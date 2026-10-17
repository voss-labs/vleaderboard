# Contribution data implementation

Implemented 2026-10-17 for `proj-80a9413ef32d45f1`. Source strategy follows `research/contribution-metrics.md`.

## Outcome

- `OfficeSnapshot.code` adds independent repository commit captures without changing the existing `/api/snapshot` endpoint or mandatory credentials.
- Every discovered public VOSS Labs repository is captured and aggregated, including repositories outside the four featured rooms, archives and forks. Private and foreign-organization catalog entries remain excluded. A supplied validated repository ID does not narrow the organization snapshot.
- `RepositoryCode` exposes `status`, `fetchedAt`, nullable `commits`, `captureComplete`, `message`, `retryAt`, and `detailReadLimit`. Missing repository captures are unavailable rather than empty.
- `CodeCommit` identifies repository plus full immutable SHA, validated GitHub author ID or null, committed timestamp, nullable additions/removals, source URL, and bot status. Names, emails, committers and coauthor text do not establish author identity.
- Leaderboard rows add nullable `commits`, `additions`, `deletions` and `codeStatus`. Captured commit-only authors join the board with no captured PRs. Merged PR ranking and competition ties remain unchanged.
- `Leaderboard.codeCoverage` discloses covered repositories, capture status/time, completeness, selected-period captured commits, missing line measurements, unattributed commits, retry time and the active hourly detail limit.
- API requests default to genuine GitHub data. Production rejects every preview-mode request in the shared loader before creating fixtures or making an upstream request. Direct preview API requests return a structured, no-store 400 response.

## Measurement policy

- List up to the latest 10 default-branch commit records per fetched public VOSS Labs repository. Do not follow pagination. More than one parent excludes a merge commit from both commit and changed-line counts.
- Fetch at most 10 immutable SHA details per repository. Read top-level validated nonnegative integer `stats.additions` and `stats.deletions`; never sum a potentially truncated file list.
- Apply exactly the existing UTC month, rolling 30 days or captured-history window, inclusive at the start and exclusive at the snapshot capture time, to `commit.committer.date`.
- Deduplicate by repository plus normalized SHA. Exclude bots from the board. Unlinked authors remain in coverage as unattributed commits.
- Missing any selected-period detail for an author makes that author's line totals null, even if other details succeeded. Measured zero remains zero. Partial captured subtotals retain an explicit partial status.
- Preview fixtures have fixed dated commits, different counts across periods, explicit simulated labels and empty source URLs. They make no fake commit links.

## Cache and failure behavior

- Commit-list cache TTL is 15 minutes, independent of the existing five-minute PR cache.
- Three repository workers collect the complete discovered catalog. Snapshot requests coalesce at catalog, repository PR, repository code and SHA-detail cache boundaries. The client limits all upstream requests to three concurrent reads.
- The leaderboard fetches PRs without fetching unused issues. Unrequested issue data remains null; it is not reported as an empty fetched result.
- SHA details use a bounded 1,000-entry cache keyed by repository and SHA, including single-flight requests. Successful immutable details are reused without consuming another detail allowance.
- Budgets are shared by default readers in the process: at most 20 new SHA detail attempts per rolling hour in anonymous mode or 600 with an existing server token. No token, CLI authentication or new dependency is required in application runtime; the optional `GITHUB_TOKEN` remains server-only.
- Existing retry/rate-limit headers remain honored. A successful response with zero remaining requests also stops subsequent reads until reset.
- Successful PR data survives commit list, detail, malformed-object and rate-limit failures. A failed code-list refresh retains its prior successful capture and timestamp as stale, independently of PR state. Cold code failures produce null metrics.
- Existing numeric repository ID validation, public organization catalog checks, fixed upstream host/organization and server-only optional token handling remain in place.

## Validation

- `npm test`: all 40 tests passed: 32 data/domain tests plus the existing eight motion tests.
- `npm run typecheck`: passed with integrated frontend changes present.
- Tests cover exact period boundaries; competition ties; SHA dedup; bots; merge exclusion; unknown authors; stable roster IDs; commit-only contributors; measured zero versus missing stats; bounded and malformed list responses; top-level detail stats; object-response validation; independent code failures; TTL/single-flight; immutable detail reuse; 1,000-SHA eviction; both hourly detail caps and recovery; zero-remaining headers; stale retention/retry recovery; every-catalog-repository collection; contributors outside the top four; archive/fork inclusion; private/foreign exclusion; independent failures across repositories; the three-request concurrency bound; and production preview rejection.
- No production build, new server, live GitHub call, commit or process gate was run by the data worker. Frontend integration/build and browser checks belong to the parent/UI owner.

## Limits

The result is a bounded captured snapshot, not complete organization ingestion or lifetime contribution totals. Pagination, unfetched repositories, missing SHA stats and unlinked authors remain visible coverage limits. Committed date does not establish when a branch first reached the default branch. Empty non-merge commits count with measured zero lines, unlike GitHub contributor statistics. Changed lines do not establish code ownership or productivity.

Caches and detail caps are process-local. Restarting clears them; separate server processes do not share a rate budget. GitHub's anonymous allowance is shared by originating IP, so organization-wide PR/catalog/list reads and other clients may exhaust it before the detail cap is reached. Existing rate-limit headers stop subsequent reads and leave honest partial coverage. The catalog is bounded to three 100-repository pages and discloses incomplete catalog pagination. No job queue, database, mandatory token, per-person API request or new infrastructure was introduced.
