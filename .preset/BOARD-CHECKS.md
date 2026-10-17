# Contributor board verification

2026-10-17. Local production build; no public deployment was performed.

## Automated checks

- All 40 domain tests pass, including all-catalog collection, long-tail repositories, independent failures, GitHub identity/date attribution, merge/bot exclusion, unknown versus zero, cache coalescing, request budgets and production Preview rejection.
- Typecheck and client/SSR production build pass after the final mobile CSS correction. Home client bundle is 21.77 kB (6.81 kB gzip); no Pixi scene chunks are emitted for the board.
- Independent source review passes, including the two targeted mobile follow-ups. See BOARD-FINAL-REVIEW.md. Qodo was not run because this repository has no remote/pushed comparison base.

## Production HTTP and genuine data

- Built server runs with NODE_ENV=production, bound to 127.0.0.1:5173. The earlier temporary 4173 server and development server were stopped.
- GET / returns 200 with leaderboard content and no development source selector or Preview option.
- GET /api/snapshot defaults to GitHub and returns 200. Genuine capture discovers all 16 public VOSS repositories, with PR and code data for 16/16, 148 PR records and 91 non-merge commit records; no missing SHA stats in this capture.
- GET /api/snapshot?mode=preview returns 400 with an explicit production-unavailable error.
- Existing GitHub CLI authentication was passed privately into the local server environment. No credential value was printed, committed or persisted to a file. The application itself depends only on its server environment variable.

## Browser checks

- Production UI shows 27 contributors, small GitHub avatars, PR/code coverage and genuine source/freshness labels. No canvas or game UI is mounted.
- Search by @amey returns one contributor with original rank 02. Unknown search gives the no-results state; clearing restores 27 rows.
- Keyboard interaction opens repository details. Harshal's breakdown includes 13 repositories; repository links and separate code coverage are visible.
- This month, Last 30 days and Captured history change the selected period. Genuine captured history shows Harshal with 83 merged PRs versus 9 for the current month. Search retains global ranks.
- Production Refresh completes in GitHub mode without exposing Preview.
- At 320x740, document scroll width equals 320 and the first contributor begins at y=573.39. Metrics stack labels above intact, unwrapped numbers. Expanded repository details also retain 320px document width and unwrapped numbers.
- Desktop 1280x900 layout reviewed. No new browser warnings/errors after the final reload.
- Screenshots: design/board-production.jpg and design/board-mobile.jpg.

## Scope

Every public catalog repository is requested, including archives and forks; catalog discovery is bounded to 300 and warns if incomplete. PR history is capped at 100 most recently updated records per repo. Code captures the latest 10 default-branch records per repo and excludes merges. Metrics are captured subtotals, not lifetime code ownership or complete historical contribution totals. The process-local cache is not a durable cloud ingestion system; Cloudflare integration is a separate next task.
