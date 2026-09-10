# NUR2460 Adaptive · Exam 2

An offline-capable, interactive nursing quiz with **252 original ATI-/NCLEX-style practice questions**, option-level rationales, and source references. Educational practice only, with no official affiliation, calibrated difficulty, or pass prediction. The bank needs independent nursing-educator review before use beyond personal study.

## Open the quiz

**[Take the quiz online](https://sleepyius.github.io/NUR2460-Adaptive/)** — no GitHub account or download required. Share this website link with other learners, rather than the repository's `index.html` file view.

Select an answer and confidence level, then submit. Answers lock on submission. Press Continue when ready. Each learner's progress stays in their own browser; scores are not sent to the repository owner or shared with other learners.

Optional statistics, adaptation help, sources, and scoring details are tucked into **Progress & quiz info**, collapsed by default. It sits below the question on smaller screens so it does not crowd the quiz.

For offline use, open [`index.html`](index.html) on GitHub and choose **Download raw file**, or download and extract the repository ZIP. Open the downloaded `index.html` in a full browser such as Safari, Chrome, Edge, or Firefox. GitHub's ordinary file view displays source; it does not run the quiz.

The HTML contains its own question bank, CSS, and JavaScript. The online version needs internet access to load; the downloaded version requires no account, AI API, server, or internet connection to practice. Optional clinical-reference links need internet access. The GitHub Actions release workflow tests and builds changes on `main` before publishing only the standalone website artifact to GitHub Pages.

## Two session modes

- **15-question adaptive study:** Immediate rationales and explanations for every option. The selector samples all seven topics, revisits weaker areas with spacing, and adjusts among authored difficulty levels.
- **80-question blueprint exam:** Application/prioritization cases with answers and rationales withheld until completion. Fixed topic counts, 56 multiple-choice items and 24 select-all-that-apply items. Selection does not adapt to correctness during the exam. Topic and nursing-skill results are shown afterward.

Use the mode buttons to begin a session. Starting a new session asks for confirmation. Submitted responses remain in overall practice history; the abandoned session's unfinished selection is discarded. Export first if you want to resume that exact session later.

| Exam 2 topic | Per 80-question exam | In bank |
|---|---:|---:|
| High-risk pregnancy | 15 | 46 |
| High-risk labor and delivery | 15 | 47 |
| High-risk newborn | 15 | 47 |
| GYN, infertility, contraception, STI | 15 | 46 |
| Growth and development | 10 | 32 |
| Integumentary | 5 | 17 |
| Gastrointestinal disorders | 5 | 17 |
| Total | 80 | 252 |

The full bank contains 195 MC and 57 SATA items. The 56/24 exam-format mix is a practice design choice retained from the earlier PDF, not a claim about the instructor's actual format mix. The blueprint's care-management, assessment, teaching, pharmacology, safety, priority, communication, and collaboration categories are represented according to each topic's listed breakdown.

## Rationales, scoring, and randomness

- The key clue explains what matters in the scenario. Each option has its own explanation. Sources can be expanded after feedback becomes available.
- One study point requires an entirely correct answer. SATA feedback distinguishes missed correct choices from extra incorrect selections. This transparent all-or-nothing practice score is **not official NCLEX partial-credit scoring**.
- Options are shuffled with a Fisher–Yates shuffle driven by browser cryptographic randomness. Correctness and explanations stay attached to stable option IDs, never a hard-coded letter.
- Every new attempt receives a fresh shuffle, including repeat encounters with the same question. Reloading, resuming, and reviewing retain that attempt's order, selections, and matching rationale letters. A fresh random draw can legitimately repeat a previous order.
- Short repeated-letter runs can occur naturally. There is no predictable A-B-C-D cycle or forced pattern. Tests check the distribution over many shuffles.
- Question repetition is prevented within a session. Across sessions, unattempted items are preferred, but blueprint/format/skill needs or the finite bank may require review. Repeated cases are not counted as fresh-case evidence.

## How adaptation works

Each practice area starts at an intermediate target. Two correct responses on distinct, spaced questions at or above that target can raise it; easy successes alone cannot. One miss prompts more evidence rather than automatically lowering the target. Two distinct, spaced misses at or below the target can lower it. Missing a question above the target does not by itself lower the target.

Evidence needs two intervening questions or a gap of at least 24 hours. Same-day repeats of the same item do not count toward progression. Later-day reviews can contribute retention evidence, but two distinct item IDs are still required. Confidence helps select follow-up practice; it does not change points or veto a correct response's progression evidence. SATA omissions and extra selections are reported separately, without claiming validated option-level mastery.

Question difficulty is an author estimate based on the reasoning required, not the presence of “priority” or the SATA format. Version 3 has 66 foundational, 146 intermediate, and 40 advanced items. All 31 practice areas have foundational coverage, but not every area has all three levels. The selector uses the closest available case. Labels summarize practice signals across related conditions, not certified mastery of each disorder. Short study sessions guarantee seven-topic coverage and at least three SATA and six MC items. Full exams use intermediate/advanced cases and enforce blueprint quotas rather than adaptive difficulty changes. See the [authoring rubric](AUTHORING.md).

## Save and restore

Progress stays in this browser on this device. There is no remote progress database or automatic cross-device synchronization. Browser storage on a `file:` URL can vary; moving the file, private browsing, clearing storage, or switching browsers can disconnect or erase a save. See [MDN's localStorage documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Use **Export progress** regularly to save a JSON backup. **Restore** validates the version, question IDs, answer order, selections, and session structure, then asks before replacing the current progress. Backups contain answers, confidence, and timestamps; do not commit them to this public repository.

Version 3 uses a new save key and can migrate the expanded version 2 save or JSON backup. The original browser key is retained. Previous attempts keep their original wording, option order, and answer key through a frozen archive. An unfinished version 2 exam finishes on its original bank; the next session uses version 3. Archived attempts remain in scoring/history but do not advance current-revision difficulty targets. Earlier pregnancy-pilot saves are not imported; keep those with the pilot HTML.

Unreadable saves are preserved until replacement is explicitly confirmed. Another tab changing the save pauses this tab's autosave and asks you to export or reload, reducing accidental overwrite risk. Export before updating, restoring, or moving devices; a browser-only tool cannot guarantee recovery after storage is cleared.

## Sources and review

Instructor notes are primary; the supplied lectures, selected ATI modules and maternal-child textbook passages, and current clinical guidance supplement them. See [SOURCES.md](SOURCES.md) for the exact scope, limitations, and clinical clarifications. Original course files and book text are not included in this repository.

These are fictional educational cases, not instructions for treating an actual patient. Consult your instructor about differences between course wording and current clinical recommendations.

## Build and maintain

Requires Node.js 22.13+ and pnpm. The lockfile is retained; do not update dependencies just to add questions.

```sh
pnpm install --frozen-lockfile
pnpm check
```

`check` rebuilds the bank, runs simulation/unit tests, type-checks, builds the standalone HTML, and verifies packaging. `build:html` writes the root `index.html` and `dist/index.html`. `pnpm dev` runs the existing Sites/Vinext development preview; `pnpm build` checks that optional framework build. The GitHub deliverable is the standalone HTML; learners need no hosting credentials.

- `content/exam-base.json`: the original 80 authored practice items.
- `content/pilot-base.json`: the 36-item pilot, including its 15 shared PDF items.
- `content/expansion.txt`: 139 new authored scenarios in a readable source format.
- `content/v3-additions.txt`: 12 version 3 cases, including new foundation and competing-cue decisions.
- `content/difficulty-review.txt`: an explicit reasoning-based rating for every current item.
- `content/source-map.txt` and `content/book-locators.json`: note headings, lecture text-layer locators, and supplemental chapter pointers.
- `content/clue-review.txt`: concise clue replacements for older items whose clue duplicated the rationale.
- `data/legacy-bank-v2.json`: immutable original bank used to preserve version 2 answers.
- `scripts/build-bank.mjs`: merges sources without duplicating shared items, validates the bank, and writes `data/bank.json`.
- `lib/quiz-engine.ts`: scoring, selection, adaptation, and progress validation.
- `components/QuizApp.tsx`: shared interactive interface.
- `tests/quiz.test.mjs`: content, randomization, session, and import tests.
- `scripts/export-html.mjs`: standalone HTML packaging.

Follow [AUTHORING.md](AUTHORING.md) for item review, safe version changes, and releases. See [QUALITY.md](QUALITY.md) for completed checks and remaining limits. Do not copy official exam items, upload copyrighted source documents, or use patient-identifiable information.

## Validation boundaries

Automated tests exercise 300 study sessions and 150 full exams, including repeat-use conditions, exact quotas, nursing-skill coverage, stable answer IDs, later-day review evidence, and versioned save/restore validation. Version 3 also received local Chrome walkthroughs of a complete study session and a complete exam, submission/feedback locking, saved option order, native keyboard controls, and narrow-screen layout. These checks do not establish clinical validity, complete accessibility conformance, or cross-browser compatibility.

The optional WebMCP surface exposes the current question and accepts only learner-supplied choices. Exam-mode submission does not return correctness. Live WebMCP registration has not been validated in a supported browser context. The answer bank is embedded in the HTML, so this is a study tool, not a tamper-proof exam system.

No open-source license has been selected for original project content. See [third-party software notices](THIRD_PARTY_NOTICES.md) for dependency licenses. These notices are also embedded in the HTML source. Public repository visibility alone does not grant a new license for the original questions or the source course materials.
