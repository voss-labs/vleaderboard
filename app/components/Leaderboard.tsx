import { Fragment, useMemo, useState } from "react";
import type { Leaderboard as LeaderboardData, OfficeSnapshot, Period, Person } from "../data/types";
import { deriveLeaderboard } from "../data/derive";
import { ContributionDetails, ContributionMetrics, MetricValue, type RepositoryContribution } from "./ContributionDetails";
import { Icon, Timestamp } from "./ui";

type Props = {
  snapshot: OfficeSnapshot;
  board: LeaderboardData;
  period: Period;
  onPeriod: (period: Period) => void;
};

const periods: { value: Period; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "Captured history" },
];

function ContributorAvatar({ person }: { person: Person }) {
  const [failed, setFailed] = useState(false);
  const initials = person.name.replace(/^Preview /, "").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return <span className="contributor-avatar" aria-hidden="true">
    <span>{initials}</span>
    {person.github && !failed && <img src={`https://avatars.githubusercontent.com/u/${person.github.id}?s=80&v=4`} alt="" width="36" height="36" loading="lazy" onError={() => setFailed(true)} />}
  </span>;
}

function ContributorName({ person }: { person: Person }) {
  const identity = <><strong>{person.name.replace(/^Preview /, "")}</strong><small>{person.kind === "preview" ? "Preview contributor" : person.github ? `@${person.github.login}` : "Contributor"}</small></>;

  return <div className="contributor-identity">
    <ContributorAvatar person={person} />
    {person.github ? <a className="contributor-profile" href={person.github.url} target="_blank" rel="noreferrer">{identity}<Icon name="arrow" size={13} /></a> : <span className="contributor-profile">{identity}</span>}
  </div>;
}

function utcDate(value: string) {
  return new Date(value).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function Leaderboard({ snapshot, board, period, onPeriod }: Props) {
  const [query, setQuery] = useState("");
  const people = new Map(snapshot.people.map((person) => [person.id, person]));
  const covered = board.coveredRepositoryIds.map((id) => snapshot.repositories.find((repository) => repository.id === id)?.fullName ?? id);
  const codeCovered = board.codeCoverage.repositoryIds.map((id) => snapshot.repositories.find((repository) => repository.id === id)?.fullName ?? id);
  const preview = snapshot.source.mode === "preview";
  const pullsCaptured = board.coveredRepositoryIds.length > 0;
  const normalizedQuery = query.trim().replace(/^@/, "").toLocaleLowerCase("en");
  const visibleRows = board.rows.filter((row) => {
    const person = people.get(row.personId);
    return person && (!normalizedQuery || person.name.toLocaleLowerCase("en").includes(normalizedQuery) || person.github?.login.toLocaleLowerCase("en").includes(normalizedQuery));
  });
  const repositoryContributions = useMemo(() => {
    const contributions = new Map<string, RepositoryContribution[]>();
    for (const repository of snapshot.repositories) {
      const work = snapshot.work.filter((item) => item.repositoryId === repository.id);
      const code = snapshot.code?.filter((item) => item.repositoryId === repository.id);
      const repositoryBoard = deriveLeaderboard({ ...snapshot, repositories: [repository], work, code }, period, new Date(board.to));
      for (const row of repositoryBoard.rows) {
        const entries = contributions.get(row.personId) ?? [];
        entries.push({ repository, row, pullsCaptured: repositoryBoard.coveredRepositoryIds.length > 0, code: code?.[0] });
        contributions.set(row.personId, entries);
      }
    }
    return contributions;
  }, [snapshot, period, board.to]);

  return <section className="contributor-board" id="contributor-leaderboard" tabIndex={-1} aria-labelledby="ranking-title">
    <div className="ranking-toolbar">
      <div><h2 id="ranking-title">Contributors</h2><p>Merged PRs, highest first. Ties share a rank.</p></div>
      <div className="ranking-periods" role="group" aria-label="Leaderboard period">
        {periods.map((item) => <button key={item.value} aria-pressed={period === item.value} onClick={() => onPeriod(item.value)}>{item.label}</button>)}
      </div>
    </div>
    <div className="ranking-filters">
      <div className="contributor-search"><Icon name="search" size={16} /><label className="sr-only" htmlFor="contributor-search">Search contributors by name or GitHub handle</label><input id="contributor-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or @handle" autoComplete="off" />{query && <button onClick={() => setQuery("")} aria-label="Clear contributor search"><Icon name="close" size={14} /></button>}</div>
      <p className="ranking-results" role="status">{query.trim() ? `${visibleRows.length} of ${board.rows.length}` : board.rows.length} {board.rows.length === 1 ? "contributor" : "contributors"}</p>
      <div className="ranking-repository-scope"><strong>{snapshot.repositories.length} {snapshot.catalogComplete ? "public repositories" : "listed repositories"}</strong><span>PRs {covered.length}/{snapshot.repositories.length}<span aria-hidden="true"> · </span>Code {codeCovered.length}/{snapshot.repositories.length} captured</span></div>
    </div>
    {!snapshot.catalogComplete && <p className="ranking-catalog-warning">Repository discovery is incomplete. Coverage refers to listed repositories only.</p>}
    <p className="ranking-code-scope">{preview ? "Simulated code metrics." : "Code: latest 10 default-branch commit records per repository, excluding merges."} <span>{preview ? "All counts are sample data." : board.codeCoverage.status === "unavailable" ? "Code unavailable; a dash means unknown." : board.codeCoverage.status === "stale" ? "Cached code subtotals." : "Captured subtotals; history may be partial."}</span></p>

    <table className="contributor-table">
      <caption className="sr-only">Contributors ranked by merged pull requests, highest first. Equal counts share a rank. {preview ? "Simulated preview data." : "Partial fetched GitHub history."}</caption>
      <thead><tr><th scope="col" className="contributor-rank">Rank</th><th scope="col">Contributor</th><th scope="col" className="contributor-score">Merged PRs</th></tr></thead>
      <tbody>
        {visibleRows.map((row) => {
          const person = people.get(row.personId);
          if (!person) return null;
          return <Fragment key={row.personId}><tr className={`contributor-summary${row.rank === 1 ? " is-leading" : ""}`}>
            <td className="contributor-rank"><span>{row.rank.toString().padStart(2, "0")}</span></td>
            <th scope="row"><ContributorName person={person} /></th>
            <td className="contributor-score"><MetricValue value={pullsCaptured ? row.merged : null} label="Merged PRs" /></td>
          </tr><tr className="contributor-metrics-row"><td colSpan={3}>
            <div className="contributor-row-more">
              <ContributionMetrics row={row} pullsCaptured={pullsCaptured} />
              <ContributionDetails name={person.name} entries={repositoryContributions.get(row.personId) ?? []} preview={preview} codeStatus={row.codeStatus} />
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

    <footer className="ranking-footer">
      <p>Ranks reflect the full captured scope. Search keeps original ranks.</p>
      <details className="ranking-coverage">
        <summary>Window and coverage<Icon name="chevron-right" size={13} /></summary>
        <dl>
          <div><dt>Repository catalog</dt><dd>{snapshot.catalogComplete ? "All public repositories returned by the captured VOSS Labs catalog are included." : "Repository discovery is incomplete. The catalog captures at most three pages of 100 public repositories; repository coverage counts refer only to listed repositories."}</dd></div>
          <div><dt>Pull requests</dt><dd>{preview ? "Simulated preview. All counts are sample data." : "Partial fetched history. This is not a complete organization ranking. Up to 100 most recently updated pull requests per fetched repository; opened and merged use their respective event dates."}</dd></div>
          <div><dt>Captured code</dt><dd>{preview ? "Simulated default-branch non-merge commits and changed lines." : `Captured default-branch non-merge commits, filtered by committed time. Latest 10 commit records per fetched repository. ${board.codeCoverage.detailReadLimit === null ? "Changed lines come from the same GitHub history capture." : `At most 10 commit detail reads per repository, with ${board.codeCoverage.detailReadLimit} new detail reads shared per capture.`} GitHub capture runs every 15 minutes; Refresh reads the latest saved snapshot. Captured history is not a lifetime total.`}</dd></div>
          <div><dt>Code coverage</dt><dd>{board.codeCoverage.message} {board.codeCoverage.capturedCommits} commits captured in this window; {board.codeCoverage.missingStats} missing line measurements; {board.codeCoverage.unattributedCommits} unattributed commits. Unavailable measurements show a dash.</dd></div>
          <div><dt>Code captured</dt><dd><Timestamp value={board.codeCoverage.fetchedAt} />{board.codeCoverage.retryAt && <>. Next attempt after <Timestamp value={board.codeCoverage.retryAt} /></>}</dd></div>
          <div><dt>From, inclusive</dt><dd>{board.from ? <time dateTime={board.from}>{utcDate(board.from)}</time> : "Earliest captured work"}</dd></div>
          <div><dt>Until, exclusive</dt><dd><time dateTime={board.to}>{utcDate(board.to)}</time></dd></div>
          <div><dt>PR repositories</dt><dd>{covered.length ? covered.join(", ") : "No repository work captured."}</dd></div>
          <div><dt>Code repositories</dt><dd>{codeCovered.length ? codeCovered.join(", ") : "No commit data captured."}</dd></div>
        </dl>
      </details>
    </footer>
  </section>;
}
