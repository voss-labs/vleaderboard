# Review

## Verdict

PASS

Reviewed the source, tests, configuration, and delivered artwork wiring against `.preset/PRODUCT.md`, `.preset/ARCHITECTURE.md`, and both accepted VLIPs. Scope is the local animated visual slice and bounded public GitHub snapshots; webhook hosting and deployment remain later work. The reviewed implementation is commit `092e3d035f982a2adecdc6ec1550f36a82b2e8dd` against baseline `0f2c2d47255633f5b4b159f56570c2db4dd657d4`, including the subsequent mobile-header and motion-cooldown working-tree changes.

## Findings

1. Resolved P2: `app/office/scene.ts:117` — scene rebuilds originally recreated initial absolute visit deadlines while simulation time persisted. After a natural visit completed, visiting an off-floor room and returning started another visit only 0.05 seconds later, violating the 90–180-minute repeat interval. Persistent per-person deadlines now survive rebuilds; completion and interruption reschedule them, and new actors schedule relative to current simulation time. A focused harness executing the actual scene, layout, and motion code with render surfaces stubbed independently verified that the same room round trip preserves the cooldown: the next visit starts after 167.984 minutes. `tests/motion.test.ts:86` covers deadline retention and the required range.

No open blocking findings remain. The source keeps preview work separate from genuine ranking, attributes source work by stable GitHub identity, preserves unknown versus observed empty work, bounds upstream requests and cache scope, retains valid data during failures, and keeps credentials server-only. Renderer initialization cancellation, resource cleanup, motion freeze, manual camera rendering, and accessible HTML selection paths are present. Source files remain below 400 lines.

The focused scene reproduction and `git diff --check` passed. Existing domain tests were inspected for ranking boundaries, deduplication, bot filtering, source separation, backoff, bounded pagination, and motion behavior. Full suite/build verification and independent browser/visual QA are separate acceptance checks; this review does not claim those checks were run by the reviewer. The configured API version and action majors are confirmed by [GitHub API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions), [checkout releases](https://github.com/actions/checkout/releases), and [setup-node releases](https://github.com/actions/setup-node/releases).

## Required changes

None. The visit-cooldown blocker was fixed and independently verified before this verdict.
