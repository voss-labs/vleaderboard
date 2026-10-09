import { useId } from "react";
import type { Leaderboard, OfficeSnapshot, Period, Selection } from "../data/types";
import { Icon, Portrait, SourceBadge, Timestamp } from "./ui";

type ProjectProps = { snapshot: OfficeSnapshot; selection: Selection; onSelect: (selection: Selection) => void; onDirectory: () => void; onPeople: () => void; onClose?: () => void };

export function ProjectsPanel({ snapshot, selection, onSelect, onDirectory, onPeople, onClose }: ProjectProps) {
  const main = snapshot.mainRepositoryIds.map((id) => snapshot.repositories.find((repository) => repository.id === id)).filter((repository) => repository !== undefined);
  return <div className="panel-content projects-content">
    <div className="panel-heading"><h2>Projects</h2>{onClose && <button className="icon-button" aria-label="Collapse Projects" onClick={onClose}><Icon name="chevron-left" size={16} /></button>}</div>
    <div className="panel-rule" />
    <p className="panel-caption">On the main floor <span>{main.length.toString().padStart(2, "0")}</span></p>
    <nav className="project-list" aria-label="Main floor projects">
      {main.map((repository, index) => <button key={repository.id} className={`project-row${selection?.kind === "repository" && selection.id === repository.id ? " selected" : ""}`} onClick={() => onSelect({ kind: "repository", id: repository.id })} aria-pressed={selection?.kind === "repository" && selection.id === repository.id}>
        <span className="room-dot" /><span className="project-name">{repository.name}</span><span className="room-number">{String(index + 1).padStart(2, "0")}</span>
      </button>)}
    </nav>
    {!main.length && <p className="muted">No repository rooms are available in this snapshot.</p>}
    <button className="button directory-button" onClick={onDirectory}><Icon name="grid" size={16} /><span>All rooms</span><span className="count">{snapshot.repositories.length}</span></button>
    <p className="selection-basis">{snapshot.roomSelectionBasis}</p>
    <div className="panel-rule" />
    <button className="button people-button" onClick={onPeople}><Icon name="people" size={17} /><span>Meet the people</span></button>
    <p className="panel-note">A little office.<br />A lot of open source.</p>
    <div className="panel-brand" aria-hidden="true"><div className="pixel-globe"><i /><i /><i /><i /></div><span><b />VOSS LABS</span><small>Open source opens doors.</small></div>
  </div>;
}

type BoardProps = { snapshot: OfficeSnapshot; board: Leaderboard; period: Period; onPeriod: (period: Period) => void; onSelect: (selection: Selection) => void; onClose?: () => void };

export function LeaderboardPanel({ snapshot, board, period, onPeriod, onSelect, onClose }: BoardProps) {
  const periodId = useId();
  const preview = snapshot.source.mode === "preview";
  const covered = board.coveredRepositoryIds.map((id) => snapshot.repositories.find((repository) => repository.id === id)?.fullName ?? id);
  const utcDate = (value: string) => new Date(value).toISOString().replace("T", " ").replace("Z", " UTC");
  return <div className="panel-content leaderboard-content">
    <div className="panel-heading"><h2>Leaderboard</h2>{onClose && <button className="icon-button" aria-label="Collapse Leaderboard" onClick={onClose}><Icon name="chevron-right" size={16} /></button>}</div>
    <div className="panel-rule" />
    <div className="board-label"><span>Merged pull requests</span><SourceBadge preview={preview} /></div>
    <label className="sr-only" htmlFor={periodId}>Leaderboard period</label>
    <select id={periodId} className="period-select" value={period} onChange={(event) => onPeriod(event.target.value as Period)}>
      <option value="month">This month</option><option value="30d">Last 30 days</option><option value="all">Available history</option>
    </select>
    <div className="leaderboard-list">
      {board.rows.slice(0, 6).map((row) => {
        const person = snapshot.people.find((item) => item.id === row.personId);
        if (!person) return null;
        return <button key={row.personId} className="leaderboard-row" onClick={() => onSelect({ kind: "person", id: row.personId })}>
          <span className={`rank rank-${Math.min(row.rank, 4)}`}>{row.rank.toString().padStart(2, "0")}</span><Portrait person={person} />
          <span className="board-person"><strong>{person.name.replace(/^Preview /, "")}</strong><small>{person.kind === "preview" ? "Preview contributor" : person.role}</small></span>
          <span className="merged-count">{row.merged}<small>merged</small></span>
        </button>;
      })}
      {!board.rows.length && <div className="empty-state"><span className="empty-dash">—</span><strong>{snapshot.source.status === "unavailable" ? "Work data unavailable" : "No captured PRs"}</strong><p>{snapshot.source.status === "unavailable" ? "Refresh the GitHub snapshot to try again." : "The selected period has no captured pull requests."}</p></div>}
    </div>
    <div className="board-explanation"><p>Equal counts share a rank.</p><p>Opened PRs and requested reviews appear in person details.</p></div>
    <div className="panel-rule" />
    <div className="coverage"><span className="coverage-title">{preview ? "Preview data" : "Snapshot coverage"}</span><p>{board.coveredRepositoryIds.length} / {snapshot.repositories.length} repositories · {board.complete ? preview ? "Complete preview" : "Complete fetched scope" : "Partial history"}</p><p>{preview ? "All counts are simulated." : "Review counts are not fetched."}</p><small>Captured <Timestamp value={snapshot.source.fetchedAt} /></small>
      <details className="coverage-details"><summary>Window and coverage<Icon name="chevron-right" size={12} /></summary><dl><div><dt>Count source</dt><dd>{board.label}</dd></div><div><dt>From, inclusive</dt><dd>{board.from ? <time dateTime={board.from}>{utcDate(board.from)}</time> : "Earliest captured work"}</dd></div><div><dt>Until, exclusive</dt><dd><time dateTime={board.to}>{utcDate(board.to)}</time></dd></div><div><dt>History</dt><dd>{board.complete ? preview ? "Complete within this simulated scenario." : "Complete within the declared fetched scope." : "Partial fetched history; not a complete organization ranking."}</dd></div><div><dt>Covered repositories</dt><dd>{covered.length ? covered.join(", ") : "No repository work fetched."}</dd></div></dl></details>
    </div>
    <p className="board-footnote">GitHub work is one part of what people bring to VOSS.</p>
  </div>;
}
