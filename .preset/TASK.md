# Leaderboard-only contributor view

## Goal

Show only a full-width VOSS contributor leaderboard spanning all public VOSS products/repositories, ordered by merged pull requests from highest to lowest, with a small avatar or initials logo beside every contributor. Include captured commits, PRs opened and merged, lines added and removed, plus optional contributor details with repository breakdowns and source coverage. Make genuine GitHub the initial source and remove Preview controls/options from production, with no fixture fallback. Improve board spacing, contributor search, filters and status clarity. Hide the entire office game, maintainer rooms, people scene, projects panels, tours, and narrative activity feed. Keep captured history and incomplete coverage truthful; unavailable measurements remain unknown rather than zero.

## Approach

1. Default the standalone route to genuine GitHub and confine any Preview source control to development builds. Coordinate all-public-repository aggregation and direct production API guards with the data owner. Preserve highest-merged-first ranking, ties, shared periods and exact captured-commit scope, without claiming lifetime or complete organization history.
2. Tighten the board hierarchy and spacing, add local contributor search by name/GitHub handle with clear/reset and honest result counts, and keep period/source/status controls accessible. Preserve global ranks under search. Show PRs opened/merged, captured commits and lines added/removed with verified small avatars, mobile metric grids and per-repository Details. Display PR/code repository coverage near the results, with discoverable date/capture limits and unknown dashes. Keep normal scrolling and no game/role/person panels.
3. After shared all-repository/backend work stabilizes, run meaningful metric/data tests through the data owner, final `npm run typecheck` and `npm run build`. Hand the existing local page to the parent for desktop/mobile inspection of search, filters, initial genuine source, production Preview absence, all-repo coverage, details, unknowns, avatar fallback, focus and scrolling.

Validation: Data-owner metric/data tests, final integrated typecheck and production build, and parent-owned browser inspection. No implementation-mirroring UI tests or new dependencies.

Frontend scope: `app/routes/home.tsx`, `app/components/Leaderboard.tsx`, `app/components/ContributionDetails.tsx`, `app/styles/leaderboard.css`, minimal changes to `app/app.css` and `app/root.tsx`, and the final `README.md`. The separate data owner owns additive snapshot/derivation/client/cache/preview/API changes and their tests.

## Outcome

- The home route now displays only the full-width contributor leaderboard. All office scene, room, maintainer-role, project, people-directory, inspector, camera, tour, and narrative-feed composition has been removed from the route; its dormant implementation and assets remain available in the codebase.
- All returned contributor rows render in existing highest-merged-first order with shared ranks for ties. Each contributor has a small avatar from their confirmed GitHub numeric identity or an initials fallback, and only confirmed GitHub identities link to profiles.
- The route loads genuine GitHub by default. Production renders a static GitHub source label and refresh, with the Preview source selector limited to development. The data owner also blocks production preview requests with HTTP 400, defaults the API to genuine GitHub and aggregates every public catalog repository without fixture fallback. A server-generated timestamp provides a hydration-safe period clock when capture timestamps are unavailable.
- The page uses VOSS dark ink, paper and orange with normal document scrolling, mobile-first layout, accessible table headers, focus states and 44px controls. Route metadata and root error copy describe the leaderboard.
- Every contributor now shows captured commits, PRs opened, merged PRs, lines added and lines removed within the shared selected period. Accessible dashes preserve unknown measurements; partial values are identified as captured subtotals. Code capture scope, limit, timestamp, retries and missing/unattributed measurements are separate from PR coverage.
- Native Details disclosures show repository contributions and coverage, reusing the shared derivation with repository/work/code narrowed together. Verified GitHub profile and genuine repository links remain available; simulated repository entries do not create fabricated links. Extra metrics use a two-column mobile grid and expand to four columns on larger screens.
- Local name/handle search includes a clear control, result counts and helpful no-results state, while preserving original ranks. Tighter spacing, 12px or larger important labels, wrapped mobile metric grids, visible PR/code repository coverage and repository-count disclosures improve navigation. Incomplete catalog discovery is explicit. Code detail budgets display the actual 20/600 server allowance. README describes the final board, source guards, caches and environment behavior.
- A targeted mobile layout pass reduces header/hero/control spacing so the first contributor can appear in the first 320px-wide screen. Decorative tagline/prefix text yields to a compact title/GitHub row while full accessible link naming, freshness, period/search controls, code scope and 44px targets remain available. Desktop layout is preserved; final first-row position is subject to parent browser measurement.
- Shared all-repository integration is complete. Frontend changes add no dependencies, game UI, role panels or fetches per contributor/search/period. Production browser verification and independent review pass. A final narrow-screen metric rule stacks labels above unwrapped numeric values in board and repository details.

## Tests

- Final all-repository/production/UX `npm run typecheck`: passed (`react-router typegen && tsc`).
- Final `npm run build`: passed client and SSR, repeated after two real mobile findings: excessive first-screen spacing and wrapping numeric values. Final home client bundle is 21.77 kB (6.81 kB gzip), with no Pixi/scene chunks. Typecheck also passed after both corrections.
- The data owner reports all 40 tests passed, including all-repository aggregation and production preview rejection.
- `git diff --check`: passed.
- Parent production HTTP/browser checks pass with genuine 16/16 public repository PR/code coverage, 27 contributors, working search/reset/no-results/global ranks, all three periods, keyboard repository details and Refresh. Preview UI is absent and direct Preview requests return 400. At 320x740 the first contributor starts at y=573.39, document width stays 320, and numbers remain intact in main/nested metric grids. No new browser warnings/errors after the final reload. Full evidence is in BOARD-CHECKS.md and BOARD-FINAL-REVIEW.md, with desktop/mobile screenshots.
