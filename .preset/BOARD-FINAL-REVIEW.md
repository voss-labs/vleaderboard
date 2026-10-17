# Final contributor board source review

2026-10-17. Independent review of the local change against plan baseline `cc3048f2e07649ec7bf651759b10f201be903eec` and the latest scope in `TASK.md`. Preset project `proj-80a9413ef32d45f1`, phase `build`; state and recorded decisions were read before assessment.

Result: PASS. No unresolved actionable correctness or security findings in the final source. Two small clarity corrections were returned to the UI owner and verified after correction: `README.md:37` now describes PR-only capture; `Leaderboard.tsx:82` and `:117` explicitly disclose incomplete repository discovery and the three-page catalog cap.

## Coverage assessed

- `load-snapshot.server.ts:31-49` attempts PR and code capture for every validated catalog repository, including archived repositories, forks and entries outside the former four-room selection. The optional repository ID validates membership without narrowing the board. Catalog pagination remains bounded to three pages; `catalogComplete` records truncation.
- `github.server.ts:83-121` applies the shared client semaphore to catalog, PR, commit-list and SHA-detail requests, with at most three active upstream reads, timeouts, fixed upstream host, no redirects and rate-limit backoff. The default runtime shares one client. Snapshot and SHA caches coalesce overlapping reads. SHA entries are bounded at 1,000; new detail attempts share the process allowance of 20/hour anonymously or 600/hour with a token.
- PR and code caches retain successful captures independently. Missing list captures remain null; missing per-commit stats make that author's line total unknown. The UI separates PR/code repository coverage, captured subtotals, stale code and retry/capture times. No fixture fallback was introduced.
- PR event dates and commit committed dates use one inclusive-start/exclusive-end period predicate. Commit records deduplicate by repository/SHA, exclude merges and bots, preserve unlinked authors as unattributed coverage, and create commit-only contributor rows. Author identity uses validated GitHub numeric IDs; names, email and committer identity do not establish authorship.
- Home and API default to genuine GitHub. The shared loader rejects production preview requests before creating fixtures or requesting upstream data. The source selector is guarded by `import.meta.env.DEV`; production refresh forces genuine mode. The optional token is read only in server modules and is not included in the snapshot contract.
- The home route mounts only the contributor board. Search is local, matches names/handles, exposes result counts and clear controls, and keeps global ranks. Period controls expose pressed state. The table has a caption, column/row headers, a focusable skip target, verified small avatars/initials and native named Details disclosures. Repository details reuse the same period derivation. Mobile metric grids, wrapping text, focus styles, 44px controls and document scrolling are present in source.

## Validation boundary

Source and test-code review only. No tests, builds, browser/server sessions, live GitHub calls or credential reads were run by this reviewer. The data owner reported 40 passing tests and typecheck; the UI owner reported final typecheck and production build passed, including the catalog warning. The parent owns production HTTP and desktop/mobile browser validation. No commits, gates or application/test edits were made by this reviewer.

Known product limits are explicit bounded capture, not lifetime totals: at most 300 catalog entries, 100 recently updated PRs and ten default-branch commit records per repository; process-local caches/budgets; incomplete/unattributed measurements. This review does not claim complete organization history, durable ingestion or a public deployment.

## Compact mobile follow-up

Result remains PASS after the UI owner froze the targeted layout changes. Reviewed only `leaderboard.css:131-143`, the organization-link markup at `home.tsx:56` and the shorter ranking helper at `Leaderboard.tsx:72`.

The new rules apply below 768px and reduce header, intro, status and filter spacing. The title and compact GitHub link share one line; only the decorative tagline and visible link prefix are hidden. The link retains its full accessible name. The existing 44px control minima, 12px labels, search, period state, incomplete-catalog warning, code-scope disclosure, focus and normal document scrolling are preserved. No data or ranking behavior changed. Desktop layout rules are preserved; the shorter helper retains the same meaning.

No new actionable source finding. The parent owns the actual 320x740 first-row position and overflow check; this follow-up ran no tests, build or browser session.

## Narrow metric follow-up

Result remains PASS after the final CSS freeze. Reviewed only `leaderboard.css:145-148`: at widths up to 420px, each metric places its value below its label, aligns it left and prevents the number from breaking across lines. The shared selector covers both board and repository-detail metrics. The existing two-column metric grid, labels, values, unknown markers, control targets and desktop rules are preserved. No actionable source finding. Actual 320px digit rendering and overflow remain parent-owned browser checks; no tests, build or browser session were run for this review.
