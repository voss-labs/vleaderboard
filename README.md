# VLeaderboard

The VOSS Labs contributor board, built with React Router SSR, React and Tailwind CSS. It aggregates captured contributions across every public repository in the `voss-labs` catalog, ranks contributors by merged pull requests and shows commits, PRs opened, lines added/removed and repository breakdowns.

## Run locally

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). The initial page uses genuine public GitHub data. Development also offers an explicitly labeled simulated Preview source for checking the interface. Production has no Preview control, rejects preview API requests and never falls back to fixture data.

```sh
npm test
npm run typecheck
npm run build
npm run start
```

The production server serves `build/server/index.js`. CI runs the tests, TypeScript check and production build on Node 24.

## Use the board

Choose This month, Last 30 days or Captured history. Search by contributor name or GitHub handle; filtering preserves ranks from the full captured scope. Open a contributor's Details for repository contributions and source coverage. Profile and repository links lead to genuine GitHub records. Small avatars use confirmed GitHub identities, with initials when an image or identity is unavailable.

The board shows PR and code repository coverage separately. A dash means unavailable, while a measured zero remains zero. Lines added and removed describe changed text in captured commits, including documentation and other files; they are not repository size or code ownership. The office scene remains dormant in the source and is not mounted by the board.

## GitHub data and environment

Public reads work without credentials. An optional `GITHUB_TOKEN` in the server process environment increases the GitHub request budget and the application's commit-detail allowance. Supply it through the runtime environment; `.env.example` names the variable. Credentials remain server-only and never enter snapshot JSON.

`GET /api/snapshot` defaults to genuine GitHub data. `mode=github` is explicit; `mode=preview` is development-only. The optional `repositoryId=github:<repository-id>` validates a public catalog identity, while genuine snapshots still aggregate every catalog repository. Invalid modes/IDs and production preview requests return HTTP 400 JSON. Upstream failures return explicit unavailable/stale domain state, preserve cached data when available and use `Cache-Control: no-store`.

The catalog follows at most three pages of 100 public repositories and caches for ten minutes. Every catalog repository receives bounded PR and commit capture, with three repository workers and at most three active upstream requests. PR snapshots cache for five minutes; each captures up to 100 most recently updated PRs. Issues are not fetched by this board. Commit snapshots cache for fifteen minutes; each lists the latest ten default-branch commit records and excludes merge commits. Changed-line measurements come from immutable per-SHA details, cached separately. New SHA-detail reads share a per-process hourly allowance of 20 without a token or 600 with a token. All allowances remain subject to GitHub's rate limits.

Counts use UTC calendar-month, exact rolling-30-day or captured-history windows with an exclusive upper bound. PRs use their opened/merged dates; commits use committed time. Bots, duplicate records and unlinked authors are handled explicitly. Equal merged counts share competition ranks. Captured history is not a lifetime total, and bounded history may cover only part of a selected period. Missing line details stay unknown rather than becoming zero.

Requests have timeouts, concurrency limits and shared in-flight reads. Rate-limit retries honor upstream headers, cached successful data survives refresh failures and source timestamps expose age. Caches and capture budgets are process-local and reset on restart. No webhook, private repository or live-presence integration is included.

## Build container

```sh
docker build -t vleaderboard .
docker run --rm -p 3000:3000 vleaderboard
```

The Dockerfile uses Node 24 and the SSR server. Environment files, Git history, process artifacts and local credentials are excluded from its build context. A public hosting destination is not configured.
