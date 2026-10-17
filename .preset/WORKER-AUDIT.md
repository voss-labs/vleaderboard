# Unified Worker integration audit

Date: 2026-10-17. Read-only application audit; no implementation changes made. The current leaderboard UI changes remain untouched.

The existing GitHub data layer can run inside a Worker. The missing work is the platform entry, web-stream SSR, request context injection, build/deployment configuration, and removal of two implicit Node environment reads. Keep the existing resource route: the website and `/api/snapshot` already belong to the same React Router route tree.

## Current file map

| File | Existing responsibility | Integration change |
| --- | --- | --- |
| `vite.config.ts` | Tailwind and React Router Vite plugins | Add verified Cloudflare Vite integration for the SSR environment. |
| `react-router.config.ts` | `ssr: true` | Keep SSR; apply only integration flags required by the installed versions. |
| `package.json` | React Router 8.4, Vite 8, Node server scripts/adapters | Add compatible Cloudflare plugin/Wrangler; replace production start/deploy commands and regenerate lockfile. |
| `app/routes.ts` | Home and `api/snapshot` routes | Reuse unchanged. |
| `app/routes/home.tsx` | SSR initial snapshot through `loadSnapshot` | Accept typed loader args and obtain the persistent loader from request context. |
| `app/routes/api.snapshot.ts` | Refresh JSON, 400 validation, `no-store` | Obtain the same loader from request context; preserve current response semantics. |
| `app/data/load-snapshot.server.ts` | Catalog/work/code orchestration and three repository workers | Explicit preview policy; remove import-time `process.env.GITHUB_TOKEN` singleton and direct `process.env.NODE_ENV` policy. Preserve reusable factory. |
| `app/data/github.server.ts` | Public org catalog, PR reads, max three upstream requests | Reuse; token already accepted as an option and stays in request headers. |
| `app/data/github-code.server.ts` | Default-branch commits, immutable SHA detail cache, capture budgets | Reuse; describe its global budgets as isolate-local in Worker deployment docs. |
| `app/data/snapshot-cache.server.ts` | TTL, stale preservation, retries and pending-read coalescing | Reuse pending verification of Worker cross-request promise semantics. |
| `app/components/useOfficeSnapshot.ts` | Same-origin `/api/snapshot` fetch | Reuse unchanged. |
| New Worker entry | No Worker entry exists | Platform fetch entry delegates to `createRequestHandler` and seeds request context. |
| New `app/entry.server.tsx` | No explicit SSR entry exists | Use web `renderToReadableStream` with `ServerRouter`, HEAD handling and bot `allReady`. |
| New context module | No application context exists | Shared typed context key for the snapshot-loader function. |
| New Wrangler config / Worker types | None exist | Configure one Worker plus static build assets, optional secret, compatibility and generated types. |
| `README.md`, `.env.example`, `.gitignore` | Node process, container and public-hosting instructions | Document local Worker development/preview/deploy, `.dev.vars`, secret management and isolate cache scope. |

## React Router 8.4 context is not the legacy object context

Installed `react-router/dist/development/lib/server-runtime/server.d.ts` declares:

```ts
type RequestHandler = (request: Request, loadContext?: RouterContextProvider) => Promise<Response>;
```

Installed router utilities declare `DefaultContext = Readonly<RouterContextProvider>`, `createContext<T>()`, and typed provider `set`/`get`. A plain `{ cloudflare: { env, ctx } }` second argument does not satisfy this installed API, even if a deployment guide still shows that snippet.

For a direct HTTP-capture design, the smallest seam is to inject a snapshot-loader function rather than the entire platform binding set:

```ts
// app/snapshot-context.server.ts
import { createContext } from "react-router";
import type { createSnapshotLoader } from "./data/load-snapshot.server";

export const snapshotLoaderContext = createContext<ReturnType<typeof createSnapshotLoader>>();
```

The Worker builds a new `RouterContextProvider` per request and sets that key to one isolate-persistent loader created from the current environment token and explicit preview policy. Both route loaders retrieve the function via `context.get(snapshotLoaderContext)`. Snapshot-loader construction must not happen on every request, or every page/refresh call loses its caches, retry state, immutable SHA details and in-flight deduplication.

A single module-held loader plus the token it was created with would preserve the existing cache scope. If a binding changes during an isolate lifetime, reconstruct that loader. Avoid a map accumulating arbitrary credential strings. Runtime execution context need not enter the routes because the current data work is awaited and does not schedule background tasks. The runtime constraints below favor scheduled capture plus durable snapshot reads for production; in that design inject the snapshot-read service into this same typed context seam instead.

## SSR entry and Node compatibility

The application imports no Node built-ins. Only `app/data/load-snapshot.server.ts` reads `process.env`, once for preview policy and once for the default token. Fetch, URL, Headers, Response, AbortSignal, Date, Map and Promise provide the rest of its server runtime behavior.

However, the installed React Router development package currently chooses its Node SSR default because `@react-router/node` is a direct dependency. `node_modules/@react-router/dev/dist/typegen-WywajSVn.js:461` selects `entry.server.node.tsx` when the Node adapter dependency exists. That default imports Node streams and uses `renderToPipeableStream`.

An explicit `app/entry.server.tsx` based on `node_modules/@react-router/dev/dist/config/defaults/entry.server.web.tsx` removes this ambiguity. The installed `react-dom` export map has a `workerd` condition for `react-dom/server.edge`; the Worker build should resolve that condition. Remove unneeded Node server adapters if the project is moving entirely to Workers. Check the existing Dockerfile and README if replacing `start`: both currently assume `react-router-serve ./build/server/index.js`.

## Cache and capture scope

`createSnapshotLoader` owns one GitHub client, one TTL cache, an observed-work map and an observed-code map. The GitHub client owns global retry/backoff state and a maximum of three active upstream requests. The code reader owns a maximum 1,000-entry immutable SHA details map. Each cache entry includes a pending promise, so simultaneous loads on the same instance coalesce.

Current TTLs: catalog 10 minutes, PR work 5 minutes, commit list/code snapshot 15 minutes. Failed refreshes retain successful values and declare stale/unavailable plus retry time. HTTP API responses remain `Cache-Control: no-store`; there is no shared CDN or durable cache. These maps become isolate-local when deployed to Workers. Different isolates/locations and cold starts have separate snapshots, rate budgets and retry state. The current guarantees must not be described as a deployment-wide rate limiter or persistent cache.

The module-level code detail budgets are distinct for authenticated and unauthenticated clients, shared among clients in the same isolate, and reset when that isolate disappears. Authentication grants the application's budget of 600 new detail reads per hour; otherwise 20. These are application ceilings rather than GitHub's actual quota.

No response body stream is stored after a cache read resolves; requests finish `response.json()` before caching normalized data. However, an in-flight promise still closes over upstream I/O owned by the original request. The Researcher verified the [Worker request-ownership warning](https://developers.cloudflare.com/workers/observability/errors/): sharing I/O objects between requests is unsafe, and origin-request cancellation complicates global pending work. Resolved JSON is safe to share. A scheduled event can construct a fresh client/loader, complete capture in that event, and persist the resulting plain JSON for HTTP routes to read.

## Existing metric bounds remain intentional

The catalog follows at most three pages of 100 public repositories belonging to `voss-labs`. Forks and archived repositories are included. Every catalog repository gets a PR and commit request; `repositoryId` validates catalog identity but does not narrow aggregation.

Each repository captures up to 100 most recently updated PRs. Issues and reviews are not fetched. Each code snapshot lists ten latest default-branch records, excludes merge commits, deduplicates SHA values, and fetches immutable addition/deletion details. Missing details remain `null`; pagination and invalid records mark coverage partial. Counts use current UTC month, exact last 30 days or captured history; this is bounded capture, not a complete historical ledger.

A cold load costs 1–3 catalog requests, two list requests per repository, and up to ten new SHA detail requests per repository subject to the global detail budget. With 300 repositories, that is up to 603 list/catalog requests plus 20 unauthenticated or 600 authenticated detail reads. The existing seven-repository test fixture with one commit per repository requires 22 upstream reads. The Researcher verified [current Worker limits](https://developers.cloudflare.com/workers/platform/limits/): Free permits 50 external subrequests per invocation; Paid defaults to 10,000. A 16-repository cold capture can therefore exceed Free even with the 20-detail unauthenticated budget. GraphQL can batch commit list and line-stat capture per repository, but that is a deliberate code-reader change requiring new test fixtures; it is not just platform plumbing.

## Tests and verification affected

`tests/data-snapshot.test.ts` and `tests/code-all-repositories.test.ts` directly invoke the API loader with `{ request } as Route.LoaderArgs`. Once the loader reads its context, these tests need a real `RouterContextProvider` containing the injected test loader.

The production preview test currently mutates `process.env.NODE_ENV` and tests both the factory and API route. Replace that implicit policy with an explicit factory option and verify production rejection before fixtures or upstream fetches. Development must opt into preview explicitly; production default should reject it.

Existing factory/data tests cover all repositories, max concurrency, retries, cache TTLs, stale state, detail budget and eviction. Preserve them. Add one meaningful context/entry seam test for environment token selection and cache reuse across requests, plus a local Worker smoke check for SSR `/`, `/api/snapshot`, an actual hashed asset, 404 behavior, and production preview rejection. Existing source modules are compatible with Node tests because they need not import `cloudflare:workers`.

Run type generation/TypeScript, existing tests and production build with the verified Cloudflare dependency combination. Inspect the built Worker graph for a Node SSR entry and token leakage. No tests were run during this audit because no implementation was changed.
