import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { selectContributionHistory, inContributionWindow } from "../app/data/contribution-history.ts";
import { historyCoverage } from "../app/data/history-coverage.ts";
import { assertCompletePublicSnapshot } from "../app/data/snapshot-validation.server.ts";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const witness = { githubId: 149477150, sha: "2189670e140eefffa8041e53de47655d8669059f",
  committedAt: "2026-10-02T17:54:21Z", additions: 744, deletions: 213 };
const key = "public-office-snapshot:v1";
const serve = process.argv.includes("--serve");
let stage = "prepare";

function emit(event, values) {
  console.log(JSON.stringify({ event, ...values }));
}

function runtimeLogs(events) {
  return (log) => {
    try {
      const value = JSON.parse(log.message);
      if (value.event !== "github-snapshot-capture") return;
      const event = { published: value.published === true, reason: value.published === true ? "captured" : "failed",
        requests: Number.isSafeInteger(value.requests) ? value.requests : null,
        repositories: Number.isSafeInteger(value.repositories) ? value.repositories : null,
        elapsedMs: Number.isFinite(value.elapsedMs) ? value.elapsedMs : null };
      events.push(event);
      emit("runtime-capture", event);
    } catch {}
  };
}

async function readJson(mf, path) {
  const response = await mf.dispatchFetch(`http://local${path}`);
  assert.equal(response.status, 200, "Built API request failed");
  assert.equal(response.headers.get("cache-control"), "no-store");
  return response.json();
}

async function reference(path, token, payload) {
  const response = await fetch(`https://api.github.com${path}`, { redirect: "manual", signal: AbortSignal.timeout(8000),
    method: payload ? "POST" : "GET", body: payload ? JSON.stringify(payload) : undefined,
    headers: { Accept: "application/vnd.github+json", "User-Agent": "vleaderboard-history-verification",
      "X-GitHub-Api-Version": "2026-03-10", "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Independent public GitHub reference read failed");
  }
  return { data: await response.json(), next: /rel="next"/.test(response.headers.get("link") ?? "") };
}

async function verifyReferences(snapshot, person, commit, token) {
  stage = "reference-commit";
  const repository = snapshot.repositories.find((item) => item.id === commit.repositoryId);
  assert.ok(repository);
  const { data: raw } = await reference(`/repos/${repository.fullName}/commits/${witness.sha}`, token);
  assert.equal(raw.sha, witness.sha);
  assert.equal(raw.author?.id, witness.githubId);
  assert.equal(raw.commit?.committer?.date, witness.committedAt);
  assert.equal(raw.stats?.additions, witness.additions);
  assert.equal(raw.stats?.deletions, witness.deletions);
  assert.equal(commit.url, raw.html_url);
  stage = "reference-headline";
  assert.equal(typeof raw.node_id, "string");
  const { data: envelope } = await reference("/graphql", token, {
    query: "query WitnessHeadline($id: ID!) { node(id: $id) { ... on Commit { oid messageHeadline } } }",
    variables: { id: raw.node_id },
  });
  assert.ok(!envelope.errors?.length, "Independent headline reference failed");
  assert.equal(envelope.data?.node?.oid, witness.sha);
  assert.equal(commit.messageHeadline, envelope.data.node.messageHeadline);
  stage = "reference-pull-requests";
  const pulls = snapshot.work.flatMap((item) => item.pulls ?? []).filter((pull) => pull.authorPersonId === person.id && !pull.isBot);
  for (const pull of pulls) {
    const repo = snapshot.repositories.find((item) => item.id === pull.repositoryId);
    const { data: current } = await reference(`/repos/${repo.fullName}/pulls/${pull.number}`, token);
    assert.equal(current.user?.id, witness.githubId);
    for (const [field, expected] of Object.entries({ title: current.title, url: current.html_url,
      createdAt: current.created_at, updatedAt: current.updated_at, mergedAt: current.merged_at,
      closedAt: current.closed_at, state: current.merged_at ? "merged" : current.state })) {
      assert.equal(pull[field], expected, "Captured PR differs from its public GitHub record");
    }
  }
  for (const [number, state] of [[73, "open"], [64, "open"], [63, "closed"]]) {
    assert.ok(pulls.some((pull) => pull.number === number && pull.state === state && pull.mergedAt === null), "Known unmerged PR missing");
  }
  const liveIds = [];
  stage = "reference-catalog";
  for (let page = 1; page <= 10; page += 1) {
    const { data, next } = await reference(`/orgs/voss-labs/repos?type=public&per_page=100&page=${page}`, token);
    assert.ok(Array.isArray(data));
    liveIds.push(...data.filter((item) => item.private === false && item.owner?.login?.toLowerCase() === "voss-labs").map((item) => item.id));
    if (!next) break;
    assert.notEqual(page, 10, "Reference catalog did not exhaust");
  }
  assert.deepEqual(snapshot.repositories.map((item) => item.githubId).sort((a, b) => a - b), [...new Set(liveIds)].sort((a, b) => a - b));
  return { headline: commit.messageHeadline, repository: repository.fullName,
    pullRequests: pulls.map((pull) => ({ number: pull.number, state: pull.state, title: pull.title,
      openedAt: pull.createdAt, closedAt: pull.closedAt, mergedAt: pull.mergedAt, url: pull.url })) };
}

function verifyPeriod(snapshot, report, person) {
  const contributor = report.contributors.find((item) => item.id === person.id);
  assert.ok(contributor, "Linked contributor missing from API");
  assert.deepEqual(report.coverage.history, { pullRequests: true, commits: true, complete: true });
  const histories = snapshot.repositories.map((repository) => ({ repository,
    history: selectContributionHistory(snapshot, person.id, repository.id, report) }));
  const commits = histories.flatMap((entry) => entry.history.commits);
  const pulls = histories.flatMap((entry) => entry.history.pullRequests);
  const target = commits.find((commit) => commit.sha === witness.sha);
  assert.ok(target, "Earlier October commit missing from selected period");
  assert.equal(target.committedAt, witness.committedAt);
  assert.equal(target.additions, witness.additions);
  assert.equal(target.deletions, witness.deletions);
  assert.equal(target.href, target.url);
  assert.equal(target.headline, target.messageHeadline.trim());
  assert.equal(contributor.capturedCommits, commits.length);
  assert.equal(contributor.additions, commits.some((commit) => commit.additions === null || commit.deletions === null)
    ? null : commits.reduce((total, commit) => total + commit.additions, 0));
  assert.equal(contributor.deletions, commits.some((commit) => commit.additions === null || commit.deletions === null)
    ? null : commits.reduce((total, commit) => total + commit.deletions, 0));
  const allPulls = snapshot.work.flatMap((entry) => entry.pulls ?? []).filter((pull) => pull.authorPersonId === person.id && !pull.isBot);
  assert.equal(contributor.opened, allPulls.filter((pull) => inContributionWindow(pull.createdAt, report)).length);
  assert.equal(contributor.merged, allPulls.filter((pull) => pull.state === "merged" && inContributionWindow(pull.mergedAt, report)).length);
  for (const pull of pulls) {
    assert.equal(pull.href, pull.url);
    assert.ok(Object.hasOwn(pull, "closedAt"));
  }
  emit("contributor-period", { period: report.period, from: report.from, to: report.to,
    commits: commits.length, additions: contributor.additions, deletions: contributor.deletions,
    opened: contributor.opened, merged: contributor.merged, visiblePullRequests: pulls.length,
    witnessSha: target.sha, witnessCommittedAt: target.committedAt, witnessHeadline: target.headline });
}

async function main() {
  const raw = await readFile(join(project, ".deploy.secrets"), "utf8");
  const secrets = raw.trimStart().startsWith("{") ? JSON.parse(raw) : parseEnv(raw);
  assert.ok(secrets.GITHUB_TOKEN?.trim(), "Required private runtime credential unavailable");
  const root = join(project, "build/server");
  const config = JSON.parse(await readFile(join(root, "wrangler.json"), "utf8"));
  const names = (await readdir(root, { recursive: true })).filter((name) => name.endsWith(".js"));
  names.sort((a, b) => a === config.main ? -1 : b === config.main ? 1 : a.localeCompare(b));
  const modules = await Promise.all(names.map(async (name) => ({ type: "ESModule", path: resolve(root, name),
    contents: await readFile(resolve(root, name), "utf8") })));
  const directory = await mkdtemp(join(tmpdir(), "vleaderboard-full-history-"));
  const events = [];
  const options = (token) => convertV4MiniflareOptions({ modules, modulesRoot: root,
    compatibilityDate: config.compatibility_date, compatibilityFlags: config.compatibility_flags,
    kvNamespaces: ["SNAPSHOTS"], kvPersist: directory, host: "127.0.0.1", port: 0,
    assets: { directory: resolve(root, config.assets.directory), routerConfig: { has_user_worker: true } },
    handleStructuredLogs: runtimeLogs(events), bindings: { GITHUB_TOKEN: token, ALLOW_PREVIEW: "false" } });
  let mf;
  try {
    mf = new Miniflare(options(secrets.GITHUB_TOKEN));
    stage = "scheduled-capture";
    let kv = await mf.getKVNamespace("SNAPSHOTS");
    assert.equal(await kv.get(key), null);
    const scheduled = await (await mf.getWorker()).scheduled({ cron: "*/15 * * * *", scheduledTime: Date.now() });
    assert.equal(scheduled.outcome, "ok");
    const good = await kv.get(key);
    assert.ok(good, "Built scheduled handler did not publish");
    const document = JSON.parse(good);
    assertCompletePublicSnapshot(document.snapshot);
    assert.deepEqual(historyCoverage(document.snapshot), { pullRequests: true, commits: true, complete: true });
    stage = "built-apis";
    const snapshot = await readJson(mf, "/api/snapshot");
    assertCompletePublicSnapshot(snapshot);
    assert.deepEqual(snapshot, document.snapshot);
    const person = snapshot.people.find((item) => item.github?.id === witness.githubId);
    assert.ok(person, "Linked GitHub identity missing");
    const commit = snapshot.code.flatMap((entry) => entry.commits).find((item) => item.sha === witness.sha);
    assert.ok(commit, "Earlier default-branch witness missing");
    assert.equal(commit.authorPersonId, person.id);
    const all = await readJson(mf, "/api/leaderboard");
    assert.equal(all.period, "all", "API default must be All time");
    const explicitAll = await readJson(mf, "/api/leaderboard?period=all");
    assert.deepEqual(all, explicitAll);
    const month = await readJson(mf, "/api/leaderboard?period=month");
    stage = "all-period-records";
    verifyPeriod(snapshot, all, person);
    stage = "month-period-records";
    verifyPeriod(snapshot, month, person);
    stage = "independent-public-references";
    const referenceData = await verifyReferences(snapshot, person, commit, secrets.GITHUB_TOKEN);
    const captured = events.find((event) => event.published);
    assert.ok(captured && captured.requests > 0 && captured.requests <= 44, "Missing bounded capture request measurement");
    emit("full-history-publication", { outcome: scheduled.outcome, capturedAt: document.capturedAt,
      requests: captured.requests,
      repositories: snapshot.repositories.length, pullRequests: snapshot.work.reduce((total, entry) => total + entry.pulls.length, 0),
      nonMergeCommits: snapshot.code.reduce((total, entry) => total + entry.commits.length, 0),
      completeness: historyCoverage(snapshot), witness: referenceData });
    stage = "failed-refresh-retention";
    await mf.setOptions(options("invalid-runtime-test-token"));
    const failed = await (await mf.getWorker()).scheduled({ cron: "*/15 * * * *", scheduledTime: Date.now() });
    kv = await mf.getKVNamespace("SNAPSHOTS");
    assert.equal(failed.outcome, "ok");
    assert.equal(await kv.get(key), good, "Failed refresh replaced the last good document");
    assert.deepEqual(await readJson(mf, "/api/snapshot"), snapshot);
    emit("failed-refresh", { outcome: failed.outcome, lastGoodUnchanged: true });
    if (serve) {
      stage = "serving";
      console.log(String(await mf.ready));
      await new Promise((done) => {
        process.once("SIGINT", done);
        process.once("SIGTERM", done);
      });
    }
  } finally {
    await mf?.dispose();
    await rm(directory, { recursive: true, force: true });
  }
}

await main().catch(() => {
  emit("history-runtime-failed", { stage });
  process.exitCode = 1;
});
