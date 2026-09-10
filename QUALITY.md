# Version 3 quality record

Author/source check: September 10, 2026. Independent nursing-educator review and psychometric calibration remain pending.

Layout-only follow-up: the five secondary sidebar sections now sit inside one closed-by-default native “Progress & quiz info” disclosure, with reduced internal spacing and placement below the question on narrow screens. A structural regression test checks the native disclosure, its collapsed default, and retention of all five sections. This brings the test suite to 20 tests; no question data, scoring, save schema, or adaptive logic changed. This follow-up was checked by source inspection, the automated suite, type checking, lint, and the production build, without a new interactive browser walkthrough.

## Content changes

- 252 current original items: 195 MC and 57 SATA, with 1,072 individual option explanations.
- All 240 prior stems, choices, and main rationales were examined for the difficulty/source pass. Every current item has an explicit reasoning-based rating and rating explanation. The 12 additions address missing foundations and decisions involving trends, conflicting cues, treatment response, and care constraints.
- Current levels: 66 foundational, 146 intermediate, 40 advanced. All 31 areas have foundational items; three-level coverage is still incomplete. The labels are estimates, not empirically calibrated difficulty.
- Note-section and lecture text-layer locators are recorded per item when available. Book chapter titles are supplemental reading pointers, not evidence of a full chapter-by-chapter clinical re-review. Image-only lecture details remain a source-review limitation.
- q47 now explicitly names levonorgestrel emergency contraception. Historical q47 reviews flag the old ambiguity. Original saved answers remain attached to their original revisions.

## Automated checks completed

All 19 tests passed in the version 3 local release run, including:

- Bank schema, source/review metadata, 31-area foundation coverage, and nonduplicated clues.
- MC/SATA scoring and option explanations through repeated shuffles; 12,000 seeded MC draws across answer positions.
- New-attempt option shuffling, stable saved/review order, submission locking, and mid-question selections/confidence round trips.
- Spaced progression using target-level evidence, no easy-item shortcut, no automatic downgrade after one miss, and no confidence veto on correct evidence.
- Later-day review evidence, same-day repeat exclusions, distinct-case requirements, and separate SATA omission/extra-choice signals.
- 300 simulated 15-question study sessions and 150 simulated 80-question exams, including exact topic/format quotas and required nursing-skill coverage. Full-exam selection stays independent of correctness/confidence under an identical random stream.
- Corrupt or tampered import rejection; version 2 migration preserving question wording, score, order, and an unfinished 80-question exam.

TypeScript checking, linting of the changed application/engine/build/test files, standalone packaging verification, and the optional framework production build passed locally. The HTML is self-contained and includes software license notices. The larger bundle includes a frozen old bank to keep earlier saved answers reproducible.

## Interactive checks completed

Tests used disposable local-browser progress, not a learner's production account or live answers.

- Completed a 15-question study session and an 80-question exam in Chrome.
- Exam answers and rationales stayed hidden through submission and appeared only after the last question. Results showed the exact 15/15/15/15/10/5/5 topic totals.
- Verified MC radio keyboard navigation, SATA Space-key selection, required confidence, locked submitted inputs, and focus advancing to question/feedback headings.
- Reloaded an unanswered SATA item: its option order, selected choices, and confidence were unchanged. Feedback correctly distinguished missed and extra selections, with letter-matched option explanations.
- Inspected a 390 × 844 viewport: readable wrapped options and no horizontal overflow. Restored the viewport afterward.
- Exported the completed Chrome test history to JSON, then restored its 95 responses into the disposable in-app preview through the file picker and explicit replacement confirmation. The completed exam retained its score and 80-answer state. The Chrome automation file-chooser path was blocked by the extension's file-URL permission; the in-app picker, engine-level export/restore, and migrations passed. No app console warnings/errors appeared in that restore check.
- Opened a second local in-app tab and started a new study session. The first tab visibly paused saving and offered export/reload guidance rather than overwriting the newer save.

## Release gate and remaining limits

The GitHub Actions workflow runs the bank build, all tests, type checking, standalone build, and packaging verification before its Pages deployment job. It publishes only the built website artifact on `main`. The gate catches the tested technical failures; it does not certify clinical accuracy or stop a repository administrator from changing deployment settings.

Still pending: independent educator review, learner-response difficulty calibration, complete all-tier coverage, comprehensive screen-reader/accessibility review, a true 200% browser-zoom check, Safari/Firefox/Edge and physical-device testing, and supported-browser WebMCP validation. There is no telemetry, cloud score database, or pass prediction. A local browser export is the recovery mechanism; automatic cross-device syncing is not implemented.
