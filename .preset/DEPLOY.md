# VLeaderboard local delivery

2026-10-09. Project `proj-f983e77652b4bb2f`. This artifact verifies delivery of the accepted local animated office and bounded public GitHub snapshot slice. It is not a production release or live-event deployment.

## Pipeline

- Accepted application source: `84638c3e51991cb549371d5e9d45e517ad09d98e`, with independent review and QA PASS. Delivery HEAD is `2ff507181077c62e5b9e4e34e9f176c2e461bc1c`, the QA artifact checkpoint. `git diff 2ff5071 HEAD` is empty; no application or test code changed during delivery verification.
- QA already passed all 22 tests, strict TypeScript, and the client/SSR production build. This phase reused that build and added a production HTTP startup smoke; it did not rerun the suite or build.
- Local prerequisites and scripts remain Node.js 24+, `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, and `npm run start`. The start script loads `build/server/index.js` through installed `@react-router/serve` 8.4.0. Its installed CLI source explicitly reads `HOST`, `PORT`, and `NODE_ENV`; the smoke used `HOST=127.0.0.1 PORT=4173 NODE_ENV=production npm run start`.
- `.github/workflows/ci.yml` defines tests, typecheck, and build on Node 24 for pushes and pull requests, with read-only contents permission. No Git remote is configured. No remote workflow run, push, publish, or CD execution occurred.
- The existing multi-stage Node 24 Dockerfile builds the SSR bundle and starts the Node server. `.dockerignore` excludes environment files, credentials, Git history, installed dependencies, build debris, tests, and process artifacts. Container build/runtime were not exercised in this delivery.
- Preview needs no credentials. Optional `GITHUB_TOKEN` is supplied only through the server process environment for public reads; no credential was added or inspected by this phase. The accepted project has no auth or database dependency, so generic archetype auth environment variables do not apply.
- The delivered interactive preview remains at `http://127.0.0.1:5173/` through the parent-owned development server. The temporary production server existed only for the smoke and was stopped afterward. No external host, domain, account, webhook subscription, durable ingestion service, or browser push transport is configured.

## Observability

- The installed SSR server prints its startup URL and Morgan `tiny` request logs. The smoke observed successful home and preview-resource access logs. These logs are plain access logs, without structured request IDs, traces, metrics, retention, dashboards, or alerting.
- Snapshot JSON and the source-details UI expose mode, capture time, `ready`/`partial`/`stale`/`unavailable` state, messages, coverage, and retry time. The server cache preserves prior valid data on upstream errors and keeps genuine failures separate from fixtures. QA covered those deterministic failure paths; this production smoke made no GitHub calls and did not force an outage or rate limit.
- Resource requests disable browser caching. Invalid requests return structured 400 JSON, and unexpected snapshot failures return generic 500 JSON. Upstream unavailability is an HTTP 200 domain state, so a future monitor must inspect source status and freshness rather than relying on HTTP status alone.
- Preview mode and simulated motion/activity remain labeled. No claim of presence, live GitHub events, or complete repository history is made.
- Current visibility is sufficient to inspect the accepted local slice. Production monitoring, runtime error capture, retained logs, and actionable alerts remain unverified until a hosting runtime is selected; no monitoring infrastructure was added here.

## Rollback

- No production deployment was performed, so no external rollback was needed or tested. The accepted source commit above is the local recovery anchor.
- For a future local recovery, use a separate checkout at the accepted source commit, install its lockfile with Node 24, build it, and start that matching server/client bundle on a free loopback port. Keep the complete build together so SSR does not reference assets from another revision. Verify the health checks below before switching a local preview to it.
- The current app has no database migrations or durable user state. Process-local GitHub cache clears on restart; stale snapshots are not persisted across a rollback or restart.
- Delivery cleanup was verified: the temporary production server session `50072`, PID `60930`, received Ctrl+C; a subsequent listener check found port 4173 free. The parent development server remained PID `33316` on loopback port 5173 before and after verification. No files outside this report were edited, and no app process was restarted.

## Health check

Production HTTP smoke ran against `http://127.0.0.1:4173/` on 2026-10-09, finishing before `10:15:28 UTC`. The filesystem sandbox initially denied loopback listen/connect with `EPERM`; the identical local commands passed after approved execution escalation. The server bound only to `127.0.0.1`.

| Check | Actual result |
| --- | --- |
| Production server startup | PASS; installed serve CLI loaded the existing SSR build and listened on loopback port 4173. |
| `GET /` | 200, `text/html`; title `VLeaderboard — VOSS Labs`, named maintainer/co-maintainer content and Preview labeling present; 66,786 response bytes. |
| `GET /api/snapshot?mode=preview` | 200, JSON, `Cache-Control: no-store`; version 1, preview/ready, 12 catalog repositories and four main-room IDs. |
| Referenced client JavaScript | 200, JavaScript, nonempty; hashed asset cached immutable for one year. |
| Referenced CSS | 200, CSS, nonempty; hashed asset cached immutable for one year. |
| `/office/characters.png` | 200, PNG, 928,713 bytes. |
| `/office/furniture.png` | 200, PNG, 1,128,425 bytes. |
| Temporary server cleanup | PASS; no remaining listener on 4173, existing development listener on 5173 unchanged. |

There is no dedicated `/healthz` route. The home page and preview resource are the existing equivalent local SSR/data checks and do not test GitHub availability. For genuine-source health, inspect the JSON source status, capture time, coverage, and retry time separately.

This pass verifies production HTTP boot, SSR output, fixture data, and static asset delivery. Client hydration, Pixi rendering and desktop/mobile/keyboard interaction are supported by the separate QA browser evidence, which used the development preview; no production browser pass was repeated. Container execution, hosted operation, remote CI, production observability, failover, and an actual PR webhook end to end remain outside this accepted local delivery. The local slice is delivered; a live-event release is not claimed.
