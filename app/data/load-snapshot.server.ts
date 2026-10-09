import { selectMainRepositories } from "./derive.ts";
import { createGithubClient } from "./github.server.ts";
import type { GithubOptions, WorkResult } from "./github.server.ts";
import { createPreviewSnapshot } from "./preview.ts";
import { createRoster } from "./roster.ts";
import { createSnapshotCache } from "./snapshot-cache.server.ts";
import type { CachedResult } from "./snapshot-cache.server.ts";
import type { DataMode, OfficeSnapshot, RepositoryWork } from "./types.ts";

export class InvalidSnapshotRequest extends Error {}

export function createSnapshotLoader(options: GithubOptions = {}) {
  const now = options.now ?? (() => new Date());
  const client = createGithubClient(options);
  const cache = createSnapshotCache(now);
  const observed = new Map<string, CachedResult<WorkResult>>();

  return async function load(options: { mode: DataMode; repositoryId?: string }): Promise<OfficeSnapshot> {
    if (options.mode !== "preview" && options.mode !== "github") throw new InvalidSnapshotRequest("Invalid snapshot mode.");
    if (options.repositoryId !== undefined && !/^github:[1-9]\d*$/.test(options.repositoryId)) throw new InvalidSnapshotRequest("Invalid repository ID.");
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
      cache.retain(repositories.map((repository) => `work:${repository.id}`));
      for (const id of observed.keys()) if (!ids.has(id)) observed.delete(id);
      if (options.repositoryId && !ids.has(options.repositoryId)) throw new InvalidSnapshotRequest("Repository is not in the public catalog.");
    }
    const selectedId = options.repositoryId ?? mainRepositoryIds[0];
    const selected = repositories.find((repository) => repository.id === selectedId);
    if (selected) observed.set(selected.id, await cache.read(`work:${selected.id}`, 300000, () => client.work(selected, roster)));
    const work: RepositoryWork[] = repositories.map((repository) => {
      const entry = observed.get(repository.id);
      if (!entry?.value) return {
        repositoryId: repository.id, status: "unavailable", fetchedAt: null, pulls: null, issues: null,
        message: entry?.message || "Work has not been fetched for this repository.",
      };
      const expired = Date.parse(entry.fetchedAt ?? "") + 300000 <= now().getTime();
      return { ...entry.value.work,
        status: entry.status === "stale" || expired ? "stale" : entry.value.work.status,
        message: entry.message || (expired ? "Cached snapshot · select this room to refresh." : entry.value.work.message),
      };
    });
    const people = new Map(roster.map((person) => [person.id, person]));
    const activity = new Map<string, OfficeSnapshot["activity"][number]>();
    for (const entry of observed.values()) {
      for (const person of entry.value?.people ?? []) people.set(person.id, person);
      for (const event of entry.value?.activity ?? []) activity.set(event.id, event);
    }
    const selectedWork = selected ? observed.get(selected.id) : undefined;
    const stale = catalog.status === "stale" || selectedWork?.status === "stale";
    const unavailable = catalog.status === "unavailable" || selectedWork?.status === "unavailable";
    const retryAt = [catalog.retryAt, selectedWork?.retryAt].filter((time): time is string => !!time).sort().at(-1) ?? null;
    const fetchedAt = [catalog.fetchedAt, ...[...observed.values()].map((entry) => entry.fetchedAt)]
      .filter((time): time is string => !!time).sort().at(-1) ?? null;
    return {
      version: 1,
      source: {
        mode: "github", status: stale ? "stale" : unavailable ? "unavailable" : "partial",
        fetchedAt,
        message: catalog.message || selectedWork?.message || "Public GitHub snapshot · bounded repository coverage. Select a room to fetch its work.",
        retryAt,
      },
      people: [...people.values()], repositories, mainRepositoryIds,
      roomSelectionBasis: "Most recently pushed · GitHub snapshot",
      catalogComplete: catalog.value?.complete ?? false, work,
      activity: [...activity.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 100),
    };
  };
}

const defaultLoader = createSnapshotLoader({ token: process.env.GITHUB_TOKEN });

export function loadSnapshot(options: { mode: DataMode; repositoryId?: string }): Promise<OfficeSnapshot> {
  return defaultLoader(options);
}
