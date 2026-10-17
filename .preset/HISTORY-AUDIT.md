# Contributor history audit

2026-10-17. Task `proj-2a3d9fa34f971f90`, plan phase. Read-only application audit against baseline `cb9514c66a31dc1c4ec337a775d827db3c7ccdac`. Only this artifact was written. Parent owns verification of Parth's actual GitHub commits, dates, current repository sizes and the product decision.

## Findings

The screenshot alone does not prove an October counting defect. The board defaults to This month. A September commit belongs outside October even if GitHub's Last 3 months contributor graph includes it. Separately, the ten-record history bound can omit genuine contributions from every available period, including Captured history.

- `app/data/github-code.server.ts:14` requests only `history(first: 10)` from the current default branch. Lines 58 and 60 reject excess response records and slice at ten. This is a record bound before merge exclusion, not a promise of ten non-merge contributions. Five merge commits in that page leave at most five counted commits. Earlier commits and commits absent from the default branch are not captured.
- The GraphQL result already includes `hasNextPage` and `endCursor`, but the reader never follows a cursor. `captureComplete` is true only when no next page exists and no malformed records were excluded. A truncated capture correctly remains partial even when every repository was read successfully.
- `app/data/github.server.ts` independently fetches the first 100 PRs sorted by updated time, covering all states. Opening and merging are different events: three opened PRs need not imply any merged PRs. Older PRs can also fall outside the first page. Commit capture must not be used to infer merged PRs.
- `app/data/derive.ts` applies `[from,to)` in UTC. Month starts at the first of the captured month; 30d subtracts exactly 30 days; all has no lower bound. PRs use createdAt and mergedAt; code uses committedAt. The page and contributor API anchor to saved source.fetchedAt, avoiding wall-clock drift between refreshes. There is no Last 3 months or custom period today.
- PR authors and commit authors enter the row map before the event date is tested. Therefore a person with only historical captured work can remain a zero row in This month. Per-repository derivation repeats that behavior, so a repository detail entry can contain only zero counts for the selected period. This is current behavior, not proof of missing ingestion.
- Numeric GitHub ID is the attribution key. Commit author.user.databaseId must link to a GitHub account; null or invalid identities remain unattributed. Names, emails, co-author trailers and PR authors are not substituted. Matching a PR login visually does not independently prove a commit's account linkage.
- `addCodeMetrics` initializes captured metrics to zero for existing rows when any code coverage is present. Partial history therefore produces a real captured subtotal of zero, not a statement that the person has never contributed. The distinction is currently easy to miss.
- All public catalog repositories, including forks and archives, are already scanned. The four main rooms do not limit leaderboard scope. A vroom-only breakdown can result from only vroom activity being present in the bounded records; it does not establish that other repositories were skipped.
- PRs 17/17 and Code 17/17 mean repository read coverage. They do not mean complete PR or commit history. The expanded Window and coverage section describes this, but exact selected dates are buried there.

## Smallest appropriate improvement

Subject to the parent's actual history-size evidence and discussion with Boss, increase the one-page commit capture to 100 records for every catalog repository and make the date/coverage distinction visible beside the period controls. Keep merge exclusion, GitHub linked identity and exact event-date filtering unchanged. This can recover contributions beyond record ten without creating new per-person requests or changing the ingestion architecture.

GitHub permits 1 to 100 records on GraphQL connections. A single-page 100 capture still uses one code request per repository: one catalog + 17 PR lists + 17 history queries = 35 external reads, with nine reads of headroom under 44. Payload size and GitHub execution time rise, so the existing 45-second overall deadline, eight-second request timeouts, three-request concurrency and genuine built Worker verification remain necessary. The prior 35-request success at ten records is not evidence that 100 records meets runtime limits.

This change must remain labeled bounded captured history wherever any page still hasNextPage. If all 17 code pages exhaust, code history is complete for those captured default-branch histories, while PR history may still be truncated. Do not label the entire organization ranking lifetime-complete merely because code pages exhaust.

The visible period description should give the actual UTC start/end and explain that zero means no captured contributions in that selected window. The all tab should continue to say Captured history. A small visible cue or selected-period empty-state text can direct a person with historical work to Captured history. September must not be inserted into October to make the screenshot match. A Last 3 months period is a separate product choice: add it coherently to the shared Period type, derivation, UI and API validation only if Boss wants that comparison.

Do not hide zero-only contributors merely as a data fix. Whether the board includes known contributors who have no selected-period activity is a product decision. If changed, filter them consistently in the shared derivation so API totals, UI repository entries, search and rank semantics agree.

## Alternatives and constraints

| Approach | Current architecture impact | Accuracy and budget implications |
| --- | --- | --- |
| One 100-record GraphQL page | Small, coordinated collector/validation/labels/tests change; existing record schema works | 35 reads for 17 repos. Captures more dated per-SHA contributions; remains partial where hasNextPage is true. Cannot guarantee arbitrary historical completeness. |
| Follow every history cursor in the invocation | Reader loop, nullable cursor variable support, dedup and pagination guards, larger snapshot bounds and labels | Potentially exact default-branch history. With 17 PR lists and one catalog, all code pages together must fit 26 requests; first pages use 17 of them. Only nine extra pages fit. Actual current sizes decide feasibility; runtime may still exceed the deadline. |
| Durable cursor backfill across invocations | New ingestion state, snapshot assembly, refresh/reconciliation and publication semantics | Can preserve bounded request/time limits while progressively obtaining deeper history. Current fresh loader and one public snapshot provide no durable cursor or progress, so this is a distinct feature rather than a small query edit. |
| Replace code history with contributor statistics | New aggregate types, validation, derivation and period contract | One response per repo can remain 35 reads, but weekly buckets cannot reconstruct exact month/rolling-30-day boundaries or per-SHA events. Keeping both old history and stats raises the baseline to 52 reads and exceeds 44. |

Complete cursor traversal is not inherently prohibited for the current small organization: it could fit if the measured pages and execution time fit. It cannot be promised for growth under a hard 44-read limit. If traversal runs out, current strict whole-document publication must retain the prior public snapshot. Without separate durable progress, the next invocation starts over and gains no backfill progress.

Statistics also have source-specific differences: GitHub excludes merges and empty commits, may return 202 while generating default-branch-SHA-cached statistics, and reports zero additions/deletions for repositories with at least 10,000 commits. The current collector includes non-merge empty commits and treats measured zero as real. Treating a statistics zero as interchangeable would therefore change the contract and risk false totals.

## Coordinated files

For the one-page 100 change:

- `app/data/github-code.server.ts`: query bound, oversized-response guard, slicing bound and per-repository message. Prefer one shared bound rather than new independent magic numbers.
- `app/data/snapshot-validation.server.ts:142`: publication/read validation currently permits at most ten commits per repo. Query-only changes otherwise reject every snapshot with more than ten surviving non-merge commits. Keep all existing strict public identities, references, allowed fields and measurements.
- `app/data/derive-code.ts:26`: global coverage message currently hardcodes ten.
- `app/data/contributor-report.ts:43`: API machine-readable limit and human-readable message hardcode ten.
- `app/components/Leaderboard.tsx`: short code scope and expanded scope hardcode ten; selected dates can become visible here. `app/styles/leaderboard.css` only if the new visible text needs layout changes.
- `README.md`: capture contract and request-count example. Actual 17-repository baseline is 35 reads.
- `tests/code-source.test.ts`: query assertion and cap regression currently enforce ten. Extend fixtures to prove a linked contributor beyond record ten is captured, the maximum is respected, and merges still reduce non-merge totals.
- `tests/leaderboard-report.test.ts`: expected machine-readable limit and fixture wording. Preserve exact date boundaries and per-repo subtotal agreement.
- `tests/stored-snapshot.test.ts`: exercise accepted expanded records and rejected excess/malformed records through the actual publisher and stored reader; retain byte-identical last-good behavior.
- `tests/github-budget.test.ts`: add/adjust the actual 17-repository 35-read scenario with expanded histories and verify max three active. Existing 16-repository coverage remains useful.

No changes are inherently required to Worker bindings, secrets, Cron, HTTP reader routes, transport or capture allowance. Increasing the bound alone does not require adding commit fields or changing OfficeSnapshot version. Existing saved ten-record snapshots are valid subsets of a 100-record validation maximum. During rollout, avoid copy that falsely asserts an older saved document was collected with the new bound: actual recorded per-repository messages and snapshot timestamps must remain meaningful. More precise machine-readable per-capture limit metadata would require coordinated type, preview/fallback, validator, storage compatibility and API changes because the public validator rejects unknown fields.

For any new period, additionally coordinate `app/data/types.ts`, `app/data/derive.ts`, `app/routes/api.leaderboard.ts`, the period buttons, route error text, README and the date/API tests. Keeping default month is independent from collecting additional history; switching the default to all would change expectations in both `app/routes/home.tsx` and `/api/leaderboard` unless deliberately scoped and documented.

## Existing verification

Ran the actual existing suites, without source edits:

`node --test tests/code-source.test.ts tests/code-ranking.test.ts tests/data-ranking.test.ts tests/leaderboard-report.test.ts tests/github-budget.test.ts tests/stored-snapshot.test.ts tests/code-all-repositories.test.ts`

Result: 48 passed, zero failures, skips or cancellations. Coverage includes linked identity and unknowns, merge/bot exclusions, duplicate SHAs, exact committed-date and PR boundaries, current ten-record cap, all-repository inclusion, shared request budget/concurrency, deadlines/timeouts, redirect rejection, strict publication, safe diagnostics, exact last-good retention, KV-only HTTP reads and API validation. These passing tests establish the current bounded contract, not that ten records satisfy Boss's historical expectations. A new history regression is needed to verify the improved behavior.

Parent should verify the final changed collector with genuine built workerd, public API/UI dates, actual selected contributor records and strict KV publication before claiming the data issue resolved. The current audit made no credential, deployment, public KV or remote mutations.

## Primary references

- [GitHub GraphQL pagination](https://docs.github.com/en/graphql/guides/using-pagination-in-the-graphql-api): connection size 1 to 100 and after/endCursor traversal.
- [GitHub Commit reference](https://docs.github.com/en/graphql/reference/commits): history ordering, committedDate and history filter/cursor fields.
- [GitHub repository statistics](https://docs.github.com/en/rest/metrics/statistics): weekly contributor counts and line totals, 202 generation, cache behavior, merge/empty exclusions and the 10,000-commit line-total limit.

## Verified data correction and accepted scope

The parent subsequently verified Parth's actual commit directly. Commit `2189670e140eefffa8041e53de47655d8669059f` is dated `2026-10-02T17:54:21Z`, has 744 additions and 213 deletions, and links to GitHub user ID `149477150`. It falls outside the latest ten records. Therefore the zero commits and lines in This month are genuinely caused by the capture bound. The initial screenshot's apparent September position was not reliable date evidence. The general warning about event-date filtering remains correct, but it does not explain this verified October omission.

The parent's complete current-catalog audit measured 325 commit records and 151 PRs across all 17 repositories. `verp` is largest at 109 commit records and 83 PRs; every other repository has at most 44 commit records. At page size 100, that means 18 history requests plus 17 PR requests plus one catalog request: 36 external reads, within the existing 44-read allowance. Request count alone still does not prove runtime success; the genuine built Worker capture must meet the existing 45-second deadline.

Boss explicitly requires exact earlier historical contributions. The selected implementation direction therefore supersedes the tentative single-page recommendation above: paginate all available default-branch history and all PR history in 100-record pages, use captured history as the default period, and expose dated source records with links. Preserve the shared request/time/concurrency bounds and strict last-good publication. If future growth exceeds an operational budget, fail the refresh and retain the previous complete public document rather than silently publishing a sampled history. Current measured volume does not require a new database or durable backfill state.

The current schema's ten-record commit and 100-record PR array limits, as well as captureComplete/status, messages, shared period defaults, report limits and API/UI source details, now need coordinated review for complete paginated capture. API and UI must describe the completeness of the saved document rather than the configured page size. PR pagination must follow the same fixed GitHub origin and transport protections; GraphQL cursors are untrusted input and require pagination guards. Statistics remain unsuitable because they cannot supply exact dates and per-record links.
