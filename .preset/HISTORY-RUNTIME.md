# Full-history built runtime verification

Task `proj-2a3d9fa34f971f90`, baseline `cb9514c66a31dc1c4ec337a775d827db3c7ccdac`. Harness and local runtime evidence. Parent owns final source/build readiness and production operations.

Run the saved harness only after building stable source:

```sh
node .preset/HISTORY-RUNTIME.mjs
```

For the parent to inspect the verified genuine local board afterward:

```sh
node .preset/HISTORY-RUNTIME.mjs --serve
```

The optional serve mode prints its ephemeral loopback URL after checks, retains the same genuine local KV, serves built static assets and closes on SIGINT/SIGTERM. Cleanup disposes workerd and removes temporary persistence. The deliberately invalid local token used for retention remains bound while serving; public HTTP reads only KV. Neither mode writes production KV or changes remote bindings/secrets.

The harness loads the existing ignored `.deploy.secrets` only at execution time and supplies the intended token solely through an in-memory Miniflare binding. It loads the unchanged built scheduled entry and modules from `build/server`, uses that build's compatibility settings, and starts with empty isolated temporary local KV. It uses the same installed local Miniflare/workerd route as the previous genuine capture verification; no Node-produced snapshot is written into KV.

Checks cover strict `assertCompletePublicSnapshot`, saved PR/code history completeness, matching built snapshot API, default contributor API period `all`, explicit all/month consistency, no-store, and the UI's raw-record selector. The October witness links only by GitHub numeric ID `149477150`: SHA `2189670e140eefffa8041e53de47655d8669059f`, committed `2026-10-02T17:54:21Z`, +744/-213, must be present in both current All time and October windows. Summary totals must agree with selected raw records and event dates.

Separate read-only GitHub reference requests compare the immutable witness headline/date/measurements/URL, Parth's actual PR titles/states/opened/closed/merged timestamps/URLs and the current public catalog against the actual built capture. These reference reads do not publish data or contribute to the scheduled invocation's measured request count. Repository and total-record counts are observations, never hardcoded expected totals. Known PRs #73/#64 remain open and #63 closed-unmerged in the dated witness checks.

After successful publication/API/reference checks, a second actual scheduled invocation uses only a deliberate invalid local test token. It must retain the exact serialized KV bytes and continue serving the same saved snapshot. Output is limited to known runtime-capture fields, public witness data, counts and fixed failure stage; credentials, request headers, query bodies and arbitrary upstream exception text are never printed.

Parent owns full application checks, deployment, live browser checks and production Cron/KV/API verification. Passing this local harness establishes genuine built-workerd capture and local retention, not remote delivery or cloud CPU capacity.

## First built run

Parent signaled a stable build after 81 tests and generated typecheck. Genuine local workerd successfully published 17 repositories using 36 requests in 10,777 ms, with complete strict publication and matching built APIs. At capture time `2026-10-17T12:37:34.066Z`, both All time and month selectors/API summaries included Parth's exact October 2 SHA, one commit, +744/-213, three opened PRs and zero merged PRs. The current API default was verified as all.

The independent-reference stage then stopped on an incorrect harness assumption: REST raw commit first line was treated as equivalent to GraphQL `messageHeadline`. GitHub provides a shortened headline ending in an ellipsis for this witness. This is a harness comparison error, not evidence of a collection defect. The comparison now independently fetches GraphQL `messageHeadline` through the REST commit's immutable node ID; date, numeric identity, stats and URL remain independently checked through REST. No application files were changed. The first temporary namespace/runtime was cleaned up, and serving did not start.

The data owner subsequently tightened rejection of malformed non-null changed-line measurements after independent review. Parent rebuilt that final source after 82 tests and generated typecheck passed; the complete rerun below supersedes the first run.

## Final built run

Every prepared assertion passed on the final production build. Genuine local workerd started with empty isolated KV, executed the actual built scheduled handler and published at `2026-10-17T12:39:12.686Z`: 17 current public repositories, 36 external requests, 8,818 ms elapsed, 151 PRs and 309 non-merge commits. Strict complete-publication validation accepted all current PR and code histories; the independently fetched live public catalog IDs matched exactly. No repository or total-record count was hardcoded as an assertion.

Built `/api/snapshot`, default `/api/leaderboard`, explicit `period=all` and `period=month` all passed. Snapshot data matched the persisted document, responses used no-store, default period was all, and both PR and code history completeness were true. Snapshot source/cutoff time was `2026-10-17T12:39:12.679Z`; the serialized capturedAt followed seven milliseconds later.

The linked contributor `github:149477150` had one commit, +744/-213, three opened PRs and zero merged PRs in both All time and October. The raw-record/UI selector contained SHA `2189670e140eefffa8041e53de47655d8669059f`, committed `2026-10-02T17:54:21Z`, at its exact public GitHub URL. Independent REST validation matched author numeric ID, date, additions, deletions and URL. Independent GraphQL validation of the immutable node matched the captured plain `messageHeadline`: `Add four rooms as a fixed list: placements, electives, hostel, projec…`.

Independent REST references matched every captured PR authored by that identity in vroom:

| PR | Title | State | Opened UTC | Closed UTC | Merged |
| --- | --- | --- | --- | --- | --- |
| [63](https://github.com/voss-labs/vroom/pull/63) | feat: implement dynamic sidebar routing and custom room empty states | closed | 2026-10-01 20:35:48 | 2026-10-02 17:55:25 | null |
| [64](https://github.com/voss-labs/vroom/pull/64) | Feature/theme toggle | open | 2026-10-03 21:26:27 | null | null |
| [73](https://github.com/voss-labs/vroom/pull/73) | Feature/ filter | open | 2026-10-07 20:08:38 | null | null |

The deliberate invalid-token second scheduled invocation completed with ordinary failed publication and preserved the exact serialized KV bytes. The snapshot API still returned the identical complete document afterward.

Serving remains active for parent browser inspection at `http://127.0.0.1:50530/`, PTY execution session `80737`. This endpoint serves the unchanged built Worker/static assets and only the verified isolated local KV; the deliberately invalid test token remains in its local binding. Parent can send Ctrl-C to that session for disposal and temporary-persistence cleanup. No production KV/resource/binding/secret changes occurred during this verification.
