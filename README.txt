MISC PYQ QUIZ BANK — HOW IT WORKS
==================================

FILES
-----
index.html        The app shell. You should never need to edit this.
style.css         All visual styling (light + dark mode). Never need to edit this.
app.js            The whole engine — dashboard, quizzes, timers, results,
                   review, history. Never need to edit this.
data/manifest.js  The ONLY file whose CONTENT you edit regularly.
data/2001.js      One file per year. Currently 2001, 2002, and 2023 are
data/2002.js      filled with SAMPLE / MOCK questions so you can test the
data/2023.js      whole app immediately.

HOW PYQ-WISE AND SECTION-WISE BOTH WORK FROM ONE ADD
-----------------------------------------------------
Every question you add carries its own "section" field (one of the 14
fixed subjects). The app builds both views live from the same pool:
  - "PYQ Tests" groups questions by year.
  - "Section-Wise Practice" groups the SAME questions by subject,
    pulled from every year that's been added.
You never enter a question twice — adding it once to its year's file
makes it appear in both places automatically.

ADDING A NEW YEAR'S PAPER (e.g. 2024)
--------------------------------------
1. Send me (Claude) the new PDF. I'll sort it into the 14 sections and
   hand you back a file named data/2024.js in the exact same format as
   the existing year files.
2. Open data/manifest.js and add "2024" to the PYQ_YEARS list.
3. Upload data/2024.js and the updated data/manifest.js to your GitHub
   repo (or wherever you're hosting the site), replacing the old
   manifest.js. Nothing else needs to be touched.

That's it — the dashboard, the section pages, the custom test builder,
analytics, and repeat-question detection all update automatically.

REPLACING THE SAMPLE DATA WITH YOUR REAL 2001/2002/2023 PAPERS
-----------------------------------------------------------------
data/2001.js, data/2002.js, and data/2023.js currently hold demo
questions so the app works out of the box. When you're ready, just ask
me for the real 100-question file for any year (I already have all 15
years analysed and sorted into the 14 sections from your PDFs) and
I'll hand you a replacement file in this exact format — you upload it
over the sample one.

THE QUESTION FORMAT (for reference)
-------------------------------------
registerPYQ("2024", [
  {
    originalNumber: 1,
    section: "Ancient History",     // must match one of the 14 names exactly
    question: "Question text here",
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctAnswer: 0,               // 0-3, index into options
    explanation: "Why this is correct",
    difficulty: "Medium"            // optional
  },
  // ... 99 more
]);

WHAT'S ALREADY BUILT
---------------------
- Full-paper tests per year, and pooled tests per section
- Custom Test Builder (pick years + sections + question count)
- No Timer / Per-Question Timer / Per-Test Timer, all with auto-advance
  or auto-submit on expiry
- Question navigator (answered / unanswered / marked / current)
- Overall + section-wise + year-wise results after every test
- Full answer review with explanations and source (year + Q number)
- Automatic 🔁 repeat-question detection across years
- Dark/light mode (saved) and full mobile responsiveness
- Test history saved in the browser (localStorage) — no backend needed
- Basic data validation (console warning if a question file has a
  typo, wrong section name, missing option, etc.)

HOSTING
-------
Upload the whole folder (keeping the data/ subfolder) to GitHub Pages,
exactly like your existing sites. Opening index.html directly in a
browser also works for quick local testing.
