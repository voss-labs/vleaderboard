# World implementation

2026-10-09. Owner: isolated world frontend. Project proj-f983e77652b4bb2f.

## Modules built

- Named OfficeWorld accepts shared SceneProps; imports Pixi browser code after mount with loading/error states, async cancellation and cleanup.
- PixiJS 8.22.0 installed. Modular transparent character and furniture atlases copied into public/office; all 16 frames use integer quarter boundaries and nearest sampling.
- Compact 1200 by 1050 elevated top-down office: adjacent maintainer rooms, three core tables, four six-station project rooms, commons bottom left and separate DevRel bottom right. Rich tile floors, layered ivory walls, doorway thresholds, wood desks, chairs, rugs, plants, shelves, coffee corner and office cat use reusable art.
- Distinct immediate staggered work bobs, code monitors, DevRel slide cycling, a shared planning table and presentation/planning poses. Occasional simulated work bubbles also create explicit preview-source activity events.
- Native pointer/touch pan, pinch and wheel zoom, fit/focus commands, hover/selection rings, character/repository hit tests and follow. Manual camera input exits follow. Resize and snapshot refresh preserve camera center/scale. Off-floor repository scenes restore the main camera on Back.
- Slow axis-aligned visits use room doors and connected corridor waypoints. Seeded initial schedules are 45–120 visible minutes; later schedules 90–180 minutes. One traveler globally. Simulated Tour starts immediately at the same 19 logical pixels/second with door and destination pauses.
- Pause, reduced motion and document.hidden stop frame scheduling and discard wall-time catchup. Selection/camera/resize render on demand. Reduced motion returns active travelers to their home seat.

## Tests

- npm test: 20 tests passed, including seven motion/layout tests for hierarchy/capacity, corridor route constraints, slow travel/stop durations, hidden-time discard and seeded quiet intervals.
- npm run typecheck: passed against current shared data and shell modules.
- npm run build: passed both client and SSR production builds.
- Local development initially retained a cached missing-module error while peers published files; restarted the existing 5173 listener. GET / now returns 200. Current sole dev server belongs to world agent, session40616.
- Parent owns browser visual/interaction review and final combined checks.

## Deviations and limits

- Tour currently demonstrates one project occupant visiting core then maintainer and returning, as the accepted architecture describes. Two-person natural handoff storytelling remains a possible refinement; no pathfinding complexity was added.
- Genuine repository assignments remain empty unless explicitly supplied; available desks are labeled rather than inventing real membership. The compact commons renders six seats; selecting or following an overflow contributor swaps that person into a visible seat while retaining other occupants. Focused placement persists until another person needs a slot.
- Simulation remains decorative and never represents real presence or real GitHub activity. Historical activity is never replayed as a fresh bubble.
- No commits, gates or external deployment performed by this owner.

## Targeted integration fixes

- Added the requested shared DevRel meeting/planning table beside the PPT screen, retaining both named leads, podium and planning board.
- Added focused commons placement for selected/followed people beyond six visible seats; meaningful regression test verifies both focused people appear and the first four occupants retain identical seats.
- Coordinated shell Tour availability and Follow view switching so off-floor people and unavailable tours do not leave inert controls.
- Final targeted checks: all 20 tests and strict typecheck pass.
- Ambient scene simulation/rendering is capped at 30 frames per second, with a regression test for refresh-frame gating. Following reuses the camera render instead of rendering twice per frame.
- Async cancellation checks now run after application initialization and atlas loading, before canvas attachment or listeners; canceled module imports skip scene construction entirely.

- Final preview refinement: occasional ambient opened events now show "Simulated · Opened a pull request" above the attributed actor and remain in the feed as kind opened, source preview and URL null. Uses the existing bounded bubble/event flow; no factual GitHub claims or invented links.
