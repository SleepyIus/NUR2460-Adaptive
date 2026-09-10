# NUR2460 Adaptive · Exam 2

An offline-capable, interactive nursing quiz with **240 original ATI-/NCLEX-style practice questions**, option-level rationales, and source references. Educational practice only, with no official affiliation, calibrated difficulty, or pass prediction. The bank needs independent nursing-educator review before use beyond personal study.

## Open the quiz

1. Open [`index.html`](index.html) on GitHub and choose **Download raw file**. Alternatively, download the repository ZIP and extract it.
2. Open the downloaded `index.html` in a full browser such as Safari, Chrome, Edge, or Firefox. GitHub's ordinary file view displays source; it does not run the quiz.
3. Select an answer and confidence level, then submit. Answers lock on submission. Press Continue when ready.

The HTML contains its own question bank, CSS, and JavaScript. No account, AI API, server, or internet connection is required to practice. Only optional clinical-reference links need internet access. Uploading this repository does not automatically enable GitHub Pages, and Pages has not been enabled as part of this upload.

## Two session modes

- **15-question adaptive study:** Immediate rationales and explanations for every option. The selector samples all seven topics, revisits weaker areas with spacing, and adjusts among authored difficulty levels.
- **80-question blueprint exam:** Application/prioritization cases with answers and rationales withheld until completion. Fixed topic counts, 56 multiple-choice items and 24 select-all-that-apply items. Selection does not adapt to correctness during the exam. Topic and nursing-skill results are shown afterward.

Use the mode buttons to begin a session. Starting a new session asks for confirmation. Submitted responses remain in overall practice history; the abandoned session's unfinished selection is discarded. Export first if you want to resume that exact session later.

| Exam 2 topic | Per 80-question exam | In bank |
|---|---:|---:|
| High-risk pregnancy | 15 | 45 |
| High-risk labor and delivery | 15 | 45 |
| High-risk newborn | 15 | 45 |
| GYN, infertility, contraception, STI | 15 | 45 |
| Growth and development | 10 | 30 |
| Integumentary | 5 | 15 |
| Gastrointestinal disorders | 5 | 15 |
| Total | 80 | 240 |

The full bank contains 185 MC and 55 SATA items. The 56/24 exam-format mix is a practice design choice retained from the earlier PDF, not a claim about the instructor's actual format mix. The blueprint's care-management, assessment, teaching, pharmacology, safety, priority, communication, and collaboration categories are represented according to each topic's listed breakdown.

## Rationales, scoring, and randomness

- The key clue explains what matters in the scenario. Each option has its own explanation. Sources can be expanded after feedback becomes available.
- One study point requires an entirely correct answer. SATA feedback distinguishes missed correct choices from extra incorrect selections. This transparent all-or-nothing practice score is **not official NCLEX partial-credit scoring**.
- Options are shuffled with a Fisher–Yates shuffle driven by browser cryptographic randomness. Correctness and explanations stay attached to stable option IDs, never a hard-coded letter.
- Short repeated-letter runs can occur naturally. There is no predictable A-B-C-D cycle or forced pattern. Tests check the distribution over many shuffles.
- Question repetition is prevented within a session. Across sessions, unattempted items are preferred, but blueprint/format/skill needs or the finite bank may require review. Repeated cases are not counted as fresh-case evidence.

## How adaptation works

Each practice area starts at an application target. A miss lowers its next target by one level, to a minimum of foundational. Two confident, correct responses on distinct fresh cases with spacing can raise the target. Guessing does not reduce the point score, but it does not supply confidence-based promotion evidence. Same-area cases are separated by two other questions when feasible.

Question difficulty is an author estimate. The selector uses the closest available case; not every practice area contains all three levels. Labels summarize practice signals across related conditions, not certified mastery of each disorder. Short study sessions guarantee seven-topic coverage and at least three SATA and six MC items. Full exams enforce blueprint quotas rather than adaptive difficulty changes.

## Save and restore

Progress stays in this browser on this device. There is no remote progress database or automatic cross-device synchronization. Browser storage on a `file:` URL can vary; moving the file, private browsing, clearing storage, or switching browsers can disconnect or erase a save. See [MDN's localStorage documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Use **Export progress** regularly to save a JSON backup. **Restore** validates the version, question IDs, answer order, selections, and session structure, then asks before replacing the current progress. Backups contain answers, confidence, and timestamps; do not commit them to this public repository.

The expanded bank uses a separate save key. Earlier pregnancy-pilot browser saves are not overwritten. Keep pregnancy-pilot backups with the original pilot HTML; they are not silently imported into version 2. Unreadable saves are preserved until replacement is explicitly confirmed.

## Sources and review

Instructor notes are primary; the supplied lectures, selected ATI modules and maternal-child textbook passages, and current clinical guidance supplement them. See [SOURCES.md](SOURCES.md) for the exact scope, limitations, and clinical clarifications. Original course files and book text are not included in this repository.

These are fictional educational cases, not instructions for treating an actual patient. Consult your instructor about differences between course wording and current clinical recommendations.

## Build and maintain

Requires Node.js 22.13+ and pnpm. The lockfile is retained; do not update dependencies just to add questions.

```sh
pnpm install --frozen-lockfile
pnpm build:bank
pnpm test:quiz
pnpm exec tsc --noEmit
pnpm build
pnpm build:html
```

`build:html` writes the self-contained root `index.html` and `dist/index.html`. `pnpm dev` runs the existing Sites/Vinext development preview. The GitHub deliverable is the standalone HTML; no Sites or Pages hosting credentials are required.

- `content/exam-base.json`: the original 80 authored practice items.
- `content/pilot-base.json`: the 36-item pilot, including its 15 shared PDF items.
- `content/expansion.txt`: 139 new authored scenarios in a readable source format.
- `scripts/build-bank.mjs`: merges sources without duplicating shared items, validates the bank, and writes `data/bank.json`.
- `lib/quiz-engine.ts`: scoring, selection, adaptation, and progress validation.
- `components/QuizApp.tsx`: shared interactive interface.
- `tests/quiz.test.mjs`: content, randomization, session, and import tests.
- `scripts/export-html.mjs`: standalone HTML packaging.

To add questions, follow the existing source format, supply plausible alternatives with separate rationales, identify real supporting sources, update version/count targets when needed, rebuild, and run the checks. Do not copy official exam items or upload copyrighted source documents. Do not use patient-identifiable information.

## Validation boundaries

Automated tests exercise 300 study sessions and 150 full exams, including repeat-use conditions, exact quotas, nursing-skill coverage, stable answer IDs, fresh/review evidence, and save/restore validation. Compilation and offline packaging are checked separately. These checks do not establish clinical validity or replace live browser interaction and accessibility testing; no full browser UI test is claimed.

The optional WebMCP surface exposes the current question and accepts only learner-supplied choices. Exam-mode submission does not return correctness. Live WebMCP registration has not been validated in a supported browser context. The answer bank is embedded in the HTML, so this is a study tool, not a tamper-proof exam system.

No open-source license has been selected for original project content. See [third-party software notices](THIRD_PARTY_NOTICES.md) for dependency licenses. These notices are also embedded in the HTML source. Public repository visibility alone does not grant a new license for the original questions or the source course materials.
