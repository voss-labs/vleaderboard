# Restore production GitHub capture

## Goal

Diagnose and fix the deployed `vleaderboard` Worker's failing scheduled GitHub capture, then verify genuine publication in the existing production KV and live leaderboard. Boss reports an empty namespace after `GITHUB_TOKEN` was configured and more than 15 minutes elapsed. This authorizes the necessary application fix and deployment; it does not authorize billing changes, broader account permissions or altered security scope.

Baseline: `9635fec` on `main`/`origin/main`. Parent reports deployed version `4793603f…` at 11:29 UTC on 2026-10-17 in account `1dfc99e44eaba4def73a09dea46a0eda`. Preserve Boss's current namespace binding `bc25976951394aca86a5afdaab482528`, the existing `GITHUB_TOKEN` secret and production preview policy. Production remains genuine-GitHub-only. Preserve all-repository completeness, bounded-history disclosure, linked identities, null unknowns, KV-only public readers and last-good retention.

The root cause is unconfirmed. `.preset/CAPTURE-AUDIT.md` separates plausible runtime, token, transport, validation, scheduling and KV causes. `.preset/WORKER-CHECKS.md` proves a real Node capture with a different credential and successful unauthenticated workerd failure handling; it does not prove authenticated collection inside workerd or successful production execution.

## Approach

1. Finish evidence collection before selecting the cause fix. Parent owns the active live tail, deployed configuration/secret-presence checks and private test of the actual configured deployment credential. Correlate the next quarter-hour invocation with deployed version, scheduled timestamp, runtime outcome and application event. An ordinary `incomplete-capture`, runtime termination and missing invocation require different fixes. Record only sanitized results. Historical telemetry returned 403 with existing OAuth permissions; do not broaden authentication to obtain it.
2. If current events remain generic, add a narrow structured diagnostic path around existing capture stages and preserve it through swallowed cache failures. Emit safe stage, fixed failure category, endpoint kind, HTTP status or allowlisted GraphQL error code when available, request/repository counts and elapsed time. Add a capture-start event so termination can be distinguished from no invocation. Never log credentials, headers, request/query bodies, arbitrary upstream error text or contributor private data. Do not place operational diagnostics into the public snapshot contract.
3. Apply the smallest change supported by evidence. Keep strict publication validation and the existing scan bounds unless the observed failure specifically proves they are wrong. If the confirmed cause needs a billing or security-scope change, complete the concrete diagnosis and explain that requirement to Boss before making that change. Do not weaken validation, seed production with fixtures, or copy a Node-produced snapshot into production to conceal an unsuccessful Worker capture.
4. Reproduce the diagnosed failure using existing injected fetch/time/store seams. Add a focused regression that fails before the fix and verifies the corrected outcome; keep last-good KV byte-for-byte unchanged on failed upstream, validation or storage paths. If diagnostics change, test fixed categories and redaction using hostile error strings. Preserve existing request-budget, concurrency, timeout, GraphQL error and complete-coverage tests.
5. Exercise the built scheduled handler with genuine upstream requests inside local workerd using the actual intended credential privately in process memory. Start from empty local KV, require a valid persisted document and complete current repository coverage, then read it through the built HTTP APIs. Separately test a failed invocation preserving that document. A Node collector or mocked successful scheduler alone is insufficient runtime evidence; local workerd success still cannot establish cloud CPU capacity or Cron delivery.
6. Run focused tests, then the full suite, typecheck, production build and Wrangler dry-run once the fix is stable. Review the diff for secret exposure, snapshot/route-contract changes and accidental configuration drift. Parent deploys the authorized fix with existing secrets and Boss's binding preserved, and records the resulting version.
7. Verify the deployed outcome: the next configured Cron invocation completes and reports successful publication; remote KV contains a valid new capture; `/api/snapshot`, `/api/leaderboard` and the visible live board show that genuine capture and current coverage. Allow documented KV propagation and correlate timestamps. This real scheduled run establishes the cloud refresh path while publishing the first document. HTTP 200 or deployment success alone does not close the task. Record exact observations and remaining limits in `.preset/`.

## Ownership and boundaries

The implementation worker owns only the capture/transport/cache diagnostic seam, the confirmed cause fix and focused tests agreed after runtime evidence arrives. The worker is not alone: preserve concurrent changes and coordinate shared type edits. No unrelated UI, configuration, dependency or collection-scope changes.

Parent owns Cloudflare authentication, live logs, private credential checks, remote KV reads, deployment, browser verification, Git and Preset phase submissions. This planning agent owns only `.preset/TASK.md`; it performs no application/configuration/test changes or deployment. The previous completed Worker plan remains in `.preset/WORKER-TASK.md`.

## Completion evidence

- Sanitized production failure evidence and a supported cause, without conflating secret presence with validity or elapsed time with CPU use.
- Focused regression and diagnostic-redaction coverage where applicable; passing full tests, typecheck, build and dry-run.
- Genuine authenticated local workerd publication and failure retention evidence, with its cloud-runtime limits stated.
- Deployed version, unchanged intended binding/secrets, successful real production capture, live KV/API/board timestamps, and the next Cron result.

## Outcome

Fixed and deployed in source commit `75675444f47e0011726fcfc1d4654cd5ae5fe350`, pushed to `origin/main`. The shared transport's `redirect:error` was rejected synchronously by workerd. It now uses `manual` and rejects redirect responses. Safe capture diagnostics retain stage, fixed reason, request/repository counts, HTTP status and allowlisted GraphQL codes without upstream text or credentials. `CAPTURE-FIX.md` and `CAPTURE-REVIEW.md` record the reproduction and independent approval.

Production version `925f8c4e-1d44-4edd-80d6-7aedb0ee30e3` completed the next Cron run and published at `2026-10-17T12:15:25.262Z`: all 17 current public repositories, 35 requests, 151 PR records and 108 non-merge commits. Actual remote KV validated; the live snapshot matched it exactly. The board and contributor API show 28 contributors and 17/17 PR/code coverage. Screenshot and detailed evidence are in `CAPTURE-LIVE.md` and `design/capture-fixed.png`.

The original GitHub secret, namespace and Cron schedule were retained. Wrangler reconciled the noncredential `ALLOW_PREVIEW` secret to the source configuration's plaintext `false`; production Preview remains disabled. No billing or access permissions changed. No fixtures or manually generated document seeded production. Qodo's external transfer was rejected by automatic approval; an isolated local review approved the fix instead. Only the first successful post-fix production Cron was observed; separate genuine local failure testing established exact last-good retention.

## Tests

- Full suite: 65 passed, zero failures/skips, including a credential-free actual-workerd regression that failed before the fix.
- Generated types, TypeScript, production build, deployment dry-run and diff checks passed. Independent budget/storage review tests: 16 passed.
- Genuine rebuilt local workerd captured all 17 repositories into empty KV, and both built APIs passed. A deliberate invalid-token invocation returned a safe 401 diagnostic and retained the previous document byte-for-byte.
- Actual production Cron: outcome `ok`, no exceptions, 6,608 ms wall / 80 ms CPU, successful publication. Remote KV and live APIs passed schema/time/data matching; both APIs return no-store. Production preview/invalid requests and method checks passed; rendered live board is populated.
