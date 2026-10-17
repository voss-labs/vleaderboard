import { CAPTURE_PAGE_SIZE } from "./capture-limits.ts";
import { historyCoverage } from "./history-coverage.ts";
import { deriveLeaderboard } from "./derive.ts";
import { validUser } from "./github-identity.ts";
import type { LeaderboardRow, OfficeSnapshot, Period } from "./types.ts";

function metrics(row: LeaderboardRow, pullsCaptured: boolean) {
  return {
    rank: row.rank,
    merged: pullsCaptured ? row.merged : null,
    opened: pullsCaptured ? row.opened : null,
    capturedCommits: row.commits,
    additions: row.additions,
    deletions: row.deletions,
    codeStatus: row.codeStatus,
  };
}

export function createContributorReport(snapshot: OfficeSnapshot, period: Period) {
  const capturedAt = snapshot.source.fetchedAt;
  const capturedTime = Date.parse(capturedAt ?? "");
  const hasCaptureTime = Number.isFinite(capturedTime);
  const now = new Date(hasCaptureTime ? capturedTime : 0);
  const board = deriveLeaderboard(snapshot, period, now);
  const people = new Map(snapshot.people.map((person) => [person.id, person]));
  const repositories = snapshot.repositories.map((repository) => {
    const work = snapshot.work.filter((entry) => entry.repositoryId === repository.id);
    const code = snapshot.code?.filter((entry) => entry.repositoryId === repository.id);
    const result = deriveLeaderboard({ ...snapshot, repositories: [repository], work, code }, period, now);
    return { repository, result };
  });

  return {
    version: 1,
    source: snapshot.source,
    period,
    from: hasCaptureTime ? board.from : null,
    to: hasCaptureTime ? board.to : null,
    coverage: {
      catalogComplete: snapshot.catalogComplete,
      repositoryCount: snapshot.repositories.length,
      pullRequestRepositoryIds: board.coveredRepositoryIds,
      complete: board.complete,
      code: board.codeCoverage,
      history: historyCoverage(snapshot),
      pagination: { pullRequestPageSize: CAPTURE_PAGE_SIZE, commitPageSize: CAPTURE_PAGE_SIZE },
      message: `${historyCoverage(snapshot).complete ? "Complete available history at capture time." : "Partial saved history; earlier records may be unavailable."} Scope is the captured public VOSS Labs catalog and default-branch non-merge commits, including forks and archives. All time removes the date lower bound within that scope. Opened and merged PRs use their respective event dates; commits use committed dates. Unavailable measurements are null.`,
    },
    contributors: board.rows.map((row) => {
      const person = people.get(row.personId)!;
      const identity = validUser(person.github) ? person.github : null;
      return {
        id: person.id,
        name: person.name,
        login: identity?.login ?? null,
        profileUrl: identity?.url ?? null,
        avatarUrl: identity ? `https://avatars.githubusercontent.com/u/${identity.id}?s=80&v=4` : null,
        ...metrics(row, board.coveredRepositoryIds.length > 0),
        repositories: repositories.flatMap(({ repository, result }) => {
          const contribution = result.rows.find((entry) => entry.personId === row.personId);
          return contribution ? [{
            id: repository.id,
            name: repository.name,
            fullName: repository.fullName,
            url: repository.url,
            ...metrics(contribution, result.coveredRepositoryIds.length > 0),
          }] : [];
        }),
      };
    }),
  };
}
