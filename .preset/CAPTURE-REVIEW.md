# Capture fix review

2026-10-17. Project `proj-bb7b90b8b486abb3`, build phase. Independent local source review against `9635feccc329d3b519d21cc0b752609b017ee6db`. Read the current task, diagnosis and fix artifacts, and queried Preset state and decisions. Preset has no recorded decisions for this task.

## Verdict

Approve the scoped capture fix. No blocking correctness, credential disclosure, redirect or last-good retention regression found. Production deployment, actual Cron publication and subsequent refresh verification remain the parent orchestrator's responsibility.

## Findings

- `github-request.server.ts:63` applies `redirect: "manual"` to the shared REST and GraphQL transport. Every non-success response is cancelled and rejected before JSON parsing; there is no redirect follow, Location fetch or retry path. The credential therefore stays on the original GitHub request. The new workerd regression constructs a real runtime Request from these options, so the old unsupported `error` setting cannot pass solely through a Node fetch mock.
- Transport diagnostics contain only fixed endpoint kinds/categories, attempt counts, numeric HTTP status and one of five explicitly allowed GraphQL codes. Arbitrary exception text, response messages/bodies, queries, headers and credentials are excluded. The outer capture result preserves the first transport failure while retaining the final total request count. Ordinary 403 responses remain HTTP permission failures unless rate headers declare limiting.
- `stored-snapshot.server.ts:105` retains both snapshot validations, the size/envelope checks, and the single KV write after all checks. The new diagnostics do not enter the stored/public snapshot. Complete catalog and all-repository coverage remain mandatory; failed upstream, incomplete measurements, missing credentials and exhausted budgets cannot reach the write. HTTP readers remain KV-only.
- Invocation allowances, three-request concurrency, individual timeout and total deadline are unchanged. Independent fixture probes confirmed a successful 17-repository capture reports 35 attempted requests and performs one write. A 24-repository capture stops at 44 attempts, reports all 24 catalog repositories and performs no write.
- `wrangler.jsonc` preserves Boss's intended `SNAPSHOTS` namespace `bc25976951394aca86a5afdaab482528`, the required token, preview policy, UTC quarter-hour Cron and observability settings. Its namespace ID and formatting drift predate this transport fix and are intentional.

## Verification and limits

- Independent budget/storage tests: 16 passed, including hostile network/GraphQL/storage diagnostic redaction, allowlisted codes, exact last-good document comparisons and write-count assertions.
- The combined independent run's workerd test remained pending in the restricted review session and was intentionally interrupted; it is not counted as an independent runtime pass. The credential-free test source was reviewed and needs no existing build, external request or real credential.
- Parent reports the full suite passed 65/65, including that workerd regression, with the needed local runtime permissions; typecheck, production build and Wrangler dry-run also passed.
- Parent reports a separate fresh built-Worker genuine local workerd capture with the intended credential: 17 repositories, 35 requests, 151 PRs and 107 non-merge commits, persisted local KV and both APIs returning 200/no-store. A subsequent invalid-token 401 preserved the exact local KV bytes. This review did not access credentials or repeat external collection.
- Local runtime and source evidence support deployment of the confirmed redirect fix. They do not establish cloud CPU capacity, live Cron delivery, remote KV propagation or successful production refresh. No application, test, authentication or deployment changes were made by this reviewer.
