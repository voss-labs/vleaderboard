# Full-history integration checks

2026-10-17, task proj-2a3d9fa34f971f90; baseline cb9514c.

- Final full suite: 82 tests passed, no skips or failures, including genuine workerd transport construction and full pagination/legacy/publication/retention/record-selector regressions.
- Generated Cloudflare and React Router types plus TypeScript passed. Production client/SSR build passed. Final Wrangler dry-run passed with existing SNAPSHOTS namespace and production preview false, 861.13 KiB upload / 184.17 KiB gzip. A build does not require the production token; the secret is supplied only at runtime.
- Independent source review passed after malformed non-null line measurements were tightened to reject publication. Null/missing measurements remain explicitly unknown; traversal completeness is separate. HISTORY-REVIEW.md records 50 independent focused test passes and retained-document reproduction.
- Fresh actual built scheduled handler in workerd: 17 repositories, 36 requests, 151 PRs and 309 non-merge commits; strict full-history snapshot, both HTTP APIs and default All time passed. Independent GitHub witness and PR references matched. Deliberate invalid-token invocation retained exact KV bytes. HISTORY-RUNTIME.md records timings and full checks.
- Browser used that actual built Worker and its genuine isolated captured KV, not preview fixtures. Default All time selected; 30 contributors and 17/17 PR/code scope visible. Parth search displayed one commit, +744/-213, three opened PRs and zero merged. Keyboard Return expanded the actual Oct 2 commit SHA/date/headline/link. PRs #73/#64 showed Open and #63 Closed/unmerged with exact opened/closed dates. This month retained the same commit metrics.
- All 98 verp commits for Harshal were revealed in successive 20-record batches to exhaustion; no Show more remained. The separate PR disclosure revealed 20/40/60/66 records; DOM inspection confirmed all 66 actual record elements with no remaining Show more.
- Responsive browser checks at 390 and 320 pixels passed. Expanded long PR titles/status/date labels wrapped. At 320 pixels document clientWidth and scrollWidth both measured 320. Screenshot design/history-mobile.png. Viewport override reset after verification.

Production deployment, scheduled publication and live evidence are recorded separately in HISTORY-LIVE.md after verification. No production KV document is manually seeded.
