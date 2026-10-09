# Architecture: VLeaderboard

2026-10-09. Project `proj-f983e77652b4bb2f`. Implements the approved spectator office on the existing React Router SSR scaffold. Immediate delivery is an animated visual preview, with bounded public GitHub snapshots when connectivity permits. Prompt webhooks remain a later externally configured integration.

## Modules

| Module and files | Responsibility | Owner agent |
| --- | --- | --- |
| `app/routes/home.tsx`, `app/root.tsx`, `app/app.css`, `app/components/*.tsx` | SSR page, independently collapsible panels, directory, inspection, leaderboard, activity, accessible controls; React state and renderer props | Frontend shell |
| `app/office/OfficeWorld.tsx`, `app/office/{scene,camera,layout,motion,art}.ts`, `package.json`, lockfile | Client-only Pixi lifecycle, textured office, hit testing, camera, sprite animation, corridor movement, Pixi dependency installation | World frontend |
| `app/data/{types,roster,preview,derive}.ts` | Shared contract, confirmed names/roles, labeled fixtures, pure room ordering and board calculations | Data engineer |
| `app/data/{github,load-snapshot}.server.ts`, `app/routes/api.snapshot.ts`, `app/routes.ts`, README, `.gitignore`, `.dockerignore`, `.env.example`, test configuration and domain tests | Bounded public GitHub reads, normalization, process cache, freshness/error states, route registration, domain checks and delivery documentation | Data engineer |
| `public/office/*`, scene motion checks | Consume supplied modular sheets and frame map, verify waypoint/motion behavior | World frontend |
| `.preset/*`, browser/visual review | Architecture/process coordination, supplied artwork and integration verification | Parent planner |

Owners edit only their files and accommodate others' changes. Keep each source file below 400 lines and dependencies to existing React/Tailwind plus `pixi.js` v8. No Pixi React adapter, physics, state library, auth, database, or second fetch framework is required. Data publishes shared types first, then shell/world build in parallel; the parent has supplied two transparent 4×4 pixel-art sheets and their frame map for the world worker.

React owns semantic state; Pixi owns ephemeral frame state. The renderer never fetches GitHub, computes ranking, or mutates a snapshot. Data normalization never imports Pixi or browser APIs. `OfficeWorld` imports Pixi dynamically inside its mount effect so SSR renders the HTML shell and a stable loading placeholder.

### World composition and artwork

- Adjacent top rooms: Harshal More and Kanchan Chavan, with individual nameplates and maintainer signs.
- Below: one core room with three visibly separate tables. Engineering seats Devdatta Talele, Amey Pawar, Mandar Patil, Shubham Ralkar; Community seats Armash Ansari and Sujal Tiwari; Research seats Shubhan Telang and Manas Deshpande.
- Exactly four repository rooms in two columns below core. Each has a lead station and five member places. Unconfirmed real assignments leave available seats; preview occupants have explicit synthetic names and fixture badges.
- At the bottom, Open contributors and a separate adjacent DevRel room. Himanshu Choyal and Parth Indulkar occupy DevRel; its screen cycles slides, one character presents, and the other occasionally works at the planning board.
- Connected floor/corridors, doorways, warm walls, wood desks, monitor depth, chairs, plants, rugs, bookshelves, foreground shadows, and varied character silhouettes reproduce the concept's elevated top-down perspective. No faculty/advisor elements.

Use reusable transparent PNG pixel-art pieces for furniture and sprites, not a screenshot of the entire office. Required pieces: desk/monitor/chair groups, table, bookshelf, plant, sofa, noticeboard, presentation screen, and character idle/work/walk frames. Supplied sheets are `.preset/design/characters.png` and `.preset/design/furniture.png`, each 1254×1254 with 4×4 frames, described by `.preset/design/ASSETS.md`. World copies them to `public/office/characters.png` and `public/office/furniture.png` and crops using integer quarter boundaries from the supplied frame map. Scene assembly uses texture sprites, procedural tiled flooring and restrained geometric wall/selection overlays. Distinct frame poses and monitor overlays provide animation; large flat rectangles with dots for people do not meet the approved visual direction. Use consistent 1-pixel outlines, palette, perspective, anchor points, nearest sampling, and integer sprite positions. Preserve readable HTML text outside the canvas; short room signs may use Pixi Text.

### Directory and camera behavior

Main floor selection is stable for the lifetime of a loaded snapshot. Preview chooses four repositories using declared synthetic recent-push timestamps; display `Preview selection · simulated activity`. Genuine mode sorts nonarchived, nonfork public organization repositories by `pushedAt` descending, then `fullName` ascending, and takes four. Display `Most recently pushed · GitHub snapshot` with capture time. This recency proxy is not a complete activity-volume measure or a contributor leaderboard; incomplete Events API history is never used to imply all work was measured. If fewer than four eligible repositories exist, show available-room slots rather than invent repos.

`All rooms` opens a searchable HTML directory of every repository returned by the organization catalog, including `.github` and archived/fork entries with factual badges. Show coverage if the catalog is truncated. Selecting one of the main four selects it and focuses its room. Selecting any other repository changes `view` to a dedicated project-room scene with the same furniture template and a prominent `Back to office` control; it does not replace or append a fifth main-floor room. Returning restores the prior main camera transform. Directory selection closes the dialog and moves focus to the inspection heading. Main panel lists four highlighted rooms; All rooms remains available when that panel is collapsed.

The camera is one world Container transform. Pointer drag and touch drag pan; wheel/pinch and HTML +/- buttons zoom about the pointer/viewport center; fit resets to visible scene bounds. Clamp zoom relative to fit within 0.65–3.0 and keep reachable content inside a generous camera margin. Follow centers a selected person's current position. Any manual pan, zoom, fit, or project visit exits follow via `onFollowChange(null)`. Selection alone does not enable follow. Keyboard buttons/list items duplicate canvas selection and camera actions.

Observe the host with ResizeObserver. Independent panel collapse/reopen changes renderer dimensions while preserving the current world center and scale; do not rerun initial fit or jump the viewport. Fit happens only at first scene load, explicit fit command or deliberate scene switch. Follow mode remains centered on its person after resize.

### Motion and lifecycle

Ambient work starts immediately: per-character staggered 2–5 second typing bursts separated by 8–25 second rests, slow monitor flicker and occasional desk motions; DevRel slides change every 20–40 seconds and planning/presenting poses alternate every 45–90 seconds. Avoid synchronized motion. Occasional preview work bubbles start after 12–25 seconds, then recur every 35–80 seconds across the whole scene; each visibly says `Simulated` and expires after 6 seconds. At most two scene bubbles and one per person; queue at most eight, group overflow into a feed entry. Animation is decorative and never denotes online presence.

Natural visits use seeded schedules for predictable testing: each eligible project occupant's next visit is 45–120 minutes of active visible simulation time away; after returning, schedule another 90–180 minutes away. At most one autonomous traveler exists globally. A visit walks seat → project door → shared corridor → core door → Engineering visitor waypoint, waits 20–45 seconds, continues via corridor → Harshal's door → maintainer visitor waypoint, waits 20–45 seconds, and returns on reversed waypoints. Movement is 14–22 logical pixels/second, with 1–3 second pauses at doors. Routes come from a fixed walkable waypoint graph, never direct interpolation through furniture/walls. No pathfinding library is needed.

The `Tour` button, labeled `Simulated visit`, increments a command nonce; it starts one labeled simulated visit immediately using the same slow path and never changes real work data. Subsequent commands are ignored while one demonstration is in progress; shell shows the active demonstration state. Normal loading must look inhabited without waiting for the hours-scale travel schedule.

`paused || reducedMotion || document.hidden` freezes simulation time, travel, work frames, slides and preview bubbles. On resume discard elapsed hidden/paused wall time; do not catch up hours of movement or popup bursts. Pause does not stop data refresh or hide readable activity. While paused/reduced motion, camera buttons, manual pan/zoom, selection and resizing still render on demand; camera focus changes snap instead of tween. Turning reduced motion on resets active travel to its home seat and cancels future demonstration commands until disabled. Unmount/StrictMode replay cancels initialization, ticker callbacks, pointer/listener/ResizeObserver registrations and destroys the completed Pixi app and scene-owned textures exactly once. Destroy a late-initialized app after cancellation instead of appending its canvas.

## Data model

The data engineer creates `app/data/types.ts` exactly from this contract before parallel UI work. IDs are strings; ISO timestamps are UTC. Unknown information is `null`, observed empty lists are `[]`, and observed zero counts are `0`. Snapshot state is serializable and must not contain Pixi objects, Dates, Maps, credentials, or response headers with secrets.

```ts
export type DataMode = "preview" | "github";
export type Period = "month" | "30d" | "all";
export type TableId = "engineering" | "community" | "research";
export type Selection = { kind: "person" | "repository"; id: string } | null;
export type WorldView = { kind: "office" } | { kind: "repository"; repositoryId: string };
export type SourceState = {
  mode: DataMode;
  status: "ready" | "partial" | "stale" | "unavailable";
  fetchedAt: string | null;
  message: string;
  retryAt: string | null;
};
export type Person = {
  id: string;
  name: string;
  role: string;
  kind: "named" | "preview" | "github";
  github: { id: number; login: string; url: string } | null;
  homeRoomId: string;
  table: TableId | null;
  repositoryIds: string[];
  assignment: "confirmed" | "preview" | "unknown";
  palette: number;
};
export type Repository = {
  id: string;
  githubId: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  archived: boolean;
  fork: boolean;
  pushedAt: string | null;
  leadPersonId: string | null;
  memberPersonIds: string[];
  assignment: "confirmed" | "preview" | "unknown";
};
export type WorkItem = {
  id: string;
  repositoryId: string;
  number: number;
  title: string;
  url: string;
  kind: "pull-request" | "issue";
  state: "open" | "closed" | "merged";
  authorPersonId: string;
  assigneePersonIds: string[];
  requestedReviewerPersonIds: string[];
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  isBot: boolean;
};
export type ActivityEvent = {
  id: string;
  personId: string;
  repositoryId: string | null;
  kind: "opened" | "merged" | "closed" | "reviewed" | "committed" | "planning" | "visit";
  text: string;
  occurredAt: string;
  source: "preview" | "github";
  url: string | null;
  fresh: boolean;
};
export type RepositoryWork = {
  repositoryId: string;
  status: "ready" | "partial" | "stale" | "unavailable";
  fetchedAt: string | null;
  pulls: WorkItem[] | null;
  issues: WorkItem[] | null;
  message: string;
};
export type OfficeSnapshot = {
  version: 1;
  source: SourceState;
  people: Person[];
  repositories: Repository[];
  mainRepositoryIds: string[];
  roomSelectionBasis: string;
  catalogComplete: boolean;
  work: RepositoryWork[];
  activity: ActivityEvent[];
};
export type LeaderboardRow = {
  personId: string;
  rank: number;
  merged: number;
  opened: number;
  reviews: number | null;
};
export type Leaderboard = {
  rows: LeaderboardRow[];
  period: Period;
  from: string | null;
  to: string;
  coveredRepositoryIds: string[];
  complete: boolean;
  label: string;
};
export type CameraCommand = {
  nonce: number;
  kind: "fit" | "zoom-in" | "zoom-out" | "focus-selection";
};
export type SceneProps = {
  snapshot: OfficeSnapshot;
  selection: Selection;
  view: WorldView;
  followedPersonId: string | null;
  paused: boolean;
  reducedMotion: boolean;
  cameraCommand: CameraCommand | null;
  previewVisitNonce: number;
  onSelect: (selection: Selection) => void;
  onFollowChange: (personId: string | null) => void;
  onPreviewEvent: (event: ActivityEvent) => void;
  onVisitActiveChange: (active: boolean) => void;
  onReady: () => void;
  onError: (message: string) => void;
};
```

Confirmed room IDs are `maintainer`, `co-maintainer`, `core`, `devrel`, `commons`; each repository's room ID is `repo:${repository.id}`. Named person IDs are deterministic slugs (`named:harshal-more`, `named:kanchan-chavan`, etc.). Known GitHub mappings attach to named records: Harshal 86048671/harshalmore31, Mandar 205825698/Mandar885, Armash 172116296/armash66. Other named identities have `github: null`. Unknown source authors use `github:${user.id}` and live in commons with correct login; never merge by display name. Synthetic people use `preview:*` IDs and are absent in genuine mode. Every roster role/table comes from PRODUCT; no GitHub activity implies a team/lead assignment.

Repository IDs use `github:${repository.id}` in both modes, so navigation survives a mode change when that repo exists. Real metadata may seed preview rooms, but preview counts/assignments/activity remain synthetic. PR identity is `${repository.id}:pr:${number}`, issue identity analogous. Initial historical snapshot events use `fresh: false` and never replay as incoming bubbles. Real author attribution uses the PR author, independent of who merged/closed it.

## API contracts

### Shared module exports

- `OfficeWorld`: named export from `app/office/OfficeWorld.tsx`, accepts `SceneProps`. Shell supplies a wrapper with actual flexible height/width; renderer observes that element and reports one readiness/error result per mount.
- `createPreviewSnapshot(now: Date): OfficeSnapshot` from `app/data/preview.ts`. Fixed fixtures deterministic apart from declared capture time, covering all catalog rooms and every state needed for interactions.
- `deriveLeaderboard(snapshot: OfficeSnapshot, period: Period, now: Date): Leaderboard` from `app/data/derive.ts`. No mutations or fetches. Rank authored merged PRs by mergedAt inside `[from,to)`, exclude bots and duplicate PR IDs, and use competition ranks (1,1,3). UTC month starts at first day 00:00; `30d` uses exact 30 preceding days; `all` means available captured history, not complete organization history. Opened uses createdAt; reviews remain null until fetched. Equal counts share rank and use name/id only for stable display order.
- `loadSnapshot(options: { mode: DataMode; repositoryId?: string }): Promise<OfficeSnapshot>` from `app/data/load-snapshot.server.ts`. Preview is synchronous internally and never reaches GitHub. Genuine data failures remain genuine unavailable/stale data.

### Public resource route

`GET /api/snapshot?mode=preview|github&repositoryId=<known-id>` returns `OfficeSnapshot` JSON. Only explicit `voss-labs` public repositories discovered in the catalog are eligible; reject invalid modes/IDs with 400 JSON `{ error: string }`. Do not allow arbitrary upstream URLs, organization names or credentials from the client. Upstream outage/rate limiting returns the last snapshot with explicit `stale`, or `unavailable` with null unknown work, as 200 domain state; unexpected internal failure returns 500 generic error. Endpoint is read-only and contains no user-private material.

Home SSR loader calls `loadSnapshot({ mode: "preview" })`, providing instant reliable visuals. Shell keeps current snapshot while fetching mode/repository changes with browser `fetch`/AbortController; discard old request results after a newer selection and abort on unmount. Genuine selection fetches the catalog plus that repository's work. A successful explicit refresh can replace data; no per-frame fetches or automatic historical popup replay. Return `Cache-Control: no-store` to browsers; the server module owns upstream caching.

### Bounded GitHub adapter

Use public REST fetches with JSON Accept/User-Agent headers and a pinned API version supported by current docs. Catalog: `/orgs/voss-labs/repos?type=public&per_page=100`, follow `Link` pagination up to three pages and disclose `catalogComplete: false` if more remain. Catalog TTL 10 minutes, work TTL 5 minutes; coalesce concurrent requests by cache key, timeout each request after 8 seconds, preserve last valid response on failure. Cache is process-local, bounded to the organization catalog and its repository work, and clears on restart. Optional runtime `GITHUB_TOKEN` stays only in `.server.ts` and is unnecessary for the preview. 403/429 uses upstream reset/retry headers for `retryAt` and prevents repeated requests during backoff.

Selected repository work: `/repos/voss-labs/{name}/pulls?state=all&sort=updated&direction=desc&per_page=100` and `/repos/voss-labs/{name}/issues?state=open&per_page=100`; remove `pull_request` entries from issues. Initial slice takes one page of each and explicitly marks history partial when another page exists. Requested reviewers/assignees come from fetched PR objects; assigned issues from issue objects. Reviews not fetched are unknown. Catalog `open_issues_count` includes pull requests, so do not display it as a factual issue-only count.

Board title in genuine mode is `Merged PRs · fetched repository coverage` with covered repository names, date window and `Partial history` whenever bounded PR coverage is incomplete. An untouched repository has unknown work; it contributes no fake zero row. Snapshot mode never mixes simulated counts into genuine ranking. Fixture feed and ephemeral world events are separate React state; source badges follow every simulated bubble/feed entry. The first visual slice may show preview mode while genuine mode has limited repository coverage, but must not claim live integration.

### Verified Pixi v8 surface

Verified 2026-10-09 against primary docs: construct `new Application()` then `await app.init(...)`; attach `app.canvas` (not deprecated `view`). Use WebGL preference, antialias false, element dimensions and capped device resolution. Add world Container/Sprites to stage. Load PNGs with `Assets.load`, set texture-source sampling to nearest; use `eventMode`, `pointertap`, explicit `hitArea`, and `globalpointermove` for hit-independent dragging. Ticker callbacks receive the ticker object (`deltaMS`), not an old numeric delta; clamp frame delta to 50 ms, cap 30 FPS, and stop/restart or render on demand when motion is inactive. Cleanup uses `app.destroy({ removeView: true }, { children: true })` plus deliberate unloading/destruction of scene-owned textures; do not destroy assets shared by another live instance.

Sources: [Application lifecycle](https://pixijs.com/8.x/guides/components/application), [Application API and destroy options](https://pixijs.download/release/docs/app.Application.html), [events](https://pixijs.com/8.x/guides/components/events), [ticker](https://pixijs.com/8.x/guides/components/ticker), [textures](https://pixijs.com/8.x/guides/components/textures), [GitHub repository endpoints](https://docs.github.com/en/rest/repos/repos#list-organization-repositories). Additional GitHub rate-limit/webhook evidence is in [saved research](research/github-and-rendering.md).

## Deployment shape

Retain existing Node SSR entry point, `react-router-serve`, Vite pipeline, and multi-stage Node 24 Docker shape. SSR produces usable panels and canvas placeholder; client initializes Pixi after hydration. `npm run dev`, `npm run typecheck`, and `npm run build` remain the primary workflow. No hosting destination is assumed and no deployment is performed by this architecture.

Optional public snapshot access uses the same SSR process, server-only token environment variable, bounded memory cache and public resource route. Exclude `.env*`, `.git`, node_modules, build debris and unnecessary `.preset` artifacts from secret-sensitive Docker copy contexts before adding runtime credentials. No persistence guarantee is claimed for process cache. An HTTP endpoint reachable from GitHub, authorized subscription, secret, durable event acceptance and reconnect transport must be designed against the chosen host later; the current delivery explicitly has no webhook route or live claim.

Verification targets the real behaviors: deterministic recency selection, all-catalog directory reachability, competition ties/bot/dedup/time boundaries, source separation, unknown versus zero, stale/backoff behavior, waypoint segments staying in corridors, pause/hidden/reduced-motion freeze, and browser interaction on desktop/mobile. Run strict typecheck/build, browser smoke checks, independent visual review against the concept, and meaningful data/motion unit checks with injected clocks rather than waiting hours.

## Decisions

- [VLIP-1: Separate the pixel world from semantic UI and factual data](vlips/vlip-01-renderer-boundary.md).
- [VLIP-2: Keep source truth and a bounded four-room floor](vlips/vlip-02-source-and-room-scope.md).
- Preserve installed React Router SSR instead of migrating to the generic default Next.js stack. User selected PixiJS and approved implementation; architecture applies that decision.
- Delivery needs no auth, database, admin, multiplayer, faculty/advisors or speculative event service. Public snapshot freshness and coverage are observable limitations, not hidden fixture fallbacks.

## Open questions

None blocks the authorized visual slice. Production webhook endpoint/hosting/access and unverified GitHub identities/project memberships remain later external dependencies. Real names/roles are confirmed; real repository assignments are not.
