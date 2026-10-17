import { useState } from "react";
import { contributionDate, type ContributionHistory, type HistoryCommit, type HistoryPullRequest } from "../data/contribution-history";
import { Icon } from "./ui";

const pageSize = 20;

function RecordDate({ value }: { value: string | null | undefined }) {
  return value && Number.isFinite(Date.parse(value))
    ? <time dateTime={value}>{contributionDate(value)}</time> : <span>Date unavailable</span>;
}

function CommitRecord({ commit }: { commit: HistoryCommit }) {
  return <li className="contribution-record">
    <p className="contribution-record-title">{commit.headline ?? <span className="record-unavailable">Headline unavailable in this snapshot</span>}</p>
    <div className="commit-record-meta">
      {commit.href ? <a href={commit.href} target="_blank" rel="noreferrer" title={commit.sha} aria-label={`Commit ${commit.sha} on GitHub`}><code>{commit.sha.slice(0, 7)}</code><Icon name="arrow" size={12} /></a>
        : <code title={commit.sha} aria-label={`Commit ${commit.sha}`}>{commit.sha.slice(0, 7)}</code>}
      <span>Committed <RecordDate value={commit.committedAt} /></span>
      {commit.attributedBy === "pull-request" && <span className="record-unavailable" title="The commit email is not linked to a GitHub account; the author of the merged pull request that landed it is credited.">Credited via merged PR</span>}
      <span className="commit-record-lines">
        <span className="lines-added" aria-label={commit.additions === null ? "Lines added unavailable" : `${commit.additions} lines added`}>{commit.additions === null ? "— added" : `+${commit.additions.toLocaleString("en-US")}`}</span>
        <span className="lines-removed" aria-label={commit.deletions === null ? "Lines removed unavailable" : `${commit.deletions} lines removed`}>{commit.deletions === null ? "— removed" : `−${commit.deletions.toLocaleString("en-US")}`}</span>
      </span>
    </div>
  </li>;
}

function PullRequestRecord({ pull }: { pull: HistoryPullRequest }) {
  const title = <>#{pull.number} {pull.title}</>;
  return <li className="contribution-record">
    <div className="pull-record-heading">
      <p className="contribution-record-title">{pull.href ? <a href={pull.href} target="_blank" rel="noreferrer">{title}<Icon name="arrow" size={12} /></a> : title}</p>
      <span className={`pull-record-state is-${pull.state}`}>{pull.state === "merged" ? "Merged" : pull.state === "closed" ? "Closed · unmerged" : "Open"}</span>
    </div>
    <dl className="pull-record-dates">
      <div><dt>Opened</dt><dd><RecordDate value={pull.createdAt} /></dd></div>
      {pull.state === "merged" && <div><dt>Merged</dt><dd><RecordDate value={pull.mergedAt} /></dd></div>}
      {pull.state === "closed" && <div><dt>Closed</dt><dd><RecordDate value={pull.closedAt} />{pull.closedAt === undefined && <span className="record-unavailable"> · legacy snapshot</span>}</dd></div>}
    </dl>
  </li>;
}

export function ContributionRecords({ history, codeAvailable, pullsAvailable }: { history: ContributionHistory; codeAvailable: boolean; pullsAvailable: boolean }) {
  const [commitCount, setCommitCount] = useState(pageSize);
  const [pullCount, setPullCount] = useState(pageSize);
  const { commits, pullRequests } = history;
  const remainingCommits = Math.max(0, commits.length - commitCount);
  const remainingPulls = Math.max(0, pullRequests.length - pullCount);

  return <div className="contribution-record-groups">
    <details className="contribution-record-group">
      <summary>Commits <span>{commits.length.toLocaleString("en-US")}</span><Icon name="chevron-right" size={13} /></summary>
      {commits.length ? <>
        <ol className="contribution-record-list">{commits.slice(0, commitCount).map((commit) => <CommitRecord key={commit.sha} commit={commit} />)}</ol>
        {remainingCommits > 0 && <button className="contribution-show-more" onClick={() => setCommitCount((count) => count + pageSize)}>Show {Math.min(pageSize, remainingCommits)} more commits <span>({Math.min(commitCount, commits.length)} of {commits.length} shown)</span></button>}
      </> : <p className="contribution-record-empty">{codeAvailable ? "No captured commits by this contributor in the selected period." : "Commit records are unavailable for this repository."}</p>}
    </details>
    <details className="contribution-record-group">
      <summary>Pull requests <span>{pullRequests.length.toLocaleString("en-US")}</span><Icon name="chevron-right" size={13} /></summary>
      {pullRequests.length ? <>
        <p className="contribution-record-explainer">Opened, merged or closed in this period. Summary counts use opened and merged dates separately.</p>
        <ol className="contribution-record-list">{pullRequests.slice(0, pullCount).map((pull) => <PullRequestRecord key={pull.id} pull={pull} />)}</ol>
        {remainingPulls > 0 && <button className="contribution-show-more" onClick={() => setPullCount((count) => count + pageSize)}>Show {Math.min(pageSize, remainingPulls)} more pull requests <span>({Math.min(pullCount, pullRequests.length)} of {pullRequests.length} shown)</span></button>}
      </> : <p className="contribution-record-empty">{pullsAvailable ? "No captured pull requests by this contributor opened, merged or closed in the selected period." : "Pull request records are unavailable for this repository."}</p>}
    </details>
  </div>;
}
