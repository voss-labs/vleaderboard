import type { OfficeSnapshot } from "./types.ts";
import { MAX_CAPTURE_RECORDS } from "./capture-limits.ts";
import { historyCoverage } from "./history-coverage.ts";

function record(value: unknown, keys: string[], optional: string[] = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid snapshot object.");
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !keys.includes(key) && !optional.includes(key)) || keys.some((key) => !(key in result))) {
    throw new Error("Invalid snapshot fields.");
  }
  return result;
}

function text(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length > 20000) throw new Error("Invalid snapshot text.");
}

function integer(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error("Invalid snapshot count.");
}

function timestamp(value: unknown) {
  text(value);
  if (!Number.isFinite(Date.parse(value))) throw new Error("Invalid snapshot time.");
}

function array(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) throw new Error("Invalid snapshot collection.");
  return value;
}

function nullable(value: unknown, validate: (item: unknown) => void) {
  if (value !== null) validate(value);
}

function bool(value: unknown) {
  if (typeof value !== "boolean") throw new Error("Invalid snapshot flag.");
}

function oneOf(value: unknown, values: unknown[]) {
  if (!values.includes(value)) throw new Error("Invalid snapshot value.");
}

function reference(value: unknown, ids: Set<unknown>) {
  if (!ids.has(value)) throw new Error("Invalid snapshot relationship.");
}

function references(value: unknown, ids: Set<unknown>, maximum: number) {
  const entries = array(value, maximum);
  if (new Set(entries).size !== entries.length) throw new Error("Duplicate snapshot relationship.");
  entries.forEach((id) => reference(id, ids));
}

function unique(entries: Record<string, unknown>[], key: string) {
  const ids = new Set(entries.map((entry) => entry[key]));
  if (ids.size !== entries.length) throw new Error("Duplicate snapshot identity.");
  return ids;
}

function githubUrl(value: unknown) {
  text(value);
  const url = new URL(value);
  if (url.origin !== "https://github.com" || url.username || url.password || url.search || url.hash) {
    throw new Error("Invalid public GitHub URL.");
  }
}

export function assertPublicSnapshot(value: unknown): asserts value is OfficeSnapshot {
  const snapshot = record(value, ["version", "source", "people", "repositories", "mainRepositoryIds", "roomSelectionBasis", "catalogComplete", "work", "code", "activity"]);
  if (snapshot.version !== 1 || snapshot.catalogComplete !== true) throw new Error("Incomplete public catalog.");
  text(snapshot.roomSelectionBasis);
  const source = record(snapshot.source, ["mode", "status", "fetchedAt", "message", "retryAt"]);
  if (source.mode !== "github" || source.retryAt !== null) throw new Error("Invalid public source.");
  oneOf(source.status, ["ready", "partial"]);
  timestamp(source.fetchedAt);
  text(source.message);

  const people = array(snapshot.people, 20000).map((item) => record(item, ["id", "name", "role", "kind", "github", "homeRoomId", "table", "repositoryIds", "assignment", "palette"]));
  const personIds = unique(people, "id");
  const repositories = array(snapshot.repositories, 300).map((item) => record(item, ["id", "githubId", "name", "fullName", "description", "url", "language", "archived", "fork", "pushedAt", "leadPersonId", "memberPersonIds", "assignment"]));
  const repositoryIds = unique(repositories, "id");
  for (const person of people) {
    text(person.id); text(person.name); text(person.role); text(person.homeRoomId);
    oneOf(person.kind, ["named", "github"]);
    oneOf(person.assignment, ["confirmed", "unknown"]);
    oneOf(person.table, [null, "engineering", "community", "research"]);
    integer(person.palette);
    if (person.kind === "named" ? !/^named:[a-z0-9-]+$/.test(person.id) : !/^github:[1-9]\d*$/.test(person.id)) {
      throw new Error("Invalid public person.");
    }
    if (person.github !== null) {
      const github = record(person.github, ["id", "login", "url"]);
      integer(github.id); text(github.login);
      if (!github.id || !/^[A-Za-z0-9][A-Za-z0-9-]*(?:\[bot\])?$/.test(github.login) ||
        github.url !== `https://github.com/${github.login}` ||
        person.kind === "github" && person.id !== `github:${github.id}`) throw new Error("Invalid public identity.");
    } else if (person.kind === "github") throw new Error("Missing public identity.");
    references(person.repositoryIds, repositoryIds, 300);
  }
  for (const repository of repositories) {
    integer(repository.githubId); text(repository.name);
    if (!repository.githubId || repository.id !== `github:${repository.githubId}` ||
      !/^[A-Za-z0-9_.-]+$/.test(repository.name) || repository.fullName !== `voss-labs/${repository.name}` ||
      repository.url !== `https://github.com/voss-labs/${repository.name}`) throw new Error("Invalid public repository.");
    nullable(repository.description, text); nullable(repository.language, text);
    nullable(repository.pushedAt, timestamp); nullable(repository.leadPersonId, (id) => reference(id, personIds));
    references(repository.memberPersonIds, personIds, 20000);
    oneOf(repository.assignment, ["confirmed", "unknown"]);
    bool(repository.archived); bool(repository.fork);
  }
  references(snapshot.mainRepositoryIds, repositoryIds, 4);

  const work = array(snapshot.work, 300).map((item) => record(item, ["repositoryId", "status", "fetchedAt", "pulls", "issues", "message"], ["captureComplete"]));
  const code = array(snapshot.code, 300).map((item) => record(item, ["repositoryId", "status", "fetchedAt", "commits", "captureComplete", "message", "retryAt", "detailReadLimit"]));
  for (const entries of [work, code]) {
    const ids = unique(entries, "repositoryId");
    if (ids.size !== repositoryIds.size) throw new Error("Incomplete repository capture.");
    for (const entry of entries) {
      reference(entry.repositoryId, repositoryIds);
      oneOf(entry.status, ["ready", "partial"]); timestamp(entry.fetchedAt); text(entry.message);
    }
  }
  for (const entry of work) {
    if ("captureComplete" in entry) bool(entry.captureComplete);
    if (entry.issues !== null) throw new Error("Unexpected issue capture.");
    const pulls = array(entry.pulls, MAX_CAPTURE_RECORDS).map((item) => record(item, ["id", "repositoryId", "number", "title", "url", "kind", "state", "authorPersonId", "assigneePersonIds", "requestedReviewerPersonIds", "createdAt", "updatedAt", "mergedAt", "isBot"], ["closedAt"]));
    unique(pulls, "id");
    const repository = repositories.find((item) => item.id === entry.repositoryId)!;
    for (const pull of pulls) {
      integer(pull.number); text(pull.title); bool(pull.isBot);
      if (!pull.number || pull.repositoryId !== entry.repositoryId || pull.kind !== "pull-request" ||
        pull.id !== `${entry.repositoryId}:pr:${pull.number}` || pull.url !== `${repository.url}/pull/${pull.number}`) {
        throw new Error("Invalid public pull request.");
      }
      oneOf(pull.state, ["open", "closed", "merged"]);
      reference(pull.authorPersonId, personIds);
      references(pull.assigneePersonIds, personIds, 20000); references(pull.requestedReviewerPersonIds, personIds, 20000);
      timestamp(pull.createdAt); timestamp(pull.updatedAt); nullable(pull.mergedAt, timestamp);
      if ((pull.state === "merged") !== (pull.mergedAt !== null) ||
        Date.parse(pull.updatedAt as string) < Date.parse(pull.createdAt as string) ||
        pull.mergedAt !== null && (Date.parse(pull.mergedAt as string) < Date.parse(pull.createdAt as string) ||
          Date.parse(pull.mergedAt as string) > Date.parse(pull.updatedAt as string))) throw new Error("Invalid merged time.");
      if ("closedAt" in pull) {
        nullable(pull.closedAt, timestamp);
        if ((pull.state === "open") !== (pull.closedAt === null) ||
          pull.closedAt !== null && (Date.parse(pull.closedAt as string) < Date.parse(pull.createdAt as string) ||
            Date.parse(pull.closedAt as string) > Date.parse(pull.updatedAt as string) ||
            pull.mergedAt !== null && Date.parse(pull.closedAt as string) < Date.parse(pull.mergedAt as string))) throw new Error("Invalid closed time.");
      }
    }
  }
  for (const entry of code) {
    if (entry.retryAt !== null || entry.detailReadLimit !== null) throw new Error("Incomplete code capture.");
    bool(entry.captureComplete);
    const commits = array(entry.commits, MAX_CAPTURE_RECORDS).map((item) => record(item, ["id", "repositoryId", "sha", "url", "authorPersonId", "committedAt", "additions", "deletions", "isBot"], ["messageHeadline", "attributedBy"]));
    unique(commits, "sha");
    const repository = repositories.find((item) => item.id === entry.repositoryId)!;
    for (const commit of commits) {
      text(commit.sha); bool(commit.isBot); timestamp(commit.committedAt);
      if ("messageHeadline" in commit) text(commit.messageHeadline);
      if ("attributedBy" in commit) { oneOf(commit.attributedBy, ["pull-request"]); reference(commit.authorPersonId, personIds); }
      nullable(commit.authorPersonId, (id) => reference(id, personIds));
      nullable(commit.additions, integer); nullable(commit.deletions, integer);
      if (!/^[a-f0-9]{40}$/i.test(commit.sha) || commit.repositoryId !== entry.repositoryId ||
        commit.id !== `${entry.repositoryId}:commit:${commit.sha}` || commit.url !== `${repository.url}/commit/${commit.sha}`) {
        throw new Error("Invalid public commit.");
      }
    }
  }
  const activity = array(snapshot.activity, 100).map((item) => record(item, ["id", "personId", "repositoryId", "kind", "text", "occurredAt", "source", "url", "fresh"]));
  unique(activity, "id");
  for (const event of activity) {
    text(event.id); text(event.text); timestamp(event.occurredAt);
    reference(event.personId, personIds); nullable(event.repositoryId, (id) => reference(id, repositoryIds));
    oneOf(event.kind, ["opened", "merged", "closed", "reviewed", "committed", "planning", "visit"]);
    nullable(event.url, githubUrl);
    if (event.source !== "github" || event.fresh !== false) throw new Error("Invalid public activity.");
  }
}

export function assertCompletePublicSnapshot(value: unknown): asserts value is OfficeSnapshot {
  assertPublicSnapshot(value);
  if (!historyCoverage(value).complete || value.work.some((entry) => entry.pulls?.some((pull) => !("closedAt" in pull))) ||
    value.code?.some((entry) => entry.commits?.some((commit) => typeof commit.messageHeadline !== "string"))) {
    throw new Error("Incomplete public contribution history.");
  }
}
