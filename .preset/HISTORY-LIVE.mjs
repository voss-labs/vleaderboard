import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { assertCompletePublicSnapshot } from "../app/data/snapshot-validation.server.ts";
import { historyCoverage } from "../app/data/history-coverage.ts";
import { createContributorReport } from "../app/data/contributor-report.ts";
import { selectContributionHistory } from "../app/data/contribution-history.ts";

const account = "1dfc99e44eaba4def73a09dea46a0eda";
const namespace = "bc25976951394aca86a5afdaab482528";
const minimumCapture = Date.parse(process.argv[2] ?? "");
assert.ok(Number.isFinite(minimumCapture), "Provide the earliest acceptable deployed capture time");
const credential = JSON.parse(execFileSync("npx", ["wrangler", "auth", "token", "--json"], {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 20000,
}));
async function cloudflare(path, raw = false) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    headers: { Authorization: `Bearer ${credential.token}` }, signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200, "Existing Cloudflare read authorization failed");
  const body = await response.json();
  if (raw) return body;
  assert.equal(body.success, true);
  return body.result;
}
function live(host, path) {
  const body = execFileSync("curl", ["--fail", "--silent", "--show-error", "--max-time", "20", `https://${host}${path}`], {
    encoding: "utf8", timeout: 25000, stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(body);
}
const document = await cloudflare(`/storage/kv/namespaces/${namespace}/values/${encodeURIComponent("public-office-snapshot:v1")}`, true);
assert.equal(document.version, 1);
assert.ok(Date.parse(document.capturedAt) >= minimumCapture, "Production full-history Cron has not published yet");
const snapshot = document.snapshot;
assertCompletePublicSnapshot(snapshot);
assert.deepEqual(historyCoverage(snapshot), { pullRequests: true, commits: true, complete: true });
const person = snapshot.people.find((entry) => entry.github?.id === 149477150);
const repository = snapshot.repositories.find((entry) => entry.fullName === "voss-labs/vroom");
assert.ok(person && repository);
const all = createContributorReport(snapshot, "all");
const month = createContributorReport(snapshot, "month");
for (const report of [all, month]) {
  const history = selectContributionHistory(snapshot, person.id, repository.id, report);
  const witness = history.commits.find((entry) => entry.sha === "2189670e140eefffa8041e53de47655d8669059f");
  assert.ok(witness);
  assert.equal(witness.committedAt, "2026-10-02T17:54:21Z");
  assert.equal(witness.additions, 744);
  assert.equal(witness.deletions, 213);
  assert.equal(witness.href, witness.url);
  const row = report.contributors.find((entry) => entry.id === person.id);
  assert.equal(row.capturedCommits, 1);
  assert.equal(row.additions, 744);
  assert.equal(row.deletions, 213);
  assert.equal(row.opened, 3);
  assert.equal(row.merged, 0);
  assert.equal(history.pullRequests.length, 3);
  assert.ok(history.pullRequests.some((entry) => entry.number === 63 && entry.state === "closed" && entry.mergedAt === null));
}
for (const host of ["vleaderboard.vosslabs.org", "vleaderboard.harshal-more.workers.dev"]) {
  assert.deepEqual(live(host, "/api/snapshot"), snapshot);
  assert.deepEqual(live(host, "/api/leaderboard"), all);
  assert.deepEqual(live(host, "/api/leaderboard?period=month"), month);
}
const settings = await cloudflare("/workers/scripts/vleaderboard/settings");
assert.ok(settings.bindings.some((entry) => entry.name === "GITHUB_TOKEN" && entry.type === "secret_text"));
assert.ok(settings.bindings.some((entry) => entry.name === "SNAPSHOTS" && entry.namespace_id === namespace));
assert.ok(settings.bindings.some((entry) => entry.name === "ALLOW_PREVIEW" && entry.type === "plain_text" && entry.text === "false"));
const schedules = await cloudflare("/workers/scripts/vleaderboard/schedules");
assert.ok(schedules.schedules.some((entry) => entry.cron === "*/15 * * * *"));
const commits = snapshot.code.flatMap((entry) => entry.commits);
console.log(JSON.stringify({ event: "production-history-verified", capturedAt: document.capturedAt,
  repositories: snapshot.repositories.length, pullRequests: snapshot.work.reduce((sum, entry) => sum + entry.pulls.length, 0),
  nonMergeCommits: commits.length, contributors: all.contributors.length, completeness: historyCoverage(snapshot),
  earliestCommit: commits.map((entry) => entry.committedAt).sort()[0],
  parth: { commits: 1, additions: 744, deletions: 213, opened: 3, merged: 0 },
  bothHostsMatch: true, existingSecretKvSchedulePreserved: true }));
