import type { DataMode, OfficeSnapshot } from "./types.ts";

export class InvalidSnapshotRequest extends Error {}
export type SnapshotRequest = { mode: DataMode; repositoryId?: string };
export type SnapshotReader = (request: SnapshotRequest) => Promise<OfficeSnapshot>;

export function validateSnapshotRequest(request: SnapshotRequest, allowPreview: boolean) {
  if (request.mode !== "preview" && request.mode !== "github") throw new InvalidSnapshotRequest("Invalid snapshot mode.");
  if (request.repositoryId !== undefined && !/^github:[1-9]\d*$/.test(request.repositoryId)) {
    throw new InvalidSnapshotRequest("Invalid repository ID.");
  }
  if (request.mode === "preview" && !allowPreview) throw new InvalidSnapshotRequest("Preview data is unavailable in production.");
}
