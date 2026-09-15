# Exam 2 study checkpoint 1

This separate study-only application is deployed at `study-checkpoint/` under the existing GitHub Pages site. The original quiz, question archive, save keys and migration logic remain unchanged at the parent path. The public bank contains only accepted, original educational questions and bounded source labels; no source documents or private review files are included.

## Scope and limits

261 questions: Pregnancy48, Labor48, Newborn51, GYN48, Growth32, Skin17 and GI17; 206MC/55SATA. Estimated levels are75 foundational,172 intermediate,14 advanced. These are AI-assisted author/reviewer estimates, not independent educator certification, empirical calibration, hard80 eligibility or an NCLEX pass probability. The hard-only80 mode is deliberately absent. The course blueprint is displayed as context, not enforced as study-session quotas.

Track-level practice estimates use only the first presentation of distinct evidence families in that track. An incorrect response lowers the target one level; two confident correct responses at or above the target raise it one level. Repeated families do not advance targets. No family repeats within a session. Same-track and explicitly related cases are separated by three other answered questions; focused practice interleaves within its chosen topic and may finish early. Actual questions retain their reviewed difficulty labels even when the preferred tier has no eligible case.

## Persistence

Storage key: `nur2460-study-checkpoint-1`. Save schema: `nur2460-study-checkpoint-save-1`. Only exact checkpoint bank versions/revisions are accepted. All submitted answers are graded from stable option IDs, never display letters or imported grade fields. Options are Fisher–Yates shuffled per new presentation; order and selections persist on resume. SATA uses exact-match one-point scoring, with explanatory option feedback.

Save writes use a Web Lock and compare against the last-read serialized value. A changed value pauses the stale tab. Browsers without Web Locks practice in memory with a visible download warning. Invalid saved data remains untouched and downloadable. Imports validate before confirmation/write and do not touch original-quiz keys. This is browser-local learning data, not tamper-resistant exam administration. Progress JSON is personal and should not be committed to the repository.

## Build and publication

`pnpm check` runs both the original suite/build and the checkpoint suite/build. `scripts/build-checkpoint.mjs` preserves and checks original artifact hashes and emits a standalone `dist/study-checkpoint/index.html`, a release manifest and existing favicon assets. Original code and `dist/index.html` are not replaced. The checkpoint script has no third-party runtime dependencies, external fonts, analytics or remote scripts. The standalone HTML works offline; bookmark icons use relative files.

Question source is `checkpoint/bank.json`. Content is frozen to its hash in `checkpoint/release.json`; do not revise a published question in place. A future release must explicitly version content and retain compatible history or provide a separate namespace with an honest migration policy. Private evidence and candidate-to-public hash joins are maintained outside this repository.

The deployment workflow packages only `dist/`, after all checks pass. Prior main commit `4f11237a8b8f5cc4275a4a07f4f0175b519694b5` is the root-quiz fallback. Revert the checkpoint release through an ordinary reviewed commit to remove its route; do not force-push, reset learner data, or claim earlier versions can read newer checkpoint saves. Download newer progress before a rollback.
