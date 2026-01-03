// Game Configuration
const MAX_ROUNDS = 5;
const POINTS_PER_Q = 10;
const MASTER_CLASS_LIST = [
    "FYBA", "SYBA", "TYBA",
    "FYBCOM A", "FYBCOM B",
    "SYBCOM A", "SYBCOM B",
    "TYBCOM A", "TYBCOM B",
    "MCOM PART I", "MCOM PART II"
];

// State Variables
let gameMode = 'classroom'; // 'classroom' or 'single'
let teams = [];          
let teamQueue = [];      
let currentRound = 1;
let selectedQuestions = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeLeft = 60;
let userWantsExplanations = true;
let currentTeamIndex = -1;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const overlay = document.getElementById('transition-overlay');
const lastQBanner = document.getElementById('last-q-banner');

const questionText = document.getElementById('question-text');
const mediaContainer = document.getElementById('media-container');
const optionsContainer = document.getElementById('options-container');
const nextBtn = document.getElementById('next-btn');
const revealBtn = document.getElementById('reveal-btn');
const roundDisplay = document.getElementById('round-display');
const qRemaining = document.getElementById('q-remaining');
const timerDisplay = document.getElementById('timer-display');
const turnBanner = document.getElementById('turn-banner');
const categoryList = document.getElementById('category-list');
const teamList = document.getElementById('team-list');
const errorMsg = document.getElementById('error-msg');
const qTag = document.getElementById('q-tag');
const leaderboardBody = document.getElementById('leaderboard-body');

// --- INIT ---
window.onload = function() {
    if(typeof quizDatabase === 'undefined') return;
    
    // 1. Populate Teams Checkboxes
    let teamHtml = `<label class="cat-option" style="grid-column: span 2; border-bottom:1px solid #eee; padding-bottom:5px;">
                        <input type="checkbox" onchange="toggleAllTeams(this)"> <b>Select All Classes</b>
                    </label>`;
    MASTER_CLASS_LIST.forEach((name, index) => {
        const checked = index < 2 ? 'checked' : ''; 
        teamHtml += `<label class="cat-option">
                        <input type="checkbox" class="team-chk" value="${name}" ${checked}> ${name}
                     </label>`;
    });
    teamList.innerHTML = teamHtml;

    // 2. Populate Categories
    const cats = new Set();
    quizDatabase.forEach(q => cats.add(q.category || "Uncategorized"));
    
    let catHtml = `<label class="cat-option" style="grid-column: span 2; border-bottom:1px solid #eee; padding-bottom:5px;">
                    <input type="checkbox" checked onchange="toggleAllCats(this)"> <b>Select All Categories</b>
                </label>`;
    cats.forEach(cat => {
        catHtml += `<label class="cat-option">
                    <input type="checkbox" class="cat-chk" value="${cat}" checked> ${cat}
                 </label>`;
    });
    categoryList.innerHTML = catHtml;
}

// --- UTILITIES ---
function playSound(id) {
    const audio = document.getElementById(id);
    if(audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play failed (user interaction required first)"));
    }
}

function setGameMode(mode) {
    gameMode = mode;
    document.getElementById('btn-mode-class').classList.toggle('active', mode === 'classroom');
    document.getElementById('btn-mode-single').classList.toggle('active', mode === 'single');
    
    if(mode === 'classroom') {
        document.getElementById('classroom-panel').classList.remove('hidden');
        document.getElementById('single-panel').classList.add('hidden');
    } else {
        document.getElementById('classroom-panel').classList.add('hidden');
        document.getElementById('single-panel').classList.remove('hidden');
    }
}

function toggleAllTeams(source) {
    const checkboxes = document.querySelectorAll('.team-chk');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

function toggleAllCats(source) {
    const checkboxes = document.querySelectorAll('.cat-chk');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

function toggleLeaderboard() {
    if(!startScreen.classList.contains('hidden') && quizScreen.classList.contains('hidden')) return;
    
    if (leaderboardScreen.classList.contains('hidden')) {
        updateLeaderboardUI();
        quizScreen.classList.add('hidden');
        leaderboardScreen.classList.remove('hidden');
    } else {
        closeLeaderboard();
    }
}

function closeLeaderboard() {
    leaderboardScreen.classList.add('hidden');
    if(currentRound > MAX_ROUNDS) resultScreen.classList.remove('hidden');
    else quizScreen.classList.remove('hidden');
}

// --- GAME LOGIC ---
function startGame() {
    errorMsg.style.display = 'none';

    // 1. Configure Mode
    if(gameMode === 'classroom') {
        const teamCheckboxes = document.querySelectorAll('.team-chk:checked');
        if(teamCheckboxes.length === 0) {
            errorMsg.innerText = "Please select at least one class/team.";
            errorMsg.style.display = 'block';
            return;
        }
        teams = Array.from(teamCheckboxes).map(cb => ({ name: cb.value, score: 0 }));
    } else {
        // Single Player Mode
        teams = [{ name: "Player 1", score: 0 }];
    }

    // 2. Filter DB
    const catCheckboxes = document.querySelectorAll('.cat-chk:checked');
    const allowedCats = Array.from(catCheckboxes).map(cb => cb.value);
    if(allowedCats.length === 0) {
        errorMsg.innerText = "Please select at least one category!";
        errorMsg.style.display = 'block';
        return;
    }
    const filteredDB = quizDatabase.filter(q => allowedCats.includes(q.category || "Uncategorized"));
    
    // 3. Questions Count
    let totalQuestionsNeeded;
    if(gameMode === 'classroom') {
        totalQuestionsNeeded = teams.length * MAX_ROUNDS;
    } else {
        totalQuestionsNeeded = parseInt(document.getElementById('num-questions').value) || 10;
    }
    
    if(filteredDB.length < totalQuestionsNeeded) {
        errorMsg.innerText = `Not enough questions! Need ${totalQuestionsNeeded}, found ${filteredDB.length}.`;
        errorMsg.style.display = 'block';
        return;
    }

    // 4. Shuffle & Init
    const shuffled = [...filteredDB].sort(() => 0.5 - Math.random());
    selectedQuestions = shuffled.slice(0, totalQuestionsNeeded);
    
    userWantsExplanations = document.getElementById('show-explain').checked;
    currentRound = 1;
    currentQuestionIndex = 0;
    
    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    if(gameMode === 'classroom') {
        startNewRound();
    } else {
        turnBanner.innerText = "Single Player Mode";
        turnBanner.style.backgroundColor = "#e0e0e0";
        roundDisplay.innerText = "Single Player";
        loadTurn();
    }
}

function startNewRound() {
    teamQueue = teams.map((_, index) => index);
    teamQueue.sort(() => 0.5 - Math.random());
    loadTurn();
}

function showRoundTransition(roundNum) {
    quizScreen.classList.add('hidden');
    overlay.classList.remove('hidden');
    document.getElementById('trans-title').innerText = `ROUND ${roundNum}`;
    playSound('sfx-round');
}

function resumeGame() {
    overlay.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    startNewRound();
}

function loadTurn() {
    if(gameMode === 'single') {
        qRemaining.innerText = `Q: ${currentQuestionIndex + 1} / ${selectedQuestions.length}`;
    } 
    else {
        if (teamQueue.length === 0) {
            currentRound++;
            if (currentRound > MAX_ROUNDS) {
                endGame();
                return;
            }
            showRoundTransition(currentRound);
            return;
        }

        currentTeamIndex = teamQueue.pop();
        const currentTeamName = teams[currentTeamIndex].name;
        
        roundDisplay.innerText = `Round: ${currentRound} / ${MAX_ROUNDS}`;
        qRemaining.innerText = `Q Left in Round: ${teamQueue.length + 1}`;
        turnBanner.innerText = `👉 ${currentTeamName}'s Turn 👈`;
        turnBanner.style.backgroundColor = getTeamColor(currentTeamIndex);
    }

    if(currentQuestionIndex === selectedQuestions.length - 1) {
        lastQBanner.classList.remove('hidden');
        playSound('sfx-final');
    } else {
        lastQBanner.classList.add('hidden');
    }

    resetState();
    
    const currentData = selectedQuestions[currentQuestionIndex];
    questionText.innerText = currentData.question;
    qTag.innerText = currentData.category || "General"; 
    renderMedia(currentData, mediaContainer);

    currentData.options.forEach(opt => {
        const button = document.createElement('button');
        button.innerText = opt;
        button.classList.add('option-btn');
        button.onclick = () => selectAnswer(button, currentData);
        optionsContainer.appendChild(button);
    });

    startTimer();
}

function getTeamColor(index) {
    const colors = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#fffffc', '#e5e5e5'];
    return colors[index % colors.length];
}

function renderMedia(data, container) {
    container.innerHTML = '';
    if (!data.media) return;
    let html = '';
    if (data.type === 'image') html = `<img src="${data.media}">`;
    else if (data.type === 'video') html = `<video controls src="${data.media}"></video>`;
    else if (data.type === 'audio') html = `<audio controls src="${data.media}"></audio>`;
    container.innerHTML = html;
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 60;
    timerDisplay.innerText = `${timeLeft}s`;
    timerDisplay.classList.remove('timer-warning');
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = `${timeLeft}s`;
        if (timeLeft <= 10) timerDisplay.classList.add('timer-warning');
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timeIsUp();
        }
    }, 1000);
}

function timeIsUp() {
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);
    revealBtn.classList.remove('hidden');
    playSound('sfx-wrong');
}

function selectAnswer(selectedBtn, questionData) {
    clearInterval(timerInterval);
    const correctAnswer = questionData.answer;
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    if (selectedBtn.innerText === correctAnswer) {
        selectedBtn.classList.add('correct');
        playSound('sfx-correct');
        if(gameMode === 'classroom') teams[currentTeamIndex].score += POINTS_PER_Q;
        else teams[0].score += POINTS_PER_Q;

        if(userWantsExplanations) showExplanation(questionData);
        else nextBtn.classList.remove('hidden');
    } else {
        selectedBtn.classList.add('wrong');
        playSound('sfx-wrong');
        revealBtn.classList.remove('hidden');
    }
}

function revealAnswer() {
    const currentData = selectedQuestions[currentQuestionIndex];
    const correctAnswer = currentData.answer;
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach(btn => {
        if (btn.innerText === correctAnswer) btn.classList.add('correct');
    });
    revealBtn.classList.add('hidden');
    if(userWantsExplanations) showExplanation(currentData);
    else nextBtn.classList.remove('hidden');
}

function showExplanation(data) {
    const explainBox = document.getElementById('explanation-container');
    if(!data.explanation) { nextBtn.classList.remove('hidden'); return; }
    
    explainBox.classList.remove('hidden');
    document.getElementById('explain-text').innerHTML = data.explanation.text || "No text.";
    const expMedia = document.getElementById('explain-media');
    const expLink = document.getElementById('explain-link');
    
    expMedia.innerHTML = '';
    if(data.explanation.media) renderMedia({type: data.explanation.type, media: data.explanation.media}, expMedia);
    
    if(data.explanation.link) {
        expLink.href = data.explanation.link;
        expLink.classList.remove('hidden');
    } else expLink.classList.add('hidden');
    
    nextBtn.classList.remove('hidden');
}

function nextTurn() {
    currentQuestionIndex++;
    if(currentQuestionIndex >= selectedQuestions.length) endGame();
    else loadTurn();
}

function updateLeaderboardUI() {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    let html = '';
    sortedTeams.forEach(team => {
        html += `<div class="team-card">
                    <span class="team-name">${team.name}</span>
                    <span class="team-score">${team.score}</span>
                 </div>`;
    });
    leaderboardBody.innerHTML = html;
}

function endGame() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    // Play Game Over Sound
    playSound('sfx-gameover'); 
    
    if(gameMode === 'single') {
        const finalScore = teams[0].score;
        const maxScore = selectedQuestions.length * POINTS_PER_Q;
        const percentage = (finalScore / maxScore) * 100;
        
        let feedback = "";
        let color = "#007bff";

        if(percentage >= 90) {
            feedback = "Outstanding! 🌟";
            color = "#28a745";
        } else if (percentage >= 80) {
            feedback = "Excellent Work! 👏";
            color = "#17a2b8";
        } else if (percentage >= 60) {
            feedback = "Good Job! 👍";
            color = "#ffc107";
        } else {
            feedback = "Keep Practicing! 📚";
            color = "#dc3545";
        }

        document.getElementById('final-winner').innerText = feedback;
        document.getElementById('final-winner').style.color = color;
        document.getElementById('final-standings').innerHTML = 
            `<div style="font-size:2rem; text-align:center; margin-top:20px;">
                You scored <b>${finalScore}</b> out of <b>${maxScore}</b> (${Math.round(percentage)}%)
             </div>`;
             
    } else {
        updateLeaderboardUI();
        const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
        const winner = sortedTeams[0];
        const tiedWinners = sortedTeams.filter(t => t.score === winner.score);
        
        if (tiedWinners.length > 1) {
            document.getElementById('final-winner').innerText = `It's a Tie! (${winner.score} pts)`;
        } else {
            document.getElementById('final-winner').innerText = `Winner: ${winner.name}!`;
        }
        document.getElementById('final-winner').style.color = "#007bff";
        document.getElementById('final-standings').innerHTML = leaderboardBody.innerHTML;
    }
}

function restartGame() {
    startScreen.classList.remove('hidden');
    resultScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
}

function resetState() {
    nextBtn.classList.add('hidden');
    revealBtn.classList.add('hidden');
    document.getElementById('explanation-container').classList.add('hidden');
    optionsContainer.innerHTML = '';
    mediaContainer.innerHTML = '';
    timerDisplay.innerText = '';
    clearInterval(timerInterval);
}