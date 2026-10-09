# Tech Lead Notes: VLeaderboard

2026-10-09. Project `proj-f983e77652b4bb2f`, implementation phase. The approved ARCHITECTURE and accepted VLIPs define the implementation contract.

## Stack

- Frontend: existing React 19, React Router 7 SSR, strict TypeScript, Tailwind 4 and Vite; client-initialized PixiJS v8 owns the office scene.
- Backend: React Router loader and public snapshot resource route in the existing Node SSR process; bounded GitHub REST reads and process-local cache.
- Database and auth: none required by this public spectator slice.
- Deploy: preserve existing Node/Docker build shape; no hosting or webhook integration is assumed.
- The generic archetype's TanStack Query, shadcn and better-auth suggestions do not override the approved minimal stack.

## Conventions

- Keep source files below 400 lines, with focused domain modules and strict TypeScript contracts.
- Use `app/data/types.ts` verbatim from ARCHITECTURE as the shared source of truth; no renderer objects enter snapshots.
- React owns selection, source mode, directory, panels and accessible controls. Pixi owns frame state and camera transforms; it never fetches or calculates ranking.
- Preserve explicit source/coverage labels and `null` unknown versus observed empty/zero. Genuine data never falls back to simulated activity.
- Keep optional credentials and upstream caching in `.server.ts`; validate route inputs and return generic unexpected failures.
- Provide loading, empty, partial, stale and renderer-error states. Honor pause, reduced motion, hidden tabs, keyboard equivalents and mobile panel access.
- No comments/docstrings by default, emojis, attribution footers, dead code or credentials in source.

## Tradeoffs

- Client-only Pixi preserves SSR and semantic HTML while supporting modular textured animation.
- Exactly four recency-selected repository slots preserve a readable floor; All rooms reaches the complete catalog through dedicated room scenes.
- Process caching and bounded public snapshots serve the present slice with disclosed coverage; production event infrastructure remains a separate host-specific integration.

## Coordination points

| Owner | Files and obligations |
| --- | --- |
| Data | `app/data/*`, snapshot route, `app/routes.ts`, domain tests and delivery/environment docs; publish shared types first and export `createPreviewSnapshot`, `deriveLeaderboard`, `loadSnapshot` exactly as specified. |
| World | `app/office/*`, `public/office/*`, `package.json` and lockfile; export named `OfficeWorld(SceneProps)`, consume supplied sprites, own dependency installation and motion checks. |
| Shell | Home/root/CSS/components; consume data and world contracts, provide a flex-sized renderer host, maintain accessible state and isolate browser request cancellation from scene rendering. |
| Parent/tech lead | Process artifacts and integration review; preserve every owner's edits and run combined verification after modules settle. |

- `SceneProps` callbacks are the sole bridge: selection, follow exit, preview feed, visit-active state and mount readiness/error. Reuse nonce commands; do not invent a parallel scene API.
- Mode/repository fetching preserves the current valid snapshot, aborts older requests and rejects stale results. Historical source events remain `fresh: false`.
- Directory visits to off-floor repositories restore the prior main camera on return. Independent panel collapse preserves center/scale and triggers size observation.
- Named roster/table/room IDs and GitHub identities are fixed by ARCHITECTURE. Real assignments stay unknown unless confirmed.
- Only the world owner mutates dependencies; coordinate any necessary test script changes with that owner.

## Integration verification

Run strict typecheck and production build, meaningful data tests for rank ties/bots/dedup/periods/source separation/backoff, and motion tests with injected time for corridor routes and freeze/resume. Browser checks cover desktop/mobile, independent panel collapse, All rooms, person/project inspection, follow/manual exit, camera controls, labeled tour, pause/reduced motion and initialization cleanup. Compare modular artwork to the approved concept. Report genuine-data coverage and remaining externally configured webhook work explicitly in IMPLEMENTATION.

No contract incompatibility was identified in the approved architecture. Implementation review remains pending until the modules are complete.
