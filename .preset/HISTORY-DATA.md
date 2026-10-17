# Complete history data implementation

2026-10-17. Project `proj-2a3d9fa34f971f90`; accepted build baseline `cb9514c66a31dc1c4ec337a775d827db3c7ccdac`. This worker owns data modules, contributor API defaults and focused data tests. Parent owns remote state, credentials, deployment, full integration and phase submission. Concurrent UI edits were preserved.

## Outcome

Commit collection now traverses GraphQL history pages of 100 until exhaustion, requiring a stable default-branch head and raw history total, progressing unique cursors, complete page shapes, distinct SHAs and exact terminal totals. Malformed records, duplicate pages, changed heads, contradictory exhaustion and detectable gaps reject the repository result. Merge commits remain excluded after validating the raw traversal; null linked identities remain unattributed and missing changed-line measurements remain null.

PR collection now traverses all states in ascending creation order with 100 records per page. Each continuation must progress to the next page in the same API scope, with ordered distinct PR identities and nonempty subsequent pages. All requests reconstruct the known repository endpoint; untrusted Link URLs are never followed. GitHub's documented numeric repository pagination aliases are accepted only for the catalog's repository ID. Canonical organization aliases are tied to the public catalog response's owner ID and login. The public catalog itself now traverses until exhaustion and rejects duplicate or malformed pagination.

Reference for GitHub's canonical pagination aliases: https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api. Its example translates a named repository endpoint into a numeric repository Link URL; the numeric-ID regression covers that legitimate response without accepting another repository.

The existing shared 44-read allowance, 45-second transport deadline, eight-second request timeout, maximum three in-flight requests, eight-MB stored-document bound, manual redirects and safe diagnostics remain in place. Validation's per-history operational ceiling is derived from `44 * 100`; page size no longer defines historical coverage. Any unsuccessful traversal prevents publication and retains the last good stored bytes.

New fields remain optional for strict legacy reads: `CodeCommit.messageHeadline?: string`, `WorkItem.closedAt?: string | null`, `RepositoryWork.captureComplete?: boolean`. New captures populate them. `assertCompletePublicSnapshot` adds strict publication requirements to the legacy-compatible `assertPublicSnapshot`: every current repository must have exhausted both histories, every new commit must have its headline, and every new PR must have its closed date field. Closed, open and merged timestamps are checked for consistency; closed-unmerged PRs cannot count as merged.

`historyCoverage(snapshot)` in `app/data/history-coverage.ts` returns `{ pullRequests, commits, complete }`, proving explicit exhaustion and exact current repository coverage. It remains meaningful for a stale saved capture. Missing legacy PR exhaustion is partial. New captures with complete histories and unavailable changed-line totals retain separate history completeness and partial measurement status.

Derived coverage and contributor report metadata use the same helper. The report exposes `coverage.history` and `coverage.pagination` page sizes, removes historical record limits, and describes public-catalog/default-branch scope. The contributor API now defaults to `all`. UTC capture-anchored windows, non-bot numeric-ID attribution, opened versus merged event dates, competition ranks and zero rows retain existing behavior.

## Validation

- Focused final run: 67 tests passed, zero failures/skips. Command: `node --test tests/code-source.test.ts tests/data-snapshot.test.ts tests/stored-snapshot.test.ts tests/github-budget.test.ts tests/leaderboard-report.test.ts tests/code-ranking.test.ts tests/code-all-repositories.test.ts tests/data-ranking.test.ts tests/history-pagination.test.ts`.
- `npx tsc --noEmit`: passed after final data implementation and numeric-alias regression.
- `git diff --check`: passed.
- New regressions collect 205 raw commits and 205 PRs across three pages, restore linked ID `149477150` commit `2189670e140eefffa8041e53de47655d8669059f` beyond record ten at `2026-10-02T17:54:21Z` with +744/-213 in both October and All time, preserve closed-unmerged versus merged distinctions, reject malformed/cyclic/gapped traversal, verify shared budget/concurrency, accept empty/exactly-100 terminal histories, preserve unknown measurements, and retain last-good bytes after later-page failures and budget exhaustion.
- Legacy regression reads the known version-one ten-record shape without new fields, rejects it for new complete publication, and preserves unavailable old headline/closed-date values. Optional-field, unknown-field, relationship and timestamp inconsistency checks remain strict.
- An attempted existing `tests/github-workerd.test.ts` invocation produced no Wrangler startup output and remained pending for approximately 121 seconds. It was interrupted; no assertion failure was observed and no pass is claimed. Its sibling data tests passed separately. Parent handles escalated full-suite and genuine authenticated built-workerd verification.

No real credential was read, no remote mutation/deployment occurred and no commit was created by this worker. Runtime, live-catalog, production capture and browser evidence belong to parent integration.

## Review correction

Independent review found that non-null malformed additions/deletions were being normalized to unknown. Non-merge commits now reject negative, fractional, string, boolean, object and unsafe-integer line measurements before a repository result can be returned. Genuine null or missing fields still produce null totals and partial measurement status after complete traversal. The new later-page publication regression verifies each invalid value in both fields leaves the exact prior KV bytes and write count unchanged. Focused data suite: 67 passed; TypeScript and diff checks passed after this correction.
