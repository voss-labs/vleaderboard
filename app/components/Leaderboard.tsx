import { Fragment, useMemo, useState } from "react";
import type { Leaderboard as LeaderboardData, OfficeSnapshot, Period, Person } from "../data/types";
import { deriveLeaderboard } from "../data/derive";
import { contributionDate, selectContributionHistory } from "../data/contribution-history";
import { historyCoverage } from "../data/history-coverage";
import { ContributionDetails, ContributionMetrics, MetricValue, type RepositoryContribution } from "./ContributionDetails";
import { ContributorAvatar, ContributorCard } from "./ContributorCard";
import { ExportMenu } from "./ExportMenu";
import { buildLeaderboardExport } from "../data/leaderboard-export";
import { Icon, Timestamp } from "./ui";

type Props = {
  snapshot: OfficeSnapshot;
  board: LeaderboardData;
  period: Period;
  onPeriod: (period: Period) => void;
};

const periods: { value: Period; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
];

function ContributorName({ person, onOpen }: { person: Person; onOpen: () => void }) {
  return <button className="contributor-identity" onClick={onOpen} aria-haspopup="dialog" aria-label={`Open contributor card for ${person.name.replace(/^Preview /, "")}`}>
    <ContributorAvatar person={person} />
    <span className="contributor-profile">
      <strong>{person.name.replace(/^Preview /, "")}</strong>
      <small>{person.kind === "preview" ? "Preview contributor" : person.github ? `@${person.github.login}` : "Contributor"}</small>
    </span>
  </button>;
}

export function Leaderboard({ snapshot, board, period, onPeriod }: Props) {
  const [query, setQuery] = useState("");
  const [cardPersonId, setCardPersonId] = useState<string | null>(null);
  const periodLabel = periods.find((item) => item.value === period)?.label ?? "All time";
  const people = new Map(snapshot.people.map((person) => [person.id, person]));
  const covered = board.coveredRepositoryIds.map((id) => snapshot.repositories.find((repository) => repository.id === id)?.fullName ?? id);
  const codeCovered = board.codeCoverage.repositoryIds.map((id) => snapshot.repositories.find((repository) => repository.id === id)?.fullName ?? id);
  const preview = snapshot.source.mode === "preview";
  const history = historyCoverage(snapshot);
  const pullsCaptured = board.coveredRepositoryIds.length > 0;
  const normalizedQuery = query.trim().replace(/^@/, "").toLocaleLowerCase("en");
  const visibleRows = board.rows.filter((row) => {
    const person = people.get(row.personId);
    return person && (!normalizedQuery || person.name.toLocaleLowerCase("en").includes(normalizedQuery) || person.github?.login.toLocaleLowerCase("en").includes(normalizedQuery));
  });
  const cardRow = cardPersonId ? board.rows.find((row) => row.personId === cardPersonId) : undefined;
  const cardPerson = cardPersonId ? people.get(cardPersonId) : undefined;
  const repositoryContributions = useMemo(() => {
    const contributions = new Map<string, RepositoryContribution[]>();
    for (const repository of snapshot.repositories) {
      const work = snapshot.work.filter((item) => item.repositoryId === repository.id);
      const code = snapshot.code?.filter((item) => item.repositoryId === repository.id);
      const repositoryBoard = deriveLeaderboard({ ...snapshot, repositories: [repository], work, code }, period, new Date(board.to));
      for (const row of repositoryBoard.rows) {
        const entries = contributions.get(row.personId) ?? [];
        entries.push({ repository, row, pullsCaptured: repositoryBoard.coveredRepositoryIds.length > 0,
          code: code?.[0], work: work[0], history: selectContributionHistory(snapshot, row.personId, repository.id, board) });
        contributions.set(row.personId, entries);
      }
    }
    return contributions;
  }, [snapshot, period, board.to]);

  return <section className="contributor-board" id="contributor-leaderboard" tabIndex={-1} aria-labelledby="ranking-title">
    <div className="ranking-toolbar">
      <div><h2 id="ranking-title">Contributors</h2><p>Merged PRs, highest first. Ties share a rank.</p></div>
      <div className="ranking-actions">
        <div className="ranking-periods" role="group" aria-label="Leaderboard period">
          {periods.map((item) => <button key={item.value} aria-pressed={period === item.value} onClick={() => onPeriod(item.value)}>{item.label}</button>)}
        </div>
        <ExportMenu disabled={!visibleRows.length} periodLabel={periodLabel} to={board.to}
          build={() => buildLeaderboardExport(snapshot, board, visibleRows, periodLabel, query)} />
      </div>
    </div>
    <div className="ranking-window" aria-live="polite">
      <p><strong>Selected UTC window</strong> {board.from ? <time dateTime={board.from}>{contributionDate(board.from)}</time> : "Earliest available work"} <span>to before</span> <time dateTime={board.to}>{contributionDate(board.to)}</time></p>
      <p><strong>Snapshot captured</strong> {snapshot.source.fetchedAt ? <time dateTime={snapshot.source.fetchedAt}>{contributionDate(snapshot.source.fetchedAt)}</time> : "Not captured"}</p>
    </div>
    <div className="ranking-filters">
      <div className="contributor-search"><Icon name="search" size={16} /><label className="sr-only" htmlFor="contributor-search">Search contributors by name or GitHub handle</label><input id="contributor-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or @handle" autoComplete="off" />{query && <button onClick={() => setQuery("")} aria-label="Clear contributor search"><Icon name="close" size={14} /></button>}</div>
      <p className="ranking-results" role="status">{query.trim() ? `${visibleRows.length} of ${board.rows.length}` : board.rows.length} {board.rows.length === 1 ? "contributor" : "contributors"}</p>
      <div className="ranking-repository-scope"><strong>{snapshot.repositories.length} {snapshot.catalogComplete ? "public repositories" : "listed repositories"}</strong><span>PRs {covered.length}/{snapshot.repositories.length}<span aria-hidden="true"> · </span>Code {codeCovered.length}/{snapshot.repositories.length} captured</span></div>
    </div>
    {!snapshot.catalogComplete && <p className="ranking-catalog-warning">Repository discovery is incomplete. Coverage refers to listed repositories only.</p>}
    <p className="ranking-code-scope">{preview ? "Simulated contributions. All counts are sample data." : history.complete ? "Complete available PR and default-branch non-merge commit history for the captured public catalog." : "Partial saved history; earlier PRs or commits may be missing."} <span>{!preview && <>PR history {history.pullRequests ? "complete" : "partial"} · Code history {history.commits ? "complete" : "partial"}. {board.codeCoverage.status === "unavailable" ? "Code unavailable; a dash means unknown." : board.codeCoverage.status === "stale" ? "Showing cached code records." : "Commits use committed dates."}</>}</span></p>

    <table className="contributor-table">
      <caption className="sr-only">Contributors ranked by merged pull requests, highest first. Equal counts share a rank. {preview ? "Simulated preview data." : history.complete ? "Complete available history in the captured public catalog." : "Partial captured GitHub history."}</caption>
      <thead><tr><th scope="col" className="contributor-rank">Rank</th><th scope="col">Contributor</th><th scope="col" className="contributor-score">Merged PRs</th></tr></thead>
      <tbody>
        {visibleRows.map((row) => {
          const person = people.get(row.personId);
          if (!person) return null;
          return <Fragment key={row.personId}><tr className={`contributor-summary${row.rank === 1 ? " is-leading" : ""}`}>
            <td className="contributor-rank"><span>{row.rank.toString().padStart(2, "0")}</span></td>
            <th scope="row"><ContributorName person={person} onOpen={() => setCardPersonId(person.id)} /></th>
            <td className="contributor-score"><MetricValue value={pullsCaptured ? row.merged : null} label="Merged PRs" /></td>
          </tr><tr className="contributor-metrics-row"><td colSpan={3}>
            <div className="contributor-row-more">
              <ContributionMetrics row={row} pullsCaptured={pullsCaptured} />
              <ContributionDetails key={`${person.id}:${period}:${board.to}`} name={person.name} entries={repositoryContributions.get(row.personId) ?? []} preview={preview} codeStatus={row.codeStatus} />
            </div>
          </td></tr></Fragment>;
        })}
      </tbody>
    </table>

    {board.rows.length > 0 && !visibleRows.length && <div className="leaderboard-empty"><h3>No contributors found</h3><p>No name or GitHub handle matches “{query.trim()}”.</p><button className="leaderboard-clear-search" onClick={() => setQuery("")}>Clear search</button></div>}
    {!board.rows.length && <div className="leaderboard-empty">
      <h3>{snapshot.source.status === "unavailable" ? "Work data unavailable" : "No captured contributions"}</h3>
      <p>{snapshot.source.status === "unavailable" ? "GitHub capture runs every 15 minutes. Refresh reads the latest saved snapshot." : "There are no captured contributions in this snapshot. GitHub capture runs every 15 minutes."}</p>
    </div>}

    {cardRow && cardPerson && <ContributorCard key={`${cardPerson.id}:${period}:${board.to}`} snapshot={snapshot} person={cardPerson} row={cardRow}
      contributionWindow={board} periodLabel={periodLabel} pullsCaptured={pullsCaptured} onClose={() => setCardPersonId(null)} />}

    <footer className="ranking-footer">
      <p>Ranks reflect the full captured scope. Search keeps original ranks.</p>
      <details className="ranking-coverage">
        <summary>Window and coverage<Icon name="chevron-right" size={13} /></summary>
        <dl>
          <div><dt>Repository catalog</dt><dd>{snapshot.catalogComplete ? "All public repositories returned by the captured VOSS Labs catalog are included." : "Repository discovery is incomplete; coverage counts refer only to listed repositories."}</dd></div>
          <div><dt>Pull requests</dt><dd>{preview ? "Simulated preview. All counts are sample data." : `${history.pullRequests ? "Complete available PR history in the captured public catalog." : "Partial PR history; this saved capture does not prove that earlier records are included."} Opened and merged counts use their respective event dates. Details also include PRs closed in the selected period; closed unmerged PRs never count as merged.`}</dd></div>
          <div><dt>Captured code</dt><dd>{preview ? "Simulated default-branch non-merge commits and changed lines." : `${history.commits ? "Complete available default-branch non-merge commit history in the captured public catalog." : "Partial default-branch commit history; this saved capture does not prove that earlier records are included."} Commits are filtered by committed time. Changed lines come from captured commit measurements. This scope excludes other branches and private or deleted repositories. Unlinked authors remain unattributed. GitHub capture runs every 15 minutes; Refresh reads the latest saved snapshot.`}</dd></div>
          <div><dt>Code coverage</dt><dd>{board.codeCoverage.message} {board.codeCoverage.capturedCommits} commits captured in this window; {board.codeCoverage.missingStats} missing line measurements; {board.codeCoverage.unattributedCommits} unattributed commits. Unavailable measurements show a dash.</dd></div>
          <div><dt>Code captured</dt><dd><Timestamp value={board.codeCoverage.fetchedAt} />{board.codeCoverage.retryAt && <>. Next attempt after <Timestamp value={board.codeCoverage.retryAt} /></>}</dd></div>
          <div><dt>From, inclusive</dt><dd>{board.from ? <time dateTime={board.from}>{contributionDate(board.from)}</time> : "Earliest available work"}</dd></div>
          <div><dt>Until, exclusive</dt><dd><time dateTime={board.to}>{contributionDate(board.to)}</time></dd></div>
          <div><dt>PR repositories</dt><dd>{covered.length ? covered.join(", ") : "No repository work captured."}</dd></div>
          <div><dt>Code repositories</dt><dd>{codeCovered.length ? codeCovered.join(", ") : "No commit data captured."}</dd></div>
        </dl>
      </details>
    </footer>
  </section>;
}
