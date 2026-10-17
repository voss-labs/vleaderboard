# Unified Worker final source review

Date: 2026-10-17. Project: `proj-6d42d886a09354ca`. Baseline: `210dbaddf56c9ec26e4cd77b7104acb4116166e3`.

Verdict: no unresolved actionable correctness or security findings in the reviewed migration after the deployment documentation fixes below.

## Scope and method

Independent read-only review of the Worker entry, web-stream SSR, typed request context, scheduled collector, GitHub transport/history parsing, public snapshot validation/KV reader, both APIs, shared ranking/report derivation, preview gating, refresh client, configuration and deployment/container instructions. Read Preset state/decisions, TASK.md, WORKER-AUDIT.md and Cloudflare research first. Reviewed full source files and baseline drift, not only patch fragments.

Applied the Workers best practices skill, current Cloudflare documentation, the pinned Wrangler 4.151.1 schema/implementation, and generated runtime types from workerd 1.20261012.1 with the configured compatibility date. Verified the installed types permit awaited asynchronous scheduled handlers. Confirmed KV bindings may omit IDs for automatic provisioning and checked the exact namespace creation flags in the pinned CLI.

No application, test or configuration edits were made by this reviewer. No tests, builds, servers, browser sessions, GitHub requests, credentials, deployments, commits or gates were invoked. Parent-owned validation evidence is separate from this source review.

## Findings resolved during review

1. The first-deployment instructions originally deployed before providing the required `GITHUB_TOKEN`. Pinned Wrangler's `addRequiredSecretsInheritBindings` rejects that sequence for a Worker that does not exist. README.md now supplies a dedicated ignored `.deploy.secrets` file through `npm run deploy -- --secrets-file .deploy.secrets` during first deployment, with only `GITHUB_TOKEN` in its example. Later token rotation remains an interactive `wrangler secret put GITHUB_TOKEN`. The local `.dev.vars` preview setting is not selected for upload. Verified against CLI source and the [official secrets documentation](https://developers.cloudflare.com/workers/configuration/secrets/#upload-secrets-alongside-code).
2. The platform worker corrected the container volume example to mount `/app/.wrangler/state`, preserving the build-generated `.wrangler/deploy` configuration redirect. Final README.md and Dockerfile consistently describe local Worker preview.

## Reviewed guarantees

- One configured Worker owns the React Router route tree and assets. The entry uses a new typed `RouterContextProvider` for each HTTP request and injects a KV reader. Normal asset routing remains asset-first; unmatched requests reach the router. No invocation-owned I/O is stored in module state.
- `GITHUB_TOKEN` is a required generated binding and enters the invocation-local collector through the runtime environment. It is used in GitHub Authorization headers, with no token serialization, browser exposure or raw upstream exception logging found.
- HTTP SSR/API reads perform no upstream collection. Unsupported methods and invalid modes/ID shapes are rejected before storage. Production preview is rejected even if its runtime variable is changed. `/api/leaderboard` always requests genuine mode and checks its source.
- Scheduled publication requires a valid versioned public envelope, complete catalog, one valid work/code entry per repository and valid identity/relationship references. Bounded history is accepted; failed reads, malformed measurements, authentication/GraphQL errors and exhausted limits cannot replace the prior good document. Reads handle missing/corrupt storage as unavailable and mark saved source/repository coverage stale after 30 minutes.
- REST and GraphQL share three active requests, a 44-request invocation allowance, eight-second request timeout and 45-second deadline. Redirects are rejected and no automatic retry loop exists. The current 16-repository fixture's 33-read contract is represented in dedicated tests. These are request/deadline bounds, not proof of arbitrary organization or hosting-plan capacity.
- Code history remains the latest ten default-branch records, with merge exclusion, SHA deduplication, linked numeric identities and unattributed authors preserved. GraphQL error envelopes are rejected even on HTTP 200. Unknown changed lines stay nullable; zero remains measured zero. Capture failures retain previous data rather than publishing incomplete measurements.
- Website and report API use the shared merged-PR ranking/period derivation. The report anchors windows to capture time, includes per-repository subtotals and capture/coverage limits, preserves competition ranks and nullable unavailable values, and does not claim lifetime totals.

## Remaining validation boundary

The parent owns final test/typecheck/build/package checks and genuine local Worker/KV/browser verification. A local package and source review do not prove remote account configuration, actual secret validity, production CPU/resource capacity, eventual-consistency timing or Cron delivery. No public deployment is part of this task.

References: [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [scheduled handlers](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/), [automatic provisioning](https://developers.cloudflare.com/workers/wrangler/configuration/#automatic-provisioning).
