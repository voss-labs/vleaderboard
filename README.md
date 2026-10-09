# VLeaderboard

An animated spectator office for VOSS Labs, built with React Router SSR, React, Tailwind CSS and PixiJS. The pixel world handles camera and decorative motion; accessible HTML panels handle project discovery, people, activity and merged-PR counts.

## Run locally

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). The initial page uses a deterministic preview scenario dated 9 October 2026. Named core roles are confirmed configuration. Project teams, work items, counts, visits and work messages in preview are simulated. Synthetic PRs and issues have no GitHub links.

```sh
npm test
npm run typecheck
npm run build
npm run start
```

The production server serves `build/server/index.js`. CI runs the tests, TypeScript check and production build on Node 24.

## Office controls

Collapse either side panel to give the office more space. Drag to pan, use the zoom controls and Fit to frame the scene, and select people or rooms to inspect them. All rooms includes the complete captured repository catalog; off-floor projects open a dedicated room view. Follow tracks a selected character until a manual camera action. Pause and reduced motion stop decorative work and travel while keeping the information accessible. Simulated visit demonstrates ambient movement without claiming a person's location or online status.

## Public GitHub snapshots

`GET /api/snapshot?mode=preview|github&repositoryId=github:<repository-id>` returns the serializable version-1 office snapshot. `repositoryId` is optional; genuine mode fetches work for the first main room by default. Only public repositories discovered under `voss-labs` are eligible. Invalid modes or IDs return HTTP 400 JSON. Upstream errors return HTTP 200 with explicit unavailable or stale source state. Responses use `Cache-Control: no-store`.

Public reads work without credentials. An optional `GITHUB_TOKEN` in the server process environment increases the available request budget. `.env.example` documents the variable; supply it through the runtime's environment configuration. Tokens remain in server-only modules and never enter snapshot JSON. No webhook route, private repository access or live presence integration is included.

The catalog follows at most three pages of 100 repositories and is cached for ten minutes. Selected-room work reads one page of up to 100 pull requests and one page of open issues, cached for five minutes. Each request has an eight-second timeout. Concurrent reads are coalesced, rate-limit retries use GitHub's response headers, and errors preserve the last valid data. Cache is bounded to the captured catalog and its work and clears on process restart. Untouched work remains unknown, rather than appearing as zero. Selecting a room fetches its work; previously fetched rooms remain in board coverage.

The board counts authored merged PRs in UTC calendar-month, exact rolling-30-day or available-history windows. The upper bound excludes the capture time itself. Bots and duplicate PR IDs are excluded, equal counts share competition ranks, and review counts remain unknown until reviews are fetched. Genuine mode always discloses bounded repository/history coverage. A PR count describes captured GitHub work, rather than a complete measure of a person's contribution.

## Build container

```sh
docker build -t vleaderboard .
docker run --rm -p 3000:3000 vleaderboard
```

The existing Dockerfile uses Node 24 and the SSR server. Environment files, Git history, process artifacts and local credentials are excluded from its build context. A hosting destination and webhook delivery infrastructure are not configured.
