# Data and backend implementation

Implemented against ARCHITECTURE and accepted VLIP-1/VLIP-2 in the existing React Router SSR app. No phase submissions, commits, deployment or external mutations performed.

## Modules built

- `app/data/types.ts` is the exact shared architecture contract, published before implementation.
- `roster.ts` contains 12 confirmed names and roles, three core tables, dedicated maintainer/co-maintainer rooms and separate DevRel. Only the three source-confirmed GitHub identities are mapped; project assignments remain unknown in genuine mode.
- `preview.ts` contains the 12-repository catalog and 24 explicitly named preview occupants across vroom/vprep/verp/vauth. Six synthetic seats per room include a lead and five members. Scenario dates are fixed at 9 October 2026 and disclosed in the source message. PRs, issues, reviews requested, assignments and activity are synthetic; invented work numbers have empty URLs. Repository links are actual public links. Historical preview events are not fresh.
- `derive.ts` implements disclosed pushed-at ordering, UTC calendar-month/exact 30-day/available-history count windows, exclusive capture upper bounds, competition ranks, deterministic ties, bots, deduplication and explicit unknown review counts. Genuine mode excludes preview people and untouched repositories supply no fake zero rows.
- `github.server.ts` reads only the public voss-labs catalog and selected known repository, pins supported REST version 2026-03-10, limits catalog pagination to three pages and work to one PR/issue page, removes issue-list PR entries, attributes authors by stable user IDs independently of merge senders and emits source-backed historical events with `fresh: false`.
- `snapshot-cache.server.ts` and `load-snapshot.server.ts` provide ten-minute catalog/five-minute work cache, eight-second request timeout, concurrent request coalescing, response-header rate-limit backoff, stale preservation and cold unavailable state. The process cache is bounded to the catalog and discovered repository work and clears on restart. Real failures never substitute fixtures.
- `/api/snapshot` returns version-1 JSON with no-store browser caching, rejects invalid modes/IDs with 400, exposes upstream failure as a 200 domain state and keeps unexpected errors generic.
- README, environment template, Git/Docker exclusions and Node 24 CI replace starter delivery documentation. TypeScript extension imports support Node's built-in test stripping. Package test script and engine changes were coordinated with the world owner.

## Validation

- `npm test`: all 13 data tests passed. Covers source separation, roster/catalog, deterministic room ordering, shared competition ranks, duplicate/bot filtering, UTC boundaries, unknown versus observed counts, public identity attribution, pagination limits, concurrent reads, stale/backoff/recovery and resource-route error shapes.
- `npm run typecheck`: passed after scene module became available.
- `npm run build`: passed client and SSR production bundles.
- `git diff --check`: passed. All data and test source files remain below 400 lines and contain no comments/docstrings.
- Real read-only smoke, captured 2026-10-09T09:36:08Z: complete public catalog of 12 repositories; vroom coverage 12 PRs and 19 issue-only items, source github/partial, no preview people and no fresh historical events. Genuine main-room recency selected vshow/vmaps/vroom/first-contributions.
- Initial sandbox network attempt returned DNS ENOTFOUND and correctly produced genuine/unavailable with no fixture data. The public smoke then passed through reviewed read-only network escalation.

## Scope and limitations

The preview is a fixed, dated scenario. Genuine snapshots expose available fetched repository coverage, not exhaustive organization history. Reviews remain unknown. Real project leads/members and additional named GitHub identity mappings are unverified. Cache is process-local; there is no persistence, webhook subscription, event service or live-presence claim. Docker execution and remote CI execution were not performed.

API version support and PR fields were verified against [GitHub API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions), [pull-request REST endpoints](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests) and [rate-limit guidance](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api). CI action versions follow current [checkout](https://github.com/actions/checkout) and [setup-node](https://github.com/actions/setup-node) primary documentation.

## Integration correction: refresh capture time

The initial source timestamp reflected only the ten-minute catalog capture, while repository work could refresh after five minutes. This made Home's capture-bounded leaderboard exclude a genuine PR merged after the catalog capture even when the refreshed work included it.

`load-snapshot.server.ts` now selects the latest successful catalog or observed-work capture for `source.fetchedAt`. Failed requests keep cache capture times unchanged, preserving the last successful timestamp and work. The regression captures a catalog at 08:00, refreshes work at 08:06 containing a PR merged at 08:03, verifies one merged PR without refetching the catalog, then verifies a failed refresh retains the 08:06 capture and work. It failed before the fix and passes afterward.

Validation after correction: all 21 shared tests pass (14 data, 7 motion); strict typecheck and `git diff --check` pass. No network requests, external mutations or peer-file changes were required for this correction.
