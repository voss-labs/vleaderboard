# VLeaderboard QA

2026-10-09. Independent verification against PRODUCT.md, ARCHITECTURE.md, ACCEPTANCE.md and accepted VLIPs. Tested application HEAD: `84638c3e51991cb549371d5e9d45e517ad09d98e` on `codex/animated-office`. Scope is the local visual office and bounded public GitHub snapshots.

## Test results

| Check | Result | Evidence |
| --- | --- | --- |
| `npm test` | PASS, 22/22 | Ranking ties, bot/dedup filtering, UTC/time boundaries, source separation, cache coalescing, stale preservation, backoff, cold failure, bounded pagination, identity attribution, room layout, slow movement, frame timing and visit cooldown. |
| `npm run typecheck` | PASS | React Router type generation and strict TypeScript completed successfully. |
| `npm run build` | PASS | Client and SSR production bundles built successfully. |
| Local HTTP resource route | PASS | Preview GET returned 200, 12 catalog repositories and four main IDs. Invalid/empty modes, empty repository ID, arbitrary URL, zero ID and unknown catalog ID returned structured 400 JSON. GET success/errors carried `Cache-Control: no-store`. POST returned 405. |
| Focused scene lifecycle harness | PASS | `node --experimental-transform-types .preset/qa-playback.mjs` runs the actual scene update/tick code with substituted rendering primitives. Reduced motion, pause and hidden state cancel playback; manual camera rendering remains available; reduced motion prevents/cancels visits; destroy clears frames/listeners and destroys app/art. |
| Desktop browser | PASS | Existing Chrome preview at actual CSS 1512x805 rendered the adjacent named maintainer rooms, three core tables, four project rooms, commons and separate DevRel. The scene visibly contains modular pixel furniture and characters. No application console errors/warnings were captured. |
| Dialog and keyboard navigation | PASS | Directory traps focus; Shift+Tab wraps from Close to the final room. Empty search shows a clear result. Keyboard search/Tab/Enter opens off-floor vshow; Back returns to the main office. Escaping an empty directory restores the All rooms opener. People search/keyboard selection opens Kanchan with the Co-Maintainer role, unknown identity/assignment copy and labeled preview work. |
| Pause and camera/follow | PASS | Two canvas-only screenshots taken while paused were byte-identical. Resume is pressed and Tour disabled while paused. Zoom, fit and people selection remain usable. Follow displays the selected person; manual Zoom in clears follow after the scene update. |
| Genuine source semantics | PASS | Public GitHub mode showed the real 12-repository catalog, pushed-at room basis, GitHub badge, captured time, 1/12 repository coverage and Partial history. Fetched vshow had observed empty PR/issue results and unknown project assignments. Preview board rows were absent. Ambient simulated feed entries retained Simulated labels. |
| Responsive browser | PASS | Explicit viewports measured actual CSS 390x844 and 320x740. `document.documentElement.scrollWidth` equaled 390/320 respectively. Camera/motion controls, source selector and mobile navigation remained reachable. At 320px the board drawer fit within a 300px dialog, and Projects to All rooms search/navigation remained usable. |

Drift from implementation anchor `092e3d0` consists of reviewed cooldown scheduling in motion/scene, its regression test, mobile header sizing and process evidence. QA added only this report and the focused playback harness; no application code changed during this pass.

## Edge cases

- Native search inputs consume the first Escape to clear a nonempty query. A subsequent Escape closes the dialog and restores the opener. This is browser search behavior, not a dialog failure.
- Immediate reads after a React camera update can precede follow-state propagation. Waiting for the Stop following control to become hidden confirmed the final behavior.
- Upstream outage, stale data, retry backoff and partial pagination were verified through the existing deterministic fake-upstream tests. This pass did not force a live GitHub outage or rate-limit event in the browser.
- Reduced motion and hidden-state control flow were exercised through the actual scene harness. OS preference switching, real touch/pinch input, physical mobile devices, browser/WebGL compatibility across vendors and GPU-loss recovery were not exercised.
- Production bundle creation passed; no separate production HTTP server, container build or deployed environment was tested. No server was started or restarted during QA.
- Full real-time webhook delivery, durable ingestion/redelivery, reconnect transport and live deployment remain outside this accepted local slice. This verdict does not validate or claim those later product phases.
- Long quiet visit intervals and pause/hidden time bounds use deterministic clock tests; QA did not wait hours in the browser or observe a complete natural visit cycle.

No blocking defect was found in the tested local slice. The existing browser was left in Preview, on the fitted main office, unpaused, with dialogs/details closed and the viewport override reset; it was marked as the deliverable.

## Verdict

PASS

Approved for the local animated visual office and bounded public GitHub snapshot slice at `84638c3e51991cb549371d5e9d45e517ad09d98e`. Automated quality checks, API boundary checks and the focused desktop/mobile/keyboard browser checks pass. Production hosting and prompt live events require their separate acceptance phase.
