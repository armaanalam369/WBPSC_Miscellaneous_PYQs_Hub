/* ============================================================
   PYQ QUIZ ENGINE
   You should never need to edit this file when adding a new
   year's paper. See data/manifest.js + README.txt for that.
   ============================================================ */

const SECTIONS = [
  "Ancient History", "Medieval History", "Modern History",
  "Indian Geography", "West Bengal Geography", "Arts & Culture",
  "Indian Polity", "Indian Economy", "Physics", "Chemistry",
  "Biology", "Static GK", "Current Affairs", "Mathematics"
];

const ALL_QUESTIONS = [];
const HISTORY_KEY = "pyq_history_v1";
const THEME_KEY = "pyq_theme_v1";

/* ---------- 1. DATA REGISTRATION (called by each data/<year>.js file) ---------- */
function registerPYQ(year, questions) {
  questions.forEach((q, i) => {
    const originalNumber = q.originalNumber || (i + 1);
    ALL_QUESTIONS.push({
      id: `${year}-Q${String(originalNumber).padStart(3, "0")}`,
      year: parseInt(year, 10),
      originalNumber,
      section: q.section,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
      difficulty: q.difficulty || "Medium",
      repeats: []
    });
  });
}

/* ---------- 2. DYNAMIC LOADER — reads data/manifest.js's PYQ_YEARS list ---------- */
function loadDataFiles(years, done) {
  let i = 0;
  function next() {
    if (i >= years.length) return done();
    const s = document.createElement("script");
    s.src = `data/${years[i]}.js`;
    s.onload = () => { i++; next(); };
    s.onerror = () => { console.error("Could not load data file for year", years[i]); i++; next(); };
    document.head.appendChild(s);
  }
  next();
}

/* ---------- 3. REPEAT DETECTION ---------- */
function normalize(t) {
  return (t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function detectRepeats() {
  const byText = new Map();
  ALL_QUESTIONS.forEach(q => {
    const key = normalize(q.question);
    if (!byText.has(key)) byText.set(key, []);
    byText.get(key).push(q);
  });
  byText.forEach(group => {
    if (group.length > 1) {
      group.forEach(q => {
        q.repeats = group.filter(o => o.id !== q.id).map(o => ({ year: o.year, originalNumber: o.originalNumber }));
      });
    }
  });
}

/* ---------- 4. VALIDATION (section 25 of the spec) ---------- */
function validateDataset() {
  const issues = [];
  const seenIds = new Set();
  ALL_QUESTIONS.forEach(q => {
    if (seenIds.has(q.id)) issues.push(`Duplicate id ${q.id}`);
    seenIds.add(q.id);
    if (!SECTIONS.includes(q.section)) issues.push(`${q.id}: unknown section "${q.section}"`);
    if (!Array.isArray(q.options) || q.options.length !== 4) issues.push(`${q.id}: does not have exactly 4 options`);
    if (typeof q.correctAnswer !== "number" || q.correctAnswer < 0 || q.correctAnswer > 3) issues.push(`${q.id}: invalid correctAnswer`);
  });
  const perYear = {};
  ALL_QUESTIONS.forEach(q => { perYear[q.year] = (perYear[q.year] || 0) + 1; });
  if (issues.length) {
    console.warn("Data validation issues:", issues);
    const banner = document.getElementById("data-warning");
    banner.textContent = `⚠ ${issues.length} data issue(s) found — open the browser console for details.`;
    banner.classList.remove("hidden");
  }
  return { issues, perYear };
}

/* ---------- 5. STORAGE HELPERS ---------- */
function getHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; } }
function saveAttempt(record) {
  const h = getHistory();
  h.unshift(record);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}
function getTheme() { return localStorage.getItem(THEME_KEY) || "light"; }
function setTheme(t) { localStorage.setItem(THEME_KEY, t); applyTheme(t); }
function applyTheme(t) {
  document.body.classList.toggle("dark", t === "dark");
  document.getElementById("theme-toggle").textContent = t === "dark" ? "Light mode" : "Dark mode";
}

/* ---------- 6. VIEW SWITCHING ---------- */
let activeQuiz = null; // guards navigation away from an in-progress test

function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(`view-${name}`).classList.remove("hidden");
  window.scrollTo(0, 0);
}
function goHome() {
  if (activeQuiz && !confirm("Leave this test now? Your progress on this attempt will be lost.")) return;
  activeQuiz = null;
  renderDashboard();
  showView("dashboard");
}
window.addEventListener("beforeunload", (e) => {
  if (activeQuiz) { e.preventDefault(); e.returnValue = ""; }
});

/* ---------- 7. DASHBOARD ---------- */
function renderDashboard() {
  const years = [...new Set(ALL_QUESTIONS.map(q => q.year))].sort((a, b) => a - b);
  const history = getHistory();

  const yearCards = years.map(y => {
    const total = ALL_QUESTIONS.filter(q => q.year === y).length;
    const attempts = history.filter(h => h.type === "pyq" && h.year === y);
    const best = attempts.length ? Math.max(...attempts.map(a => a.scorePercent)) : null;
    return `
      <div class="card">
        <h3>${y} PYQ</h3>
        <p class="meta">${total} Questions</p>
        <p class="meta">${attempts.length ? `Best: ${best}% · ${attempts.length} attempt(s)` : "Not attempted yet"}</p>
        <button class="btn" onclick="startPYQTest(${y})">Start Test</button>
      </div>`;
  }).join("");

  const sectionCards = SECTIONS.map(s => {
    const total = ALL_QUESTIONS.filter(q => q.section === s).length;
    const relevant = history.filter(h => h.sectionBreakdown && h.sectionBreakdown[s]);
    let attempted = 0, correct = 0;
    relevant.forEach(h => { attempted += h.sectionBreakdown[s].attempted; correct += h.sectionBreakdown[s].correct; });
    const accuracy = attempted ? Math.round((correct / attempted) * 100) : null;
    const singleSectionAttempts = history.filter(h => h.type === "section" && h.sections.length === 1 && h.sections[0] === s);
    const best = singleSectionAttempts.length ? Math.max(...singleSectionAttempts.map(a => a.scorePercent)) : null;
    return `
      <div class="card">
        <h3>${s}</h3>
        <p class="meta">${total} available${total === 0 ? " (no data yet)" : ""}</p>
        <p class="meta">${accuracy !== null ? `Accuracy: ${accuracy}%` : "No attempts yet"}${best !== null ? ` · Best: ${best}%` : ""}</p>
        <button class="btn" ${total === 0 ? "disabled" : ""} onclick="startSectionTest('${s.replace(/'/g, "\\'")}')">Start Test</button>
      </div>`;
  }).join("");

  document.getElementById("pyq-cards").innerHTML = yearCards || "<p class='meta'>No PYQ data loaded yet.</p>";
  document.getElementById("section-cards").innerHTML = sectionCards;
}

/* ---------- 8. STARTING A TEST ---------- */
let pendingTest = null;

function startPYQTest(year) {
  const pool = ALL_QUESTIONS.filter(q => q.year === year).sort((a, b) => a.originalNumber - b.originalNumber);
  pendingTest = { type: "pyq", name: `${year} PYQ`, year, sections: [...new Set(pool.map(q => q.section))], pool, order: "original", shuffleOptions: false };
  openTestConfig();
}
function startSectionTest(section) {
  const pool = ALL_QUESTIONS.filter(q => q.section === section);
  pendingTest = { type: "section", name: `Section: ${section}`, sections: [section], pool, order: "original", shuffleOptions: false };
  openTestConfig();
}
function startCustomTest() {
  const yearBoxes = [...document.querySelectorAll(".custom-year:checked")].map(el => parseInt(el.value, 10));
  const sectionBoxes = [...document.querySelectorAll(".custom-section:checked")].map(el => el.value);
  if (!yearBoxes.length || !sectionBoxes.length) { alert("Pick at least one year and one section."); return; }
  let pool = ALL_QUESTIONS.filter(q => yearBoxes.includes(q.year) && sectionBoxes.includes(q.section));
  if (!pool.length) { alert("No questions match that combination."); return; }
  const countSel = document.getElementById("custom-count").value;
  let count = countSel === "all" ? pool.length : Math.min(parseInt(countSel, 10), pool.length);
  pendingTest = { type: "custom", name: "Custom Test", years: yearBoxes, sections: sectionBoxes, pool, count, order: "random", shuffleOptions: true };
  openTestConfig();
}

function renderCustomBuilder() {
  const years = [...new Set(ALL_QUESTIONS.map(q => q.year))].sort((a, b) => a - b);
  document.getElementById("custom-years").innerHTML = years.map(y =>
    `<label class="chip"><input type="checkbox" class="custom-year" value="${y}" checked> ${y}</label>`).join("");
  document.getElementById("custom-sections").innerHTML = SECTIONS.map(s =>
    `<label class="chip"><input type="checkbox" class="custom-section" value="${s}" checked> ${s}</label>`).join("");
}

/* ---------- 9. TEST CONFIG (order / shuffle / timer) ---------- */
function openTestConfig() {
  const availableCount = pendingTest.count || pendingTest.pool.length;
  document.getElementById("config-title").textContent = pendingTest.name;
  document.getElementById("config-meta").textContent = `${pendingTest.pool.length} question(s) available`;
  document.getElementById("config-order").value = pendingTest.order;
  document.getElementById("config-shuffle").checked = pendingTest.shuffleOptions;
  document.getElementById("config-count").value = pendingTest.count || pendingTest.pool.length;
  document.getElementById("config-count").max = pendingTest.pool.length;
  document.getElementById("timer-mode").value = "none";
  toggleTimerFields();
  showView("testconfig");
}
function toggleTimerFields() {
  const mode = document.getElementById("timer-mode").value;
  document.getElementById("per-question-fields").classList.toggle("hidden", mode !== "perQuestion");
  document.getElementById("per-test-fields").classList.toggle("hidden", mode !== "perTest");
}

function launchTest() {
  const order = document.getElementById("config-order").value;
  const shuffleOptions = document.getElementById("config-shuffle").checked;
  const count = Math.min(parseInt(document.getElementById("config-count").value, 10) || pendingTest.pool.length, pendingTest.pool.length);
  const timerMode = document.getElementById("timer-mode").value;

  let pool = [...pendingTest.pool];
  if (order === "random") pool = pool.sort(() => Math.random() - 0.5);
  pool = pool.slice(0, count);

  const questions = pool.map(q => {
    const copy = { ...q, origIndex: q.correctAnswer, options: [...q.options] };
    if (shuffleOptions) {
      const idx = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      copy.options = idx.map(i => q.options[i]);
      copy.correctAnswer = idx.indexOf(q.correctAnswer);
    }
    return copy;
  });

  let timerSeconds = null, perQuestionSeconds = null;
  if (timerMode === "perTest") {
    const sel = document.getElementById("per-test-select").value;
    const mins = sel === "custom" ? parseInt(document.getElementById("per-test-custom").value, 10) : parseInt(sel, 10);
    timerSeconds = (mins || 30) * 60;
  } else if (timerMode === "perQuestion") {
    const sel = document.getElementById("per-question-select").value;
    perQuestionSeconds = sel === "custom" ? parseInt(document.getElementById("per-question-custom").value, 10) : parseInt(sel, 10);
    perQuestionSeconds = perQuestionSeconds || 30;
  }

  activeQuiz = {
    meta: pendingTest,
    questions,
    index: 0,
    answers: {},
    marked: {},
    timerMode,
    timerSeconds,
    perQuestionSeconds,
    timeLeft: timerMode === "perTest" ? timerSeconds : perQuestionSeconds,
    startTime: Date.now(),
    intervalId: null
  };
  startTimerLoop();
  renderQuiz();
  showView("quiz");
}

/* ---------- 10. QUIZ ENGINE ---------- */
function startTimerLoop() {
  clearInterval(activeQuiz.intervalId);
  if (activeQuiz.timerMode === "none") { document.getElementById("quiz-timer").textContent = ""; return; }
  activeQuiz.intervalId = setInterval(() => {
    activeQuiz.timeLeft--;
    updateTimerDisplay();
    if (activeQuiz.timeLeft <= 0) {
      if (activeQuiz.timerMode === "perQuestion") {
        goToQuestion(activeQuiz.index + 1, true);
      } else {
        submitTest();
      }
    }
  }, 1000);
}
function updateTimerDisplay() {
  const el = document.getElementById("quiz-timer");
  if (activeQuiz.timerMode === "none") { el.textContent = ""; return; }
  const t = Math.max(0, activeQuiz.timeLeft);
  const m = String(Math.floor(t / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");
  el.textContent = `⏱ ${m}:${s}`;
  el.classList.toggle("timer-low", t <= 10);
}

function renderQuiz() {
  const q = activeQuiz.questions[activeQuiz.index];
  document.getElementById("quiz-progress-label").textContent = `Question ${activeQuiz.index + 1} of ${activeQuiz.questions.length}`;
  document.getElementById("quiz-progress-bar-fill").style.width = `${((activeQuiz.index + 1) / activeQuiz.questions.length) * 100}%`;
  document.getElementById("quiz-section-tag").textContent = `${q.section} · ${q.year} PYQ Q${q.originalNumber}`;
  document.getElementById("quiz-question").textContent = q.question;

  const chosen = activeQuiz.answers[q.id];
  document.getElementById("quiz-options").innerHTML = q.options.map((opt, i) => `
    <button class="option ${chosen === i ? "selected" : ""}" onclick="selectOption(${i})">${opt}</button>
  `).join("");

  document.getElementById("mark-btn").textContent = activeQuiz.marked[q.id] ? "Unmark Review" : "Mark for Review";
  document.getElementById("prev-btn").disabled = activeQuiz.index === 0;
  document.getElementById("next-btn").textContent = activeQuiz.index === activeQuiz.questions.length - 1 ? "Finish" : "Next";

  renderNavigator();
  if (activeQuiz.timerMode === "perQuestion") {
    activeQuiz.timeLeft = activeQuiz.perQuestionSeconds;
  }
  updateTimerDisplay();
}
function renderNavigator() {
  document.getElementById("quiz-nav").innerHTML = activeQuiz.questions.map((q, i) => {
    let cls = "nav-cell";
    if (i === activeQuiz.index) cls += " current";
    else if (activeQuiz.marked[q.id]) cls += " marked";
    else if (activeQuiz.answers[q.id] !== undefined) cls += " answered";
    else cls += " unanswered";
    return `<button class="${cls}" onclick="goToQuestion(${i})">${i + 1}</button>`;
  }).join("");
}
function selectOption(i) {
  const q = activeQuiz.questions[activeQuiz.index];
  activeQuiz.answers[q.id] = i;
  renderQuiz();
}
function clearAnswer() {
  const q = activeQuiz.questions[activeQuiz.index];
  delete activeQuiz.answers[q.id];
  renderQuiz();
}
function toggleMark() {
  const q = activeQuiz.questions[activeQuiz.index];
  activeQuiz.marked[q.id] = !activeQuiz.marked[q.id];
  renderQuiz();
}
function goToQuestion(i, fromTimeout) {
  if (i >= activeQuiz.questions.length) { submitTest(); return; }
  if (i < 0) return;
  activeQuiz.index = i;
  renderQuiz();
}
function nextOrFinish() {
  if (activeQuiz.index === activeQuiz.questions.length - 1) {
    if (confirm("Submit the test now?")) submitTest();
  } else {
    goToQuestion(activeQuiz.index + 1);
  }
}

/* ---------- 11. RESULTS ---------- */
function submitTest() {
  clearInterval(activeQuiz.intervalId);
  const timeTakenSec = Math.round((Date.now() - activeQuiz.startTime) / 1000);
  const qs = activeQuiz.questions;
  let correct = 0, attempted = 0;
  const sectionBreakdown = {}, yearBreakdown = {};

  qs.forEach(q => {
    const ans = activeQuiz.answers[q.id];
    const isAttempted = ans !== undefined;
    const isCorrect = isAttempted && ans === q.correctAnswer;
    if (isAttempted) attempted++;
    if (isCorrect) correct++;

    sectionBreakdown[q.section] = sectionBreakdown[q.section] || { total: 0, attempted: 0, correct: 0 };
    sectionBreakdown[q.section].total++;
    if (isAttempted) sectionBreakdown[q.section].attempted++;
    if (isCorrect) sectionBreakdown[q.section].correct++;

    yearBreakdown[q.year] = yearBreakdown[q.year] || { total: 0, attempted: 0, correct: 0 };
    yearBreakdown[q.year].total++;
    if (isAttempted) yearBreakdown[q.year].attempted++;
    if (isCorrect) yearBreakdown[q.year].correct++;
  });

  const record = {
    id: Date.now(),
    date: new Date().toISOString(),
    testName: activeQuiz.meta.name,
    type: activeQuiz.meta.type,
    year: activeQuiz.meta.year,
    sections: activeQuiz.meta.sections,
    questionIds: qs.map(q => q.id),
    answers: activeQuiz.answers,
    marked: activeQuiz.marked,
    optionOrder: qs.map(q => ({ id: q.id, options: q.options, correctAnswer: q.correctAnswer })),
    totalQuestions: qs.length,
    attempted,
    correct,
    incorrect: attempted - correct,
    unanswered: qs.length - attempted,
    scorePercent: Math.round((correct / qs.length) * 100),
    timeTakenSec,
    avgTimeSec: Math.round(timeTakenSec / qs.length),
    sectionBreakdown,
    yearBreakdown
  };
  saveAttempt(record);
  activeQuiz.lastRecord = record;
  renderResults(record);
  showView("results");
  activeQuiz = null; // test is over, safe to navigate away now
}

function renderResults(record) {
  document.getElementById("results-title").textContent = record.testName;
  document.getElementById("results-overall").innerHTML = `
    <div class="stat"><span class="stat-num">${record.scorePercent}%</span><span class="stat-label">Score</span></div>
    <div class="stat"><span class="stat-num">${record.correct}/${record.totalQuestions}</span><span class="stat-label">Correct</span></div>
    <div class="stat"><span class="stat-num">${record.incorrect}</span><span class="stat-label">Incorrect</span></div>
    <div class="stat"><span class="stat-num">${record.unanswered}</span><span class="stat-label">Unanswered</span></div>
    <div class="stat"><span class="stat-num">${Math.floor(record.timeTakenSec / 60)}m ${record.timeTakenSec % 60}s</span><span class="stat-label">Time Taken</span></div>
    <div class="stat"><span class="stat-num">${record.avgTimeSec}s</span><span class="stat-label">Avg / Question</span></div>
  `;

  const secKeys = Object.keys(record.sectionBreakdown);
  document.getElementById("results-section-wrap").classList.toggle("hidden", secKeys.length <= 1);
  if (secKeys.length > 1) {
    document.getElementById("results-section-table").innerHTML = `
      <tr><th>Section</th><th>Total</th><th>Attempted</th><th>Correct</th><th>Accuracy</th></tr>
      ${secKeys.map(s => {
        const b = record.sectionBreakdown[s];
        const acc = b.attempted ? Math.round((b.correct / b.attempted) * 100) : 0;
        return `<tr><td>${s}</td><td>${b.total}</td><td>${b.attempted}</td><td>${b.correct}</td><td>${acc}%</td></tr>`;
      }).join("")}`;
  }

  const yearKeys = Object.keys(record.yearBreakdown);
  document.getElementById("results-year-wrap").classList.toggle("hidden", yearKeys.length <= 1);
  if (yearKeys.length > 1) {
    document.getElementById("results-year-table").innerHTML = `
      <tr><th>Year</th><th>Total</th><th>Attempted</th><th>Correct</th><th>Accuracy</th></tr>
      ${yearKeys.map(y => {
        const b = record.yearBreakdown[y];
        const acc = b.attempted ? Math.round((b.correct / b.attempted) * 100) : 0;
        return `<tr><td>${y}</td><td>${b.total}</td><td>${b.attempted}</td><td>${b.correct}</td><td>${acc}%</td></tr>`;
      }).join("")}`;
  }

  window.currentReviewRecord = record;
}

/* ---------- 12. REVIEW ---------- */
function openReview(record) {
  record = record || window.currentReviewRecord;
  window.currentReviewRecord = record;
  const rows = record.questionIds.map(id => {
    const q = ALL_QUESTIONS.find(x => x.id === id);
    const opt = record.optionOrder.find(o => o.id === id);
    if (!q || !opt) return "";
    const userAns = record.answers[id];
    const status = userAns === undefined ? "unanswered" : (userAns === opt.correctAnswer ? "correct" : "incorrect");
    return `
      <div class="review-item ${status}">
        <p class="meta">${q.section} · ${q.year} PYQ, Q${q.originalNumber}${q.repeats && q.repeats.length ? ` · 🔁 also appears in ${q.repeats.map(r => r.year).join(", ")}` : ""}</p>
        <p class="review-q">${q.question}</p>
        ${opt.options.map((o, i) => {
          let cls = "review-opt";
          if (i === opt.correctAnswer) cls += " correct";
          else if (i === userAns) cls += " incorrect";
          return `<div class="${cls}">${o}</div>`;
        }).join("")}
        <p class="review-status">${status === "unanswered" ? "Not answered" : status === "correct" ? "Correct" : "Incorrect"}</p>
        ${q.explanation ? `<p class="review-explain"><strong>Explanation:</strong> ${q.explanation}</p>` : ""}
      </div>`;
  }).join("");
  document.getElementById("review-title").textContent = `Review — ${record.testName}`;
  document.getElementById("review-list").innerHTML = rows;
  showView("review");
}

/* ---------- 13. HISTORY ---------- */
function renderHistory() {
  const h = getHistory();
  document.getElementById("history-list").innerHTML = h.length ? h.map(r => `
    <div class="card history-card">
      <h3>${r.testName}</h3>
      <p class="meta">${new Date(r.date).toLocaleString()}</p>
      <p class="meta">Score: ${r.scorePercent}% · ${r.correct}/${r.totalQuestions} correct · ${Math.floor(r.timeTakenSec/60)}m ${r.timeTakenSec%60}s</p>
      <button class="btn" onclick='reopenHistory(${r.id})'>View Details</button>
    </div>
  `).join("") : "<p class='meta'>No attempts yet.</p>";
}
function reopenHistory(id) {
  const r = getHistory().find(x => x.id === id);
  if (!r) return;
  renderResults(r);
  showView("results");
}

/* ---------- 14. INIT ---------- */
function initApp() {
  applyTheme(getTheme());
  loadDataFiles(PYQ_YEARS, () => {
    detectRepeats();
    validateDataset();
    renderDashboard();
    renderCustomBuilder();
    showView("dashboard");
  });
}
document.addEventListener("DOMContentLoaded", initApp);
