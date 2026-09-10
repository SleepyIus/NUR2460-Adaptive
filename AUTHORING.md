# Authoring and release guide

This is an original course-aligned practice tool, not official ATI/NCLEX content or a calibrated computerized adaptive test. Preserve that distinction in the interface and documentation.

## Write and review an item

1. Identify the Exam 2 topic, practice area, nursing skill, and one assessable care decision. Start with the instructor-note heading. Add an actual lecture text locator or supplemental chapter only when verified; label limitations honestly.
2. Write a fictional scenario with enough context for one defensible best answer (MC) or independently true/false choices (SATA). Include timing, current assessment, orders, or scope when these change the answer. Avoid undefined protocols, two equally defensible “first” actions, and unnecessary trivia.
3. Make alternatives plausible errors in interpretation or care. Avoid clues from grammar, markedly longer correct options, absolutes used only in distractors, overlapping answers, and “all of the above.” Never refer to another option's letter: letters change every attempt.
4. Give the key clue a short, distinct explanation of the decisive evidence. Give the overall rationale the clinical reasoning and every option its own explanation. Resolve contradictions with current primary guidance, and explain relevant course/guideline differences.
5. Add the ID to `content/difficulty-review.txt` and `content/source-map.txt`; add an applicable book locator only if checked. The build rejects missing review metadata. An author check must not be relabeled independent educator review.
6. Have a nursing educator review the key, distractors, patient-care safety, and source support before representing the item as independently reviewed. Record unresolved disputes instead of silently endorsing them.

Use the existing `@@ id|topic|area|level|MC-or-SATA|skills|note heading|slide locator` format in the content text files. `+` marks a correct option and `-` an incorrect option; `||` separates its explanation. `CLUE:` and `WHY:` supply the distinct clue and overall rationale. Generated IDs and revisions, not display letters, drive grading.

## Difficulty rubric

| Level | Required reasoning | Not enough by itself |
|---|---|---|
| 1 · Foundational | Recognize a finding, mechanism, medication purpose, or routine safety principle with direct cues. | Being a short or multiple-choice question. |
| 2 · Intermediate | Apply findings to a specific care decision, interpret an aligned deterioration pattern, or evaluate routine teaching. | Adding “priority,” an emergency label, or SATA formatting. |
| 3 · Advanced | Integrate competing or discordant cues, trends, treatment response, contraindications, or linked calculations to decide or revise care. | Obscure facts, longer prose, or merely severe symptoms. |

Write an item-specific reason for the level. Reviewers may disagree; keep it an estimate. The current bank has foundational coverage in all 31 areas, not complete three-level coverage in every area. Item-response calibration would require an appropriate study, sufficient response data, and qualified measurement expertise. Do not infer an NCLEX pass probability from these levels or scores.

## Preserve saved answers

- Never reuse an item ID for an unrelated question or alter option IDs within an existing saved revision.
- The build hashes content and review metadata into a revision. Historical answers resolve by item ID plus that revision. Changing even a source label can change the revision.
- `data/legacy-bank-v2.json` is immutable. Version 3 intentionally migrates version 2 history and retains its old browser key. Old exam sessions finish with the frozen bank; new sessions use current content.
- Before a later content release, preserve every formerly published question revision in an append-only archive. Extend the builder and validator for that release's bank version and unfinished-session policy **before** publishing. Current migration support is specifically v2 → v3, not an automatic promise that an arbitrary future version is accepted.
- Add fixtures for an unanswered question, submitted question, completed study, and partially finished exam from each supported version. Verify wording, selected IDs, displayed letters, score, session quota, and export/restore. Unsupported saves must fail safely and remain available for export or manual recovery.
- If a key is disputed or corrected, show a correction notice on the historical review; do not quietly regrade a learner's old answer. Keep archived evidence out of advancement for changed current items.

## Release checklist

1. Work on a `codex/` branch. Export any real learner progress before trying a new release.
2. Install the frozen lockfile and run `pnpm check`. Review source diffs and regenerated `data/bank.json` and `index.html`; do not hand-edit the generated files.
3. Use a disposable local origin for browser QA. Test MC and SATA, confidence, submit locking, rationale letters, reload/resume, JSON export and restore, session replacement, and full exam answer withholding. Test narrow screens and keyboard controls. Do not test by submitting answers in a learner's live profile.
4. Update `QUALITY.md` with actual checks and unresolved limitations. Ensure no course documents, textbook extracts, personal progress JSON, secrets, or local filesystem paths enter the release.
5. Push the branch and require the `build-and-check` job to succeed. Review and merge to `main`. The same workflow runs again and deploys only if its checks pass. Repository owners can still change workflow/settings; this is a release gate, not immutable security or configured branch protection.
6. Confirm the deployment succeeded, open the public site without submitting an answer, and verify its release version/content. Keep the prior release commit available for recovery.

The workflow publishes only `dist/index.html`, not raw course sources or the whole repository. All necessary quiz data remain embedded for offline use. Public quiz HTML necessarily exposes the question bank; this is not a secure graded-exam delivery system.

## Recovery

If a release fails checks, the deployment job does not run. If the published application has a problem, fix forward on a branch where possible. To roll back, use a reviewed revert commit (not a forced push or hard reset), rerun the release checks, and keep exported newer progress separately. Earlier application versions may not understand newer saves. The pre-v3 main commit is `d2d3309f4049e009a86dcd98a403f0ee52631926`.
