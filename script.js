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
let gameMode = 'classroom'; 
let teams = [];          
let teamQueue = [];      
let currentRound = 1;
let selectedQuestions = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeLeft = 60;
let userWantsExplanations = true;
let currentTeamIndex = -1;
let matchHistory = []; // NEW: Stores the log of every answer

// CHART VARIABLES
let leaderboardChartInstance = null;
let finalChartInstance = null;

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
const startTimerBtn = document.getElementById('start-timer-btn'); 
const roundDisplay = document.getElementById('round-display');
const qRemaining = document.getElementById('q-remaining');
const timerDisplay = document.getElementById('timer-display');
const turnBanner = document.getElementById('turn-banner');
const categoryList = document.getElementById('category-list');
const teamList = document.getElementById('team-list');
const errorMsg = document.getElementById('error-msg');
const qTag = document.getElementById('q-tag');
const answerSheetBody = document.getElementById('answer-sheet-body'); // NEW

// --- INIT ---
window.onload = function() {
    if(typeof quizDatabase === 'undefined') return;
    
    // 1. Populate Teams Checkboxes
    if(teamList) {
        let teamHtml = `<label class="list-group-item bg-light fw-bold">
                            <input class="form-check-input me-2" type="checkbox" onchange="toggleAllTeams(this)"> Select All
                        </label>`;
        MASTER_CLASS_LIST.forEach((name, index) => {
            const checked = index < 2 ? 'checked' : ''; 
            teamHtml += `<label class="list-group-item">
                            <input class="form-check-input me-2 team-chk" type="checkbox" value="${name}" ${checked}> ${name}
                         </label>`;
        });
        teamList.innerHTML = teamHtml;
    }

    // 2. Populate Categories
    const cats = new Set();
    quizDatabase.forEach(q => cats.add(q.category || "Uncategorized"));
    
    if(categoryList) {
        let catHtml = `<label class="list-group-item bg-light fw-bold">
                        <input class="form-check-input me-2" type="checkbox" checked onchange="toggleAllCats(this)"> Select All
                    </label>`;
        cats.forEach(cat => {
            catHtml += `<label class="list-group-item">
                        <input class="form-check-input me-2 cat-chk" type="checkbox" value="${cat}" checked> ${cat}
                     </label>`;
        });
        categoryList.innerHTML = catHtml;
    }
}

// --- UTILITIES ---
function playSound(id) {
    const audio = document.getElementById(id);
    if(audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play failed"));
    }
}

function getYouTubeId(url) {
    if (!url || typeof url !== 'string') return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function createYouTubeEmbed(url) {
    try {
        const vidId = getYouTubeId(url);
        if(!vidId) return "";
        return `<div class="ratio ratio-16x9 mt-3"><iframe src="https://www.youtube.com/embed/${vidId}" allowfullscreen></iframe></div>`;
    } catch (e) { return ""; }
}

function setGameMode(mode) {
    gameMode = mode;
    const btnClass = document.getElementById('btn-mode-class');
    const btnSingle = document.getElementById('btn-mode-single');
    
    if(mode === 'classroom') {
        btnClass.classList.add('active', 'bg-primary', 'text-white');
        btnSingle.classList.remove('active', 'bg-primary', 'text-white');
        document.getElementById('classroom-panel').classList.remove('d-none');
        document.getElementById('single-panel').classList.add('d-none');
    } else {
        btnSingle.classList.add('active', 'bg-primary', 'text-white');
        btnClass.classList.remove('active', 'bg-primary', 'text-white');
        document.getElementById('classroom-panel').classList.add('d-none');
        document.getElementById('single-panel').classList.remove('d-none');
    }
}

function toggleAllTeams(source) { document.querySelectorAll('.team-chk').forEach(cb => cb.checked = source.checked); }
function toggleAllCats(source) { document.querySelectorAll('.cat-chk').forEach(cb => cb.checked = source.checked); }

function toggleFullScreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
}

function toggleLeaderboard() {
    if(!startScreen.classList.contains('d-none') && quizScreen.classList.contains('d-none')) return;
    
    if (leaderboardScreen.classList.contains('d-none')) {
        updateLeaderboardGraph('leaderboardChart'); 
        quizScreen.classList.add('d-none');
        leaderboardScreen.classList.remove('d-none');
    } else {
        closeLeaderboard();
    }
}

function closeLeaderboard() {
    leaderboardScreen.classList.add('d-none');
    if(currentRound > MAX_ROUNDS) resultScreen.classList.remove('d-none');
    else quizScreen.classList.remove('d-none');
}

// --- GAME LOGIC ---
function startGame() {
    errorMsg.classList.add('d-none');

    if(gameMode === 'classroom') {
        const teamCheckboxes = document.querySelectorAll('.team-chk:checked');
        if(teamCheckboxes.length === 0) {
            errorMsg.innerText = "Please select at least one class/team.";
            errorMsg.classList.remove('d-none');
            return;
        }
        teams = Array.from(teamCheckboxes).map(cb => ({ name: cb.value, score: 0 }));
    } else {
        teams = [{ name: "Player 1", score: 0 }];
    }

    const catCheckboxes = document.querySelectorAll('.cat-chk:checked');
    const allowedCats = Array.from(catCheckboxes).map(cb => cb.value);
    if(allowedCats.length === 0) {
        errorMsg.innerText = "Please select at least one category!";
        errorMsg.classList.remove('d-none');
        return;
    }
    const filteredDB = quizDatabase.filter(q => allowedCats.includes(q.category || "Uncategorized"));
    
    let totalQuestionsNeeded = (gameMode === 'classroom') ? teams.length * MAX_ROUNDS : (parseInt(document.getElementById('num-questions').value) || 10);
    
    if(filteredDB.length < totalQuestionsNeeded) {
        errorMsg.innerText = `Not enough questions! Need ${totalQuestionsNeeded}, found ${filteredDB.length}.`;
        errorMsg.classList.remove('d-none');
        return;
    }

    const shuffled = [...filteredDB].sort(() => 0.5 - Math.random());
    selectedQuestions = shuffled.slice(0, totalQuestionsNeeded);
    
    userWantsExplanations = document.getElementById('show-explain').checked;
    currentRound = 1;
    currentQuestionIndex = 0;
    matchHistory = []; // Reset history
    
    startScreen.classList.add('d-none');
    resultScreen.classList.add('d-none');
    quizScreen.classList.remove('d-none');
    
    if(gameMode === 'classroom') startNewRound();
    else {
        turnBanner.innerText = "Single Player Mode";
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
    quizScreen.classList.add('d-none');
    overlay.classList.remove('d-none');
    document.getElementById('trans-title').innerText = `ROUND ${roundNum}`;
    playSound('sfx-round');
}

function resumeGame() {
    overlay.classList.add('d-none');
    quizScreen.classList.remove('d-none');
    startNewRound();
}

function loadTurn() {
    // Determine who is playing
    let currentTeamName = "Player 1";
    if(gameMode === 'single' || teams.length === 1) {
        if(qRemaining) qRemaining.innerText = `Q: ${currentQuestionIndex + 1} / ${selectedQuestions.length}`;
    } else {
        if (teamQueue.length === 0) {
            currentRound++;
            if (currentRound > MAX_ROUNDS) { endGame(); return; }
            showRoundTransition(currentRound);
            return;
        }
        currentTeamIndex = teamQueue.pop();
        currentTeamName = teams[currentTeamIndex].name;
        roundDisplay.innerText = `Round: ${currentRound} / ${MAX_ROUNDS}`;
        qRemaining.innerText = `Q Left: ${teamQueue.length + 1}`;
        turnBanner.innerText = `👉 ${currentTeamName}'s Turn 👈`;
    }

    if(lastQBanner) {
        if(currentQuestionIndex === selectedQuestions.length - 1) {
            lastQBanner.classList.remove('d-none');
            playSound('sfx-final');
        } else { lastQBanner.classList.add('d-none'); }
    }

    resetState();
    const currentData = selectedQuestions[currentQuestionIndex];
    questionText.innerText = currentData.question;
    qTag.innerText = currentData.category || "General"; 
    renderMedia(currentData, mediaContainer);

    // NEW: Randomize Options
    // Create a copy so we don't mess up the original data
    let shuffledOptions = [...currentData.options];
    shuffledOptions.sort(() => Math.random() - 0.5);

    shuffledOptions.forEach(opt => {
        const col = document.createElement('div');
        col.className = 'col-md-6';
        const button = document.createElement('button');
        button.innerText = opt;
        button.className = 'btn btn-outline-dark w-100 py-3 option-btn shadow-sm fw-semibold';
        button.onclick = () => selectAnswer(button, currentData);
        if(gameMode === 'classroom') button.disabled = true;
        col.appendChild(button);
        optionsContainer.appendChild(col);
    });

    if(gameMode === 'classroom') {
        if(startTimerBtn) startTimerBtn.classList.remove('d-none');
        timerDisplay.innerText = "60s"; 
    } else startTimer();
}

function manualStartTimer() {
    if(startTimerBtn) startTimerBtn.classList.add('d-none');
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = false);
    startTimer();
}

function renderMedia(data, container) {
    container.innerHTML = '';
    if (!data.media) return;
    let html = '';
    if (data.type === 'youtube') html = createYouTubeEmbed(data.media);
    else if (data.type === 'image') html = `<img src="${data.media}" class="img-fluid rounded">`;
    else if (data.type === 'video') html = `<video controls src="${data.media}" class="w-100 rounded"></video>`;
    else if (data.type === 'audio') html = `<audio controls src="${data.media}" class="w-100"></audio>`;
    container.innerHTML = html;
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 60;
    if(timerDisplay) { timerDisplay.innerText = `${timeLeft}s`; timerDisplay.classList.remove('timer-warning'); }
    timerInterval = setInterval(() => {
        timeLeft--;
        if(timerDisplay) {
            timerDisplay.innerText = `${timeLeft}s`;
            if (timeLeft <= 10) timerDisplay.classList.add('timer-warning');
        }
        if (timeLeft <= 0) { clearInterval(timerInterval); timeIsUp(); }
    }, 1000);
}

function timeIsUp() {
    disableOptions();
    
    // RECORD RESULT (Time Out)
    const currentQ = selectedQuestions[currentQuestionIndex];
    let teamName = "Player 1";
    if(gameMode === 'classroom' && teams.length > 0 && currentTeamIndex >= 0) {
        teamName = teams[currentTeamIndex].name;
    }
    
    matchHistory.push({
        qNum: currentQuestionIndex + 1,
        team: teamName,
        question: currentQ.question,
        selected: "Time Out",
        correct: currentQ.answer,
        isCorrect: false
    });

    if(revealBtn) revealBtn.classList.remove('d-none');
    else if(userWantsExplanations) showExplanation(currentQ);
    else nextBtn.classList.remove('d-none');
    playSound('sfx-wrong');
}

function disableOptions() {
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
}

function selectAnswer(selectedBtn, questionData) {
    clearInterval(timerInterval);
    disableOptions();
    
    let isCorrect = false;
    let teamName = "Player 1";
    if(gameMode === 'classroom' && teams.length > 0 && currentTeamIndex >= 0) {
        teamName = teams[currentTeamIndex].name;
    }

    if (selectedBtn.innerText.trim() === questionData.answer.trim()) {
        selectedBtn.classList.remove('btn-outline-dark');
        selectedBtn.classList.add('correct');
        playSound('sfx-correct');
        isCorrect = true;
        
        if(gameMode === 'classroom' && teams.length > 1) teams[currentTeamIndex].score += POINTS_PER_Q;
        else teams[0].score += POINTS_PER_Q;
    } else {
        selectedBtn.classList.remove('btn-outline-dark');
        selectedBtn.classList.add('wrong');
        playSound('sfx-wrong');
        isCorrect = false;
    }
    
    // RECORD RESULT
    matchHistory.push({
        qNum: currentQuestionIndex + 1,
        team: teamName,
        question: questionData.question,
        selected: selectedBtn.innerText,
        correct: questionData.answer,
        isCorrect: isCorrect
    });

    if(isCorrect) {
        if(userWantsExplanations) showExplanation(questionData);
        else nextBtn.classList.remove('d-none');
    } else {
        if(revealBtn) revealBtn.classList.remove('d-none');
        else if(userWantsExplanations) showExplanation(questionData);
        else nextBtn.classList.remove('d-none');
    }
}

function revealAnswer() {
    const currentData = selectedQuestions[currentQuestionIndex];
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.innerText.trim() === currentData.answer.trim()) {
            btn.classList.remove('btn-outline-dark');
            btn.classList.add('correct');
        }
    });
    if(revealBtn) revealBtn.classList.add('d-none');
    if(userWantsExplanations) showExplanation(currentData);
    else nextBtn.classList.remove('d-none');
}

function showExplanation(data) {
    const explainBox = document.getElementById('explanation-container');
    const safeNextBtn = document.getElementById('next-btn');
    if(!data.explanation || !explainBox) { if(safeNextBtn) safeNextBtn.classList.remove('d-none'); return; }
    try {
        explainBox.classList.remove('d-none');
        document.getElementById('explain-text').innerHTML = data.explanation.text || "";
        const expMedia = document.getElementById('explain-media');
        const expLink = document.getElementById('explain-link');
        if(expMedia) {
            expMedia.innerHTML = '';
            if(data.explanation.media) renderMedia({type: data.explanation.type || 'image', media: data.explanation.media}, expMedia);
            if(data.explanation.youtube) expMedia.innerHTML += createYouTubeEmbed(data.explanation.youtube);
        }
        if(expLink) {
            if(data.explanation.link) { expLink.href = data.explanation.link; expLink.classList.remove('d-none'); } 
            else expLink.classList.add('d-none');
        }
    } catch (err) { console.error(err); } 
    finally { if(safeNextBtn) safeNextBtn.classList.remove('d-none'); }
}

function nextTurn() {
    currentQuestionIndex++;
    if(currentQuestionIndex >= selectedQuestions.length) endGame();
    else loadTurn();
}

// ==========================================
// CHART GENERATION
// ==========================================
function updateLeaderboardGraph(canvasId) {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const names = sortedTeams.map(t => t.name);
    const scores = sortedTeams.map(t => t.score);
    
    if(canvasId === 'leaderboardChart' && leaderboardChartInstance) leaderboardChartInstance.destroy();
    if(canvasId === 'finalChart' && finalChartInstance) finalChartInstance.destroy();

    const bgColors = ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)'];

    const ctx = document.getElementById(canvasId);
    if(!ctx) return;

    const config = {
        type: 'bar',
        data: {
            labels: names,
            datasets: [{
                label: 'Points',
                data: scores,
                backgroundColor: bgColors,
                borderColor: bgColors.map(c => c.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    };

    if(canvasId === 'leaderboardChart') leaderboardChartInstance = new Chart(ctx, config);
    if(canvasId === 'finalChart') finalChartInstance = new Chart(ctx, config);
}

function endGame() {
    quizScreen.classList.add('d-none');
    resultScreen.classList.remove('d-none');
    playSound('sfx-gameover'); 
    
    const maxScore = selectedQuestions.length * POINTS_PER_Q;
    const fw = document.getElementById('final-winner');

    // 1. Generate Answer Sheet
    renderAnswerSheet();

    // 2. Winner Display
    if(gameMode === 'single' || teams.length === 1) {
        const finalScore = teams[0].score;
        const percentage = (maxScore > 0) ? (finalScore / maxScore) * 100 : 0;
        let color = "text-danger";
        if(percentage >= 80) color = "text-success";
        else if (percentage >= 60) color = "text-warning";
        fw.innerHTML = `<h2 class="${color} fw-bold">Score: ${finalScore} / ${maxScore}</h2><h4>(${Math.round(percentage)}%)</h4>`;
        
        // --- FIX STARTS HERE ---
        // Show the graph container even for single player
        document.getElementById('finalChart').parentElement.style.display = 'block';
        // Generate the graph (One big bar for the player)
        setTimeout(() => updateLeaderboardGraph('finalChart'), 100); 
        // --- FIX ENDS HERE ---

    } else {
        const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
        const winner = sortedTeams[0];
        fw.innerHTML = `<h2 class="text-success fw-bold">Winner: ${winner.name}</h2>`;
        
        // Show Graph for teams
        document.getElementById('finalChart').parentElement.style.display = 'block';
        setTimeout(() => updateLeaderboardGraph('finalChart'), 100); 
    }
}

// NEW: Render Table
function renderAnswerSheet() {
    if(!answerSheetBody) return;
    let html = '';
    matchHistory.forEach(record => {
        // Truncate long questions
        let shortQ = record.question.length > 50 ? record.question.substring(0, 50) + "..." : record.question;
        let rowClass = record.isCorrect ? 'table-success' : 'table-danger';
        let icon = record.isCorrect ? '✅' : '❌';
        
        html += `<tr class="${rowClass}">
                    <td>${record.qNum}</td>
                    <td>${record.team}</td>
                    <td>${shortQ}</td>
                    <td>${icon}</td>
                 </tr>`;
    });
    answerSheetBody.innerHTML = html;
}

function restartGame() {
    startScreen.classList.remove('d-none');
    resultScreen.classList.add('d-none');
    leaderboardScreen.classList.add('d-none');
    if(leaderboardChartInstance) leaderboardChartInstance.destroy();
    if(finalChartInstance) finalChartInstance.destroy();
}

function resetState() {
    if(nextBtn) nextBtn.classList.add('d-none');
    if(revealBtn) revealBtn.classList.add('d-none');
    if(startTimerBtn) startTimerBtn.classList.add('d-none');
    document.getElementById('explanation-container').classList.add('d-none');
    optionsContainer.innerHTML = '';
    mediaContainer.innerHTML = '';
    timerDisplay.innerText = '';
    clearInterval(timerInterval);
}

// ==========================================
// NEW: SAVE / EXPORT FUNCTIONS
// ==========================================

function downloadCSV() {
    // UPDATED to download the detailed match history
    const now = new Date();
    const dateString = now.toLocaleDateString().replace(/\//g, '-');
    const filename = `Quiz_Report_${dateString}.csv`;

    let csvContent = "data:text/csv;charset=utf-8,";
    // Header
    csvContent += "Q No,Team Name,Question,Selected Answer,Correct Answer,Result\n";

    matchHistory.forEach(rec => {
        // Escape commas in text to prevent breaking CSV
        const safeQ = `"${rec.question.replace(/"/g, '""')}"`;
        const safeSel = `"${rec.selected.replace(/"/g, '""')}"`;
        const safeAns = `"${rec.correct.replace(/"/g, '""')}"`;
        const status = rec.isCorrect ? "Correct" : "Wrong";
        
        const row = `${rec.qNum},${rec.team},${safeQ},${safeSel},${safeAns},${status}`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadGraph() {
    if (finalChartInstance) {
        const imageLink = finalChartInstance.toBase64Image();
        const link = document.createElement('a');
        link.download = 'Quiz_Graph_Result.png';
        link.href = imageLink;
        link.click();
    } else {
        alert("No graph available to save!");
    }
}