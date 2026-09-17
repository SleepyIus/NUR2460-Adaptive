# Exam 2 Expanded · 445 questions

Published at `/study-checkpoint/`; main remains the 349-question Complete version. The earlier original and 261-question checkpoint remain at `/earlier/` and `/earlier/study-checkpoint/`.

This reviewed source-bounded expansion adds 96 original questions, retaining the exact original349 question objects and the exact80 hard items (15/15/15/15/10/5/5 by topic). It is not a claim of covering every possible exam fact. Difficulty is AI-estimated and independent nursing-educator review remains pending. This is not official ATI/NCLEX material or medical advice.

`bank.json`, mapping and selection logic are the accepted445 application inputs. The technical bank version and isolated save keys retain their pre-release `exam2-coverage-private-3` identities intentionally; this preserves the tested backup contract. The public name is Expanded445. Main and earlier-version saves are not read, migrated, regraded or deleted. Restore only compatible Expanded445 backups here. No raw course documents, textbooks, private audit files or learner records are included.

`pnpm check` validates all preserved releases, then `scripts/build-expanded.mjs` builds a self-contained expanded page. `scripts/package-complete.mjs` assembles only approved public files in `dist/site`; `scripts/verify-expanded-package.mjs` checks the final routes and immutable main/earlier HTML. GitHub Pages deploys only that directory. Local offline use: copy `dist/site` and open `study-checkpoint/index.html`.
