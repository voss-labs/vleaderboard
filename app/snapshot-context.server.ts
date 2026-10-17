import { createContext, RouterContextProvider } from "react-router";
import type { SnapshotReader } from "./data/snapshot-request.server.ts";

export const snapshotReaderContext = createContext<SnapshotReader>();
export const previewEnabledContext = createContext(false);

export function createSnapshotContext(reader: SnapshotReader, previewEnabled = false) {
  const context = new RouterContextProvider();
  context.set(snapshotReaderContext, reader);
  context.set(previewEnabledContext, previewEnabled);
  return context;
}
