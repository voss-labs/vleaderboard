# Complete history production verification

2026-10-17. Task proj-2a3d9fa34f971f90. Source commit 2f22214a13bf29d44e3af86fb9f75f29c7bc72ba, pushed to origin/main; baseline cb9514c66a31dc1c4ec337a775d827db3c7ccdac. Source changes are full PR/commit pagination, exact contribution records, explicit completeness with legacy compatibility and All time defaults. No database or remote resource was added.

## Deployment

Existing Worker vleaderboard deployed as version a3f3bf9e-5afc-4b33-9a50-5c43ada16d33. Final build and dry-run passed; package 861.13 KiB, 184.17 KiB gzip. Existing GITHUB_TOKEN secret_text, SNAPSHOTS namespace bc25976951394aca86a5afdaab482528 and */15 Cron are preserved. Production ALLOW_PREVIEW stays plaintext false. No secret was uploaded/replaced and no production KV document was manually seeded.

Before the next Cron, both legacy-compatible APIs served the previous 12:30 capture with explicit partial-history coverage, while the deployed board/API defaulted to All time. HTTP smoke confirmed snapshot preview 400, invalid period 400, POST 405, HEAD 200 and no-store.

## Real scheduled capture

The 12:45 UTC Cron invoked the deployed version and published successfully at 2026-10-17T12:45:26.948Z / 18:15 IST. Runtime outcome ok, no exceptions, 8,235 ms wall time, 57 ms CPU. Application log published:true, 17 repositories, 36 requests, 8,242 ms elapsed. This verifies actual cloud scheduling and collection rather than deployment alone.

Read-only authenticated production KV validation passed assertCompletePublicSnapshot and complete PR/code pagination for all 17 current public repositories. The capture contains 151 PR records, 310 non-merge commit records and 30 contributors in All time. Earliest retained committed date is 2025-03-30T16:03:42Z. Counts are observations at capture time; the earlier local built runtime contained 309 non-merge records before the source push.

The custom domain and workers.dev snapshot APIs exactly match the saved production snapshot. Their default All time and explicit month contributor APIs exactly match reports independently derived from that saved snapshot. HISTORY-LIVE.mjs performs these read-only assertions and verifies existing secret type, namespace, preview false and schedule; it never prints credentials or writes production storage.

Parth's linked identity 149477150 now has one commit, +744/-213, three opened PRs and zero merged in both All time and October. SHA 2189670e140eefffa8041e53de47655d8669059f is committed 2026-10-02T17:54:21Z. All three PRs are inspectable: #73/#64 open; #63 closed without merge. Its date/state/line totals are not invented to change merged-PR rank.

## Rendered proof

Reloaded https://vleaderboard.vosslabs.org/ shows the new capture time, All time selected, 30 contributors, 17 public repositories and complete PR/code history. Searching parth and expanding Details, Commits and Pull requests renders the actual headline, linked SHA, UTC date, +744/-213, and all three PR titles/statuses/opened/closed dates. Saved full-page screenshot design/history-live.png. Live board tab remains marked as the deliverable. Local mobile and unlimited-batch verification is documented in HISTORY-CHECKS.md; temporary local workerd/KV was cleaned after testing. Production log tailing was stopped after verification.

The public scope is the current captured VOSS Labs catalog, including forks and archives; commits are default-branch non-merges, linked identities only for personal attribution. Other branches, private/deleted repositories, unmerged-PR diff measurements and a person's entire GitHub lifetime are outside this scope. All available older records within the stated scope are captured; 100 is only a page size. Existing bounded capture failures preserve the last complete document.
