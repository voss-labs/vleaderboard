# Frontend shell work

2026-10-09. Project `proj-f983e77652b4bb2f`. Frontend shell owner; implementation phase.

## Modules built

- Replaced starter home with a full-height office interface. The original SSR document remains, with Geist/Geist Mono and office metadata. Removed unused welcome component and SVG assets.
- Ink panels, ivory text and VOSS orange use pixel bevel edges. Projects and leaderboard independently collapse and expose reopen handles. The flex-sized scene remains the central surface.
- Exactly the snapshot's four main rooms appear in Projects. All rooms remains available in scene chrome and mobile navigation, including when panels are collapsed. Searchable repository directory selects a main room or dedicated off-floor scene, with Back to office.
- Searchable People directory supplies keyboard equivalents for canvas selection. Person inspection shows known role/team, unknown GitHub identities, authored PRs, assigned issues, requested reviews, source badges and timestamped activity. Repository inspection shows description/team/open captured PRs/issues and real GitHub repository links. Synthetic work with empty URLs is never linked.
- Fit, zoom, pause, follow/stop-follow, labeled simulated Tour and activity log use the agreed SceneProps callbacks/nonces. Stable callbacks and the snapshot ref avoid scene remounts on interface updates.
- The merged-PR board derives month/30-day/available-history periods using the snapshot capture timestamp. It shows equal ranks, covered repository counts and explicit preview versus genuine data labels.
- Browser request client preserves the current snapshot while pending, aborts superseded requests and unmounts, discards stale responses, and exposes pending/error/retry states. Genuine unavailable/partial/stale snapshots are rendered with their actual status.
- Native dialog modality provides keyboard focus trapping, Escape dismissal and focus restoration. Responsive drawers cover 320px mobile; touch controls meet 44px targets. Reduced motion pauses scene simulation through the contract and disables Tour.

## Validation

- `npm run typecheck`: passed after complete shell wiring and activity inspector refinement.
- `npm run build`: passed with combined data and Pixi modules. SSR loader/server-only snapshot import is excluded from the browser route bundle.
- Local HTTP verification reached the development server but initially returned Vite's cached missing OfficeWorld module error from parallel file creation. Parent/world owner are restarting that server.
- In-app browser and Chrome CUA navigation to localhost/127.0.0.1 both returned `net::ERR_BLOCKED_BY_CLIENT`. Parent is handling browser recovery and visual/interaction QA; no browser pass is claimed here.

## Deviations

None from the approved contract. No dependencies added by shell. React owns semantic state, Pixi owns world state, and the data owner owns all normalization/ranking/server reads.

## Integration review corrections

- Tour is disabled when viewing a dedicated off-floor room or when the main floor has no assigned project actor. Visible short context names the reason: Main floor only, Preview only, Resume to tour or Motion off. Available tours still use the real slow corridor route and remain labeled simulated.
- Leaderboard now consumes all coverage contract fields. Window and coverage expands to the exact inclusive/exclusive UTC timestamps, count source label, history completeness and full covered repository names. The compact summary always shows Partial history for incomplete coverage.
- All rooms explicitly badges forked repositories.
- Follow explicitly restores the main office view so person focus, including the world's commons overflow placement, can work from a dedicated room.
- Typecheck passed after the review corrections. Parent owns the final combined browser checks and build.
- Historical timestamps now include a compact UTC date and time, with the complete ISO UTC date/time in both the time element's title and accessible label. Source capture times, activity strip, activity log and person activity use the same component.
- Domain failures returned as HTTP 200 now expose a footer Retry action for stale/unavailable source states, including mobile. The source-status button opens an accessible Data source dialog with the actual source message, captured timestamp and upstream retry-after time. Refresh is also available in this dialog for healthy mobile snapshots. HTTP errors keep the previous snapshot and expose the same retry path. Typecheck passed; shell source edits are frozen for final browser QA.
