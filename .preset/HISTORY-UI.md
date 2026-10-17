# Historical contribution detail UI

2026-10-17. Build work for task `proj-2a3d9fa34f971f90`, based on `cb9514c66a31dc1c4ec337a775d827db3c7ccdac`. Read saved state, TASK.md, HISTORY-RESEARCH.md, HISTORY-AUDIT.md and current application patterns; oriented through Preset get_state/get_decisions before implementation. Parent owns integration, build, genuine workerd/browser verification, deployment and process submissions.

## Outcome

The home board defaults to All time. This month and Last 30 days remain available. The chosen inclusive start/exclusive end and snapshot capture timestamp are visible beside the period controls, using full UTC dates and seconds; time elements retain the precise original datetime including any milliseconds. Rankings and ties retain the existing merged-PR policy.

Contributor Details now includes per-repository Commits and Pull requests groups. Groups are native collapsed details elements. Each list initially displays twenty records and Show more advances by twenty until every selected record is visible. Twenty is a local display batch, never a history limit. Commits show the plain headline, linked abbreviated SHA with full SHA in its accessible label/title, committed UTC date and individual added/removed measurements. PRs show number, plain title, actual current state, opened date and applicable merged/closed date. Closed PRs are explicitly labeled unmerged. Missing old headlines, closed timestamps, unavailable sources and unknown line measurements remain unavailable.

New pure `app/data/contribution-history.ts` exports `selectContributionHistory(snapshot, personId, repositoryId, { from, to })`, returning `{ commits, pullRequests }`. Selected commit records extend the stored CodeCommit with `href: string | null` and `headline: string | null`; PRs extend WorkItem with `href: string | null`. The selector reads raw snapshot.code/work rather than the bounded recent activity feed. It applies linked-person, repository, bot and dedup rules and the same UTC `[from,to)` boundaries as the summary. A PR appears if its opened, applicable merged or closed event falls inside the window; selecting a closed event never turns it into a merged count. Sorting uses committed time or the latest applicable in-window PR event.

Record hyperlinks are emitted only for HTTPS github.com URLs bound to the exact captured repository and SHA/PR number, without credentials, query or fragment. React renders upstream titles as text. Nested disclosure controls and Show more support keyboard use, inherit visible focus styles and wrap at mobile widths. External record arrows no longer inherit the outer disclosure's rotation.

Board completeness claims use the data owner's `historyCoverage(snapshot)` export. Complete history requires saved proof; legacy PR captures without captureComplete stay partial. Source coverage distinguishes catalog, PR history and code history, with stale status and unavailable measurements preserved. The UI no longer asserts latest-ten/first-hundred history limits or an obsolete three-page catalog limit. Scope notes distinguish default-branch/public-catalog coverage and explain that unlinked authors remain unattributed.

Owned changes: `app/components/Leaderboard.tsx`, `ContributionDetails.tsx`, new `ContributionRecords.tsx`, `app/routes/home.tsx`, `app/styles/leaderboard.css`, new `app/data/contribution-history.ts`, and `tests/contribution-history.test.ts`. Shared types, collectors, API and completeness helper remain owned by the data worker. No remote operations, credentials, commits or build were performed by this worker.

## Tests

- `node --test tests/contribution-history.test.ts`: 6 passed. Covers Parth's exact earlier SHA `2189670e140eefffa8041e53de47655d8669059f`, October 2 committed date and +744/−213 in All time and month, with three opened and zero merged PRs; 137 commits/141 PRs without a history cap or activity-feed dependency; inclusive/exclusive UTC edges and closed-only events; identity/bot/repository/dedup behavior; exact safe public record URLs, SHAs and plain titles; legacy fields, null measurements and unavailable sources. Fixtures verify behavior and do not claim to be live GitHub capture evidence.
- `node --test tests/contribution-history.test.ts tests/code-ranking.test.ts tests/data-ranking.test.ts`: 17 passed.
- `npx tsc --noEmit`: passed after correcting an optional snapshot.code assertion in the new test fixture.
- `git diff --check`: passed.

Genuine browser inspection of mobile/desktop disclosure behavior, Show more completion and rendered historical records remains part of the parent's final integration checks. This worker did not run the production build while shared data files were under active edit.
