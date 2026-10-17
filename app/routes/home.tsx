import { useMemo, useState } from "react";
import type { Route } from "./+types/home";
import { previewEnabledContext, snapshotReaderContext } from "../snapshot-context.server";
import { deriveLeaderboard } from "../data/derive";
import type { DataMode, Period } from "../data/types";
import { Leaderboard } from "../components/Leaderboard";
import { Icon, Timestamp } from "../components/ui";
import { useOfficeSnapshot } from "../components/useOfficeSnapshot";
import "../styles/leaderboard.css";

export function meta() {
  return [
    { title: "VLeaderboard — VOSS Labs" },
    { name: "description", content: "Explore VOSS Labs contributions, merged pull requests, captured commits and changed lines." },
  ];
}

export function headers() {
  return { "Cache-Control": "no-store" };
}

export async function loader({ context }: Route.LoaderArgs) {
  const snapshot = await context.get(snapshotReaderContext)({ mode: "github" });
  return { snapshot, serverTime: new Date().toISOString(), previewEnabled: context.get(previewEnabledContext) };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { snapshot, requestedMode, pending, error, load } = useOfficeSnapshot(loaderData.snapshot);
  const [period, setPeriod] = useState<Period>("month");
  const board = useMemo(() => deriveLeaderboard(
    snapshot,
    period,
    new Date(snapshot.source.fetchedAt ?? loaderData.serverTime),
  ), [snapshot, period, loaderData.serverTime]);
  const preview = snapshot.source.mode === "preview";
  const sourceFailure = snapshot.source.status === "stale" || snapshot.source.status === "unavailable";
  const sourceName = preview ? "Preview" : "Public GitHub";
  const refreshMode = import.meta.env.DEV ? requestedMode : "github";

  return <main className="leaderboard-app">
    <a className="skip-link" href="#contributor-leaderboard">Skip to leaderboard</a>
    <header className="leaderboard-header">
      <a className="leaderboard-brand" href="https://vosslabs.org" target="_blank" rel="noreferrer" aria-label="VOSS Labs website"><span aria-hidden="true" />VOSS<span className="leaderboard-brand-labs">Labs</span></a>
      <div className="leaderboard-source-controls">
        {import.meta.env.DEV && loaderData.previewEnabled ? <><label className="sr-only" htmlFor="data-mode">Development data source</label>
        <select id="data-mode" value={requestedMode} onChange={(event) => void load(event.target.value as DataMode)} aria-busy={pending}>
          <option value="github">Public GitHub</option>
          <option value="preview">Preview (dev)</option>
        </select></> : <span className="leaderboard-production-source"><Icon name="github" size={14} />GitHub</span>}
        <button className="leaderboard-refresh" onClick={() => void load(refreshMode)} disabled={pending} aria-label="Refresh data" title="Read the latest saved snapshot. GitHub capture runs every 15 minutes.">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 7V3m0 4h-4M4 17v4m0-4h4M20 7a9 9 0 0 0-15 1M4 17a9 9 0 0 0 15-1" /></svg>
          <span>{pending ? "Refreshing" : "Refresh"}</span>
        </button>
      </div>
    </header>

    <div className="leaderboard-page">
      <div className="leaderboard-intro">
        <div><h1>Leaderboard<span>.</span></h1><p>Contributions across VOSS Labs.</p></div>
        <a className="leaderboard-github" href="https://github.com/voss-labs" target="_blank" rel="noreferrer" aria-label="VOSS Labs on GitHub"><span className="leaderboard-org-label">VOSS Labs on</span><span>GitHub</span><Icon name="arrow" size={15} /></a>
      </div>

      <div className="leaderboard-notice" role="status" aria-live="polite">
        <span className={`leaderboard-source-tag${preview ? " is-preview" : ""}`}><span aria-hidden="true" />{preview ? "Preview · simulated counts" : snapshot.source.status === "stale" ? "GitHub · cached snapshot" : snapshot.source.status === "unavailable" ? "GitHub · data unavailable" : "GitHub · captured history"}</span>
        <span className="leaderboard-captured">{pending ? `Loading ${requestedMode === "github" ? "Public GitHub" : "Preview"}… ${sourceName} snapshot shown.` : <>Captured <Timestamp value={snapshot.source.fetchedAt} /></>}</span>
      </div>

      {(error || sourceFailure) && <div className="leaderboard-error" role="alert">
        <p>{error ?? (snapshot.source.status === "unavailable" ? "The first GitHub capture is not available yet. Captures run every 15 minutes." : "Showing the last successful GitHub capture. Captures run every 15 minutes.")}</p>
        {error && <p>The previous {sourceName} snapshot remains visible.</p>}
        {snapshot.source.retryAt && <p>Next GitHub attempt after <Timestamp value={snapshot.source.retryAt} />.</p>}
      </div>}

      <Leaderboard snapshot={snapshot} board={board} period={period} onPeriod={setPeriod} />
    </div>
  </main>;
}
