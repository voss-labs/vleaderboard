# Implementation: VLeaderboard

2026-10-09. Project `proj-f983e77652b4bb2f`. Implementation record updated after passing independent review and QA at application commit `84638c3e51991cb549371d5e9d45e517ad09d98e`. This artifact covers the authorized animated visual slice and bounded public GitHub snapshots. It does not describe a production live-event release.

## Modules built

### Shared model and source data

- `app/data/types.ts` implements the accepted serializable `OfficeSnapshot`, domain records, selection, camera commands and `SceneProps` contract. React owns semantic state; Pixi receives data and callbacks and neither fetches nor ranks.
- `roster.ts` records all 12 confirmed names and roles. Harshal More and Kanchan Chavan have adjacent maintainer rooms. Eight core members occupy Engineering, Community and Research tables. Himanshu Choyal and Parth Indulkar occupy separate DevRel beside Open contributors. Only Harshal, Mandar and Armash have source-confirmed GitHub identity mappings; other real identities and repository assignments remain explicitly unknown.
- `preview.ts` supplies the full 12-repository catalog and a fixed 9 October 2026 scenario. Four recency-selected preview rooms contain 24 synthetic occupants, one lead and five members per room. Preview work, memberships, rankings and activity are labeled simulated. Invented work items do not link to invented GitHub URLs.
- `derive.ts` selects exactly four eligible main repositories using pushed-at recency with deterministic ties. It ranks authored merged PR counts using UTC month, exact preceding 30 days or available captured history; it excludes bots and duplicate PR IDs and uses equal competition ranks. Requested reviews remain inspectable where fetched; performed review counts remain unknown.
- `github.server.ts` performs bounded public organization-catalog and selected-repository PR/issue reads. It attributes people by stable GitHub user IDs and PR authors, removes PR records from issue-only lists, retains factual states and publishes historical activity with `fresh: false`.
- `snapshot-cache.server.ts` and `load-snapshot.server.ts` provide request coalescing, ten-minute catalog/five-minute work caches, eight-second upstream timeout, rate-limit backoff, stale preservation and cold unavailable states. Source capture uses the latest successful catalog/work capture so newer fetched merges remain inside the board window; failed requests retain capture times. The cache is process-local and bounded to catalog repositories. Genuine failures never substitute preview records.
- `/api/snapshot` provides version-1 JSON, validates mode and discovered public repository IDs, disables browser caching, returns upstream problems as truthful domain states and unexpected failures as generic errors. The home SSR loader starts in preview mode without requiring external setup.

### Pixel world

- `OfficeWorld.tsx` initializes Pixi after client mount and provides scene loading/error states. Cancellation is checked before late scene construction and before canvas attachment/listeners. `scene.ts`, `camera.ts`, `layout.ts`, `rooms.ts`, `art.ts` and `motion.ts` isolate rendering, camera, placement, reusable artwork and deterministic motion responsibilities.
- A textured elevated top-down office uses modular transparent character and furniture atlases from `public/office/`. It contains adjacent maintainer rooms, exactly three core tables, exactly four main repository rooms with six stations each, Open contributors and separate DevRel. No faculty/advisor representation appears.
- All rooms visits use a dedicated repository scene for off-main catalog entries. Returning restores the main camera instead of adding a fifth main room. Resize preserves camera center/scale. Pointer and touch drag, wheel/pinch, zoom, fit, focus, selection and follow use the shared bridge; manual camera commands exit follow.
- Ambient simulation starts immediately with staggered work motion, changing monitors, DevRel slides, a shared planning table and presentation/planning poses. Simulation/rendering is capped at 30 FPS. Simulated work bubbles also enter the accessible activity feed. Source-backed historical events are not replayed as new events.
- One slow traveler follows orthogonal room-door/corridor waypoints, visiting core and maintainer before returning. Seeded natural visits begin after 45–120 visible minutes and repeat after 90–180 minutes. The labeled Tour demonstrates that path at 19 logical pixels per second with destination and door pauses; it is disabled with visible context when no eligible main-floor actor exists.
- Per-person visit deadlines persist across scene rebuilds. Completion and interruption reschedule visits, and newly observed actors schedule relative to current simulation time; room navigation cannot bypass the repeat cooldown.
- Pause, reduced motion and hidden tabs freeze simulation and discard elapsed inactive wall time. Selection, manual camera operations and resizing still render on demand. Reduced motion returns an active traveler to its seat.

### React interface and delivery

- `home.tsx`, `OfficePanels.tsx`, `OfficeDialogs.tsx`, `Inspector.tsx`, `ui.tsx` and `useOfficeSnapshot.ts` replace the starter screen with an ink/paper/orange interface using Geist and Geist Mono.
- Projects and leaderboard panels independently collapse/reopen around a flex-sized scene. All rooms remains available from scene chrome and mobile navigation. Searchable repositories and people supply keyboard equivalents to canvas selection; native dialogs handle modality, Escape and focus restoration.
- Person inspection shows confirmed roles, known/unknown team and identity data, authored PRs, assigned issues, requested reviews and activity. Repository inspection shows source description, known/unknown team, captured open PRs/issues and real repository links. Unknown data differs from observed empty lists.
- Snapshot requests preserve the current valid scene while pending, abort superseded requests and ignore stale responses. Source modes, preview badges, partial/stale/unavailable state and retry controls remain explicit.
- The board exposes its exact UTC inclusive/exclusive window, source label, covered repository names and history completeness. Historical activity and capture timestamps include date context. A source-details dialog exposes actual state/message/backoff and a reachable mobile refresh/retry action. Repository directory entries include factual archived/fork labels.
- Existing React Router SSR, strict TypeScript, Tailwind/Vite and Node/Docker build shape are preserved. PixiJS 8.22.0 is the only new runtime dependency. The scaffold already used React Router 8.4.0 at the architecture baseline; the architecture's reference to version 7 was descriptive drift, not an implementation framework migration.
- README, environment template, Git/Docker exclusions, Node 24 engine/test script and CI configuration document the runnable slice. No database, auth, private access, deployment destination or event infrastructure was introduced.

## Tests

Current evidence is in `BROWSER-CHECKS.md`, passing independent `REVIEW.md` and `QA.md`, the owner work reports and domain/motion tests. QA tested application commit `84638c3e51991cb549371d5e9d45e517ad09d98e`. This documentation update did not rerun checks or change application code.

- Independent QA confirms `npm test` passes all 22 tests, comprising 14 data/snapshot tests and eight motion/layout tests. Coverage includes deterministic selection, source separation, ties, bots, deduplication, UTC boundaries, unknown counts, public author attribution, pagination limits, concurrent reads, stale/backoff/recovery, resource-route errors, hierarchy/stations, focused commons overflow, orthogonal visit paths, slow movement/holds, hidden-time discard, seeded quiet intervals, 30 FPS frame gating and persistent visit cooldowns.
- Parent and independent QA confirm strict `npm run typecheck` and final production `npm run build` pass, including client and SSR bundles. Review and owner checks confirm `git diff --check` passes. All reviewed source modules are below 400 lines.
- Read-only genuine-data smoke captured `2026-10-09T09:36:08Z` returned the complete 12-repository catalog and vroom coverage of 12 PRs plus 19 issue-only records. The snapshot remained GitHub/partial, contained no preview people and no fresh historical events. Genuine recency selected vshow, vmaps, vroom and first-contributions.
- Initial sandbox DNS failure produced genuine/unavailable state with no fixture substitution; a reviewed read-only public-network smoke subsequently passed.
- Integration source review confirmed shared exports and `SceneProps` compatibility, pure data/renderer separation, bounded four-room composition, genuine assignment unknowns and camera-return behavior.
- A focused offline mock reproduced a capture-time mismatch: a catalog cached at 08:00 with work refreshed at 08:06 omitted a PR merged at 08:03 because the board used the older catalog capture as its upper bound. Data added a regression which failed before the fix and passes afterward: the refreshed merge counts once without a catalog refetch, and a subsequent failed request retains the successful capture and work.
- Parent browser verification passed the rendered office hierarchy/artwork, independent panel collapse/reopen, searchable All rooms and off-floor return, person inspection/follow, labeled slow Tour, pause with usable zoom, period/coverage details, preview/public source separation and source-backed repository links. Actual 320px overflow was fixed and rechecked; the final active tab had no browser errors/warnings.
- Independent QA passed desktop at actual CSS 1512×805 and mobile at 390×844 and 320×740 without horizontal overflow. Keyboard search, Tab/Shift+Tab focus trapping, selection, Escape/opener restoration, empty search, off-floor navigation and mobile drawers worked. Two paused canvas-only screenshots were byte-identical; manual zoom cleared Follow.
- Independent QA passed API boundaries: preview GET returned 200 with 12 repositories and four main rooms, invalid modes/IDs/URLs returned structured 400 JSON, all responses disabled browser caching, and POST returned 405.
- The independent actual-scene harness passed pause, reduced motion, hidden-state freeze, manual rendering, prevented/canceled visits and destruction cleanup. OS preference switching, real touch/pinch, physical devices, vendor/GPU compatibility and GPU-loss recovery were not exercised.
- Independent review found one P2 cooldown defect: an off-floor round trip after a natural visit bypassed the repeat interval. Persistent per-person deadlines fixed it; a focused actual-scene reproduction verified the next visit after 167.984 minutes, and the added regression covers deadline retention and range. Review verdict is PASS with no open blocking findings; independent QA verdict is PASS for this local slice.
- All integration corrections below are verified in the reviewed source and final checks. No implementation, review or local-slice QA blocker remains.

## Deviations

### Delivery boundary

- This is a local animated preview with genuine public snapshots. It has no webhook route/subscription, durable event acceptance, browser push transport, production host or verified end-to-end actual PR event. Product Phase 4 remains future work and the app is not described as live.
- Genuine counts cover fetched bounded PR history, not the complete organization or total member value. Reviews performed, unverified identities and project membership/leadership remain unknown. Process caching has no persistence guarantee. Docker execution and remote CI were not performed.
- Off-main repositories use independent room scenes as accepted in VLIP-2. Synthetic fixture occupants do not appear in genuine mode. Ambient storytelling remains simulated in either mode and does not indicate physical location, presence or real activity.

### Resolved integration findings and compact-world behavior

- Tour availability now names the main-floor/eligible-occupant/motion prerequisite instead of accepting an inert command.
- Commons keeps six visible seats to preserve the compact floor. Selecting/following an overflow real contributor swaps them into a supported seat; focused placement persists until another person needs the slot. A regression preserves the first four occupants while placing both focused people. All authors remain reachable through the semantic directory, and Follow restores the office view.
- The board now consumes its exact source/window/coverage/history contract fields. Forked repositories have directory badges; dates distinguish historical events from capture-day activity.
- DevRel now has a literal shared planning table beside its screen, podium and board.
- Latest successful catalog/work capture fixes ranking after work refreshes inside the longer catalog TTL; stale requests retain the successful capture.
- HTTP-200 domain outages now expose reachable mobile retry plus source-message and retry-after details; healthy mobile snapshots can also refresh through the source dialog.
- A frame gate now caps scene rendering at 30 FPS, and async cancellation checks precede attachment/listener registration. No persistent leak or browser failure was claimed from the initial source concern.
- Review's cooldown finding is resolved with persistent per-person deadlines, independently checked through the actual scene and covered by a regression. The narrow mobile header correction also passed measured 320px QA.

### Baseline drift

- Architecture gate baseline: `0f2c2d47255633f5b4b159f56570c2db4dd657d4` on `codex/animated-office`.
- Implemented/reviewed source is committed at current HEAD `84638c3e51991cb549371d5e9d45e517ad09d98e`. The original implementation anchor was `092e3d035f982a2adecdc6ec1550f36a82b2e8dd`; subsequent source changes were the reviewed persistent cooldown correction/regression and mobile header sizing.
- Cumulative committed drift from architecture replaces starter home/root/styles and welcome assets, adds snapshot route wiring, adds Pixi and its lockfile entries, enables TypeScript extension imports for Node tests, removes starter configuration comments and updates delivery exclusions/docs. It also adds the domain/cache modules, React interface, Pixi art/motion modules, public atlases, tests and environment/CI files described above.
- Current HEAD equals the code-review anchor `84638c3e51991cb549371d5e9d45e517ad09d98e`; no application or test working-tree drift exists. This update changes only the implementation artifact. Remaining untracked items are the pre-existing `.agents/` directory and independent QA report/playback evidence.
- No app/test edits, reruns, commits, submissions, human gate approvals, deployment or external writes were performed by this documentation update. Parent retains phase advancement; the delivery boundaries above remain unchanged.
