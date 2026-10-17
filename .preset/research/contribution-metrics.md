# Contributor commits and changed lines

Research date: 2026-10-17. Scope: contributor details in the current leaderboard; public GitHub REST, optional server token, current month / rolling 30 days / captured history. Changed lines means additions and removals, not repository size or a productivity score.

## Verified source comparison

| Source | Useful property | Boundary |
| --- | --- | --- |
| `GET /repos/{owner}/{repo}/stats/contributors` | One response per repository, each author's total and weekly `w/c/a/d` | Weekly buckets cannot produce exact calendar-month or rolling-30-day boundaries. |
| `GET /repos/{owner}/{repo}/commits` plus `GET /repos/{owner}/{repo}/commits/{sha}` | Individual commit records and top-level `stats.additions/deletions` | Additional detail request per captured SHA; bounded capture must remain visibly partial. |

GitHub contributor statistics exclude merge and empty commits. A `202` starts/backgrounds computation; retry later. A `204` supplies no body and does not establish zero activity. Default-branch pushes invalidate the statistics cache. At **10,000 or more repository commits**, all returned additions/deletions become zero, so zero is not always measured zero. Contributor statistics expose no date-filter parameters. [Official statistics API](https://docs.github.com/en/rest/metrics/statistics#get-all-contributor-commit-activity).

GitHub's contributor graph covers default-branch contributions linked to GitHub accounts and shows the top 100 contributors. Its page says repository contributor displays/statistics can take about 24 hours to refresh after history rewriting. The statistics API says its statistics match repository graphs; treat missing authors as unreported, rather than asserting that every repository author is represented. [Official contributor graph behavior](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-projects-contributors).

Commit listing defaults to the default branch; supports `sha`, `since`, `until`, and pages of at most 100. Both commit endpoints allow unauthenticated public reads. List responses include GitHub author/committer identities, timestamps, parents and SHAs but no change totals; details contain change totals. Large detail file lists paginate; use top-level stats rather than summing a partial `files` page. The documented `since` description does not clearly distinguish author from committer time. [Official commits API](https://docs.github.com/en/rest/commits/commits).

Unauthenticated REST has **60 requests/hour per originating IP**; ordinary personal authentication generally gives 5,000/hour. Track remaining/reset/retry headers and stop when limited. [Official REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api). GitHub recommends serial requests, restrained polling, conditional requests and honoring retry instructions. Authenticated `304` requests can avoid primary-limit charges; do not assume the same exemption for anonymous calls. [Official REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).

## Recommended implementation contract

Use **bounded commit listing plus details**, because it preserves the existing period controls. Do not substitute weekly statistics into exact periods. This is a product/engineering recommendation, not a guarantee of complete GitHub coverage.

- Fetch commits once per selected repository, independent of contributor or selected period. Cache the captured records and detail results by repository plus SHA; changing tabs must not trigger per-person requests. Start with a single bounded list page and a small fixed detail budget; retain explicit truncation metadata.
- Attribute to the validated top-level GitHub `author.id`, consistent with existing roster reconciliation. Null/unlinked authors remain unattributed; do not infer identity from names/emails. Include contributors discovered only through commits. Do not credit the committer as the author or parse coauthor trailers in this slice.
- Exclude records with more than one parent from both commit and line metrics, avoiding merge-diff duplication. Count empty non-merge commits as commits with measured zero lines. Label this policy; it differs from GitHub contributor statistics.
- Choose `commit.committer.date` as the explicit period timestamp and apply the same local `[from,to]` filter to commits and their line details. This describes committed time, not PR merge time or when a branch first reached default. Do not claim exact authored-date filtering. Do not derive period completion merely from the oldest captured record; retain pagination/truncation status.
- Represent unavailable line stats as `null` plus status. Only sum validated nonnegative integer stats from successful detail responses. Never coerce missing stats, pending responses, failed calls or uncaptured history to zero. A valid measured zero is displayable; incomplete totals need `partial` or a clearly labeled captured subtotal.
- Keep commits and line coverage independent from PR/issue coverage. One unavailable detail must not erase successfully captured PRs or commits. Preserve stale successful measurements during retry, with source timestamp.
- Keep ranking by merged PRs unless Boss requests a scoring change. Show `Commits`, `Lines added`, `Lines removed`, and explain default-branch non-merge scope. `all` means captured history, not lifetime totals, until pagination is complete.
- Anonymous budget must be explicit: use a longer commit cache than the current five-minute PR cache, a small global detail cap, single-flight refreshes and remaining-budget checks. Preserve working public mode without requiring a token. The current cache is process-local; this remains a local bounded snapshot, not a guaranteed multi-instance organization-wide ingestion service.

GraphQL could batch history and change fields but introduces authenticated API access; it is not needed for this minimal public-mode addition. [Official GraphQL authentication](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql).
