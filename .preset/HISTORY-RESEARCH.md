# Available contribution history research

2026-10-17. Task `proj-2a3d9fa34f971f90`; source baseline `cb9514c66a31dc1c4ec337a775d827db3c7ccdac`. This research supports complete available records rather than increasing an arbitrary first-page cap. Existing research-library index and local `.preset/` evidence were checked; primary GitHub documentation was opened for this plan. Parent independently queried actual public GitHub with the intended identity mapping; this agent did not access credentials or mutate remote application state.

## Primary-source facts

- [GitHub GraphQL pagination](https://docs.github.com/en/graphql/guides/using-pagination-in-the-graphql-api) permits page sizes 1–100 and describes advancing `after` with the prior `endCursor` until `hasNextPage` is false. One page is not the whole history when another page exists.
- [GitHub Commit reference](https://docs.github.com/en/graphql/reference/commits) exposes commit history, committed date, plain message headline, parent information and changed-line measurements. These records support exact contribution inspection. Capture a stable default-branch head for multipage traversal.
- [Repository statistics](https://docs.github.com/en/rest/metrics/statistics) describes weekly aggregates, asynchronous 202 generation and default-branch-SHA caching. It excludes merge commits and contributor statistics also exclude empty commits. These aggregates cannot supply the individual records Boss requested or replace exact commit dates.

## Verified current data supplied by parent

| Measurement | Observed value |
| --- | --- |
| Current public repositories | 17 |
| Default-branch raw commit records | 325 |
| All-state PR records | 151 |
| Largest commit history | verp, 109 records |
| Largest PR history | verp, 83 records |
| Every other commit history | At most 44 records |
| Full pages at page size 100 | 35 PR/commit pages plus 1 catalog request |
| Existing capture allowance | 44 external reads, 45 seconds, 3 concurrent requests |

These observed sizes explain why complete pagination is appropriate now. The request count must still be measured through the actual built Worker, and no repository-specific count is hardcoded into implementation.

Vroom contains 24 raw commits and 15 non-merges. Linked GitHub ID `149477150` owns commit `2189670e140eefffa8041e53de47655d8669059f`, dated `2026-10-02T17:54:21Z`, +744/−213. The previous latest-ten scan omits it. This is an ingestion truncation defect even for October, rather than merely an unfortunate default month. Parth's PRs #73/#64 are open and #63 is closed unmerged; the existing zero merged count is accurate.

## Decision

Keep the single Worker and public KV. Traverse complete PR and default-branch commit histories under existing operational limits, default to All time, and expose individual records. Preserve current rank, bot/merge exclusions, linked identity attribution, null unknowns and UTC event-date filtering. All time describes a date selection; history completeness is a separate saved fact. Current public/default-branch scope stays visible, including any legacy partial capture served while the first complete scheduled refresh is pending.

Keep new optional-on-read fields narrowly scoped and allowlisted. Require explicit exhaustion and required details for new publication while accepting the known old stored shape honestly. Global byte/request/time bounds remain operational protection; ten or 100 records per repository must no longer define history coverage.

No application tests were run by this planning agent. Existing audit reports 48 passing focused tests for the old contract; implementation must add history regressions and perform built-workerd plus real-production verification before claiming the defect is resolved.
