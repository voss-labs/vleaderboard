# Independent contribution-history review

2026-10-17. Project `proj-2a3d9fa34f971f90`; source baseline `cb9514c66a31dc1c4ec337a775d827db3c7ccdac`. Read saved state, TASK.md, HISTORY-RESEARCH.md and HISTORY-UI.md, then oriented through Preset get_state/get_decisions. This reviewer owned only this artifact and did not edit application or test files.

## Verdict

PASS for the reviewed source after the measurement-validation correction below. No unresolved actionable findings remain. Parent-owned genuine built-workerd collection, browser checks and production publication/verification are separate completion evidence; pure fixture tests do not establish those outcomes.

## Finding resolved

The initial implementation converted malformed non-null changed-line values into null and allowed replacement of the last good document. An independent in-memory reproduction using a negative deletion measurement produced `published: true` and two writes. This contradicted the fail-closed measurement policy.

The data owner corrected `app/data/github-code.server.ts:85` to reject malformed non-null additions/deletions, while preserving null or missing measurements as unknown. `tests/history-pagination.test.ts:205` now verifies last-good byte retention for both measurements across negative, fractional, string, boolean, object and unsafe-integer cases on a later page. README describes this distinction accurately. Independent recheck of five malformed addition values confirmed failed publication, byte-identical retention and one total write.

Exhausted history with unknown line measurements may retain `captureComplete: true` and publish with code status partial. That flag proves traversal; null totals, partial metric status and missing-stat counts separately communicate measurement availability. This separation is consistent with the agreed record contract and does not turn unknown values into zero.

## Reviewed behavior

- Commit traversal follows every cursor under a stable captured head, checks progressing cursors, raw total counts, page sizes and terminal consistency, and rejects duplicate records, cycles, gaps, malformed required data and head changes. Empty repositories and exactly full terminal pages remain valid. Merge records are excluded from captured contribution metrics.
- REST PR traversal follows all pages in ascending creation order and rejects repeated or nonprogressing records, short next pages, empty later pages, skipped or contradictory links and changes in pagination scope. Canonical numeric repository aliases remain bound to the captured repository ID. A separate 101-repository in-memory check verified canonical organization-alias catalog pagination in two requests.
- New publication requires complete catalog/PR/code coverage and all new required record details. Known version-1 legacy documents remain readable through the narrowly allowlisted optional fields, and missing explicit PR coverage never becomes a completeness claim. Unknown fields, bad relationships, unsafe record URLs and inconsistent PR state/event dates are rejected.
- Every page uses the shared transport allowance, maximum three active external requests, eight-second request timeout and 45-second capture deadline. Stored documents retain the eight-MB bound. The validator's record maximum derives from page size times the 44-request allowance; it does not silently truncate history. Failed collection, validation or budget exhaustion leaves the previous publication untouched.
- Page/API defaults are All time. Summary metrics and record selection use capture-anchored UTC inclusive-start/exclusive-end windows, numeric linked identities and matching bot exclusions. Opened and merged PR events remain distinct; a closed-unmerged PR cannot raise merged rank. Ties and merged-PR ordering remain intact.
- Contributor detail reads raw code/work arrays rather than the bounded activity feed. Commit headline, full available SHA, exact public URL, date and individual measurements are retained. PR state and event dates explain selected-window counts. The twenty-record UI batch has an advancing Show more control with no total-record cap. Native disclosures, text rendering, full UTC dates, unavailable legacy fields and safe exact record links are implemented coherently. Browser interaction remains the parent's validation responsibility.
- Public HTTP readers remain KV-only and no-store. The contributor report exposes page size separately from history completeness and accurately states public-catalog/default-branch scope, including forks and archives; unlinked commit authors remain unattributed.

## Validation

`node --test tests/history-pagination.test.ts tests/contribution-history.test.ts tests/stored-snapshot.test.ts tests/github-budget.test.ts tests/leaderboard-report.test.ts tests/code-source.test.ts`: 50 passed after the correction. Coverage includes the Parth witness SHA `2189670e140eefffa8041e53de47655d8669059f`, committed `2026-10-02T17:54:21Z`, +744/-213; more than 100 commit and PR records; event boundaries; identities/bots; empty histories; pagination faults; allowance/concurrency/deadline behavior; legacy reads; strict publication and last-good retention.

No credentials, remote application state, Qodo transfers, Git mutations, build, deployment or genuine network collection were used by this reviewer.
