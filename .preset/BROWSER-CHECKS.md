# Browser checks

2026-10-09. Parent Phoenix checked the running local app through the Codex in-app browser, using DOM/AX state and rendered screenshots.

- Desktop office: adjacent Maintainer and Co-Maintainer, Engineering/Community/Research tables, four project rooms, Open contributors and DevRel with presentation screen, podium and planning table are visible. No faculty/advisor rooms.
- Projects and Leaderboard independently collapse and reopen. All rooms stays reachable while collapsed.
- All rooms shows 12 repositories. Searching vmaps opens its dedicated room; Back to office restores the main floor.
- People search, person inspection and Follow work. Himanshu Choyal focuses in DevRel. Follow can be stopped with the fit control.
- Tour starts a labeled simulated visit and disables repeat starts. Pause changes to Resume; zoom remains usable while paused. Slow motion, monitor changes, slides and simulated activity were observed. The accessible feed includes an opened pull request event.
- Mobile navigation exposes Projects, All rooms, Board and People. Search and person details work in native dialogs. The leaderboard period is labeled and its 30-day window exposes exact UTC bounds and covered repository names.
- At actual 320 CSS pixels, a header overflow was found and corrected. Recheck: window.innerWidth = 320 and document.documentElement.scrollWidth = 320. Controls remain visible. Also checked intermediate mobile and desktop layouts. Temporary viewport overrides were reset.
- Public GitHub mode loads genuine recency-selected vshow, vmaps, vroom and first-contributions. Opening vroom fetched three open PRs and 19 issues with factual GitHub links; project leadership remains unknown. Board coverage showed two of twelve fetched repositories and Partial history. No preview events appeared in that source.
- Preview mode has explicit simulation labels. Tour is disabled in off-main rooms and genuine snapshots without assigned project occupants, with visible context.
- Browser error/warning log on the final active tab was empty.

Evidence: `design/implemented-office.jpg`. Parent final production build passed client and SSR bundles. Dev server is parent-owned session 96768 at http://127.0.0.1:5173/.

Limits: OS reduced-motion toggling, multi-hour wall-clock observation, actual GitHub webhook delivery, Docker execution and remote CI were not exercised in this browser pass. Motion timing, hidden-time discard and frame limits are covered by deterministic tests. Independent code review and QA remain separate gates.
