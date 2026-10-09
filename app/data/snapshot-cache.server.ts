import { GithubFailure } from "./github.server.ts";

export type CachedResult<T> = {
  value: T | null;
  fetchedAt: string | null;
  status: "ready" | "stale" | "unavailable";
  message: string;
  retryAt: string | null;
};
type Entry<T> = { value: T | null; captured: number; retry: number; message: string; pending?: Promise<CachedResult<T>> };

export function createSnapshotCache(now: () => Date) {
  const entries = new Map<string, Entry<unknown>>();

  function result<T>(entry: Entry<T>): CachedResult<T> {
    return {
      value: entry.value,
      fetchedAt: entry.value === null ? null : new Date(entry.captured).toISOString(),
      status: entry.retry ? entry.value === null ? "unavailable" : "stale" : "ready",
      message: entry.message,
      retryAt: entry.retry ? new Date(entry.retry).toISOString() : null,
    };
  }

  async function read<T>(key: string, ttl: number, load: () => Promise<T>): Promise<CachedResult<T>> {
    const clock = now().getTime();
    let entry = entries.get(key) as Entry<T> | undefined;
    if (entry?.pending) return entry.pending;
    if (entry && (entry.retry > clock || (entry.value !== null && !entry.retry && clock - entry.captured < ttl))) return result(entry);
    entry ??= { value: null, captured: 0, retry: 0, message: "" };
    entries.set(key, entry);
    const target = entry;
    const pending = (async () => {
      try {
        target.value = await load();
        target.captured = now().getTime();
        target.retry = 0;
        target.message = "";
      } catch (error) {
        target.retry = error instanceof GithubFailure ? Date.parse(error.retryAt) : now().getTime() + 30000;
        target.message = error instanceof GithubFailure ? error.message : "Public GitHub data is temporarily unavailable.";
      }
      return result(target);
    })();
    target.pending = pending;
    try { return await pending; } finally { delete target.pending; }
  }

  function retain(keys: string[]) {
    const allowed = new Set(["catalog", ...keys]);
    for (const key of entries.keys()) if (!allowed.has(key)) entries.delete(key);
  }

  return { read, retain };
}
