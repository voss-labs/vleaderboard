# Production capture diagnosis

2026-10-17. Read-only source diagnosis of the deployed capture path, before receiving production invocation logs. Current task `proj-bb7b90b8b486abb3`; prior Worker task `proj-6d42d886a09354ca`; repo key `path:afc40ed3375dc6f73f789eea150d669515fc6dc8cacc597acc1ef3c4abcd9b68`. This artifact changes no application, tests or Wrangler configuration and makes no claim that a cause has been confirmed. The later confirmed diagnosis is in `CAPTURE-FIX.md`.

## Existing evidence and its limits

Read `.preset/state.json`, `SUMMARY.md`, `WORKER-CHECKS.md`, `WORKER-REVIEW.md`, `WORKER-AUDIT.md` and the Cloudflare research before source diagnosis. The accepted local implementation had 61 passing tests, strict typecheck, build/dry-run, source review, local HTTP/browser checks and a genuine persisted local document with 16 public repositories, 148 PRs and 91 non-merge commits.

The genuine capture ran in a normal Node module with the existing GitHub CLI credential and a local KV proxy. The actual local scheduled handler was exercised only without a token: its `missing-token` log and last-good preservation passed. Therefore previous validation did not establish successful authenticated collection inside workerd, actual production secret validity, remote KV binding identity, Cron delivery, cloud CPU capacity, or production persistence/propagation. The review artifact already records these boundaries.

## File map

| File | Relevant behavior |
| --- | --- |
| `workers/app.ts:18` | Awaits scheduled refresh, then emits one final JSON event. No start or stage event exists. Awaiting an asynchronous scheduled handler is supported; no evidence points to a missing `waitUntil`. |
| `app/data/stored-snapshot.server.ts:84` | Creates a new loader for each run, validates, serializes, parses and validates again, then writes one KV document. Every ordinary exception is collapsed to `incomplete-capture`. |
| `app/data/github-request.server.ts:21` | Shares three-request concurrency, 44 external reads, 8-second individual timeout, 45-second capture deadline. Sends User-Agent, Accept, version and Authorization; consumes successful bodies and cancels failed bodies. Any 403 or 429 becomes a rate-limit failure; other HTTP failures lose their status. |
| `app/data/github.server.ts:88` | Catalog takes up to three 100-repository pages. One REST PR read for each public repository. |
| `app/data/github-code.server.ts:20` | One authenticated GraphQL query for each public repository, latest ten default-branch records with addition/deletion measurements. HTTP-200 GraphQL errors are rejected by transport. |
| `app/data/snapshot-cache.server.ts:28` | Converts every collection exception into safe unavailable/stale data. A cold scheduled run has no prior loader/cache values to retain. |
| `app/data/load-snapshot.server.ts:42` | Collects every repository with three concurrent workers. Code failures are represented per repository even though source retry aggregation only includes catalog/PR cache entries. |
| `app/data/snapshot-validation.server.ts:64` | Publication requires complete catalog, valid public references, work/code entries for every repository, no unavailable/stale entries, and null retry times. Bounded partial history is allowed. |
| `app/data/stored-snapshot.server.ts:65` | HTTP reader distinguishes missing KV key (`first capture is not available`) from read/parsing failure (`saved capture is unavailable`). It performs no GitHub reads. |

## Hypotheses to distinguish with logs

| Candidate | Evidence for plausibility | Evidence required to confirm |
| --- | --- | --- |
| Free-plan CPU termination | Current Cloudflare docs set Free scheduled CPU to 10 ms. This path parses 33 upstream responses for 16 repositories, normalizes, validates twice and serializes/parses the document. Prior real capture ran in Node, so it bypassed the cloud CPU limit. | A scheduled invocation outcome `exceededCpu`, CPU measurement, and account plan. A final application capture log may be absent when the runtime terminates execution. Do not infer this from elapsed wall time. |
| Cron has not executed | New/changed triggers can take up to 15 minutes to propagate and execute at UTC quarter-hour boundaries. Waiting a little over 15 minutes from deployment alone does not prove failure. | Actual scheduled invocation/event timestamps, deployed trigger configuration and deployed version. No invocation means investigate delivery before changing collector code. |
| Deployed token invalid or insufficient for GraphQL | Secret presence only checks nonempty text; local success used another credential. REST public reads can work while GraphQL rejects token permissions or org access. | Sanitized endpoint category plus HTTP status or allowlisted GraphQL error code. `missing-token` proves absent/blank only. Generic `incomplete-capture` cannot distinguish this. |
| Per-request timeout or capture deadline | Three serial-work lanes perform PR then GraphQL reads. One stalled response can exceed 8 seconds; a slow total run can exceed 45 seconds. Transport intentionally hides raw network exceptions. | Safe failure category `timeout`/`deadline`, elapsed time and endpoint/repository identifier, without raw headers or bodies. |
| Catalog/request allowance exhausted | Current 16-repo fixture uses exactly 33 requests and remains under 44. With one catalog page, 22 repositories require 45 calls; a bigger organization intentionally fails closed. | Repository count, requests attempted, and safe `request-limit` category. Current known 16-repo data alone does not support this as the cause. |
| Strict all-repository validation | Any unavailable work/code row or malformed response rejects publication. Missing line stats or malformed history sets code retryAt, also rejecting the whole document. Latest-ten pagination alone is accepted as `partial` with `captureComplete:false`. | Safe capture stage plus repository coverage/failure categories, or explicit allowlisted validation failure. Never weaken validation merely to make the first snapshot appear. |
| KV write/binding failure | KV `put` shares the same catch as upstream collection and validation. HTTP missing key cannot distinguish never-written from wrong namespace. User's namespace ID is local configuration drift that must be preserved. | Capture reached publish stage, safe binding/write error category, deployed namespace binding and remote key existence. If published is true but readers show first capture, compare writer/reader namespace and allow propagation. |

## Minimal implementation and verification plan once logs arrive

1. Confirm the actual scheduled event outcome first. `ok` with a final `incomplete-capture` event is an ordinary handled failure; `exceededCpu` is a runtime limit; no scheduled event is delivery/configuration. Do not substitute a local passing run for this evidence.
2. If logs only show the current generic outcome, add a small structured diagnostic seam: capture stage and fixed failure category; endpoint kind/status or allowlisted GraphQL error type; counts and elapsed wall time. Propagate diagnostics through the existing cache boundary instead of logging raw upstream exceptions. Keep tokens, headers, query bodies and arbitrary upstream error text out of logs and public data.
3. Reproduce the observed failure in the existing test seam (`fetcher`, `now`, in-memory `SnapshotStore`) and assert last-good KV stays unchanged. Relevant existing tests: `tests/github-budget.test.ts`, `tests/stored-snapshot.test.ts`, `tests/code-source.test.ts` and `tests/code-all-repositories.test.ts`. Add only the regression for the diagnosed behavior, plus diagnostic-redaction coverage when diagnostics change.
4. For runtime-specific failures, run the authenticated scheduled path inside the built Worker with production preview disabled, keeping the secret in process memory. A local workerd success still cannot prove Free cloud CPU capacity; validate the actual remote scheduled outcome after the authorized fix.
5. After code/config changes, run relevant tests and typecheck/build, then verify cloud capture publication and both public readers. Preserve the user-configured KV namespace ID. A `captured` event plus a reader showing a real fetchedAt/16-repository snapshot establishes the outcome more strongly than HTTP 200 alone.

## Primary references

- [Cloudflare Worker limits](https://developers.cloudflare.com/workers/platform/limits/): Free Cron CPU is 10 ms; Paid Cron under an hour interval is 30 seconds; Free external requests are 50 per invocation; CPU overrun appears as `exceededCpu`. Retrieved 2026-10-17.
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/): UTC scheduling, asynchronous handler support and propagation up to 15 minutes. Retrieved 2026-10-17.
- Applied the installed Workers best practices skill at `/Users/harshalmore31/.codex/skills/workers-best-practices/SKILL.md`: verify runtime and limit claims against current docs and installed versions; keep invocation-owned I/O scoped to its handler.
