import { selectMainRepositories } from "./derive.ts";
import { createGithubClient } from "./github.server.ts";
import type { GithubOptions, WorkResult } from "./github.server.ts";
import type { CodeResult } from "./github-code.server.ts";
import { createPreviewSnapshot } from "./preview.ts";
import { createRoster } from "./roster.ts";
import { createSnapshotCache } from "./snapshot-cache.server.ts";
import type { CachedResult } from "./snapshot-cache.server.ts";
import type { OfficeSnapshot, RepositoryCode, RepositoryWork } from "./types.ts";
import { InvalidSnapshotRequest, validateSnapshotRequest } from "./snapshot-request.server.ts";
import type { SnapshotRequest } from "./snapshot-request.server.ts";
export { InvalidSnapshotRequest } from "./snapshot-request.server.ts";

export type SnapshotLoaderOptions = GithubOptions & { allowPreview?: boolean };

export function createSnapshotLoader(options: SnapshotLoaderOptions = {}) {
  const now = options.now ?? (() => new Date());
  const allowPreview = options.allowPreview === true;
  const client = createGithubClient(options);
  const cache = createSnapshotCache(now);
  const observed = new Map<string, CachedResult<WorkResult>>();
  const observedCode = new Map<string, CachedResult<CodeResult>>();

  return async function load(options: SnapshotRequest): Promise<OfficeSnapshot> {
    validateSnapshotRequest(options, allowPreview);
    if (options.mode === "preview") {
      const preview = createPreviewSnapshot(now());
      if (options.repositoryId && !preview.repositories.some((repository) => repository.id === options.repositoryId)) {
        throw new InvalidSnapshotRequest("Repository is not in the public catalog.");
      }
      return preview;
    }
    const catalog = await cache.read("catalog", 600000, client.catalog);
    const repositories = catalog.value?.repositories ?? [];
    const roster = createRoster();
    const mainRepositoryIds = selectMainRepositories(repositories);
    if (catalog.value) {
      const ids = new Set(repositories.map((repository) => repository.id));
      cache.retain(repositories.flatMap((repository) => [`work:${repository.id}`, `code:${repository.id}`]));
      for (const id of observed.keys()) if (!ids.has(id)) observed.delete(id);
      for (const id of observedCode.keys()) if (!ids.has(id)) observedCode.delete(id);
      if (options.repositoryId && !ids.has(options.repositoryId)) throw new InvalidSnapshotRequest("Repository is not in the public catalog.");
    }
    let nextRepository = 0;
    await Promise.all(Array.from({ length: Math.min(3, repositories.length) }, async () => {
      while (nextRepository < repositories.length) {
        const repository = repositories[nextRepository++];
        observed.set(repository.id, await cache.read(`work:${repository.id}`, 300000, () => client.work(repository, roster)));
        observedCode.set(repository.id, await cache.read(`code:${repository.id}`, 900000, () => client.code(repository, roster)));
      }
    }));
    const work: RepositoryWork[] = repositories.map((repository) => {
      const entry = observed.get(repository.id);
      if (!entry?.value) return {
        repositoryId: repository.id, status: "unavailable", fetchedAt: null, pulls: null, issues: null,
        message: entry?.message || "Work has not been fetched for this repository.",
      };
      const expired = Date.parse(entry.fetchedAt ?? "") + 300000 <= now().getTime();
      return { ...entry.value.work,
        status: entry.status === "stale" || expired ? "stale" : entry.value.work.status,
        message: entry.message || (expired ? "Cached PR snapshot · refresh to retry." : entry.value.work.message),
      };
    });
    const code: RepositoryCode[] = repositories.map((repository) => {
      const entry = observedCode.get(repository.id);
      if (!entry?.value) return {
        repositoryId: repository.id, status: "unavailable", fetchedAt: null, commits: null,
        captureComplete: false, message: entry?.message || "Commits have not been fetched for this repository.",
        retryAt: entry?.retryAt ?? null, detailReadLimit: client.codeDetailLimit,
      };
      const expired = Date.parse(entry.fetchedAt ?? "") + 900000 <= now().getTime();
      return { ...entry.value.code,
        status: entry.status === "stale" || expired ? "stale" : entry.value.code.status,
        message: entry.message || (expired ? "Cached commits · refresh to retry." : entry.value.code.message),
        retryAt: entry.retryAt ?? entry.value.code.retryAt,
      };
    });
    const people = new Map(roster.map((person) => [person.id, person]));
    const activity = new Map<string, OfficeSnapshot["activity"][number]>();
    for (const entry of observed.values()) {
      for (const person of entry.value?.people ?? []) people.set(person.id, person);
      for (const event of entry.value?.activity ?? []) activity.set(event.id, event);
    }
    for (const entry of observedCode.values()) {
      for (const person of entry.value?.people ?? []) people.set(person.id, person);
    }
    const entries = [...observed.values()];
    const stale = catalog.status === "stale" || entries.some((entry) => entry.status === "stale");
    const unavailable = catalog.status === "unavailable" || entries.length > 0 && entries.every((entry) => entry.status === "unavailable");
    const retryAt = [catalog.retryAt, ...entries.map((entry) => entry.retryAt)].filter((time): time is string => !!time).sort().at(-1) ?? null;
    const fetchedAt = [catalog.fetchedAt, ...[...observed.values(), ...observedCode.values()].map((entry) => entry.fetchedAt)]
      .filter((time): time is string => !!time).sort().at(-1) ?? null;
    return {
      version: 1,
      source: {
        mode: "github", status: stale ? "stale" : unavailable ? "unavailable" : "partial",
        fetchedAt,
        message: catalog.message || `Public GitHub snapshot · ${work.filter((entry) => entry.pulls !== null).length}/${repositories.length} repositories with captured PRs; ${code.filter((entry) => entry.commits !== null).length}/${repositories.length} with captured commits. Bounded history.`,
        retryAt,
      },
      people: [...people.values()], repositories, mainRepositoryIds,
      roomSelectionBasis: "All public VOSS Labs repositories · GitHub snapshot",
      catalogComplete: catalog.value?.complete ?? false, work, code,
      activity: [...activity.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 100),
    };
  };
}
