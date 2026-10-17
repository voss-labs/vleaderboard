import type { OfficeSnapshot } from "./types.ts";

type HistorySnapshot = Pick<OfficeSnapshot, "repositories" | "catalogComplete" | "work" | "code"> & { source: Pick<OfficeSnapshot["source"], "mode"> };

export function historyCoverage(snapshot: HistorySnapshot) {
  const ids = new Set(snapshot.repositories.map((repository) => repository.id));
  const work = snapshot.work;
  const code = snapshot.code ?? [];
  const covers = (entries: { repositoryId: string }[]) => snapshot.catalogComplete &&
    entries.length === ids.size && new Set(entries.map((entry) => entry.repositoryId)).size === ids.size &&
    entries.every((entry) => ids.has(entry.repositoryId));
  const pullRequests = covers(work) && work.every((entry) => entry.pulls !== null &&
    (entry.captureComplete === true || snapshot.source.mode === "preview" && entry.status === "ready"));
  const commits = covers(code) && code.every((entry) => entry.commits !== null && entry.captureComplete);
  return { pullRequests, commits, complete: pullRequests && commits };
}
