import { useCallback, useEffect, useRef, useState } from "react";
import type { DataMode, OfficeSnapshot } from "../data/types";

function isSnapshot(value: unknown, mode: DataMode): value is OfficeSnapshot {
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 ||
    !("source" in value) || !value.source || typeof value.source !== "object" ||
    !("mode" in value.source) || value.source.mode !== mode) return false;
  return ["people", "repositories", "mainRepositoryIds", "work", "activity"].every(
    (key) => key in value && Array.isArray(Reflect.get(value, key)),
  ) && (!("code" in value) || Array.isArray(value.code));
}

async function readSnapshot(mode: DataMode, repositoryId: string | undefined, signal: AbortSignal): Promise<OfficeSnapshot> {
  const params = new URLSearchParams({ mode });
  if (repositoryId) params.set("repositoryId", repositoryId);
  const response = await fetch(`/api/snapshot?${params}`, { signal });
  if (!response.ok) throw new Error("The data could not be refreshed. Try again.");
  const result = await response.json();
  if (!isSnapshot(result, mode)) throw new Error("The server returned an unexpected snapshot.");
  return result;
}

export function useOfficeSnapshot(initial: OfficeSnapshot) {
  const [snapshot, setSnapshot] = useState(initial);
  const [requestedMode, setRequestedMode] = useState<DataMode>(initial.source.mode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef({ nonce: 0, controller: null as AbortController | null });
  useEffect(() => () => { request.current.nonce += 1; request.current.controller?.abort(); }, []);
  const load = useCallback(async (mode: DataMode, repositoryId?: string) => {
    request.current.controller?.abort();
    const controller = new AbortController();
    const nonce = ++request.current.nonce;
    request.current.controller = controller;
    setRequestedMode(mode);
    setPending(true);
    setError(null);
    try {
      const next = await readSnapshot(mode, repositoryId, controller.signal);
      if (nonce === request.current.nonce) setSnapshot(next);
    } catch (cause) {
      if (nonce === request.current.nonce && !controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "The data could not be refreshed.");
      }
    } finally {
      if (nonce === request.current.nonce) setPending(false);
    }
  }, []);
  return { snapshot, requestedMode, pending, error, load };
}
