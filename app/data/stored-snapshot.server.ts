import { createSnapshotLoader } from "./load-snapshot.server.ts";
import type { SnapshotLoaderOptions } from "./load-snapshot.server.ts";
import { createPreviewSnapshot } from "./preview.ts";
import { createRoster } from "./roster.ts";
import { InvalidSnapshotRequest, validateSnapshotRequest } from "./snapshot-request.server.ts";
import type { SnapshotReader } from "./snapshot-request.server.ts";
import { assertPublicSnapshot } from "./snapshot-validation.server.ts";
import type { OfficeSnapshot } from "./types.ts";

export const SNAPSHOT_KEY = "public-office-snapshot:v1";
export const SNAPSHOT_FRESHNESS_MS = 30 * 60 * 1000;
export const CAPTURE_REQUEST_LIMIT = 44;
export const CAPTURE_DEADLINE_MS = 45000;
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
export type SnapshotStore = { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> };
type StoredSnapshot = { version: 1; capturedAt: string; snapshot: OfficeSnapshot };
type SnapshotEnvironment = Pick<Env, "GITHUB_TOKEN"> & { SNAPSHOTS: SnapshotStore };

function unavailableSnapshot(message: string): OfficeSnapshot {
  return {
    version: 1,
    source: { mode: "github", status: "unavailable", fetchedAt: null, message, retryAt: null },
    people: createRoster(), repositories: [], mainRepositoryIds: [], catalogComplete: false,
    roomSelectionBasis: "All public VOSS Labs repositories · GitHub snapshot", work: [], code: [], activity: [],
  };
}

function serialize(document: StoredSnapshot) {
  const json = JSON.stringify(document);
  if (new TextEncoder().encode(json).byteLength > MAX_DOCUMENT_BYTES) throw new Error("Snapshot document is too large.");
  return json;
}

function parseDocument(json: string, now: Date): StoredSnapshot {
  if (new TextEncoder().encode(json).byteLength > MAX_DOCUMENT_BYTES) throw new Error("Snapshot document is too large.");
  const document: unknown = JSON.parse(json);
  if (!document || typeof document !== "object" || Array.isArray(document) ||
    Object.keys(document).length !== 3 || !("version" in document) || document.version !== 1 ||
    !("capturedAt" in document) || typeof document.capturedAt !== "string" ||
    !Number.isFinite(Date.parse(document.capturedAt)) || Date.parse(document.capturedAt) > now.getTime() + 60000 ||
    !("snapshot" in document)) throw new Error("Invalid snapshot envelope.");
  assertPublicSnapshot(document.snapshot);
  if (Date.parse(document.snapshot.source.fetchedAt!) > Date.parse(document.capturedAt) + 1000) {
    throw new Error("Invalid capture time.");
  }
  return { version: 1, capturedAt: document.capturedAt, snapshot: document.snapshot };
}

export function createStoredSnapshotReader(
  store: SnapshotStore, options: { now?: () => Date; allowPreview?: boolean } = {},
): SnapshotReader {
  const now = options.now ?? (() => new Date());
  const allowPreview = options.allowPreview === true;
  return async (request) => {
    validateSnapshotRequest(request, allowPreview);
    if (request.mode === "preview") {
      const snapshot = createPreviewSnapshot(now());
      if (request.repositoryId && !snapshot.repositories.some((repository) => repository.id === request.repositoryId)) {
        throw new InvalidSnapshotRequest("Repository is not in the public catalog.");
      }
      return snapshot;
    }
    let document: StoredSnapshot;
    try {
      const json = await store.get(SNAPSHOT_KEY);
      if (json === null) return unavailableSnapshot("The first GitHub capture is not available yet. Captures run every 15 minutes.");
      document = parseDocument(json, now());
    } catch {
      return unavailableSnapshot("The saved GitHub capture is unavailable. Captures run every 15 minutes.");
    }
    const snapshot = document.snapshot;
    if (request.repositoryId && !snapshot.repositories.some((repository) => repository.id === request.repositoryId)) {
      throw new InvalidSnapshotRequest("Repository is not in the public catalog.");
    }
    if (now().getTime() - Date.parse(document.capturedAt) >= SNAPSHOT_FRESHNESS_MS) {
      snapshot.source = { ...snapshot.source, status: "stale", message: "Showing the last successful GitHub capture. Captures run every 15 minutes." };
      snapshot.work = snapshot.work.map((entry) => ({ ...entry, status: "stale" }));
      snapshot.code = snapshot.code?.map((entry) => ({ ...entry, status: "stale" }));
    }
    return snapshot;
  };
}

export async function refreshStoredSnapshot(env: SnapshotEnvironment, options: Omit<SnapshotLoaderOptions, "token" | "allowPreview"> = {}) {
  if (!env.GITHUB_TOKEN?.trim()) return { published: false, reason: "missing-token" } as const;
  try {
    const snapshot = await createSnapshotLoader({
      ...options, token: env.GITHUB_TOKEN, allowPreview: false,
      requestLimit: options.requestLimit ?? CAPTURE_REQUEST_LIMIT, deadlineMs: options.deadlineMs ?? CAPTURE_DEADLINE_MS,
    })({ mode: "github" });
    assertPublicSnapshot(snapshot);
    const capturedAt = (options.now?.() ?? new Date()).toISOString();
    const json = serialize({ version: 1, capturedAt, snapshot });
    parseDocument(json, options.now?.() ?? new Date());
    await env.SNAPSHOTS.put(SNAPSHOT_KEY, json);
    return { published: true, reason: "captured", capturedAt, repositories: snapshot.repositories.length } as const;
  } catch {
    return { published: false, reason: "incomplete-capture" } as const;
  }
}
