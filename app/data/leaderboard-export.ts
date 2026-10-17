import {
  allTimeWindow, buildContributionCalendar, calendarDate, collectContributorEvents, contributionStats,
  type ContributionCalendar, type ContributionStats,
} from "./contributor-activity.ts";
import { validUser } from "./github-identity.ts";
import type { Leaderboard, LeaderboardRow, OfficeSnapshot, Person } from "./types.ts";

export type ExportContributor = {
  row: LeaderboardRow;
  person: Person;
  login: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  stats: ContributionStats;
  calendar: ContributionCalendar;
};
export type LeaderboardExport = {
  periodLabel: string;
  from: string | null;
  to: string;
  capturedAt: string | null;
  preview: boolean;
  pullsCaptured: boolean;
  query: string;
  totalContributors: number;
  repositoryCount: number;
  contributors: ExportContributor[];
};

const displayName = (person: Person) => person.name.replace(/^Preview /, "");

export function buildLeaderboardExport(snapshot: OfficeSnapshot, board: Leaderboard, rows: LeaderboardRow[], periodLabel: string, query = ""): LeaderboardExport {
  const people = new Map(snapshot.people.map((person) => [person.id, person]));
  return {
    periodLabel,
    from: board.from,
    to: board.to,
    capturedAt: snapshot.source.fetchedAt,
    preview: snapshot.source.mode === "preview",
    pullsCaptured: board.coveredRepositoryIds.length > 0,
    query: query.trim(),
    totalContributors: board.rows.length,
    repositoryCount: snapshot.repositories.length,
    contributors: rows.flatMap((row) => {
      const person = people.get(row.personId);
      if (!person) return [];
      const identity = validUser(person.github) ? person.github : null;
      const events = collectContributorEvents(snapshot, person.id, allTimeWindow(board.to));
      return [{ row, person, login: identity?.login ?? null, profileUrl: identity?.url ?? null,
        avatarUrl: identity ? `https://avatars.githubusercontent.com/u/${identity.id}?s=80&v=4` : null,
        stats: contributionStats(events), calendar: buildContributionCalendar(events, { kind: "recent" }, board.to) }];
    }),
  };
}

const number = (value: number | null, prefix = "") => value === null ? "—" : `${prefix}${value.toLocaleString("en-US")}`;
const date = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? calendarDate(value) : "—";
const windowLabel = (data: LeaderboardExport) => `${data.from ? date(data.from) : "Earliest available work"} to ${date(new Date(Date.parse(data.to) - 1).toISOString())}`;

function markdownCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}

export function leaderboardMarkdown(data: LeaderboardExport): string {
  const lines = [
    "# VOSS Labs Leaderboard",
    "",
    `**Period:** ${data.periodLabel} (${windowLabel(data)}, UTC)  `,
    `**Snapshot captured:** ${data.capturedAt ? `${data.capturedAt.replace("T", " ").replace(/\.\d{3}Z$|Z$/, "")} UTC` : "Not captured"}  `,
    `**Contributors:** ${data.query ? `${data.contributors.length} of ${data.totalContributors} matching “${markdownCell(data.query)}”` : data.contributors.length} across ${data.repositoryCount} repositories`,
    ...(data.preview ? ["", "> Preview data. All counts are simulated."] : []),
    "",
    "| Rank | Contributor | Merged PRs | PRs opened | Commits | Lines added | Lines removed |",
    "| ---: | :--- | ---: | ---: | ---: | ---: | ---: |",
    ...data.contributors.map(({ row, person, login, profileUrl }) => {
      const name = markdownCell(displayName(person));
      const who = profileUrl && login ? `[${name}](${profileUrl}) (@${markdownCell(login)})` : name;
      return `| ${row.rank} | ${who} | ${number(data.pullsCaptured ? row.merged : null)} | ${number(data.pullsCaptured ? row.opened : null)} | ${number(row.commits)} | ${number(row.additions, "+")} | ${number(row.deletions, "−")} |`;
    }),
    "",
    "## Contribution activity",
    "",
    "Contributions count authored commits and opened pull requests over the last 12 months.",
    "",
    "| Contributor | Last 12 months | Active days | Longest streak | First contribution | Latest contribution |",
    "| :--- | ---: | ---: | ---: | :--- | :--- |",
    ...data.contributors.map(({ person, calendar, stats }) =>
      `| ${markdownCell(displayName(person))} | ${calendar.total.toLocaleString("en-US")} | ${stats.activeDays.toLocaleString("en-US")} | ${stats.longestStreak} ${stats.longestStreak === 1 ? "day" : "days"} | ${date(stats.first)} | ${date(stats.latest)} |`),
    "",
    "---",
    "",
    "Ranked by merged pull requests; ties share a rank. A dash means the measurement is unavailable in the captured scope. Scope is the captured public VOSS Labs catalog and default-branch non-merge commits.",
    "",
  ];
  return lines.join("\n");
}

function html(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function calendarSvg(calendar: ContributionCalendar): string {
  const cell = 7;
  const gap = 2;
  const top = 11;
  const width = calendar.weeks.length * (cell + gap);
  const months = calendar.months.map((month) => `<text x="${month.week * (cell + gap)}" y="8">${html(month.label)}</text>`).join("");
  const days = calendar.weeks.map((week, x) => week.map((day, y) => day.inRange
    ? `<rect class="l${day.level}" x="${x * (cell + gap)}" y="${top + y * (cell + gap)}" width="${cell}" height="${cell}" rx="1.5"><title>${day.count} on ${html(calendarDate(day.date))}</title></rect>`
    : "").join("")).join("");
  return `<svg class="calendar" viewBox="0 0 ${width} ${top + 7 * (cell + gap)}" width="${width}" height="${top + 7 * (cell + gap)}" role="img" aria-label="${calendar.total} contributions in the last 12 months">${months}${days}</svg>`;
}

const printStyles = `
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
html { background: #0a0a0a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; padding: 28px 32px; background: #0a0a0a; color: #fafafa; font: 12px/1.6 "Geist", Arial, sans-serif; }
header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid #292929; }
.brand { display: inline-flex; align-items: center; gap: 7px; font-size: 22px; font-weight: 900; letter-spacing: -.8px; }
.brand i { width: 11px; height: 11px; background: #fb7a3c; margin-right: 2px; }
.brand small { color: #a3a3a3; font-size: 14px; font-weight: 500; letter-spacing: -.3px; }
.tag { padding: 3px 8px; border: 1px solid #444; border-radius: 4px; color: #d4d4d4; font-size: 11px; }
.tag.preview { border-color: #70442e; color: #ffad82; }
h1 { margin: 26px 0 4px; font-size: 40px; font-weight: 700; letter-spacing: -.055em; line-height: 1.08; }
h1 span { color: #fb7a3c; }
.lead { margin: 10px 0 0; color: #a3a3a3; }
.meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 22px 0 20px; padding-top: 16px; border-top: 2px solid #fb7a3c; }
.meta div { color: #a3a3a3; }
.meta strong { display: block; color: #d4d4d4; font-weight: 500; }
table { width: 100%; border-collapse: collapse; }
thead { background: #111; color: #a3a3a3; }
thead th { height: 34px; padding: 0 8px; border-top: 1px solid #292929; border-bottom: 1px solid #292929; font-size: 11px; font-weight: 400; text-align: right; }
thead th.left { text-align: left; }
tbody tr.summary td { padding: 12px 8px 6px; }
tbody tr.activity td { padding: 0 8px 12px; border-bottom: 1px solid #292929; }
tbody tr { break-inside: avoid; page-break-inside: avoid; }
td { text-align: right; vertical-align: middle; font: 500 13px "Geist Mono", monospace; color: #e0e0e0; }
td.rank { width: 44px; text-align: left; color: #999; font-size: 12px; }
td.who { text-align: left; font-family: "Geist", Arial, sans-serif; }
td.merged { font-size: 20px; letter-spacing: -1px; }
.leading td.rank, .leading td.merged { color: #fb7a3c; }
.identity { display: flex; align-items: center; gap: 10px; }
.avatar { position: relative; display: inline-flex; flex: 0 0 30px; width: 30px; height: 30px; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #42403e; border-radius: 50%; background: #27221f; color: #edc9b6; font-size: 10px; font-weight: 600; }
.avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.identity strong { display: block; color: #e9e9e9; font-size: 13px; font-weight: 500; line-height: 1.3; }
.identity small { color: #999; font-size: 11px; }
.identity a { color: inherit; text-decoration: none; }
.added { color: #a2cba5; }
.removed { color: #e4a39b; }
.activity-cell { display: flex; align-items: flex-end; gap: 18px; padding-left: 44px; text-align: left; font: 11px "Geist", Arial, sans-serif; color: #a3a3a3; }
.activity-cell b { color: #e0e0e0; font-weight: 500; }
.calendar { display: block; max-width: 100%; height: auto; }
.calendar text { fill: #737373; font: 7px "Geist", Arial, sans-serif; }
.calendar .l0 { fill: #1a1a1a; }
.calendar .l1 { fill: #4a2515; }
.calendar .l2 { fill: #8c3e1b; }
.calendar .l3 { fill: #cb5a27; }
.calendar .l4 { fill: #fb7a3c; }
.facts { display: grid; gap: 2px; min-width: 150px; }
.legend { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin: 14px 0 0; color: #a3a3a3; font-size: 10px; }
.legend i { width: 9px; height: 9px; border-radius: 2px; }
footer { margin-top: 22px; padding-top: 12px; border-top: 1px solid #292929; color: #a3a3a3; font-size: 10px; }
.empty { padding: 40px; text-align: center; color: #a3a3a3; border-bottom: 1px solid #292929; }
`;

export function leaderboardPrintDocument(data: LeaderboardExport): string {
  const rows = data.contributors.map(({ row, person, login, profileUrl, avatarUrl, stats, calendar }) => {
    const name = html(displayName(person));
    const initials = html(displayName(person).split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase());
    const identity = `<strong>${name}</strong><small>${login ? `@${html(login)}` : person.kind === "preview" ? "Preview contributor" : "Contributor"}</small>`;
    return `<tr class="summary${row.rank === 1 ? " leading" : ""}">
<td class="rank">${row.rank.toString().padStart(2, "0")}</td>
<td class="who"><div class="identity"><span class="avatar">${initials}${avatarUrl ? `<img src="${html(avatarUrl)}" alt="">` : ""}</span><div>${profileUrl ? `<a href="${html(profileUrl)}">${identity}</a>` : identity}</div></div></td>
<td class="merged">${number(data.pullsCaptured ? row.merged : null)}</td>
<td>${number(data.pullsCaptured ? row.opened : null)}</td>
<td>${number(row.commits)}</td>
<td class="added">${number(row.additions, "+")}</td>
<td class="removed">${number(row.deletions, "−")}</td>
</tr>
<tr class="activity"><td colspan="7"><div class="activity-cell">${calendarSvg(calendar)}<div class="facts"><span><b>${calendar.total.toLocaleString("en-US")}</b> contributions in 12 months</span><span><b>${stats.activeDays.toLocaleString("en-US")}</b> active days · <b>${stats.longestStreak}</b>-day best streak</span><span>First <b>${html(date(stats.first))}</b></span><span>Latest <b>${html(date(stats.latest))}</b></span></div></div></td></tr>`;
  }).join("\n");
  const count = data.query ? `${data.contributors.length} of ${data.totalContributors}` : `${data.contributors.length}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>VOSS Labs Leaderboard — ${html(data.periodLabel)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;900&family=Geist+Mono:wght@400;500&display=swap">
<style>${printStyles}</style></head>
<body>
<header><span class="brand"><i></i>VOSS<small>Labs</small></span><span class="tag${data.preview ? " preview" : ""}">${data.preview ? "Preview · simulated counts" : "GitHub · captured history"}</span></header>
<h1>Leaderboard<span>.</span></h1>
<p class="lead">Contributions across VOSS Labs. Merged PRs, highest first. Ties share a rank.</p>
<section class="meta">
<div><strong>Period</strong>${html(data.periodLabel)} · ${html(windowLabel(data))} UTC</div>
<div><strong>Snapshot captured</strong>${html(date(data.capturedAt))}</div>
<div><strong>Contributors</strong>${count}${data.query ? ` matching “${html(data.query)}”` : ""} · ${data.repositoryCount} repositories</div>
</section>
<table>
<thead><tr><th class="left">Rank</th><th class="left">Contributor</th><th>Merged PRs</th><th>Opened</th><th>Commits</th><th>Added</th><th>Removed</th></tr></thead>
<tbody>${rows || `<tr><td colspan="7" class="empty">No contributors in this export.</td></tr>`}</tbody>
</table>
<p class="legend">Less <i style="background:#1a1a1a"></i><i style="background:#4a2515"></i><i style="background:#8c3e1b"></i><i style="background:#cb5a27"></i><i style="background:#fb7a3c"></i> More</p>
<footer>Calendar squares count authored commits and opened pull requests over the last 12 months. A dash means the measurement is unavailable in the captured scope. Scope is the captured public VOSS Labs catalog and default-branch non-merge commits.</footer>
</body></html>`;
}

export function exportFileName(periodLabel: string, to: string, extension: "md" | "pdf"): string {
  const slug = periodLabel.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `voss-leaderboard-${slug}-${to.slice(0, 10)}.${extension}`;
}
