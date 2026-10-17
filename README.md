# VLeaderboard

One Cloudflare Worker serves the React Router website, static assets, `/api/snapshot` and `/api/leaderboard`. Its scheduled handler captures public `voss-labs` GitHub activity every 15 minutes into KV. Website and API requests read that saved snapshot; Refresh never starts a GitHub scan.

## Local development

Use Node.js 24 or newer.

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run dev
```

Open [localhost:5173](http://localhost:5173). Set `GITHUB_TOKEN` in the ignored `.dev.vars` file to enable authenticated GitHub capture. The token needs access to public GitHub GraphQL data; private repositories are excluded. Secrets enter through Worker bindings and never belong in `VITE_*`, Wrangler `vars` or browser code. `.env.example` documents the optional setting that disables Wrangler's fallback `.env` loading.

The first page shows an honest unavailable state until a successful local capture. With the development server running, invoke its local scheduler :

```sh
curl 'http://localhost:5173/cdn-cgi/local/scheduled?format=json'
```

Refresh the page after capture. Local KV persists under `.wrangler/state/v3`. Set `ALLOW_PREVIEW=true` in `.dev.vars` and restart development to explicitly enable labeled fixture previews. Production builds always reject preview requests; fixture data is never written to KV.

```sh
npm test
npm run typecheck
npm run build
npm run start
```

`start` runs the built Worker locally with Wrangler, normally on port 8787. `npm run preview` runs Vite's production preview. `npm run deploy:dry-run` builds and packages locally without deploying. Type checking regenerates `worker-configuration.d.ts` from the Wrangler configuration.

## Deploy to Cloudflare

This checkout is configured for the existing VOSS production Worker and KV namespace. Update that deployment with `npm run deploy`; the existing GitHub secret is preserved. Building and testing create no remote resources. For a separate deployment, choose your own Worker name and Cloudflare account before creating its namespace and secret:

```sh
cp .deploy.secrets.example .deploy.secrets
npx wrangler kv namespace create SNAPSHOTS --binding SNAPSHOTS --update-config --config wrangler.jsonc
npm run deploy -- --secrets-file .deploy.secrets
```

Before the first deployment, fill only `GITHUB_TOKEN` in the ignored `.deploy.secrets` file. Required secrets must accompany that first deployment. The namespace command saves its identifier to the source configuration before the build; skip namespace creation when updating the existing VOSS deployment. `npm run deploy -- --secrets-file .deploy.secrets` builds and deploys the generated Worker and client assets with the required secret; npm forwards the flag to `wrangler deploy`. This explicitly selected file uploads its secret values. `.dev.vars` stays local and is not selected for deployment. Later deployments use `npm run deploy`, which preserves deployed secrets. Rotate the token through the interactive command below; it creates and deploys a new Worker version.

```sh
npx wrangler secret put GITHUB_TOKEN
```

The configured Cron Trigger runs at `*/15 * * * *` in UTC. Allow Cloudflare's trigger propagation and the first successful scheduled capture before expecting rows. There is no public capture endpoint. Missing credentials or an unsuccessful capture leaves the existing saved document intact. Logs report a capture outcome without credentials or raw upstream errors; Workers logs and sampled traces are enabled.

To inspect scheduled captures:

```sh
npx wrangler tail vleaderboard --format json --search github-snapshot
```

Each invocation emits `github-snapshot-capture-start`, then a capture result. Success reports `published: true`, the timestamp, repository count, attempted requests and elapsed time. Failure reports `published: false` with a fixed stage/category and, when available, HTTP status or an allowlisted GraphQL code. A missing token has its own reason. These diagnostics stay out of the public snapshot. The test suite includes an actual workerd request-construction regression; Node fetch mocks alone cannot verify Workers runtime compatibility.

## Read the contributor API

```sh
curl 'http://localhost:8787/api/leaderboard?period=all'
curl 'http://localhost:8787/api/leaderboard?period=month'
curl 'http://localhost:8787/api/leaderboard?period=30d'
curl 'http://localhost:8787/api/leaderboard?period=all&sort=lines'
curl 'http://localhost:8787/api/snapshot?mode=github'
```

`GET` and `HEAD` are supported with `Cache-Control: no-store`; unsupported methods return 405. `/api/leaderboard` defaults to `all` and returns ranked contributor identities, merged/opened PRs, commits, changed lines and per-repository breakdowns, plus source timestamps and history completeness. `30d` is an exact rolling window; `month` starts at the current UTC month; `all` has no lower date bound. Unknown measurements stay `null`. Optional `sort` is `merged` (default), `lines` (`linesChanged`, added plus removed) or `commits`; unknown values rank last and equal values share competition ranks. Periods anchor to the saved capture time.

`/api/snapshot` returns the underlying `OfficeSnapshot`. Optional `repositoryId=github:<numeric-id>` must belong to its public catalog; it validates identity while retaining aggregation across every catalog repository. Invalid modes, malformed IDs, unknown catalog IDs and production preview requests return HTTP 400 JSON. Before priming, both APIs return HTTP 200 with explicit unavailable source/coverage and unknown data so the UI can render. A missing or malformed KV document never triggers a GitHub request or fixture fallback.

## Capture contract

The collector discovers the public repository catalog, including archives and forks, then follows every PR and default-branch commit-history page to exhaustion. GitHub pages contain at most 100 records; this is a page size, not a total-history limit. Commit records include their headline, SHA, committed date, linked numeric GitHub identity, changed-line counts and URL. PR records include their title, number, current state, opened/merged/closed dates and URL. Merge commits and bots are excluded from contributor metrics. When a commit's author email is not linked to a GitHub account, the commit is credited to the linked author of the merged PR that landed it in that repository, if GitHub reports exactly one; otherwise it remains unattributed. Identities are never guessed from names or emails.

All time includes earlier available work in the captured public repositories. Its commit scope is the default branch, not every branch or a person's entire GitHub account. Open and closed-unmerged PRs remain inspectable without being counted as merged. Changed lines measure additions and removals in default-branch commits, including documentation; they do not measure repository size, code ownership or an unmerged PR's diff. The board retains merged-PR ranking and separate PR/code history completeness.

Each scheduled invocation creates a fresh collector using its runtime token. REST and GraphQL share at most three active requests, a maximum of 44 external requests, an eight-second request timeout and a 45-second overall deadline. Every additional page consumes this shared allowance. Redirects and automatic retries are disabled. If history grows beyond the request, time or document-size allowance, the capture fails safely and keeps the previous document; it never silently drops older records to fit. These operational bounds do not establish capacity for arbitrary organizations.

KV stores a versioned public envelope at `public-office-snapshot:v1` with `capturedAt` and `snapshot`. Schema, public source, identities, repository relationships and complete PR/code page traversal are validated before new publication. Failed/missing repository reads, malformed history or measurements, authentication failures, budget exhaustion and deadline failures preserve the whole previous successful document. Null or missing changed-line measurements remain unknown and mark code metrics partial; history completeness separately describes exhausted pagination. Known older partial snapshots remain readable and labeled partial until replaced by a successful full-history capture. Snapshots have no short expiration. After 30 minutes, twice the capture cadence, readers mark the saved source and repository coverage stale while retaining its data. [KV is eventually consistent](https://developers.cloudflare.com/kv/concepts/how-kv-works/), so a new capture may take 60 seconds or longer to appear elsewhere.

The UI defaults to All time, ranked by lines changed (added plus removed), and supports sorting by merged PRs or commits, month/rolling filters and contributor search. Expand a contributor's repository details to inspect individual dated commits and PRs; Show more makes every matching record reachable. A dash means unknown; a measured zero remains zero. Select a contributor to open their card: an orange GitHub-style calendar of commits and opened PRs per UTC day (last 12 months or any active year), first/latest contribution, active days, longest streak and a month-by-month timeline for the selected period. Selecting a calendar day filters the timeline. Export downloads the visible rows as a Markdown table or opens a dark, VOSS-styled print view with activity calendars; choose Save as PDF in the print dialog. The earlier office scene remains in the source and is dormant.

## Container for local Worker preview

```sh
docker build -t vleaderboard .
docker run --rm -p 8787:8787 -v vleaderboard-kv:/app/.wrangler/state vleaderboard
```

This runs Wrangler's local Worker emulator on Node 24. Git history, process artifacts, environment files and local secrets are excluded from the image. To enable local scheduled capture, mount a prepared `.dev.vars` file read-only at `/app/.dev.vars`. The container is a development/preview runtime; production runs on Cloudflare Workers.
