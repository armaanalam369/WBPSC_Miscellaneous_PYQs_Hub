/**
 * Advanced Quiz Application Engine
 * Manages dual indexing, multi-mode timers, option shuffling,
 * responsive mobile navigation, LocalStorage analytics, and review audits.
 */

(function () {
  'use strict';

  // --- App State ---
  const state = {
    theme: localStorage.getItem('prephub_theme') || 'light',
    history: JSON.parse(localStorage.getItem('prephub_history') || '[]'),
    activeQuiz: null,
    timerInterval: null,
    timeRemaining: 0,
    elapsedSeconds: 0
  };

  // --- DOM Selectors ---
  const DOM = {
    themeBtn: document.getElementById('theme-toggle-btn'),
    themeIcon: document.getElementById('theme-icon'),
    validationBadge: document.getElementById('data-validation-badge'),
    homeBtn: document.getElementById('nav-home-btn'),
    views: {
      dashboard: document.getElementById('view-dashboard'),
      quiz: document.getElementById('view-quiz'),
      analytics: document.getElementById('view-analytics'),
      review: document.getElementById('view-review')
    },
    tabs: document.querySelectorAll('.dashboard-tabs .tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    pyqGrid: document.getElementById('pyq-cards-grid'),
    sectionGrid: document.getElementById('section-cards-grid'),
    builderYears: document.getElementById('builder-years-list'),
    builderSections: document.getElementById('builder-sections-list'),
    builderForm: document.getElementById('custom-test-form'),
    customQCount: document.getElementById('custom-q-count'),
    customOrder: document.getElementById('custom-order'),
    customTimerMode: document.getElementById('custom-timer-mode'),
    timerDurationGroup: document.getElementById('timer-duration-group'),
    customTimerVal: document.getElementById('custom-timer-val'),
    customShuffleOptions: document.getElementById('custom-shuffle-options'),
    availableCountHint: document.getElementById('available-count-hint'),
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    
    // Quiz UI
    quizHeaderTitle: document.getElementById('quiz-header-title'),
    quizQuestionCounter: document.getElementById('quiz-question-counter'),
    quizTimerDisplay: document.getElementById('quiz-timer-display'),
    quizProgressFill: document.getElementById('quiz-progress-fill'),
    quizNavToggleBtn: document.getElementById('quiz-nav-toggle-btn'),
    answeredNavBadge: document.getElementById('answered-nav-badge'),
    quizDrawer: document.getElementById('quiz-navigator-drawer'),
    closeDrawerBtn: document.getElementById('close-drawer-btn'),
    qMetaYear: document.getElementById('q-meta-year'),
    qMetaNumber: document.getElementById('q-meta-number'),
    qMetaSection: document.getElementById('q-meta-section'),
    qMetaRepeat: document.getElementById('q-meta-repeat'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    btnPrev: document.getElementById('btn-prev-q'),
    btnNext: document.getElementById('btn-next-q'),
    btnReview: document.getElementById('btn-review-q'),
    btnClear: document.getElementById('btn-clear-q'),
    btnSubmit: document.getElementById('btn-submit-test'),
    questionGrid: document.getElementById('question-grid-container'),

    // Analytics UI
    resultTitle: document.getElementById('result-title'),
    resultTimestamp: document.getElementById('result-timestamp'),
    statScore: document.getElementById('stat-score'),
    statAccuracy: document.getElementById('stat-accuracy'),
    statTime: document.getElementById('stat-time'),
    statAvgTime: document.getElementById('stat-avg-time'),
    metricCorrect: document.getElementById('metric-correct'),
    metricIncorrect: document.getElementById('metric-incorrect'),
    metricUnanswered: document.getElementById('metric-unanswered'),
    sectionBreakdownTbody: document.getElementById('section-breakdown-tbody'),
    yearBreakdownTbody: document.getElementById('year-breakdown-tbody'),
    btnGoReview: document.getElementById('btn-go-review'),
    btnFinishDashboard: document.getElementById('btn-finish-dashboard'),

    // Review UI
    reviewTitle: document.getElementById('review-title'),
    reviewQuestionsList: document.getElementById('review-questions-list'),
    btnBackToAnalytics: document.getElementById('btn-back-to-analytics'),
    reviewFilterBtns: document.querySelectorAll('.review-filter-btn')
  };

  // --- Initialization ---
  function init() {
    applyTheme(state.theme);
    validateDataIntegrity();
    setupEventListeners();
    renderDashboardPYQs();
    renderDashboardSections();
    renderCustomBuilderOptions();
    renderHistory();
  }

  // --- Theme Management ---
  function applyTheme(theme) {
    state.theme = theme;
    document.body.setAttribute('data-theme', theme);
    DOM.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('prephub_theme', theme);
  }

  // --- Requirement 25: Data Validation Engine ---
  function validateDataIntegrity() {
    const total = QUESTION_BANK.length;
    const ids = new Set();
    let hasDupes = false;
    let sectionCountMap = {};
    let yearCountMap = {};

    ALL_SECTIONS.forEach(s => sectionCountMap[s] = 0);
    ALL_YEARS.forEach(y => yearCountMap[y] = 0);

    for (let q of QUESTION_BANK) {
      if (ids.has(q.id)) hasDupes = true;
      ids.add(q.id);
      if (sectionCountMap[q.section] !== undefined) sectionCountMap[q.section]++;
      if (yearCountMap[q.year] !== undefined) yearCountMap[q.year]++;
    }

    const yearCheck = ALL_YEARS.every(y => yearCountMap[y] === 100);
    const sumSections = Object.values(sectionCountMap).reduce((a, b) => a + b, 0);

    if (total === 1500 && !hasDupes && yearCheck && sumSections === 1500) {
      DOM.validationBadge.className = 'data-badge valid';
      DOM.validationBadge.textContent = '✓ 1,500 Questions Verified';
    } else {
      DOM.validationBadge.className = 'data-badge error';
      DOM.validationBadge.textContent = `! Audit Warning (${total} Qs)`;
    }
  }

  // --- Navigation & View Switching ---
  function switchView(viewName) {
    if (state.activeQuiz && viewName !== 'quiz') {
      const confirmLeave = confirm("A quiz is currently active. Leaving will abort your progress. Return to Dashboard?");
      if (!confirmLeave) return;
      abortActiveQuiz();
    }
    Object.keys(DOM.views).forEach(key => {
      DOM.views[key].classList.toggle('active', key === viewName);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Dashboard Rendering ---
  function renderDashboardPYQs() {
    DOM.pyqGrid.innerHTML = '';
    ALL_YEARS.slice().reverse().forEach(year => {
      const bestAttempt = state.history.filter(h => h.pyqYear === year).sort((a, b) => b.score - a.score)[0];
      const card = document.createElement('div');
      card.className = 'pyq-card';
      card.innerHTML = `
        <div>
          <div class="card-title-row">
            <h4>${year} PYQ Paper</h4>
            <span class="q-badge">100 Qs</span>
          </div>
          <div class="card-stats">
            <span>Status: ${bestAttempt ? 'Completed' : 'Unattempted'}</span>
            <span>Best: ${bestAttempt ? `${bestAttempt.score}/100` : '--'}</span>
          </div>
        </div>
        <button class="primary-btn" data-start-pyq="${year}">Start 100 Qs Paper</button>
      `;
      DOM.pyqGrid.appendChild(card);
    });
  }

  function renderDashboardSections() {
    DOM.sectionGrid.innerHTML = '';
    ALL_SECTIONS.forEach(secName => {
      const qCount = QUESTION_BANK.filter(q => q.section === secName).length;
      const secAttempts = state.history.filter(h => h.sections && h.sections.includes(secName));
      const bestScore = secAttempts.length > 0 ? Math.max(...secAttempts.map(a => a.accuracy)) : null;

      const card = document.createElement('div');
      card.className = 'section-card';
      card.innerHTML = `
        <div>
          <div class="card-title-row">
            <h4>${secName}</h4>
            <span class="q-badge">${qCount} Qs</span>
          </div>
          <div class="card-stats">
            <span>Attempts: ${secAttempts.length}</span>
            <span>Best Acc: ${bestScore !== null ? `${bestScore.toFixed(1)}%` : '--'}</span>
          </div>
        </div>
        <button class="primary-btn" data-start-section="${secName}">Practice Module</button>
      `;
      DOM.sectionGrid.appendChild(card);
    });
  }

  // --- Custom Test Builder Form ---
  function renderCustomBuilderOptions() {
    DOM.builderYears.innerHTML = '';
    ALL_YEARS.forEach(year => {
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="checkbox" name="custom_year" value="${year}" checked>
        <span>${year}</span>
      `;
      DOM.builderYears.appendChild(label);
    });

    DOM.builderSections.innerHTML = '';
    ALL_SECTIONS.forEach(sec => {
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="checkbox" name="custom_sec" value="${sec}" checked>
        <span>${sec}</span>
      `;
      DOM.builderSections.appendChild(label);
    });

    updateCustomBuilderAvailability();
  }

  function updateCustomBuilderAvailability() {
    const selectedYears = Array.from(document.querySelectorAll('input[name="custom_year"]:checked')).map(el => parseInt(el.value));
    const selectedSecs = Array.from(document.querySelectorAll('input[name="custom_sec"]:checked')).map(el => el.value);

    const matchCount = QUESTION_BANK.filter(q => selectedYears.includes(q.year) && selectedSecs.includes(q.section)).length;
    DOM.availableCountHint.textContent = `Available matching questions: ${matchCount}`;
    
    // Enable/disable option elements
    Array.from(DOM.customQCount.options).forEach(opt => {
      if (opt.value !== 'all') {
        const val = parseInt(opt.value);
        opt.disabled = val > matchCount;
      }
    });

    return matchCount;
  }

  // --- Quiz Generator & Runner ---
  function startQuiz(config) {
    let pool = [...config.questions];

    if (config.randomizeQuestions) {
      shuffleArray(pool);
    }

    if (config.limit && config.limit < pool.length) {
      pool = pool.slice(0, config.limit);
    }

    // Process option shuffling while preserving exact original correct answer string
    const questions = pool.map(origQ => {
      const qCopy = { ...origQ };
      if (config.shuffleOptions) {
        const correctStr = origQ.options[origQ.correctAnswer];
        const shuffled = [...origQ.options];
        shuffleArray(shuffled);
        qCopy.options = shuffled;
        qCopy.correctAnswer = shuffled.indexOf(correctStr);
      }
      return qCopy;
    });

    state.activeQuiz = {
      title: config.title,
      pyqYear: config.pyqYear || null,
      sections: config.sections || [],
      questions: questions,
      currentIndex: 0,
      userAnswers: new Array(questions.length).fill(null),
      flags: new Array(questions.length).fill(false),
      timerMode: config.timerMode,
      durationPerQuestion: config.durationPerQuestion || 0,
      totalDurationSeconds: config.totalDurationSeconds || 0,
      elapsedSeconds: 0,
      questionTimeLeft: config.durationPerQuestion || 0
    };

    switchView('quiz');
    setupQuizUI();
    startQuizTimer();
    renderCurrentQuestion();
  }

  function setupQuizUI() {
    DOM.quizHeaderTitle.textContent = state.activeQuiz.title;
    DOM.quizProgressFill.style.width = '0%';
    renderQuestionGrid();
  }

  function renderCurrentQuestion() {
    const quiz = state.activeQuiz;
    const q = quiz.questions[quiz.currentIndex];

    DOM.quizQuestionCounter.textContent = `Q ${quiz.currentIndex + 1} / ${quiz.questions.length}`;
    DOM.qMetaYear.textContent = `${q.year} PYQ`;
    DOM.qMetaNumber.textContent = `Q.${q.originalNumber}`;
    DOM.qMetaSection.textContent = q.section;

    if (q.repetitionStatus) {
      DOM.qMetaRepeat.style.display = 'inline-block';
      DOM.qMetaRepeat.textContent = `⟳ ${q.repetitionStatus}`;
    } else {
      DOM.qMetaRepeat.style.display = 'none';
    }

    DOM.questionText.textContent = q.question;
    DOM.optionsContainer.innerHTML = '';

    const alphabet = ['A', 'B', 'C', 'D'];
    q.options.forEach((optText, i) => {
      const optBtn = document.createElement('div');
      optBtn.className = 'option-item';
      if (quiz.userAnswers[quiz.currentIndex] === i) {
        optBtn.classList.add('selected');
      }
      optBtn.innerHTML = `
        <span class="option-key">${alphabet[i]}</span>
        <span>${optText}</span>
      `;
      optBtn.addEventListener('click', () => selectAnswer(i));
      DOM.optionsContainer.appendChild(optBtn);
    });

    // Button states
    DOM.btnPrev.disabled = quiz.currentIndex === 0;
    DOM.btnNext.textContent = quiz.currentIndex === quiz.questions.length - 1 ? 'Finish' : 'Next →';
    DOM.btnReview.textContent = quiz.flags[quiz.currentIndex] ? 'Unflag Review' : 'Flag for Review';
    DOM.btnReview.classList.toggle('warning', !quiz.flags[quiz.currentIndex]);

    // Update Progress
    const answeredCount = quiz.userAnswers.filter(a => a !== null).length;
    DOM.answeredNavBadge.textContent = `${answeredCount}/${quiz.questions.length}`;
    DOM.quizProgressFill.style.width = `${((quiz.currentIndex + 1) / quiz.questions.length) * 100}%`;

    updateQuestionGridCurrent();
  }

  function selectAnswer(index) {
    const quiz = state.activeQuiz;
    quiz.userAnswers[quiz.currentIndex] = index;
    renderCurrentQuestion();
    renderQuestionGrid();
  }

  function clearCurrentAnswer() {
    const quiz = state.activeQuiz;
    quiz.userAnswers[quiz.currentIndex] = null;
    renderCurrentQuestion();
    renderQuestionGrid();
  }

  function toggleFlagCurrent() {
    const quiz = state.activeQuiz;
    quiz.flags[quiz.currentIndex] = !quiz.flags[quiz.currentIndex];
    renderCurrentQuestion();
    renderQuestionGrid();
  }

  function renderQuestionGrid() {
    const quiz = state.activeQuiz;
    DOM.questionGrid.innerHTML = '';

    quiz.questions.forEach((_, idx) => {
      const btn = document.createElement('button');
      btn.className = 'nav-grid-btn';
      btn.textContent = idx + 1;

      if (quiz.userAnswers[idx] !== null) btn.classList.add('answered');
      if (quiz.flags[idx]) btn.classList.add('review');
      if (idx === quiz.currentIndex) btn.classList.add('current');

      btn.addEventListener('click', () => {
        quiz.currentIndex = idx;
        renderCurrentQuestion();
        if (window.innerWidth <= 840) {
          DOM.quizDrawer.classList.remove('open');
        }
      });
      DOM.questionGrid.appendChild(btn);
    });
  }

  function updateQuestionGridCurrent() {
    const buttons = DOM.questionGrid.querySelectorAll('.nav-grid-btn');
    buttons.forEach((btn, idx) => {
      btn.classList.toggle('current', idx === state.activeQuiz.currentIndex);
    });
  }

  // --- Timer Systems (Per-Question / Per-Test / None) ---
  function startQuizTimer() {
    clearInterval(state.timerInterval);
    const quiz = state.activeQuiz;

    if (quiz.timerMode === 'none') {
      DOM.quizTimerDisplay.textContent = 'Untimed';
      state.timerInterval = setInterval(() => {
        quiz.elapsedSeconds++;
      }, 1000);
      return;
    }

    if (quiz.timerMode === 'test') {
      state.timeRemaining = quiz.totalDurationSeconds;
      updateTimerDisplay(state.timeRemaining);

      state.timerInterval = setInterval(() => {
        quiz.elapsedSeconds++;
        state.timeRemaining--;
        updateTimerDisplay(state.timeRemaining);

        if (state.timeRemaining <= 0) {
          clearInterval(state.timerInterval);
          alert('Time expired! Submitting test automatically.');
          submitQuiz();
        }
      }, 1000);
    } else if (quiz.timerMode === 'question') {
      state.timeRemaining = quiz.durationPerQuestion;
      updateTimerDisplay(state.timeRemaining);

      state.timerInterval = setInterval(() => {
        quiz.elapsedSeconds++;
        state.timeRemaining--;
        updateTimerDisplay(state.timeRemaining);

        if (state.timeRemaining <= 0) {
          // Lock and auto advance
          if (quiz.currentIndex < quiz.questions.length - 1) {
            quiz.currentIndex++;
            state.timeRemaining = quiz.durationPerQuestion;
            renderCurrentQuestion();
          } else {
            clearInterval(state.timerInterval);
            alert('Last question time expired! Submitting test.');
            submitQuiz();
          }
        }
      }, 1000);
    }
  }

  function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    DOM.quizTimerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    DOM.quizTimerDisplay.classList.toggle('urgent', seconds < 60);
  }

  // --- Submission & Analytics Calculation ---
  function submitQuiz() {
    clearInterval(state.timerInterval);
    const quiz = state.activeQuiz;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    const sectionMetrics = {};
    const yearMetrics = {};

    quiz.questions.forEach((q, idx) => {
      const userAns = quiz.userAnswers[idx];
      const isCorrect = userAns === q.correctAnswer;
      const isAttempted = userAns !== null;

      if (!isAttempted) {
        unanswered++;
      } else if (isCorrect) {
        correct++;
      } else {
        incorrect++;
      }

      // Section Metrics
      if (!sectionMetrics[q.section]) {
        sectionMetrics[q.section] = { total: 0, attempted: 0, correct: 0, incorrect: 0 };
      }
      sectionMetrics[q.section].total++;
      if (isAttempted) {
        sectionMetrics[q.section].attempted++;
        if (isCorrect) sectionMetrics[q.section].correct++;
        else sectionMetrics[q.section].incorrect++;
      }

      // Year Metrics
      if (!yearMetrics[q.year]) {
        yearMetrics[q.year] = { total: 0, attempted: 0, correct: 0, incorrect: 0 };
      }
      yearMetrics[q.year].total++;
      if (isAttempted) {
        yearMetrics[q.year].attempted++;
        if (isCorrect) yearMetrics[q.year].correct++;
        else yearMetrics[q.year].incorrect++;
      }
    });

    const totalQuestions = quiz.questions.length;
    const accuracy = (correct + incorrect) > 0 ? (correct / (correct + incorrect)) * 100 : 0;
    const avgSeconds = totalQuestions > 0 ? (quiz.elapsedSeconds / totalQuestions).toFixed(1) : 0;

    const resultRecord = {
      id: 'ATTEMPT_' + Date.now(),
      title: quiz.title,
      pyqYear: quiz.pyqYear,
      sections: quiz.sections,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      total: totalQuestions,
      attempted: correct + incorrect,
      correct: correct,
      incorrect: incorrect,
      unanswered: unanswered,
      score: correct,
      accuracy: accuracy,
      elapsedSeconds: quiz.elapsedSeconds,
      avgSecondsPerQ: avgSeconds,
      sectionBreakdown: sectionMetrics,
      yearBreakdown: yearMetrics,
      questions: quiz.questions,
      userAnswers: quiz.userAnswers
    };

    state.history.unshift(resultRecord);
    localStorage.setItem('prephub_history', JSON.stringify(state.history.slice(0, 50)));

    state.activeQuiz = null;
    displayAnalytics(resultRecord);
    renderDashboardPYQs();
    renderDashboardSections();
    renderHistory();
  }

  function displayAnalytics(record) {
    DOM.resultTitle.textContent = `${record.title} - Results`;
    DOM.resultTimestamp.textContent = `Completed on ${record.date}`;
    DOM.statScore.textContent = `${record.correct} / ${record.total}`;
    DOM.statAccuracy.textContent = `${record.accuracy.toFixed(1)}%`;
    DOM.statTime.textContent = formatDuration(record.elapsedSeconds);
    DOM.statAvgTime.textContent = `${record.avgSecondsPerQ}s`;

    DOM.metricCorrect.textContent = record.correct;
    DOM.metricIncorrect.textContent = record.incorrect;
    DOM.metricUnanswered.textContent = record.unanswered;

    // Section Breakdown Table
    DOM.sectionBreakdownTbody.innerHTML = '';
    Object.keys(record.sectionBreakdown).sort().forEach(sec => {
      const data = record.sectionBreakdown[sec];
      const acc = data.attempted > 0 ? ((data.correct / data.attempted) * 100).toFixed(1) + '%' : '0.0%';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${sec}</strong></td>
        <td>${data.total}</td>
        <td>${data.attempted}</td>
        <td style="color: var(--success);">${data.correct}</td>
        <td style="color: var(--danger);">${data.incorrect}</td>
        <td><strong>${acc}</strong></td>
      `;
      DOM.sectionBreakdownTbody.appendChild(row);
    });

    // Year Breakdown Table
    DOM.yearBreakdownTbody.innerHTML = '';
    Object.keys(record.yearBreakdown).sort().forEach(yr => {
      const data = record.yearBreakdown[yr];
      const acc = data.attempted > 0 ? ((data.correct / data.attempted) * 100).toFixed(1) + '%' : '0.0%';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${yr} PYQ</strong></td>
        <td>${data.total}</td>
        <td>${data.attempted}</td>
        <td style="color: var(--success);">${data.correct}</td>
        <td style="color: var(--danger);">${data.incorrect}</td>
        <td><strong>${acc}</strong></td>
      `;
      DOM.yearBreakdownTbody.appendChild(row);
    });

    DOM.btnGoReview.onclick = () => renderDetailedReview(record);
    switchView('analytics');
  }

  // --- Detailed Review Screen ---
  function renderDetailedReview(record, filter = 'all') {
    DOM.reviewTitle.textContent = `${record.title} - Solutions Review`;
    DOM.reviewQuestionsList.innerHTML = '';

    record.questions.forEach((q, idx) => {
      const userAns = record.userAnswers[idx];
      const isCorrect = userAns === q.correctAnswer;
      const isUnanswered = userAns === null;

      let status = isUnanswered ? 'unanswered' : (isCorrect ? 'correct' : 'incorrect');
      if (filter !== 'all' && filter !== status) return;

      const card = document.createElement('div');
      card.className = `review-card ${status}`;

      const userAnsText = isUnanswered ? 'None (Unanswered)' : q.options[userAns];
      const correctAnsText = q.options[q.correctAnswer];

      card.innerHTML = `
        <span class="review-status-tag">${status.toUpperCase()}</span>
        <div class="q-meta-strip">
          <span class="meta-tag">${q.year}</span>
          <span class="meta-tag">Q.${q.originalNumber}</span>
          <span class="meta-tag blue">${q.section}</span>
          ${q.repetitionStatus ? `<span class="meta-tag warning">⟳ ${q.repetitionStatus}</span>` : ''}
        </div>
        <p style="font-weight: 600; margin: 10px 0;">${idx + 1}. ${q.question}</p>
        <div style="font-size: 0.88rem; margin-bottom: 6px;">
          <div>Your Choice: <strong style="color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">${userAnsText}</strong></div>
          <div>Correct Answer: <strong style="color: var(--success);">${correctAnsText}</strong></div>
        </div>
        <div class="explanation-box">
          <strong>Explanation:</strong> ${q.explanation}
        </div>
      `;
      DOM.reviewQuestionsList.appendChild(card);
    });

    switchView('review');
  }

  // --- History Tab ---
  function renderHistory() {
    DOM.historyList.innerHTML = '';
    if (state.history.length === 0) {
      DOM.historyList.innerHTML = '<p class="subtext">No tests completed yet.</p>';
      return;
    }

    state.history.forEach(item => {
      const el = document.createElement('div');
      el.className = 'pyq-card';
      el.style.marginBottom = '10px';
      el.innerHTML = `
        <div class="card-title-row">
          <h4>${item.title}</h4>
          <span class="q-badge">${item.score}/${item.total} (${item.accuracy.toFixed(1)}%)</span>
        </div>
        <div class="card-stats">
          <span>${item.date}</span>
          <span>Time: ${formatDuration(item.elapsedSeconds)}</span>
        </div>
        <button class="secondary-btn" data-review-history="${item.id}">View Performance Breakdown</button>
      `;
      DOM.historyList.appendChild(el);
    });
  }

  function abortActiveQuiz() {
    clearInterval(state.timerInterval);
    state.activeQuiz = null;
  }
    // --- Utility Functions ---
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function formatDuration(sec) {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}m ${String(remainder).padStart(2, '0')}s`;
  }

  // --- Event Bindings ---
  function setupEventListeners() {
    DOM.themeBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'light' ? 'dark' : 'light');
    });

    DOM.homeBtn.addEventListener('click', () => switchView('dashboard'));
    DOM.btnFinishDashboard.addEventListener('click', () => switchView('dashboard'));
    DOM.btnBackToAnalytics.addEventListener('click', () => switchView('analytics'));

    // Dashboard Tabs
    DOM.tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.tabs.forEach(b => b.classList.remove('active'));
        DOM.tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    // PYQ Start Button Delegation
    DOM.pyqGrid.addEventListener('click', e => {
      const year = e.target.getAttribute('data-start-pyq');
      if (year) {
        const yearInt = parseInt(year);
        const questions = QUESTION_BANK.filter(q => q.year === yearInt).sort((a, b) => a.originalNumber - b.originalNumber);
        startQuiz({
          title: `${year} Full PYQ Paper`,
          pyqYear: yearInt,
          questions: questions,
          limit: 100,
          randomizeQuestions: false,
          shuffleOptions: false,
          timerMode: 'test',
          totalDurationSeconds: 90 * 60 // 90 min official duration
        });
      }
    });

    // Section Start Button Delegation
    DOM.sectionGrid.addEventListener('click', e => {
      const secName = e.target.getAttribute('data-start-section');
      if (secName) {
        const questions = QUESTION_BANK.filter(q => q.section === secName);
        startQuiz({
          title: `${secName} Practice Module`,
          sections: [secName],
          questions: questions,
          limit: questions.length,
          randomizeQuestions: true,
          shuffleOptions: true,
          timerMode: 'none'
        });
      }
    });

    // Custom Builder UI updates
    DOM.builderForm.addEventListener('change', updateCustomBuilderAvailability);

    document.getElementById('select-all-years').addEventListener('click', () => {
      document.querySelectorAll('input[name="custom_year"]').forEach(i => i.checked = true);
      updateCustomBuilderAvailability();
    });
    document.getElementById('clear-all-years').addEventListener('click', () => {
      document.querySelectorAll('input[name="custom_year"]').forEach(i => i.checked = false);
      updateCustomBuilderAvailability();
    });

    document.getElementById('select-all-sections').addEventListener('click', () => {
      document.querySelectorAll('input[name="custom_sec"]').forEach(i => i.checked = true);
      updateCustomBuilderAvailability();
    });
    document.getElementById('clear-all-sections').addEventListener('click', () => {
      document.querySelectorAll('input[name="custom_sec"]').forEach(i => i.checked = false);
      updateCustomBuilderAvailability();
    });

    DOM.customTimerMode.addEventListener('change', () => {
      const mode = DOM.customTimerMode.value;
      DOM.timerDurationGroup.style.display = mode === 'none' ? 'none' : 'block';
      DOM.customTimerVal.innerHTML = '';

      if (mode === 'test') {
        const testTimes = [
          { label: '10 Minutes', val: 600 },
          { label: '20 Minutes', val: 1200 },
          { label: '30 Minutes', val: 1800 },
          { label: '45 Minutes', val: 2700 },
          { label: '60 Minutes', val: 3600 },
          { label: '90 Minutes (Standard)', val: 5400 }
        ];
        testTimes.forEach(t => {
          DOM.customTimerVal.innerHTML += `<option value="${t.val}">${t.label}</option>`;
        });
      } else if (mode === 'question') {
        const qTimes = [15, 30, 45, 60, 90, 120];
        qTimes.forEach(t => {
          DOM.customTimerVal.innerHTML += `<option value="${t}">${t} Seconds</option>`;
        });
      }
    });

    // Custom Form Submit
    DOM.builderForm.addEventListener('submit', e => {
      e.preventDefault();
      const selYears = Array.from(document.querySelectorAll('input[name="custom_year"]:checked')).map(el => parseInt(el.value));
      const selSecs = Array.from(document.querySelectorAll('input[name="custom_sec"]:checked')).map(el => el.value);

      if (selYears.length === 0 || selSecs.length === 0) {
        alert('Please select at least one year and one subject section.');
        return;
      }

      const matched = QUESTION_BANK.filter(q => selYears.includes(q.year) && selSecs.includes(q.section));
      if (matched.length === 0) {
        alert('No questions match your selected criteria.');
        return;
      }

      const qCountVal = DOM.customQCount.value;
      const count = qCountVal === 'all' ? matched.length : parseInt(qCountVal);
      const isRandom = DOM.customOrder.value === 'random';
      const shuffleOpts = DOM.customShuffleOptions.checked;
      const timerMode = DOM.customTimerMode.value;
      const timerVal = parseInt(DOM.customTimerVal.value) || 0;

      startQuiz({
        title: `Custom Test (${selSecs.length} Sections, ${selYears.length} Years)`,
        questions: matched,
        limit: Math.min(count, matched.length),
        randomizeQuestions: isRandom,
        shuffleOptions: shuffleOpts,
        timerMode: timerMode,
        totalDurationSeconds: timerMode === 'test' ? timerVal : 0,
        durationPerQuestion: timerMode === 'question' ? timerVal : 0
      });
    });

    // Quiz Controls
    DOM.btnPrev.addEventListener('click', () => {
      if (state.activeQuiz && state.activeQuiz.currentIndex > 0) {
        state.activeQuiz.currentIndex--;
        renderCurrentQuestion();
      }
    });

    DOM.btnNext.addEventListener('click', () => {
      if (!state.activeQuiz) return;
      if (state.activeQuiz.currentIndex < state.activeQuiz.questions.length - 1) {
        state.activeQuiz.currentIndex++;
        renderCurrentQuestion();
      } else {
        const confirmSubmit = confirm('You are on the final question. Do you want to submit your test?');
        if (confirmSubmit) submitQuiz();
      }
    });

    DOM.btnClear.addEventListener('click', clearCurrentAnswer);
    DOM.btnReview.addEventListener('click', toggleFlagCurrent);
    DOM.btnSubmit.addEventListener('click', () => {
      const confirmSubmit = confirm('Are you sure you want to finish and submit the test?');
      if (confirmSubmit) submitQuiz();
    });

    DOM.quizNavToggleBtn.addEventListener('click', () => {
      DOM.quizDrawer.classList.toggle('open');
    });

    DOM.closeDrawerBtn.addEventListener('click', () => {
      DOM.quizDrawer.classList.remove('open');
    });

    // Review Filters
    DOM.reviewFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.reviewFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const record = state.history[0]; // Active review item
        if (record) renderDetailedReview(record, btn.dataset.filter);
      });
    });

    // History Re-open & Clear
    DOM.historyList.addEventListener('click', e => {
      const histId = e.target.getAttribute('data-review-history');
      if (histId) {
        const record = state.history.find(h => h.id === histId);
        if (record) displayAnalytics(record);
      }
    });

    DOM.clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear all local quiz attempt records?')) {
        state.history = [];
        localStorage.removeItem('prephub_history');
        renderHistory();
        renderDashboardPYQs();
        renderDashboardSections();
      }
    });
  }

  // Self-boot application
  window.addEventListener('DOMContentLoaded', init);

})();