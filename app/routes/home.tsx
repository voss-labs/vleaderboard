import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "./+types/home";
import { loadSnapshot } from "../data/load-snapshot.server";
import { deriveLeaderboard } from "../data/derive";
import type { ActivityEvent, CameraCommand, DataMode, Period, Selection, WorldView } from "../data/types";
import { OfficeWorld } from "../office/OfficeWorld";
import { ProjectsPanel, LeaderboardPanel } from "../components/OfficePanels";
import { ActivityLog, PeopleDirectory, RoomDirectory } from "../components/OfficeDialogs";
import { Inspector } from "../components/Inspector";
import { Icon, Modal, SourceBadge, Timestamp } from "../components/ui";
import { useOfficeSnapshot } from "../components/useOfficeSnapshot";

export function meta() {
  return [{ title: "VLeaderboard — VOSS Labs" }, { name: "description", content: "Step inside the VOSS Labs office. Explore the people, projects and open source work behind the community." }];
}

export async function loader() {
  return { snapshot: await loadSnapshot({ mode: "preview" }) };
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

type Overlay = "directory" | "people" | "activity" | "projects" | "board" | "source" | null;

export default function Home({ loaderData }: Route.ComponentProps) {
  const { snapshot, requestedMode, pending, error, load } = useOfficeSnapshot(loaderData.snapshot);
  const [selection, setSelection] = useState<Selection>(null);
  const [view, setView] = useState<WorldView>({ kind: "office" });
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [paused, setPaused] = useState(false);
  const [followedPersonId, setFollowedPersonId] = useState<string | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);
  const [previewVisitNonce, setPreviewVisitNonce] = useState(0);
  const [visitActive, setVisitActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [worldError, setWorldError] = useState<string | null>(null);
  const [previewEvents, setPreviewEvents] = useState<ActivityEvent[]>([]);
  const mobile = useMediaQuery("(max-width: 1023px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const commandNonce = useRef(0);
  const command = useCallback((kind: CameraCommand["kind"]) => setCameraCommand({ kind, nonce: ++commandNonce.current }), []);
  const onReady = useCallback(() => { setReady(true); setWorldError(null); }, []);
  const onError = useCallback((message: string) => setWorldError(message), []);
  const onPreviewEvent = useCallback((event: ActivityEvent) => setPreviewEvents((events) => [event, ...events.filter((item) => item.id !== event.id)].slice(0, 40)), []);
  const onSelect = useCallback((next: Selection) => {
    setSelection(next);
    setOverlay(null);
    setFollowedPersonId(null);
    if (next?.kind === "repository") {
      const current = snapshotRef.current;
      setView(current.mainRepositoryIds.includes(next.id) ? { kind: "office" } : { kind: "repository", repositoryId: next.id });
      if (current.source.mode === "github") void load("github", next.id);
    }
    if (next?.kind === "person") setView({ kind: "office" });
    if (next) command("focus-selection");
  }, [command, load]);
  const onFollowChange = useCallback((id: string | null) => { setFollowedPersonId(id); if (id) setView({ kind: "office" }); }, []);
  const onVisitActiveChange = useCallback((active: boolean) => setVisitActive(active), []);
  const closeOverlay = useCallback(() => setOverlay(null), []);
  const closeInspector = useCallback(() => setSelection(null), []);
  const openDirectory = useCallback(() => setOverlay("directory"), []);
  const openPeople = useCallback(() => setOverlay("people"), []);
  useEffect(() => { setPreviewEvents([]); setFollowedPersonId(null); }, [snapshot.source.mode]);
  useEffect(() => {
    setSelection((current) => current && !(current.kind === "person" ? snapshot.people : snapshot.repositories).some((item) => item.id === current.id) ? null : current);
    setView((current) => current.kind === "repository" && !snapshot.repositories.some((item) => item.id === current.repositoryId) ? { kind: "office" } : current);
  }, [snapshot]);
  useEffect(() => {
    if (overlay || !selection) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) setSelection(null); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [overlay, selection]);
  const board = useMemo(() => deriveLeaderboard(snapshot, period, new Date(snapshot.source.fetchedAt ?? loaderData.snapshot.source.fetchedAt ?? "2026-10-09T08:00:00Z")), [snapshot, period, loaderData.snapshot.source.fetchedAt]);
  const events = useMemo(() => [...previewEvents, ...snapshot.activity].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 60), [snapshot.activity, previewEvents]);
  const latest = events[0];
  const repository = view.kind === "repository" ? snapshot.repositories.find((item) => item.id === view.repositoryId) : null;
  const following = snapshot.people.find((person) => person.id === followedPersonId);
  const preview = snapshot.source.mode === "preview";
  const hasTourActor = snapshot.people.some((person) => snapshot.mainRepositoryIds.some((id) => {
    const project = snapshot.repositories.find((item) => item.id === id);
    return person.homeRoomId === `repo:${id}` || project?.leadPersonId === person.id || project?.memberPersonIds.includes(person.id);
  }));
  const tourContext = reducedMotion ? "Motion off" : paused ? "Resume to tour" : view.kind !== "office" ? "Main floor only" : !hasTourActor ? preview ? "No project occupants" : "Preview only" : "Simulated visit";
  const tourUnavailable = view.kind !== "office" || !hasTourActor;
  const sourceFailure = snapshot.source.status === "stale" || snapshot.source.status === "unavailable";
  const sourceTitle = error ? "Refresh failed" : preview ? "Preview data" : snapshot.source.status === "ready" ? "GitHub snapshot" : `${snapshot.source.status[0].toUpperCase()}${snapshot.source.status.slice(1)} snapshot`;
  const refresh = () => void load(requestedMode, selection?.kind === "repository" && requestedMode === "github" ? selection.id : undefined);
  const projectProps = { snapshot, selection, onSelect, onDirectory: openDirectory, onPeople: openPeople };
  const boardProps = { snapshot, board, period, onPeriod: setPeriod, onSelect };

  return <main className="office-app">
    <a className="skip-link" href="#office-controls">Skip to office controls</a>
    <header className="app-header">
      <a className="wordmark" href="https://vosslabs.org" target="_blank" rel="noreferrer" aria-label="VOSS Labs website">VOSS<span /></a><span className="header-divider" />
      <div className="app-title"><h1>VLeaderboard</h1><span>The open source office</span></div>
      <div className="header-source"><span className={`status-light ${preview ? "preview-light" : snapshot.source.status}`} /><label className="sr-only" htmlFor="data-mode">Data source</label><select id="data-mode" value={requestedMode} onChange={(event) => void load(event.target.value as DataMode)} aria-busy={pending}><option value="preview">Preview</option><option value="github">Public GitHub</option></select><button className={`icon-button refresh-button${pending ? " is-loading" : ""}`} onClick={refresh} aria-label="Refresh data" disabled={pending}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 7V3m0 4h-4M4 17v4m0-4h4M20 7a9 9 0 0 0-15 1M4 17a9 9 0 0 0 15-1" /></svg></button></div>
      <a className="header-org" href="https://github.com/voss-labs" target="_blank" rel="noreferrer"><span />VOSS Labs<Icon name="arrow" size={14} /></a>
    </header>
    <nav className="mobile-navigation" aria-label="Office panels"><button onClick={() => setOverlay("projects")}><Icon name="grid" size={16} />Projects</button><button onClick={openDirectory}>All rooms</button><button onClick={() => setOverlay("board")}>Board</button><button onClick={openPeople}><Icon name="people" size={16} /><span className="sr-only">People</span></button></nav>
    <div className="office-layout">
      <aside className={`sidebar left-sidebar pixel-panel${leftOpen ? "" : " is-collapsed"}`} aria-label="Projects panel">{leftOpen ? <ProjectsPanel {...projectProps} onClose={() => setLeftOpen(false)} /> : <button className="panel-reopen" onClick={() => setLeftOpen(true)} aria-label="Open Projects panel"><Icon name="chevron-right" /><span>Projects</span></button>}</aside>
      <section className="world-column" aria-label="Animated VOSS Labs office">
        <div className="scene-heading"><div>{repository ? <><button className="back-button" onClick={() => { setView({ kind: "office" }); setSelection(null); setFollowedPersonId(null); }}><Icon name="chevron-left" size={14} />Back to office</button><span className="scene-heading-divider" /><strong>{repository.name}</strong></> : <><span className="floor-mark"><span /><span /><span /><span /></span><strong>VOSS headquarters</strong><span className="floor-caption">Main floor</span></>}</div><button className="scene-directory" onClick={openDirectory}><Icon name="grid" size={14} />All rooms</button></div>
        <div className="scene-area">
          <OfficeWorld snapshot={snapshot} selection={selection} view={view} followedPersonId={followedPersonId} paused={paused} reducedMotion={reducedMotion} cameraCommand={cameraCommand} previewVisitNonce={previewVisitNonce} onSelect={onSelect} onFollowChange={onFollowChange} onPreviewEvent={onPreviewEvent} onVisitActiveChange={onVisitActiveChange} onReady={onReady} onError={onError} />
          {!ready && !worldError && <div className="world-loading"><span className="loading-pixel" /><p>Opening the office…</p></div>}
          {worldError && <div className="world-error" role="alert"><strong>The scene could not open</strong><p>{worldError}</p><button className="button" onClick={openPeople}>Explore people</button><button className="button" onClick={openDirectory}>Explore projects</button></div>}
          {following && <div className="following-status"><span />Following {following.name}<button className="icon-button" aria-label="Stop following" onClick={() => setFollowedPersonId(null)}><Icon name="close" size={13} /></button></div>}
          {selection && !overlay && <Inspector snapshot={snapshot} events={events} selection={selection} followedPersonId={followedPersonId} onFollow={onFollowChange} onClose={closeInspector} mobile={mobile} pending={pending} />}
          <div className="scene-hint">Drag to explore <span>·</span> Scroll to zoom</div>
        </div>
        <div className="scene-toolbar" id="office-controls" tabIndex={-1}>
          <div className="camera-tools"><button className="icon-button" aria-label="Zoom out" onClick={() => command("zoom-out")}><Icon name="minus" /></button><button className="icon-button" aria-label="Zoom in" onClick={() => command("zoom-in")}><Icon name="plus" /></button><span className="tool-divider" /><button className="button fit-button" aria-label={repository ? "Fit room" : "Fit office"} onClick={() => { setFollowedPersonId(null); command("fit"); }}><Icon name="fit" size={16} /><span>{repository ? "Fit room" : "Fit office"}</span></button></div>
          <div className="motion-tools"><button className={`button pause-button${paused ? " active" : ""}`} onClick={() => setPaused((value) => !value)} disabled={reducedMotion} aria-pressed={paused || reducedMotion}><Icon name={paused || reducedMotion ? "play" : "pause"} size={14} /><span>{reducedMotion ? "Motion off" : paused ? "Resume" : "Pause"}</span></button><button className="button tour-button" onClick={() => setPreviewVisitNonce((value) => value + 1)} disabled={visitActive || paused || reducedMotion || tourUnavailable} title={view.kind !== "office" ? "Return to the main floor for a simulated visit." : !hasTourActor ? "This snapshot has no assigned project occupants. Switch to Preview to demonstrate a visit." : "Demonstrate a simulated visit through the office."}><span>{visitActive ? "Tour in progress" : "Tour"}</span><small>{tourContext}</small></button><button className="icon-button toolbar-people" onClick={openPeople} aria-label="Open people directory"><Icon name="people" /></button></div>
        </div>
      </section>
      <aside className={`sidebar right-sidebar pixel-panel${rightOpen ? "" : " is-collapsed"}`} aria-label="Leaderboard panel">{rightOpen ? <LeaderboardPanel {...boardProps} onClose={() => setRightOpen(false)} /> : <button className="panel-reopen" onClick={() => setRightOpen(true)} aria-label="Open Leaderboard panel"><Icon name="chevron-left" /><span>Leaderboard</span></button>}</aside>
    </div>
    <footer className="activity-strip"><button className="activity-open" onClick={() => setOverlay("activity")}><Icon name="activity" size={16} /><span>Activity</span><span className="activity-count">{events.length}</span></button><div className="latest-activity">{latest ? <><SourceBadge preview={latest.source === "preview"} /><span>{latest.text}</span><Timestamp value={latest.occurredAt} /></> : <span>No captured activity yet.</span>}</div><div className="source-status" role="status">{pending ? <span>Loading {requestedMode === "github" ? "GitHub" : "preview"}…</span> : <><button className="source-details-button" onClick={() => setOverlay("source")} aria-label={`${sourceTitle}. View data source details`} title={error ?? snapshot.source.message}><span>{sourceTitle}</span><Icon name="chevron-right" size={11} /></button><small><Timestamp value={snapshot.source.fetchedAt} /></small>{(error || sourceFailure) && <button className="source-retry" onClick={refresh}>Retry</button>}</>}</div></footer>
    {overlay === "directory" && <RoomDirectory snapshot={snapshot} onSelect={onSelect} onClose={closeOverlay} />}
    {overlay === "people" && <PeopleDirectory snapshot={snapshot} onSelect={onSelect} onClose={closeOverlay} />}
    {overlay === "activity" && <ActivityLog snapshot={snapshot} events={events} onSelect={onSelect} onClose={closeOverlay} />}
    {overlay === "projects" && <Modal title="Projects" onClose={closeOverlay} className="drawer-modal"><ProjectsPanel {...projectProps} /></Modal>}
    {overlay === "board" && <Modal title="Leaderboard" onClose={closeOverlay} className="drawer-modal"><LeaderboardPanel {...boardProps} /></Modal>}
    {overlay === "source" && <Modal title="Data source" onClose={closeOverlay} className="source-modal"><div className="source-dialog-content"><SourceBadge preview={preview} /><h3>{sourceTitle}</h3><p>{error ?? snapshot.source.message}</p>{error && <p>The previous snapshot remains visible.</p>}<dl><div><dt>Captured</dt><dd><Timestamp value={snapshot.source.fetchedAt} /></dd></div>{snapshot.source.retryAt && <div><dt>Next upstream attempt after</dt><dd><Timestamp value={snapshot.source.retryAt} /></dd></div>}</dl>{snapshot.source.retryAt && <p className="source-retry-note">GitHub reads wait until this time. A refresh keeps the available snapshot while upstream is waiting.</p>}<button className="button primary" onClick={refresh} disabled={pending}>{pending ? "Refreshing…" : error || sourceFailure ? "Retry snapshot" : "Refresh snapshot"}</button></div></Modal>}
  </main>;
}
