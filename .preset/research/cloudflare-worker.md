# One Cloudflare Worker for VLeaderboard

Researched 2026-10-17. Preparation only; no Cloudflare login, resource creation, secret upload, GitHub API call, or public deployment was performed.

## Recommendation

Use one module Worker for the existing React Router SSR website, its `/api/snapshot` resource route, and a scheduled GitHub refresh. Serve the built client assets through Workers Static Assets. Store one sanitized `OfficeSnapshot` JSON document in a KV binding. Public SSR/API reads use KV and never initiate a GitHub scan. Keep the current contribution metric contract and explicit bounded-history coverage.

The current application already has a reusable GitHub collector, domain types, failure handling, contributor identity rules, and UI derivations. Reuse these. A D1 schema, event ingestion pipeline, queues, or separate API Worker are unnecessary for this delivery.

## Framework integration and version evidence

The inspected project uses React Router 8.4, React 19, Vite 8, and Node 24 for local tooling. Cloudflare documents React Router v8 SSR support in its Vite integration. Configure `cloudflare({ viteEnvironment: { name: "ssr" } })` before `reactRouter()` so the Worker shares the framework's SSR build environment. Retain the existing Tailwind plugin. Cloudflare's official plugin source currently declares Vite `^7.0.0 || ^8.0.0`; verify the actual installed package's peer dependencies and lockfile before selecting its version. No evidence requires downgrading the existing Vite dependency. [Vite environments](https://developers.cloudflare.com/workers/vite-plugin/reference/vite-environments/), [official plugin package](https://github.com/cloudflare/workers-sdk/blob/main/packages/vite-plugin-cloudflare/package.json).

Use `workers/app.ts` as the source entry and a new `wrangler.jsonc`. Build assets remain under `build/client`; let the Cloudflare plugin produce its deployable Worker output and generated Wrangler configuration. Existing assets match first, and requests without a matching asset reach the Worker/React Router. Keep SSR enabled; do not configure SPA fallback for this SSR application. [React Router on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/), [full-stack asset routing](https://developers.cloudflare.com/workers/static-assets/routing/full-stack-application/).

Important documentation discrepancy: Cloudflare's framework guide currently labels itself React Router v8 but shows a legacy plain `{ cloudflare: { env, ctx } }` load context. React Router's current 8.4 adapter documentation uses `RouterContextProvider`, matching this repository's installed declarations. Create one shared typed `createContext` token, construct a provider per request, set the snapshot reader function, and pass that provider as the second argument to `createRequestHandler`. Routes call `context.get(token)`. Injecting the reader keeps Worker binding types out of UI code and tests. [React Router adapters](https://reactrouter.com/api/other-api/adapter#react-routercloudflare), [typed contexts](https://reactrouter.com/api/utils/createContext).

## Shared snapshot lifecycle

Configure a 15-minute Cron Trigger and implement `scheduled()` in the same Worker. Await the refresh inside this handler. Instantiate the collector in that scheduled invocation, pass `env.GITHUB_TOKEN` explicitly, validate its public snapshot, and write it to KV. Do not refresh from public requests or add an unauthenticated refresh endpoint. A successful scheduled refresh is the only production writer. Prime it during the eventual authorized deployment procedure; until the first successful refresh, return an honest unavailable snapshot or HTTP 503 rather than fixtures. [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/).

KV suits this small, infrequently written, read-heavy document. It is eventually consistent, so updated data can take 60 seconds or longer to become visible at other locations. This is acceptable for a 15-minute GitHub snapshot. Keep the last successful document without a short storage expiration; mark its source stale according to `capturedAt` when refreshes fail. Never replace it with a failed empty catalog. If a refresh is incomplete, either preserve the previous whole snapshot or retain previous values per repository while marking them stale. Do not claim an atomic lock or globally exactly-once refresh from KV; it does not provide that coordination. [How KV works](https://developers.cloudflare.com/kv/concepts/how-kv-works/).

The Cache API is optional as a later optimization for KV reads. It cannot be the only shared store: entries are local to the originating data center and do not replicate. Its `put`/`match` methods do not implement `stale-while-revalidate` or `stale-if-error`. Cron warming one location therefore cannot warm all visitors. [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).

Keep request I/O local. Do not share `Response`, body streams, or a request's execution context through module caches. Reusing completed JSON data is permitted, but an isolate cache has no persistence or global coordination guarantee. A fresh scheduled collector avoids relying on cross-request in-flight fetch promises for correctness. [Workers I/O ownership](https://developers.cloudflare.com/workers/observability/errors/#cannot-perform-io-on-behalf-of-a-different-request).

## Upstream budget and the smallest useful optimization

The existing REST collector performs 1–3 catalog calls, one PR-list call and one commit-list call per repository, and up to ten SHA-detail calls per repository. The current 16-repository cold scan can exceed 50 upstream calls. These bounds come from the local collector, not an assumption about GitHub data size.

Current Workers limits are 50 external subrequests per invocation on Free and 10,000 by default on Paid. Scheduled invocations have a 15-minute wall-clock limit; HTTP `waitUntil` extends execution only up to 30 seconds after response/disconnect. At most six initial outbound connections can wait for headers at once. A scheduled scan does not bypass the plan's subrequest limit. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

For a minimal Free-compatible current-size collector, replace only the commit-list plus per-SHA REST details with one authenticated GraphQL history query per repository. Keep REST public catalog and PR collection. One catalog + 16 PR calls + 16 history queries is 33 external calls before storage. Put an explicit request budget and deadline around the collector, since this count grows with the catalog and redirects/retries consume requests too. Preserve visible partial coverage if a budget is reached; do not silently drop repositories.

The GraphQL query begins at `repository(owner: "voss-labs", name: $name).defaultBranchRef.target`, narrows to `Commit`, and requests `history(first: 10)`. Each node can return `oid`, `url`, `committedDate`, `additions`, `deletions`, `parents { totalCount }`, and `author { user { databaseId login avatarUrl url } }`. Also request `pageInfo { hasNextPage endCursor }`. Exclude merges by `parents.totalCount > 1`; preserve the existing rule that ten history records can yield fewer than ten non-merge commits. `defaultBranchRef` avoids assuming the branch is named main. [Repository schema](https://docs.github.com/en/graphql/reference/repos), [Commit schema](https://docs.github.com/en/graphql/reference/commits).

Use only a real linked GitHub user for identity attribution. `author.user` can be null when GitHub cannot resolve the commit email; leave it unattributed, never infer a GitHub account from a display name or email. Do not request or publish author emails. [GitActor schema](https://docs.github.com/en/graphql/reference/git).

GraphQL requires authentication and uses a distinct point budget. The minimum cost is one point per query, and the point formula can change. Read rate-limit headers and honor retry/reset information; reject GraphQL `errors` even when HTTP status is 200 unless explicit partial-data handling is implemented. Bound page sizes, returned nodes, repository count, elapsed time, and total requests. [Forming GraphQL calls](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql), [GraphQL limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api).

## What full contributor history would require

This Worker preparation does not make the current latest-ten commit capture into complete all-time totals. A complete result requires traversing every repository and each commit history cursor, aggregating non-merge commits by linked author, and paginating PR histories as well. Connections accept page sizes from one through 100, with `hasNextPage`/`endCursor` for continuation. Persist progress if the bounded scheduled job cannot finish; mark coverage complete only after all relevant cursors are exhausted. A wide single request over all repositories is not a substitute for pagination. [GraphQL pagination](https://docs.github.com/en/graphql/guides/using-pagination-in-the-graphql-api).

Commit history supports `since`/`until`, and `committedDate` matches the existing period derivation. Code additions/deletions describe captured commit changes, not an objective measure of developer impact. Summing merge diffs would double-count changes under the existing non-merge contract. Unmerged branch work is not part of default-branch history. Preserve these boundaries in contributor details and source labels. [Commit schema](https://docs.github.com/en/graphql/reference/commits).

## Secrets and configuration

Set a new Worker's compatibility date to `2026-10-17` and use `nodejs_compat` where required by dependencies. Declare `GITHUB_TOKEN` as a required secret name in the supported Wrangler schema. Generate runtime and binding types with project-local `wrangler types`; do not hand-maintain a duplicate `Env`. Use an ignored `.dev.vars` file for local secrets, and explicit runtime `env` access rather than import-time token capture. Never put the token in `VITE_*`, Wrangler `vars`, snapshots, API responses, or logs. `wrangler secret put` deploys a version immediately, so it belongs to the eventual authorized remote deployment sequence. [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Vite secrets](https://developers.cloudflare.com/workers/vite-plugin/reference/secrets/).

Enable Workers logs and traces in new production preparation. Validate actual configuration fields against the installed Wrangler schema. Use local build, type generation, existing domain tests, Worker runtime smoke tests, and a local scheduled-handler invocation. The currently documented local scheduler URL is `/cdn-cgi/local/scheduled?format=json` on the Vite port. A dry-run package build is useful but does not validate a real secret, remote namespace, or production scheduled execution.

## Handoff constraints

- No public deployment is authorized by this request for code/preparation.
- Keep production genuine-GitHub-only, including explicit rejection of `mode=preview` and fixtures.
- Preserve current contributor identity and coverage rules.
- Validate snapshot source/version/schema before publishing a refreshed KV document.
- Reject unsupported methods and malformed snapshot query parameters before reading expensive resources.
- Distinguish a deployment-ready local package from a proven live deployment.
