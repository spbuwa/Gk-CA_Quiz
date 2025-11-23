// State Variables
let currentQuestionIndex = 0;
let score = 0;
let selectedQuestions = [];
let timerInterval;
let timeLeft = 60;
let userWantsExplanations = true;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const questionText = document.getElementById('question-text');
const mediaContainer = document.getElementById('media-container');
const optionsContainer = document.getElementById('options-container');
const nextBtn = document.getElementById('next-btn');
const counterSpan = document.getElementById('question-counter');
const scoreSpan = document.getElementById('score-display');
const timerDisplay = document.getElementById('timer-display');
const categoryList = document.getElementById('category-list');
const errorMsg = document.getElementById('error-msg');
const qTag = document.getElementById('q-tag');

// --- INIT: POPULATE CATEGORIES ---
window.onload = function() {
    if(typeof quizDatabase === 'undefined') return;
    
    // 1. Get Unique Categories
    const cats = new Set();
    quizDatabase.forEach(q => cats.add(q.category || "Uncategorized"));
    
    // 2. Build Checkboxes
    let html = `<label class="cat-option" style="grid-column: span 2; border-bottom:1px solid #eee; padding-bottom:5px;">
                    <input type="checkbox" id="cat-all" checked onchange="toggleAllCats(this)"> <b>Select All</b>
                </label>`;
    
    cats.forEach(cat => {
        html += `<label class="cat-option">
                    <input type="checkbox" class="cat-chk" value="${cat}" checked> ${cat}
                 </label>`;
    });
    
    categoryList.innerHTML = html;
}

function toggleAllCats(source) {
    const checkboxes = document.querySelectorAll('.cat-chk');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

function startQuiz() {
    errorMsg.style.display = 'none';

    // 1. Get Selected Categories
    const checkboxes = document.querySelectorAll('.cat-chk:checked');
    const allowedCats = Array.from(checkboxes).map(cb => cb.value);

    if(allowedCats.length === 0) {
        errorMsg.innerText = "Please select at least one category!";
        errorMsg.style.display = 'block';
        return;
    }

    // 2. Filter Database
    const filteredDB = quizDatabase.filter(q => {
        const qCat = q.category || "Uncategorized";
        return allowedCats.includes(qCat);
    });

    if(filteredDB.length === 0) {
        errorMsg.innerText = "No questions found for selected categories.";
        errorMsg.style.display = 'block';
        return;
    }

    // 3. Select Random Questions
    const inputCount = parseInt(document.getElementById('num-questions').value);
    const maxQ = Math.min(inputCount, filteredDB.length);
    
    const shuffled = [...filteredDB].sort(() => 0.5 - Math.random());
    selectedQuestions = shuffled.slice(0, maxQ);
    userWantsExplanations = document.getElementById('show-explain').checked;

    // 4. Start UI
    score = 0;
    currentQuestionIndex = 0;
    scoreSpan.innerText = `Score: 0`;
    
    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    loadQuestion();
}

function loadQuestion() {
    resetState();
    const currentData = selectedQuestions[currentQuestionIndex];
    
    counterSpan.innerText = `Q: ${currentQuestionIndex + 1}/${selectedQuestions.length}`;
    questionText.innerText = currentData.question;
    qTag.innerText = currentData.category || "General"; // Show Category Tag

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

// ... (Rest of the functions: renderMedia, startTimer, selectAnswer, etc. remain EXACTLY the same as before) ...
// Copy the bottom half of your previous script.js here (from renderMedia downwards)
// Be sure to include renderMedia, startTimer, timeIsUp, selectAnswer, showExplanation, resetState, nextQuestion, showResults, restartQuiz

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
    if(userWantsExplanations) showExplanation(selectedQuestions[currentQuestionIndex]);
    else nextBtn.classList.remove('hidden');
}

function selectAnswer(selectedBtn, questionData) {
    clearInterval(timerInterval);
    const correctAnswer = questionData.answer;
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.innerText === correctAnswer) btn.classList.add('correct');
    });
    if (selectedBtn.innerText === correctAnswer) {
        score++;
        scoreSpan.innerText = `Score: ${score}`;
    } else {
        selectedBtn.classList.add('wrong');
    }
    if(userWantsExplanations) showExplanation(questionData);
    else nextBtn.classList.remove('hidden');
}

function showExplanation(data) {
    const explainBox = document.getElementById('explanation-container');
    if(!data.explanation) { nextBtn.classList.remove('hidden'); return; }
    explainBox.classList.remove('hidden');
    
    document.getElementById('explain-text').innerText = data.explanation.text || "No text.";
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

function resetState() {
    nextBtn.classList.add('hidden');
    document.getElementById('explanation-container').classList.add('hidden');
    optionsContainer.innerHTML = '';
    mediaContainer.innerHTML = '';
    timerDisplay.innerText = '';
    clearInterval(timerInterval);
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < selectedQuestions.length) loadQuestion();
    else showResults();
}

function showResults() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    document.getElementById('final-score').innerText = `${score} / ${selectedQuestions.length}`;
}

function restartQuiz() {
    startScreen.classList.remove('hidden');
    resultScreen.classList.add('hidden');
}