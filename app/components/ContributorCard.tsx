import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { LeaderboardRow, OfficeSnapshot, Person } from "../data/types";
import type { ContributionWindow } from "../data/contribution-history";
import {
  allTimeWindow, buildContributionCalendar, calendarDate, collectContributorEvents, contributionStats, contributionYears,
  dayKey, groupContributionMonths, inWindow, type CalendarRange, type ContributionCalendar, type ContributorEvent, type ContributorEventKind,
} from "../data/contributor-activity";
import { ContributionMetrics } from "./ContributionDetails";
import { Icon } from "./ui";

type Props = {
  snapshot: OfficeSnapshot;
  person: Person;
  row: LeaderboardRow;
  contributionWindow: ContributionWindow;
  periodLabel: string;
  pullsCaptured: boolean;
  onClose: () => void;
};

const weekdays = ["", "Mon", "", "Wed", "", "Fri", ""];
const monthPageSize = 4;
const eventLabels: Record<ContributorEventKind, string> = { commit: "Committed", opened: "Opened PR", merged: "Merged PR", closed: "Closed PR" };

export function ContributorAvatar({ person, size = 36 }: { person: Person; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = person.name.replace(/^Preview /, "").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return <span className="contributor-avatar" style={{ width: size, height: size, flexBasis: size }} aria-hidden="true">
    <span>{initials}</span>
    {person.github && !failed && <img src={`https://avatars.githubusercontent.com/u/${person.github.id}?s=${size * 2}&v=4`} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} />}
  </span>;
}

function plural(count: number, word: string) {
  return `${count.toLocaleString("en-US")} ${word}${count === 1 ? "" : "s"}`;
}

function CalendarGrid({ calendar, selectedDay, onSelectDay }: { calendar: ContributionCalendar; selectedDay: string | null; onSelectDay: (day: string | null) => void }) {
  return <div className="activity-calendar-scroll">
    <div className="activity-calendar" style={{ "--calendar-weeks": calendar.weeks.length } as CSSProperties}>
      <div className="activity-calendar-months" aria-hidden="true">
        {calendar.months.map((month) => <span key={`${month.label}:${month.week}`} style={{ gridColumnStart: month.week + 1 }}>{month.label}</span>)}
      </div>
      <div className="activity-calendar-weekdays" aria-hidden="true">{weekdays.map((day, index) => <span key={index}>{day}</span>)}</div>
      <div className="activity-calendar-days" role="grid" aria-label={`${plural(calendar.total, "contribution")} from ${calendarDate(calendar.from)} to ${calendarDate(calendar.to)}`}>
        {calendar.weeks.map((week, x) => <div key={x} role="row" className="activity-calendar-week">
          {week.map((day) => day.inRange
            ? <button key={day.date} role="gridcell" className={`activity-day level-${day.level}`} aria-pressed={selectedDay === day.date}
              title={`${day.count ? plural(day.count, "contribution") : "No contributions"} on ${calendarDate(day.date)}`}
              aria-label={`${day.count ? plural(day.count, "contribution") : "No contributions"} on ${calendarDate(day.date)}`}
              onClick={() => onSelectDay(selectedDay === day.date ? null : day.date)} />
            : <span key={day.date} role="gridcell" className="activity-day is-outside" aria-hidden="true" />)}
        </div>)}
      </div>
    </div>
  </div>;
}

function TimelineEvent({ event }: { event: ContributorEvent }) {
  const title = event.href ? <a href={event.href} target="_blank" rel="noreferrer">{event.title}<Icon name="arrow" size={12} /></a> : event.title;
  return <li className={`timeline-event is-${event.kind}`}>
    <span className="timeline-node" aria-hidden="true" />
    <div className="timeline-event-heading">
      <span className="timeline-kind">{eventLabels[event.kind]}</span>
      <time dateTime={event.at}>{calendarDate(event.at)} · {event.at.slice(11, 16)} UTC</time>
    </div>
    <p className="timeline-title">{title}</p>
    <p className="timeline-meta">
      <span>{event.repository.fullName}</span>
      {event.kind === "commit" && <span className="commit-record-lines">
        <span className="lines-added">{event.additions === null ? "— added" : `+${event.additions.toLocaleString("en-US")}`}</span>
        <span className="lines-removed">{event.deletions === null ? "— removed" : `−${event.deletions.toLocaleString("en-US")}`}</span>
      </span>}
    </p>
  </li>;
}

export function ContributorCard({ snapshot, person, row, contributionWindow, periodLabel, pullsCaptured, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [range, setRange] = useState<CalendarRange>({ kind: "recent" });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [monthCount, setMonthCount] = useState(monthPageSize);

  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);

  const allEvents = useMemo(() => collectContributorEvents(snapshot, person.id, allTimeWindow(contributionWindow.to)), [snapshot, person.id, contributionWindow.to]);
  const years = useMemo(() => contributionYears(allEvents), [allEvents]);
  const calendar = useMemo(() => buildContributionCalendar(allEvents, range, contributionWindow.to), [allEvents, range, contributionWindow.to]);
  const stats = useMemo(() => contributionStats(allEvents), [allEvents]);
  const periodEvents = useMemo(() => allEvents.filter((event) => inWindow(event, contributionWindow)), [allEvents, contributionWindow]);
  const timelineEvents = selectedDay ? allEvents.filter((event) => dayKey(event.at) === selectedDay) : periodEvents;
  const months = useMemo(() => groupContributionMonths(timelineEvents), [timelineEvents]);
  const name = person.name.replace(/^Preview /, "");
  const preview = snapshot.source.mode === "preview";
  const selectDay = (day: string | null) => { setSelectedDay(day); setMonthCount(monthPageSize); };
  const selectRange = (next: CalendarRange) => { setRange(next); selectDay(null); };

  return <dialog ref={ref} className="contributor-card" aria-labelledby="contributor-card-title"
    onCancel={(event) => { event.preventDefault(); closeRef.current(); }}
    onClick={(event) => { if (event.target === event.currentTarget) closeRef.current(); }}>
    <div className="contributor-card-inner">
      <header className="contributor-card-header">
        <ContributorAvatar person={person} size={64} />
        <div className="contributor-card-identity">
          <span className={`contributor-card-rank${row.rank === 1 ? " is-leading" : ""}`}>Rank {row.rank.toString().padStart(2, "0")} · {periodLabel}</span>
          <h2 id="contributor-card-title">{name}</h2>
          {person.github ? <a href={person.github.url} target="_blank" rel="noreferrer">@{person.github.login}<Icon name="arrow" size={12} /></a>
            : <span>{person.kind === "preview" ? "Preview contributor" : "Contributor"}</span>}
        </div>
        <button className="contributor-card-close" onClick={onClose} aria-label={`Close ${name}'s contributor card`}><Icon name="close" /></button>
      </header>

      <div className="contributor-card-body">
        <section className="contributor-card-section" aria-label={`${periodLabel} totals`}>
          <div className="contributor-card-merged"><strong>{pullsCaptured ? row.merged.toLocaleString("en-US") : "—"}</strong><span>merged PRs · {periodLabel}</span></div>
          <ContributionMetrics row={row} pullsCaptured={pullsCaptured} />
        </section>

        <section className="contributor-card-section" aria-labelledby="contributor-activity-title">
          <div className="contributor-card-section-heading">
            <h3 id="contributor-activity-title">{plural(calendar.total, "contribution")} {range.kind === "recent" ? "in the last 12 months" : `in ${range.year}`}</h3>
            {years.length > 0 && <div className="activity-range" role="group" aria-label="Calendar range">
              <button aria-pressed={range.kind === "recent"} onClick={() => selectRange({ kind: "recent" })}>12 months</button>
              {years.map((year) => <button key={year} aria-pressed={range.kind === "year" && range.year === year} onClick={() => selectRange({ kind: "year", year })}>{year}</button>)}
            </div>}
          </div>
          <CalendarGrid calendar={calendar} selectedDay={selectedDay} onSelectDay={selectDay} />
          <div className="activity-calendar-footer">
            <span>Commits and opened PRs per UTC day. Select a day to filter the timeline.</span>
            <span className="activity-legend" aria-hidden="true">Less{[0, 1, 2, 3, 4].map((level) => <i key={level} className={`activity-day level-${level}`} />)}More</span>
          </div>
          <dl className="contributor-card-stats">
            <div><dt>First contribution</dt><dd>{stats.first ? calendarDate(stats.first) : "—"}</dd></div>
            <div><dt>Latest contribution</dt><dd>{stats.latest ? calendarDate(stats.latest) : "—"}</dd></div>
            <div><dt>Active days</dt><dd>{stats.activeDays.toLocaleString("en-US")}</dd></div>
            <div><dt>Longest streak</dt><dd>{plural(stats.longestStreak, "day")}</dd></div>
          </dl>
        </section>

        <section className="contributor-card-section" aria-labelledby="contributor-timeline-title">
          <div className="contributor-card-section-heading">
            <h3 id="contributor-timeline-title">Timeline</h3>
            {selectedDay ? <button className="timeline-filter" onClick={() => selectDay(null)}>{calendarDate(selectedDay)}<Icon name="close" size={12} /></button>
              : <span className="timeline-scope">{periodLabel} · {plural(periodEvents.length, "event")}</span>}
          </div>
          {months.length ? <ol className="contribution-timeline">
            {months.slice(0, monthCount).map((month) => <li key={month.key} className="timeline-month">
              <div className="timeline-month-heading">
                <h4>{month.label}</h4>
                <span>{[month.counts.commit && plural(month.counts.commit, "commit"), month.counts.opened && `${month.counts.opened} opened`,
                  month.counts.merged && `${month.counts.merged} merged`, month.counts.closed && `${month.counts.closed} closed`].filter(Boolean).join(" · ")}</span>
              </div>
              <ol>{month.events.map((event) => <TimelineEvent key={event.id} event={event} />)}</ol>
            </li>)}
          </ol> : <p className="timeline-empty">{selectedDay ? "No contributions on this day." : `No captured contributions in ${periodLabel.toLocaleLowerCase("en")}.`}</p>}
          {months.length > monthCount && <button className="contribution-show-more" onClick={() => setMonthCount((count) => count + monthPageSize)}>
            Show earlier months <span>({monthCount} of {months.length} shown)</span>
          </button>}
          {preview && <p className="timeline-empty">Simulated preview records.</p>}
        </section>
      </div>
    </div>
  </dialog>;
}
