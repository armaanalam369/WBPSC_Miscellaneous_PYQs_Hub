/**
 * Advanced Quiz Engine & UI Manager
 * Handles Dual-Indexed Routing, Timer Configurations (3 modes),
 * Multi-Option Shuffling, Off-Canvas Mobile Drawer, and Analytics.
 */

(function () {
  'use strict';

  const state = {
    theme: localStorage.getItem('prephub_theme') || 'light',
    history: JSON.parse(localStorage.getItem('prephub_history') || '[]'),
    activeQuiz: null,
    timerInterval: null,
    timeRemaining: 0
  };

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

  function init() {
    applyTheme(state.theme);
    validateQuestionBank();
    bindEvents();
    renderDashboardPYQs();
    renderDashboardSections();
    renderCustomBuilderOptions();
    renderHistory();
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.body.setAttribute('data-theme', theme);
    DOM.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('prephub_theme', theme);
  }

  function validateQuestionBank() {
    const total = QUESTION_BANK.length;
    const ids = new Set();
    let unique = true;
    let yearMap = {};

    ALL_YEARS.forEach(y => yearMap[y] = 0);

    for (let q of QUESTION_BANK) {
      if (ids.has(q.id)) unique = false;
      ids.add(q.id);
      if (yearMap[q.year] !== undefined) yearMap[q.year]++;
    }

    const allYearsHundred = ALL_YEARS.every(y => yearMap[y] === 100);

    if (total === 1500 && unique && allYearsHundred) {
      DOM.validationBadge.className = 'data-badge valid';
      DOM.validationBadge.textContent = '✓ 1,500 Questions Verified';
    } else {
      DOM.validationBadge.className = 'data-badge error';
      DOM.validationBadge.textContent = `! Audit Warning: ${total}/1500 Qs`;
    }
  }

  function switchView(viewName) {
    if (state.activeQuiz && viewName !== 'quiz') {
      const confirmed = confirm("A test is currently running. Leaving now will discard your responses. Confirm return to dashboard?");
      if (!confirmed) return;
      clearInterval(state.timerInterval);
      state.activeQuiz = null;
    }
    Object.keys(DOM.views).forEach(key => {
      DOM.views[key].classList.toggle('active', key === viewName);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderDashboardPYQs() {
    DOM.pyqGrid.innerHTML = '';
    ALL_YEARS.slice().reverse().forEach(year => {
      const best = state.history.filter(h => h.pyqYear === year).sort((a, b) => b.score - a.score)[0];
      const card = document.createElement('div');
      card.className = 'pyq-card';
      card.innerHTML = `
        <div>
          <div class="card-title-row">
            <h4>${year} PYQ Paper</h4>
            <span class="q-badge">100 Qs</span>
          </div>
          <div class="card-stats">
            <span>Status: ${best ? 'Attempted' : 'Fresh'}</span>
            <span>Best: ${best ? `${best.score}/100` : '--'}</span>
          </div>
        </div>
        <button class="primary-btn" data-start-pyq="${year}">Start Full Paper</button>
      `;
      DOM.pyqGrid.appendChild(card);
    });
  }

  function renderDashboardSections() {
    DOM.sectionGrid.innerHTML = '';
    ALL_SECTIONS.forEach(secName => {
      const count = QUESTION_BANK.filter(q => q.section === secName).length;
      const attempts = state.history.filter(h => h.sections && h.sections.includes(secName));
      const bestAcc = attempts.length > 0 ? Math.max(...attempts.map(a => a.accuracy)) : null;

      const card = document.createElement('div');
      card.className = 'section-card';
      card.innerHTML = `
        <div>
          <div class="card-title-row">
            <h4>${secName}</h4>
            <span class="q-badge">${count} Qs</span>
          </div>
          <div class="card-stats">
            <span>Attempts: ${attempts.length}</span>
            <span>Best: ${bestAcc !== null ? `${bestAcc.toFixed(1)}%` : '--'}</span>
          </div>
        </div>
        <button class="primary-btn" data-start-section="${secName}">Practice Module</button>
      `;
      DOM.sectionGrid.appendChild(card);
    });
  }

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

    updateCustomBuilderPool();
  }

  function updateCustomBuilderPool() {
    const selectedYears = Array.from(document.querySelectorAll('input[name="custom_year"]:checked')).map(el => parseInt(el.value));
    const selectedSecs = Array.from(document.querySelectorAll('input[name="custom_sec"]:checked')).map(el => el.value);

    const matches = QUESTION_BANK.filter(q => selectedYears.includes(q.year) && selectedSecs.includes(q.section)).length;
    DOM.availableCountHint.textContent = `Available matching questions: ${matches}`;

    Array.from(DOM.customQCount.options).forEach(opt => {
      if (opt.value !== 'all') {
        opt.disabled = parseInt(opt.value) > matches;
      }
    });

    return matches;
  }

  function startQuiz(config) {
    let pool = [...config.questions];

    if (config.randomizeQuestions) {
      shuffleArray(pool);
    }

    if (config.limit && config.limit < pool.length) {
      pool = pool.slice(0, config.limit);
    }

    // Preserve answer mapping during option shuffling
    const questions = pool.map(origQ => {
      const copy = { ...origQ };
      if (config.shuffleOptions) {
        const correctText = origQ.options[origQ.correctAnswer];
        const shuffled = [...origQ.options];
        shuffleArray(shuffled);
        copy.options = shuffled;
        copy.correctAnswer = shuffled.indexOf(correctText);
      }
      return copy;
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
      elapsedSeconds: 0
    };

    switchView('quiz');
    DOM.quizHeaderTitle.textContent = state.activeQuiz.title;
    renderQuestionGrid();
    setupTimer();
    renderCurrentQuestion();
  }

  function renderCurrentQuestion() {
    const quiz = state.activeQuiz;
    const q = quiz.questions[quiz.currentIndex];

    DOM.quizQuestionCounter.textContent = `Question ${quiz.currentIndex + 1} / ${quiz.questions.length}`;
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

    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((optText, idx) => {
      const div = document.createElement('div');
      div.className = 'option-item';
      if (quiz.userAnswers[quiz.currentIndex] === idx) {
        div.classList.add('selected');
      }
      div.innerHTML = `
        <span class="option-key">${letters[idx]}</span>
        <span>${optText}</span>
      `;
      div.addEventListener('click', () => {
        quiz.userAnswers[quiz.currentIndex] = idx;
        renderCurrentQuestion();
        renderQuestionGrid();
      });
      DOM.optionsContainer.appendChild(div);
    });

    DOM.btnPrev.disabled = quiz.currentIndex === 0;
    DOM.btnNext.textContent = quiz.currentIndex === quiz.questions.length - 1 ? 'Finish' : 'Next →';
    DOM.btnReview.textContent = quiz.flags[quiz.currentIndex] ? 'Unflag Review' : 'Mark for Review';
    DOM.btnReview.classList.toggle('warning', !quiz.flags[quiz.currentIndex]);

    const answered = quiz.userAnswers.filter(a => a !== null).length;
    DOM.answeredNavBadge.textContent = `${answered}/${quiz.questions.length}`;
    DOM.quizProgressFill.style.width = `${((quiz.currentIndex + 1) / quiz.questions.length) * 100}%`;

    const navBtns = DOM.questionGrid.querySelectorAll('.nav-grid-btn');
    navBtns.forEach((btn, i) => btn.classList.toggle('current', i === quiz.currentIndex));
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

  function setupTimer() {
    clearInterval(state.timerInterval);
    const quiz = state.activeQuiz;

    if (quiz.timerMode === 'none') {
      DOM.quizTimerDisplay.textContent = 'Untimed';
      state.timerInterval = setInterval(() => { quiz.elapsedSeconds++; }, 1000);
      return;
    }

    if (quiz.timerMode === 'test') {
      state.timeRemaining = quiz.totalDurationSeconds;
      paintTimer(state.timeRemaining);

      state.timerInterval = setInterval(() => {
        quiz.elapsedSeconds++;
        state.timeRemaining--;
        paintTimer(state.timeRemaining);

        if (state.timeRemaining <= 0) {
          clearInterval(state.timerInterval);
          alert('Test duration completed. Submitting automatically.');
          submitQuiz();
        }
      }, 1000);
    } else if (quiz.timerMode === 'question') {
      state.timeRemaining = quiz.durationPerQuestion;
      paintTimer(state.timeRemaining);

      state.timerInterval = setInterval(() => {
        quiz.elapsedSeconds++;
        state.timeRemaining--;
        paintTimer(state.timeRemaining);

        if (state.timeRemaining <= 0) {
          if (quiz.currentIndex < quiz.questions.length - 1) {
            quiz.currentIndex++;
            state.timeRemaining = quiz.durationPerQuestion;
            renderCurrentQuestion();
          } else {
            clearInterval(state.timerInterval);
            alert('Question timer expired! Submitting test.');
            submitQuiz();
          }
        }
      }, 1000);
    }
  }

  function paintTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    DOM.quizTimerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    DOM.quizTimerDisplay.classList.toggle('urgent', seconds < 60);
  }

  function submitQuiz() {
    clearInterval(state.timerInterval);
    const quiz = state.activeQuiz;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    const secStats = {};
    const yrStats = {};

    quiz.questions.forEach((q, i) => {
      const ans = quiz.userAnswers[i];
      const isAtt = ans !== null;
      const isCor = ans === q.correctAnswer;

      if (!isAtt) unanswered++;
      else if (isCor) correct++;
      else incorrect++;

      if (!secStats[q.section]) secStats[q.section] = { total: 0, attempted: 0, correct: 0, incorrect: 0 };
      secStats[q.section].total++;
      if (isAtt) {
        secStats[q.section].attempted++;
        if (isCor) secStats[q.section].correct++;
        else secStats[q.section].incorrect++;
      }

      if (!yrStats[q.year]) yrStats[q.year] = { total: 0, attempted: 0, correct: 0, incorrect: 0 };
      yrStats[q.year].total++;
      if (isAtt) {
        yrStats[q.year].attempted++;
        if (isCor) yrStats[q.year].correct++;
        else yrStats[q.year].incorrect++;
      }
    });

    const total = quiz.questions.length;
    const accuracy = (correct + incorrect) > 0 ? (correct / (correct + incorrect)) * 100 : 0;
    const avgSec = total > 0 ? (quiz.elapsedSeconds / total).toFixed(1) : 0;

    const record = {
      id: 'REC_' + Date.now(),
      title: quiz.title,
      pyqYear: quiz.pyqYear,
      sections: quiz.sections,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      total: total,
      attempted: correct + incorrect,
      correct: correct,
      incorrect: incorrect,
      unanswered: unanswered,
      score: correct,
      accuracy: accuracy,
      elapsedSeconds: quiz.elapsedSeconds,
      avgSecondsPerQ: avgSec,
      secBreakdown: secStats,
      yrBreakdown: yrStats,
      questions: quiz.questions,
      userAnswers: quiz.userAnswers
    };

    state.history.unshift(record);
    localStorage.setItem('prephub_history', JSON.stringify(state.history.slice(0, 50)));

    state.activeQuiz = null;
    showAnalytics(record);
    renderDashboardPYQs();
    renderDashboardSections();
    renderHistory();
  }

  function showAnalytics(rec) {
    DOM.resultTitle.textContent = `${rec.title} - Scorecard`;
    DOM.resultTimestamp.textContent = `Completed: ${rec.date}`;
    DOM.statScore.textContent = `${rec.correct} / ${rec.total}`;
    DOM.statAccuracy.textContent = `${rec.accuracy.toFixed(1)}%`;
    DOM.statTime.textContent = formatSec(rec.elapsedSeconds);
    DOM.statAvgTime.textContent = `${rec.avgSecondsPerQ}s`;

    DOM.metricCorrect.textContent = rec.correct;
    DOM.metricIncorrect.textContent = rec.incorrect;
    DOM.metricUnanswered.textContent = rec.unanswered;

    DOM.sectionBreakdownTbody.innerHTML = '';
    Object.keys(rec.secBreakdown).sort().forEach(sec => {
      const item = rec.secBreakdown[sec];
      const acc = item.attempted > 0 ? ((item.correct / item.attempted) * 100).toFixed(1) + '%' : '0.0%';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${sec}</strong></td>
        <td>${item.total}</td>
        <td>${item.attempted}</td>
        <td style="color: var(--success); font-weight: 600;">${item.correct}</td>
        <td style="color: var(--danger); font-weight: 600;">${item.incorrect}</td>
        <td><strong>${acc}</strong></td>
      `;
      DOM.sectionBreakdownTbody.appendChild(tr);
    });

    DOM.yearBreakdownTbody.innerHTML = '';
    Object.keys(rec.yrBreakdown).sort().forEach(yr => {
      const item = rec.yrBreakdown[yr];
      const acc = item.attempted > 0 ? ((item.correct / item.attempted) * 100).toFixed(1) + '%' : '0.0%';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${yr} PYQ</strong></td>
        <td>${item.total}</td>
        <td>${item.attempted}</td>
        <td style="color: var(--success); font-weight: 600;">${item.correct}</td>
        <td style="color: var(--danger); font-weight: 600;">${item.incorrect}</td>
        <td><strong>${acc}</strong></td>
      `;
      DOM.yearBreakdownTbody.appendChild(tr);
    });

    DOM.btnGoReview.onclick = () => showReview(rec);
    switchView('analytics');
  }

  function showReview(rec, filter = 'all') {
    DOM.reviewTitle.textContent = `${rec.title} - Solutions Review`;
    DOM.reviewQuestionsList.innerHTML = '';

    rec.questions.forEach((q, idx) => {
      const userAns = rec.userAnswers[idx];
      const isCor = userAns === q.correctAnswer;
      const isUn = userAns === null;

      let status = isUn ? 'unanswered' : (isCor ? 'correct' : 'incorrect');
         if (filter !== 'all' && filter !== status) return;

      const card = document.createElement('div');
      card.className = `review-card ${status}`;

      const userText = isUn ? 'None (Unanswered)' : q.options[userAns];
      const corText = q.options[q.correctAnswer];

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
          <div>Your Choice: <strong style="color: ${isCor ? 'var(--success)' : 'var(--danger)'};">${userText}</strong></div>
          <div>Correct Answer: <strong style="color: var(--success);">${corText}</strong></div>
        </div>
        <div class="explanation-box">
          <strong>Explanation:</strong> ${q.explanation}
        </div>
      `;
      DOM.reviewQuestionsList.appendChild(card);
    });

    switchView('review');
  }

  function renderHistory() {
    DOM.historyList.innerHTML = '';
    if (state.history.length === 0) {
      DOM.historyList.innerHTML = '<p class="subtext">No tests completed yet.</p>';
      return;
    }

    state.history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'pyq-card';
      div.style.marginBottom = '10px';
      div.innerHTML = `
        <div class="card-title-row">
          <h4>${item.title}</h4>
          <span class="q-badge">${item.score}/${item.total} (${item.accuracy.toFixed(1)}%)</span>
        </div>
        <div class="card-stats">
          <span>${item.date}</span>
          <span>Time: ${formatSec(item.elapsedSeconds)}</span>
        </div>
        <button class="secondary-btn" data-review-history="${item.id}">View Analysis</button>
      `;
      DOM.historyList.appendChild(div);
    });
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function formatSec(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  }

  function bindEvents() {
    DOM.themeBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'light' ? 'dark' : 'light');
    });

    DOM.homeBtn.addEventListener('click', () => switchView('dashboard'));
    DOM.btnFinishDashboard.addEventListener('click', () => switchView('dashboard'));
    DOM.btnBackToAnalytics.addEventListener('click', () => switchView('analytics'));

    DOM.tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.tabs.forEach(b => b.classList.remove('active'));
        DOM.tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    DOM.pyqGrid.addEventListener('click', e => {
      const yr = e.target.getAttribute('data-start-pyq');
      if (yr) {
        const yearInt = parseInt(yr);
        const questions = QUESTION_BANK.filter(q => q.year === yearInt).sort((a, b) => a.originalNumber - b.originalNumber);
        startQuiz({
          title: `${yearInt} Full PYQ Paper`,
          pyqYear: yearInt,
          questions: questions,
          limit: 100,
          randomizeQuestions: false,
          shuffleOptions: false,
          timerMode: 'test',
          totalDurationSeconds: 90 * 60
        });
      }
    });

    DOM.sectionGrid.addEventListener('click', e => {
      const sec = e.target.getAttribute('data-start-section');
      if (sec) {
        const questions = QUESTION_BANK.filter(q => q.section === sec);
        startQuiz({
          title: `${sec} Practice Module`,
          sections: [sec],
          questions: questions,
          limit: questions.length,
          randomizeQuestions: true,
          shuffleOptions: true,
          timerMode: 'none'
        });
      }
    });

    DOM.builderForm.addEventListener('change', updateCustomBuilderPool);

    document.getElementById('select-all-years').addEventListener('click', () => {
      document.querySelectorAll('input[name="custom_year"]').forEach(i => i.checked = true);
      updateCustomBuilderPool();
    });
    document.getElementById('clear-all-years').addEventListener('click', () => {
      document.querySelectorAll('input[name="custom_year"]').forEach(i => i.checked = false);
      updateCustomBuilderPool();
    });

    document.getElementById('select-all-sections').addEventListener('click', () => {
      document.querySelectorAll('input[name="custom_sec"]').forEach(i => i.checked = true);
      updateCustomBuilderPool();
    });
    document.getElementById('clear-all-sections').addEventListener('click', () => {
      document.querySelectorAll('input[name="custom_sec"]').forEach(i => i.checked = false);
      updateCustomBuilderPool();
    });

    DOM.customTimerMode.addEventListener('change', () => {
      const mode = DOM.customTimerMode.value;
      DOM.timerDurationGroup.style.display = mode === 'none' ? 'none' : 'block';
      DOM.customTimerVal.innerHTML = '';

      if (mode === 'test') {
        const times = [
          { label: '10 Minutes', val: 600 },
          { label: '20 Minutes', val: 1200 },
          { label: '30 Minutes', val: 1800 },
          { label: '45 Minutes', val: 2700 },
          { label: '60 Minutes', val: 3600 },
          { label: '90 Minutes (Full Standard)', val: 5400 }
        ];
        times.forEach(t => {
          DOM.customTimerVal.innerHTML += `<option value="${t.val}">${t.label}</option>`;
        });
      } else if (mode === 'question') {
        [15, 30, 45, 60, 90, 120].forEach(t => {
          DOM.customTimerVal.innerHTML += `<option value="${t}">${t} Seconds</option>`;
        });
      }
    });

    DOM.builderForm.addEventListener('submit', e => {
      e.preventDefault();
      const years = Array.from(document.querySelectorAll('input[name="custom_year"]:checked')).map(el => parseInt(el.value));
      const secs = Array.from(document.querySelectorAll('input[name="custom_sec"]:checked')).map(el => el.value);

      if (years.length === 0 || secs.length === 0) {
        alert('Please choose at least one PYQ year and one subject section.');
        return;
      }

      const match = QUESTION_BANK.filter(q => years.includes(q.year) && secs.includes(q.section));
      if (match.length === 0) {
        alert('No questions match this combination.');
        return;
      }

      const count = DOM.customQCount.value === 'all' ? match.length : parseInt(DOM.customQCount.value);

      startQuiz({
        title: `Custom Test (${secs.length} Sections, ${years.length} Years)`,
        questions: match,
        limit: Math.min(count, match.length),
        randomizeQuestions: DOM.customOrder.value === 'random',
        shuffleOptions: DOM.customShuffleOptions.checked,
        timerMode: DOM.customTimerMode.value,
        totalDurationSeconds: DOM.customTimerMode.value === 'test' ? (parseInt(DOM.customTimerVal.value) || 0) : 0,
        durationPerQuestion: DOM.customTimerMode.value === 'question' ? (parseInt(DOM.customTimerVal.value) || 0) : 0
      });
    });

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
        if (confirm('Submit test and compute scorecard?')) submitQuiz();
      }
    });

    DOM.btnClear.addEventListener('click', () => {
      if (state.activeQuiz) {
        state.activeQuiz.userAnswers[state.activeQuiz.currentIndex] = null;
        renderCurrentQuestion();
        renderQuestionGrid();
      }
    });

    DOM.btnReview.addEventListener('click', () => {
      if (state.activeQuiz) {
        state.activeQuiz.flags[state.activeQuiz.currentIndex] = !state.activeQuiz.flags[state.activeQuiz.currentIndex];
        renderCurrentQuestion();
        renderQuestionGrid();
      }
    });

    DOM.btnSubmit.addEventListener('click', () => {
      if (confirm('Are you sure you want to finish and submit the test?')) submitQuiz();
    });

    DOM.quizNavToggleBtn.addEventListener('click', () => {
      DOM.quizDrawer.classList.toggle('open');
    });

    DOM.closeDrawerBtn.addEventListener('click', () => {
      DOM.quizDrawer.classList.remove('open');
    });

    DOM.reviewFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.reviewFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (state.history[0]) showReview(state.history[0], btn.dataset.filter);
      });
    });

    DOM.historyList.addEventListener('click', e => {
      const id = e.target.getAttribute('data-review-history');
      if (id) {
        const item = state.history.find(h => h.id === id);
        if (item) showAnalytics(item);
      }
    });

    DOM.clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Delete all test attempt history?')) {
        state.history = [];
        localStorage.removeItem('prephub_history');
        renderHistory();
        renderDashboardPYQs();
        renderDashboardSections();
      }
    });
  }

  window.addEventListener('DOMContentLoaded', init);
})();