# Unified Worker verification

2026-10-17. Code and local runtime validation only; no remote Cloudflare resources, secret upload or public deployment.

## Automated and packaging

- Final full `npm test`: 61 passed, zero failures/skips. Covers public all-repo capture, identities/ranks/periods/unknowns, GraphQL errors, request budgets/concurrency/timeouts, typed context, KV validation/staleness/last-good preservation and contributor-report APIs.
- `npm run typecheck`: passed with regenerated Wrangler bindings and current React Router loader arguments.
- `npm run build`: passed client and Cloudflare SSR bundles. Home client22.48kB (7.04kB gzip); Worker dry-run total838.24KiB (179.66KiB gzip). No Pixi scene chunks in the visible board.
- `npx wrangler deploy --dry-run`: passed with generated `build/server/wrangler.json`, static assets and KV binding. Nothing uploaded or provisioned remotely. It does not prove remote account/secret/binding setup.
- Independent static review passes; WORKER-REVIEW.md records corrected first-deployment secret ordering and container persistence mount. `git diff --check` passes.

## Genuine collection and local persistence

- A normal-module invocation of `refreshStoredSnapshot` used the existing GitHub CLI credential privately in process memory and Wrangler `getPlatformProxy` default local KV. No secret file was created or uploaded, and no token value was printed or committed.
- The GraphQL-assisted collector published a valid envelope at `public-office-snapshot:v1`:16 public repositories, PR/code data16/16,148 PR records,91 non-merge commits, zero missing line measurements and complete current catalog discovery.
- The same local KV was readable by the built Worker under Vite preview. The Worker runtime itself had no token bound during HTTP checks, proving visitors do not need GitHub access or trigger scans.
- The fixture for16repos proves33 external requests. The collector caps44 external reads,3 active requests,8-second request timeouts and45-second invocation time. Larger-catalog failure retains last-good KV instead of publishing missing repository measurements.

## Built local Worker HTTP

`npm run preview -- --host 127.0.0.1 --port 5173` runs the built single Worker locally.

- Home and a real hashed JavaScript asset:200.
- `/api/snapshot`:200, GitHub mode,16 repos.
- `/api/leaderboard?period=month`:200,27 contributors. Top contributor has9 merged PRs,13 captured commits and13 repository entries; `period=all` shows83 captured merged PRs. Responses include identities/avatars, changed lines, per-repo metrics, timestamps, nulls and explicit limits.
- Both APIs use no-store. HEAD returns no body. Unsupported POST requests return405; invalid report periods, malformed repository IDs and production Preview requests return400. Unknown routes return404.
- The actual local scheduled handler was invoked through the documented local scheduler and Local Explorer. With no token bound, it returned normally, logged the missing-token outcome and preserved the genuine stored snapshot byte-for-byte. Unit tests cover successful publication and other failed refresh cases.

## Browser

- Built Worker SSR and hydration show27 contributors,16/16 PR/code coverage, genuine capture time, no game canvas and no Preview selector. Refresh succeeds by reading KV.
- Desktop1280x900 reviewed. At320x740 document width remains320, first contributor starts at573.39px, numeric values stay intact and Preview remains absent.
- No new browser errors/warnings after the Worker reload. Existing search/period/details behavior is preserved and backed by shared report/derivation tests and prior board browser evidence.
- Screenshots: design/worker-board.jpg and design/worker-board-mobile.jpg.

## Remaining deployment boundary

README supplies namespace creation, first deployment with a dedicated ignored `.deploy.secrets` file and later interactive secret rotation. These remote operations were not run. The first cloud snapshot depends on successful Cron execution after setup; KV propagation may delay visibility. Captures remain bounded100PRs/latest10commit records per repo, not full lifetime totals. Docker instructions were reviewed; no container execution was performed.
