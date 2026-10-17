# Scheduled capture transport fix

2026-10-17. Project `proj-bb7b90b8b486abb3`, build phase, accepted baseline `9635fec`. Implementation scope is the GitHub transport, scheduled capture diagnostics and focused tests. Parent owns production deployment and verification. Existing credentials and Boss's configured KV namespace were preserved.

## Confirmed cause

The deployed transport passed `redirect: "error"` to global `fetch`. The installed workerd rejects that option while constructing the outgoing request, before any GitHub request is sent. Its exact static validation error is:

> Invalid redirect value, must be one of "follow" or "manual" ("error" won't be implemented since it does not make sense at the edge; use "manual" and check the response status code).

The transport converts this `TypeError` to `GithubFailure`; the cache turns it into an unavailable catalog; strict publication validation then rejects the document. The outer catch previously collapsed the cause to `incomplete-capture`. This explains production's ordinary `ok` outcome and approximately 1–2 ms execution, with no KV write. This is neither CPU termination nor missing Cron delivery.

The [workerd request implementation](https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.c%2B%2B) accepts `FOLLOW` and `MANUAL` and contains that validation error. Cloudflare's current Request documentation lists `error`, so the installed runtime reproduction and primary implementation are the decisive evidence.

## Before and after evidence

- Ran the unchanged built scheduled handler in genuine local workerd with the actual intended credential loaded privately from ignored `.deploy.secrets` into an in-memory binding. Empty isolated local KV remained empty; scheduled outcome was `ok`; the application emitted `incomplete-capture`.
- In-memory instrumentation of that unchanged bundle emitted only fixed category booleans and stack frames. It identified a `TypeError` at the first transport fetch, with a redirect-related message. A separate credential-free local `new Request` probe produced the exact static error above.
- Changing only `redirect: "error"` to `redirect: "manual"` in the built bundle in memory allowed genuine authenticated local scheduled collection to publish at `2026-10-17T12:01:40.394Z`: 17 public repositories, outcome `ok`, document present in isolated local KV. No remote writes, fixture seed or Node-produced publication was used.
- A focused credential-free workerd regression was added using the project's public Wrangler API. It imports the current transport source and constructs actual workerd Requests with the transport's options; no prebuilt application, external network or real credential is needed. Before the fix it failed with `ready:false, requests:0`; after the fix it passes and verifies a 302 response is rejected without following the destination.

## Final built runtime verification

The parent's fresh production bundle was loaded unchanged into genuine local workerd. The actual credential was held privately in process memory and all KV writes targeted a new isolated temporary local namespace. No real credential was copied to a new file, logged or supplied in process arguments.

- Started with no document. The actual built scheduled handler emitted its start event, then published at `2026-10-17T12:06:17.459Z`: 17 repositories, 35 external reads, 8,300 ms elapsed, runtime outcome `ok`.
- Strict `assertPublicSnapshot` accepted the persisted document and the built `/api/snapshot` response. PR coverage was 17/17 and code coverage 17/17, with 151 captured PR records and 107 captured non-merge commits.
- Built `/api/snapshot` and `/api/leaderboard?period=month` both returned 200 and `Cache-Control: no-store`. Snapshot data matched the persisted document. The contributor API included source, period, coverage and contributors.
- Changed only the isolated local in-memory token binding to a deliberate invalid test value. The next actual built scheduled invocation completed normally with `published:false`, safe diagnostic `stage:validate`, `endpoint:catalog`, `category:http`, HTTP 401, one request and zero captured repositories. The previous KV document remained byte-for-byte identical. Temporary runtime persistence was removed after verification.

This proves successful authenticated collection inside the built Worker runtime and genuine local last-good retention. Parent separately verifies the deployed version, remote KV, live APIs/board and actual Cron refresh.

## Change

Use `manual` redirect handling and retain the existing rejection of every non-success response. Authorization therefore cannot be forwarded to a redirect destination. Preserve complete current-catalog publication, all-repository PR/code coverage, bounded history, null unknowns, strict snapshot assertions and byte-for-byte last-good KV retention.

The scheduled handler now emits a safe start event. Failed captures retain diagnostic stage, fixed category, endpoint kind, optional HTTP status/allowlisted GraphQL code, total attempted requests, repository count and elapsed milliseconds through the swallowed cache failure. Successful captures report request count and elapsed time. No diagnostic is added to public snapshot data. No arbitrary exception/upstream text, credentials, headers, query bodies or contributor data are logged. HTTP 403 is classified as rate limiting only when declared rate headers establish it; ordinary permission errors retain their HTTP category/status.

## Focused validation

- Original focused suite plus real-workerd regression: 30 passed, zero failures/skips.
- Added separate ordinary-403/declared-rate/hostile-GraphQL-code regression; final focused budget/storage subset: 16 passed.
- Diagnostics tests prove hostile network/GraphQL/storage details and token-like strings do not escape; authenticated collection, validation and storage failures preserve the exact last-good document.
- `tsc --noEmit` and `git diff --check`: passed.
- Parent reports full `npm test`: 65 passed, plus generated typecheck, production build and diff check. Parent performs dry-run, deployment and real production Cron/KV/API/board verification. Local workerd success does not establish cloud CPU capacity or Cron delivery.
