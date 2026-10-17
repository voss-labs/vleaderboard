# VLeaderboard current handoff

2026-10-17. Current task pointer is in state.json; task-state.json also links the original project. Live phase is owned by Preset.

## Current update

Complete available contribution history is live under task `proj-2a3d9fa34f971f90`. Source commit `2f22214a13bf29d44e3af86fb9f75f29c7bc72ba` is pushed to main and deployed as Worker version `a3f3bf9e-5afc-4b33-9a50-5c43ada16d33`. The real 12:45 UTC Cron published at `2026-10-17T12:45:26.948Z`: 17 public repositories, 151 PRs, 310 non-merge commits and 30 All time contributors; earliest committed date March 2025. Every PR/default-branch commit page is traversed; 100 is only a page size. All time is the board/API default. Contributor details expose individual linked commit headlines/SHAs/UTC dates/changed lines and PR titles/states/opened/merged/closed dates, with unlimited Show more. Parth's Oct 2 commit is restored as 1/+744/-213, with all three PRs correctly unmerged. Strict remote KV, both production hosts' APIs and actual rendered records match. Original token/KV/Cron and preview rejection retained. 82 full tests, typecheck/build/dry-run, independent review, genuine built runtime success/byte-retention and keyboard/mobile/record-batch browser checks passed. Read TASK.md, HISTORY-CHECKS.md, HISTORY-REVIEW.md, HISTORY-RUNTIME.md and HISTORY-LIVE.md; screenshot `design/history-live.png`. Live board: https://vleaderboard.vosslabs.org/. Scope remains current public catalog/default-branch non-merges, including forks/archives; other branches and private/deleted repositories are excluded. Safe operational bounds retain the last complete snapshot on failure.

The previous capture transport failure was fixed under `proj-bb7b90b8b486abb3` at source `75675444f47e0011726fcfc1d4654cd5ae5fe350`. Workerd rejected `redirect:error` before GitHub I/O; manual handling rejects redirects safely. CAPTURE-FIX.md, CAPTURE-REVIEW.md and CAPTURE-LIVE.md preserve that incident's evidence. Its ten-commit/100-PR history limits are superseded by the complete-history update above. Earlier entries below describe prior milestones and deployment boundaries at their completion time.

The leaderboard-only update is complete at 210dbaddf56c9ec26e4cd77b7104acb4116166e3: small avatars, PR/commit/changed-line details across all 16 public repos, search, periods, no game UI and no production Preview. Forty tests, typecheck/build, independent review and genuine production/mobile browser checks pass. Read BOARD-CHECKS.md, BOARD-FINAL-REVIEW.md and LEADERBOARD-TASK.md for evidence. Metrics remain bounded captured history, not full lifetime totals.

Boss requested Cloudflare Worker code with the website and contributor API in one Worker. Implementation and local validation are complete under task proj-6d42d886a09354ca; read TASK.md, WORKER-CHECKS.md and WORKER-REVIEW.md. One Worker serves React Router8 SSR/assets, /api/snapshot and server-computed /api/leaderboard. A15-minute scheduled GraphQL-assisted capture writes validated public KV; readers never scan GitHub. GITHUB_TOKEN is a Worker secret. Failed captures retain last good data; stale/unknown/partial limits and production Preview rejection remain explicit. Final61tests, typecheck/build, dry-run, independent review and local Worker HTTP/browser pass. Genuine local KV has16repos/148PRs/91commits; no missing stats. Parent-owned Vite production Worker preview is running on127.0.0.1:5173 (session85047). No remote resources, secret upload or public deployment. README documents namespace setup and first deployment using ignored .deploy.secrets; no actual secret file was created.

## Previous office scope

- Spectator office; click people/rooms, pan, zoom, follow characters.
- PixiJS world and React panels in existing React Router SSR project.
- Approved pixel-art concept in design/office-concept.png, with subsequent revisions in PRODUCT.md taking precedence over the image.
- Adjacent Maintainer Harshal More and Co-Maintainer Kanchan Chavan rooms; no faculty/advisors.
- Core room: Engineering, Community and Research tables. Separate DevRel room beside Open contributors, with slides and campaign-planning animation.
- Exactly four active repo rooms in main view; All rooms directory to browse/visit every repo.
- Independently collapsible Projects and Leaderboard panels.
- Subtle ongoing working animation, occasional source-labeled activity bubbles, slow hours-paced room visits. Fun and explorable first local visual build is the immediate priority.
- Use GPT-6.1-Sol xhigh specialist agents; parent acts as planner.

## Evidence and state

- Audit passed typecheck/build; healthy untouched scaffold. AUDIT.md records details.
- Source baseline commit c9205168ea4ccdff0181c79b8e4d085ccc203b6d. Product/research checkpoint 248602aa547f97ec10d80f26bfb675e8828b879d. Active branch codex/animated-office.
- Architecture baseline 0f2c2d47255633f5b4b159f56570c2db4dd657d4. Implementation checkpoint 092e3d035f982a2adecdc6ec1550f36a82b2e8dd; shared data, React interface and Pixi world are built. IMPLEMENTATION.md describes the delivered local slice; source is in app/ and public/office/.
- Twenty-two domain/motion tests, strict typecheck and production client/SSR build passed. BROWSER-CHECKS.md records rendered desktop/mobile inspection, room navigation, panels, Follow, Tour, pause/zoom, genuine data and a corrected 320px header overflow. design/implemented-office.jpg is the actual implementation screenshot.
- Independent review and QA both passed. Review checkpoint 84638c3e51991cb549371d5e9d45e517ad09d98e fixes room-rebuild cooldowns; independent scene testing verified a 167.984-minute repeat interval. QA checkpoint 2ff507181077c62e5b9e4e34e9f176c2e461bc1c includes QA.md and qa-playback.mjs. Actual CSS 320/390 layouts, focus, API boundaries and motion playback passed. Read live Preset state for the delivery gate.
- Parent-owned local dev server session 96768 is running at http://127.0.0.1:5173/. The in-app browser can open it. No Git remote, public deployment or PR has been created.
- DEPLOY.md records a passing production HTTP smoke for SSR, preview JSON and static assets on temporary loopback 4173. That temporary server was stopped. The accepted local delivery is complete; the gate closure does not authorize or claim a public/live-event release.
- Official palette #FB7A3C, #0A0A0A, #FAFAFA; Geist/Geist Mono. Twelve public repositories verified.
- research/ stores primary-source evidence. Generic website hierarchy does not override Boss's diagram or revisions.

## Truth boundaries

Preview animation and sample messages are explicitly authorized and labeled. Do not infer online status, repo leadership or GitHub identities. Known mappings only: Harshal harshalmore31, Mandar Mandar885, Armash armash66. Public GitHub mode fetches genuine cached catalog/selected repository snapshots; main-floor selection uses most recently pushed, and board scope/date coverage is visible. Unconfirmed project assignments stay empty in genuine mode. Prompt webhook delivery still needs durable event infrastructure and authorized external setup; this app is not live-event connected yet.
