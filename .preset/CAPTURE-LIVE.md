# Production capture verification

2026-10-17. Task `proj-bb7b90b8b486abb3`. Source fix commit `7567544`, baseline `9635fec`.

## Production failure

The original deployed version `4793603f-6d24-4070-8b60-bc13d29e57ff` received its scheduled invocations. Dashboard invocation `0be77900bce84bff38ec293143e1555b` at 11:45 UTC completed with runtime outcome `ok`, 1 ms CPU and 2 ms wall time, but logged `published:false`, reason `incomplete-capture`. The next live-tailed 12:00 UTC invocation repeated that handled failure in 1 ms. These events ruled out absent Cron delivery and CPU termination.

The actual intended token succeeded in a private Node collector run for all 17 repositories, but the unchanged built handler failed in workerd. A credential-free runtime probe exposed workerd's rejection of `redirect:error` before network I/O. Changing only that setting to `manual` allowed genuine local publication. `CAPTURE-FIX.md` contains the runtime reproduction and fresh built-handler/API/retention evidence.

Historical telemetry API access returned 403 under the existing OAuth scopes. Historical logs were instead read through the already authenticated Cloudflare dashboard; live logs used existing Wrangler tail access. No permissions were expanded.

## Checks before deployment

- Full tests: 65 passed, zero skips or failures, including an actual workerd request-construction regression without external requests or credentials.
- Generated Cloudflare/React Router types and TypeScript: passed.
- Production client/SSR build, Wrangler dry-run and Git diff checks: passed. Worker package 840.17 KiB, 180.21 KiB gzip.
- Independent local review: approved, no blockers; its separate budget/storage tests passed 16/16. Qodo submission was rejected by automatic approval because external code/config transfer was not explicitly authorized; no retry or workaround was used, and no Qodo review coverage is claimed.
- Fresh built authenticated local workerd capture: 17 repositories, 35 requests, 151 PRs and 107 non-merge commits; complete PR/code coverage. Persisted schema and both built HTTP APIs passed. A subsequent deliberate invalid-token capture produced a safe 401 diagnostic and retained exactly the previous KV bytes.

## Deployment

Deployed source fix `7567544` with existing Wrangler authentication. The new version is `925f8c4e-1d44-4edd-80d6-7aedb0ee30e3`. No GitHub secret file was uploaded and `GITHUB_TOKEN` was not replaced.

Post-deployment settings confirmed `GITHUB_TOKEN` remains `secret_text`, `SNAPSHOTS` remains namespace `bc25976951394aca86a5afdaab482528`, and observability is enabled. Wrangler reconciled the noncredential `ALLOW_PREVIEW` binding from the existing remote secret to its configured plaintext `false`; production's compile-time preview rejection remains unchanged. The custom domain remains attached.

The Cron remains `*/15 * * * *`; its created and modified timestamps both remain `2026-10-17T11:29:37.213542Z`, so this deployment did not replace the schedule. Both production hostnames serve the application and contributor API. Production preview requests and invalid report periods return 400; POST returns 405 and HEAD returns 200. No document was manually seeded into production KV.

## Scheduled publication

The next real scheduled run succeeded under the new deployed version. Its invocation started at `2026-10-17T12:15:19.135Z`; the capture published at `2026-10-17T12:15:25.262Z` / 17:45 IST. Runtime outcome was `ok`, with no exceptions, 6,608 ms wall time and 80 ms CPU. The application reported `published:true`, 17 repositories, 35 attempted requests and 6,613 ms elapsed.

An authenticated read of the actual production namespace returned a version-1 envelope at the expected key. Strict public snapshot validation passed: catalog discovery complete, PR and code coverage 17/17, 151 PR records and 108 non-merge commits. No production KV write was performed outside the scheduled handler.

The live snapshot API passed the same validation and matched the remote KV snapshot exactly, including `2026-10-17T12:15:25.262Z`. Both populated APIs return 200 with `Cache-Control:no-store`. The contributor API and rendered custom-domain board show 28 contributors; Harshal More is first with 9 merged PRs and 23 captured commits in the month window. The existing historical bounds and partial-history labels remain visible.

Screenshot: `design/capture-fixed.png`. The live board tab remains open as the deliverable. Temporary log tailing was stopped after verification. Source fix `75675444f47e0011726fcfc1d4654cd5ae5fe350` was pushed to `origin/main`.

The next configured Cron both exercised the cloud refresh path and published the first document; no second successful post-fix Cron was observed. Last-good failure retention was separately verified against the genuine built local Worker. Existing scan bounds remain 100 updated PRs and ten default-branch commit records per repository, not lifetime totals.
