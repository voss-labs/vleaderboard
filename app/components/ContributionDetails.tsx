import type { CodeStatus, LeaderboardRow, Repository, RepositoryCode } from "../data/types";
import { Icon, Timestamp } from "./ui";

export type RepositoryContribution = {
  repository: Repository;
  row: LeaderboardRow;
  pullsCaptured: boolean;
  code: RepositoryCode | undefined;
};

function statusLabel(status: CodeStatus) {
  return status === "ready" ? "Captured scope" : status === "partial" ? "Partial capture" : status === "stale" ? "Cached capture" : "Code unavailable";
}

export function MetricValue({ value, label, prefix = "", partial = false }: { value: number | null; label: string; prefix?: string; partial?: boolean }) {
  if (value === null) return <span className="metric-unknown" title={`${label} unavailable in this captured scope`} aria-label={`${label} unavailable in this captured scope`}>—</span>;
  return <span title={partial ? `${label}: captured subtotal` : label}>{prefix}{value.toLocaleString("en-US")}{partial && <span className="sr-only"> captured subtotal</span>}</span>;
}

export function ContributionMetrics({ row, pullsCaptured = true }: { row: LeaderboardRow; pullsCaptured?: boolean }) {
  const partial = row.codeStatus !== "ready";
  return <dl className="contribution-metrics">
    <div><dt>Captured commits</dt><dd><MetricValue value={row.commits} label="Commits" partial={partial} /></dd></div>
    <div><dt>PRs opened</dt><dd><MetricValue value={pullsCaptured ? row.opened : null} label="PRs opened" /></dd></div>
    <div className="lines-added"><dt>Lines added</dt><dd><MetricValue value={row.additions} label="Lines added" prefix="+" partial={partial} /></dd></div>
    <div className="lines-removed"><dt>Lines removed</dt><dd><MetricValue value={row.deletions} label="Lines removed" prefix="−" partial={partial} /></dd></div>
  </dl>;
}

export function ContributionDetails({ name, entries, preview, codeStatus }: { name: string; entries: RepositoryContribution[]; preview: boolean; codeStatus: CodeStatus }) {
  return <details className="contributor-details">
    <summary aria-label={`Contribution details for ${name}`}>Details<span className="contributor-repo-count">{entries.length} {entries.length === 1 ? "repo" : "repos"}</span><Icon name="chevron-right" size={13} /></summary>
    <div className="contribution-detail-content">
      <div className="contribution-detail-heading"><h3>Repository breakdown</h3><span>{statusLabel(codeStatus)}</span></div>
      <p>Contributions in the selected period. PRs and code have separate coverage.</p>
      {entries.length ? <div className="repository-contributions">{entries.map(({ repository, row, pullsCaptured, code }) => <div className="repository-contribution" key={repository.id}>
        <div className="repository-contribution-heading">
          {preview ? <strong>{repository.name}</strong> : <a href={repository.url} target="_blank" rel="noreferrer">{repository.fullName}<Icon name="arrow" size={13} /></a>}
          <span><MetricValue value={pullsCaptured ? row.merged : null} label="Merged PRs" /> merged PRs</span>
        </div>
        <ContributionMetrics row={row} pullsCaptured={pullsCaptured} />
        <p className="repository-code-coverage">{code ? <>{statusLabel(code.status)}. {code.message} Captured <Timestamp value={code.fetchedAt} />.{code.retryAt && <> Retry after <Timestamp value={code.retryAt} />.</>}</> : "Commit data has not been captured for this repository."}</p>
      </div>)}</div> : <p>No repository breakdown is available in this snapshot.</p>}
      <p className="contribution-detail-note">A dash means unavailable. Changed lines measure additions and removals in captured commits; they do not measure repository size or code ownership.</p>
    </div>
  </details>;
}
