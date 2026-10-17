import { inContributionWindow, selectContributionHistory, type ContributionWindow } from "./contribution-history.ts";
import type { OfficeSnapshot, Repository } from "./types.ts";

const DAY = 86400000;

export type ContributorEventKind = "commit" | "opened" | "merged" | "closed";
export type ContributorEvent = {
  id: string;
  kind: ContributorEventKind;
  at: string;
  repository: Repository;
  title: string;
  href: string | null;
  additions: number | null;
  deletions: number | null;
};
export type CalendarRange = { kind: "recent" } | { kind: "year"; year: number };
export type CalendarDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4; inRange: boolean };
export type ContributionCalendar = {
  weeks: CalendarDay[][];
  months: { label: string; week: number }[];
  total: number;
  from: string;
  to: string;
};
export type ContributionStats = {
  total: number;
  first: string | null;
  latest: string | null;
  activeDays: number;
  longestStreak: number;
  repositories: number;
};
export type ContributionMonth = {
  key: string;
  label: string;
  events: ContributorEvent[];
  counts: Record<ContributorEventKind, number>;
};

export const allTimeWindow = (to: string): ContributionWindow => ({ from: null, to });
export const inWindow = (event: ContributorEvent, window: ContributionWindow) => inContributionWindow(event.at, window);

export function dayKey(value: string | number): string {
  return new Date(typeof value === "number" ? value : Date.parse(value)).toISOString().slice(0, 10);
}

function startOfDay(time: number): number {
  return Math.floor(time / DAY) * DAY;
}

/** Calendar squares count authored commits and opened PRs, matching GitHub's contribution graph. */
export function countsTowardCalendar(event: ContributorEvent): boolean {
  return event.kind === "commit" || event.kind === "opened";
}

export function collectContributorEvents(snapshot: OfficeSnapshot, personId: string, window: ContributionWindow): ContributorEvent[] {
  const events: ContributorEvent[] = [];
  for (const repository of snapshot.repositories) {
    const history = selectContributionHistory(snapshot, personId, repository.id, window);
    for (const commit of history.commits) {
      events.push({ id: `commit:${repository.id}:${commit.sha}`, kind: "commit", at: commit.committedAt, repository,
        title: commit.headline ?? `Commit ${commit.sha.slice(0, 7)}`, href: commit.href,
        additions: commit.additions, deletions: commit.deletions });
    }
    for (const pull of history.pullRequests) {
      const title = `#${pull.number} ${pull.title}`;
      const dates: [ContributorEventKind, string | null | undefined][] = [["opened", pull.createdAt],
        ["merged", pull.state === "merged" ? pull.mergedAt : null], ["closed", pull.state === "closed" ? pull.closedAt : null]];
      for (const [kind, at] of dates) {
        if (!at || !inContributionWindow(at, window)) continue;
        events.push({ id: `${kind}:${pull.id}`, kind, at, repository, title, href: pull.href, additions: null, deletions: null });
      }
    }
  }
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id, "en"));
}

export function contributionYears(events: ContributorEvent[]): number[] {
  return [...new Set(events.filter(countsTowardCalendar).map((event) => new Date(event.at).getUTCFullYear()))].sort((a, b) => b - a);
}

function level(count: number, max: number): CalendarDay["level"] {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as CalendarDay["level"];
}

export function buildContributionCalendar(events: ContributorEvent[], range: CalendarRange, end: string): ContributionCalendar {
  const lastAvailable = startOfDay(Date.parse(end) - 1);
  const first = range.kind === "recent" ? lastAvailable - 364 * DAY : Date.UTC(range.year, 0, 1);
  const gridEnd = range.kind === "recent" ? lastAvailable : Date.UTC(range.year, 11, 31);
  const last = Math.min(gridEnd, lastAvailable);
  const counts = new Map<string, number>();
  for (const event of events) {
    const time = Date.parse(event.at);
    if (!countsTowardCalendar(event) || !Number.isFinite(time)) continue;
    const day = startOfDay(time);
    if (day < first || day > last) continue;
    const key = dayKey(day);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const max = Math.max(0, ...counts.values());
  const weeks: CalendarDay[][] = [];
  const months: ContributionCalendar["months"] = [];
  const monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  for (let weekStart = first - new Date(first).getUTCDay() * DAY; weekStart <= gridEnd; weekStart += 7 * DAY) {
    const week: CalendarDay[] = [];
    let monthStart: number | null = null;
    for (let offset = 0; offset < 7; offset += 1) {
      const time = weekStart + offset * DAY;
      const date = dayKey(time);
      const inRange = time >= first && time <= last;
      const count = inRange ? counts.get(date) ?? 0 : 0;
      week.push({ date, count, level: level(count, max), inRange });
      if (time >= first && time <= gridEnd && (time === first || new Date(time).getUTCDate() === 1)) monthStart = time;
    }
    if (monthStart !== null) {
      const label = { label: monthFormat.format(monthStart), week: weeks.length };
      const previous = months.at(-1);
      if (previous && label.week - previous.week < 3) months[months.length - 1] = label;
      else months.push(label);
    }
    weeks.push(week);
  }
  return { weeks, months, total: [...counts.values()].reduce((sum, value) => sum + value, 0), from: dayKey(first), to: dayKey(last) };
}

export function contributionStats(events: ContributorEvent[]): ContributionStats {
  const days = [...new Set(events.map((event) => startOfDay(Date.parse(event.at))).filter(Number.isFinite))].sort((a, b) => a - b);
  let longestStreak = 0;
  let streak = 0;
  days.forEach((day, index) => {
    streak = index > 0 && day - days[index - 1] === DAY ? streak + 1 : 1;
    longestStreak = Math.max(longestStreak, streak);
  });
  return {
    total: events.filter(countsTowardCalendar).length,
    first: events.at(-1)?.at ?? null,
    latest: events[0]?.at ?? null,
    activeDays: days.length,
    longestStreak,
    repositories: new Set(events.map((event) => event.repository.id)).size,
  };
}

export function groupContributionMonths(events: ContributorEvent[]): ContributionMonth[] {
  const format = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const months = new Map<string, ContributionMonth>();
  for (const event of events) {
    const key = event.at.slice(0, 7);
    const month = months.get(key) ?? { key, label: format.format(Date.parse(event.at)), events: [],
      counts: { commit: 0, opened: 0, merged: 0, closed: 0 } };
    month.events.push(event);
    month.counts[event.kind] += 1;
    months.set(key, month);
  }
  return [...months.values()];
}

export function calendarDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(Date.parse(value));
}
