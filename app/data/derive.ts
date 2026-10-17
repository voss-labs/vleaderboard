import type {
  Leaderboard,
  LeaderboardRow,
  OfficeSnapshot,
  Period,
  Repository,
} from "./types.ts";
import { addCodeMetrics, emptyLeaderboardRow } from "./derive-code.ts";

export function selectMainRepositories(repositories: Repository[]): string[] {
  return repositories
    .filter((repository) => !repository.archived && !repository.fork)
    .sort((a, b) => {
      const recency = (Date.parse(b.pushedAt ?? "") || 0) -
        (Date.parse(a.pushedAt ?? "") || 0);
      return recency || a.fullName.localeCompare(b.fullName, "en");
    })
    .slice(0, 4)
    .map((repository) => repository.id);
}

export function deriveLeaderboard(
  snapshot: OfficeSnapshot,
  period: Period,
  now: Date,
): Leaderboard {
  const end = now.getTime();
  const start = period === "month"
    ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    : period === "30d" ? end - 30 * 86400000 : null;
  const inside = (value: string | null) => {
    const time = Date.parse(value ?? "");
    return Number.isFinite(time) && time < end && (start === null || time >= start);
  };
  const people = new Map(snapshot.people.map((person) => [person.id, person]));
  const counts = new Map<string, LeaderboardRow>();
  const seen = new Set<string>();
  const work = snapshot.work.filter((repository) => repository.pulls !== null);

  for (const repository of work) {
    for (const pull of repository.pulls ?? []) {
      const person = people.get(pull.authorPersonId);
      if (pull.kind !== "pull-request" || pull.isBot || !person || seen.has(pull.id)) continue;
      if (snapshot.source.mode === "github" && person.kind === "preview") continue;
      seen.add(pull.id);
      const row = counts.get(person.id) ?? emptyLeaderboardRow(person.id);
      if (inside(pull.createdAt)) row.opened += 1;
      if (pull.state === "merged" && inside(pull.mergedAt)) row.merged += 1;
      counts.set(person.id, row);
    }
  }

  const codeCoverage = addCodeMetrics(snapshot, counts, people, inside);

  const rows = [...counts.values()].sort((a, b) => b.merged - a.merged ||
    (people.get(a.personId)?.name ?? a.personId).localeCompare(
      people.get(b.personId)?.name ?? b.personId, "en",
    ) || a.personId.localeCompare(b.personId, "en"));
  rows.forEach((row, index) => {
    row.rank = index > 0 && rows[index - 1].merged === row.merged
      ? rows[index - 1].rank : index + 1;
  });
  const complete = snapshot.source.mode === "preview" && work.length === snapshot.repositories.length &&
    work.every((repository) => repository.status === "ready");

  return {
    rows,
    period,
    from: start === null ? null : new Date(start).toISOString(),
    to: now.toISOString(),
    coveredRepositoryIds: [...new Set(work.map((repository) => repository.repositoryId))],
    complete,
    label: snapshot.source.mode === "preview"
      ? "Merged PRs · simulated preview"
      : "Merged PRs · fetched repository coverage",
    codeCoverage,
  };
}
