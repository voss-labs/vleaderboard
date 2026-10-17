# Leaderboard presentation review

Result: PASS. No concrete required fixes found in the scoped source review.

Reviewed the current diff and source for `app/routes/home.tsx`, `app/components/Leaderboard.tsx`, `app/styles/leaderboard.css`, `app/app.css`, and `app/root.tsx` against `.preset/TASK.md`. Inspected the existing derivation, snapshot hook, roster, and loader only to verify the presentation's contracts. Did not read the author's work assessment.

- Home no longer imports or renders the office world, scene, panels, directories, inspector, tour, or activity controls. Its shared UI imports do not import Pixi.
- The existing descending merged-PR ordering and equal-count ranks flow directly into the table. Every derived row is rendered; no row limit or second ordering is introduced.
- Avatar URLs and profile links use existing confirmed or API-normalized GitHub identities. Contributors without an identity and failed avatar images retain initials. No identity is inferred from display names.
- Preview counts remain explicitly simulated. GitHub coverage is explicitly partial, with fetched repository counts, captured window boundaries, repository names, and the 100-PR fetch limit available in coverage details.
- Source switching and refresh preserve the hook's existing behavior. Loading labels identify the requested source and the snapshot still displayed; failed refresh and stale/unavailable snapshots have visible alerts.
- The table has a caption, column and row headers; period buttons expose their selection; source and refresh controls have accessible names; the skip link has a focusable target. Global focus styling remains active and the document permits vertical scrolling.
- Page metadata and root error actions use leaderboard copy.

Validation boundary: source review only. No tests, builds, or browser sessions were run by this reviewer. The parent owns desktop/mobile browser verification, including the 320px header fit and scrolling; the implementation worker owns typecheck and build.
