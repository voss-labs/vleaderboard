# VLeaderboard current handoff

2026-10-17. Current task pointer is in state.json; task-state.json also links the original project. Live phase is owned by Preset.

## Current update

Boss now requests a leaderboard-only page with a small avatar beside each contributor. This supersedes the visible office/game UI below. Hide the office canvas, rooms, people/project panels, tours and narrative activity. New steering adds commits, PR counts, lines added/removed and contributor details across every public VOSS repository. Production must use genuine GitHub only, hide Preview and reject fixture requests; development may retain an explicit preview switch. Improve the board with tighter spacing, contributor search, clear period and coverage controls, and readable per-repository details. Use bounded default-branch commit records with cached SHA details so code metrics share the PR date window; exclude merge diffs and mark partial/unavailable coverage. Research is in research/contribution-metrics.md. Task project: proj-80a9413ef32d45f1; all-repo/prod/UX implementation is underway after initial ranking tests and build passed.

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
