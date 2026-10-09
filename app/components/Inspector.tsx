import { useEffect, useRef } from "react";
import type { ActivityEvent, OfficeSnapshot, Person, Repository, Selection, WorkItem } from "../data/types";
import { Icon, Modal, Portrait, SourceBadge, Timestamp } from "./ui";

type InspectorProps = { snapshot: OfficeSnapshot; events: ActivityEvent[]; selection: NonNullable<Selection>; followedPersonId: string | null; onFollow: (id: string | null) => void; onClose: () => void; mobile: boolean; pending: boolean };

function WorkList({ title, items, unknown }: { title: string; items: WorkItem[]; unknown: boolean }) {
  return <section className="work-group"><h3>{title}<span>{unknown ? "—" : items.length}</span></h3>
    {unknown ? <p className="unknown-state">Not available in this snapshot.</p> : !items.length ? <p className="unknown-state">None in captured work.</p> : <ul>{items.slice(0, 5).map((item) => <li key={item.id}><span className={`work-state ${item.state}`}>{item.state}</span>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}<Icon name="arrow" size={12} /></a> : <span className="work-title">{item.title}</span>}<small>#{item.number}</small></li>)}</ul>}
    {items.length > 5 && <p className="unknown-state">Showing 5 of {items.length} captured items.</p>}
  </section>;
}

function PersonDetails({ snapshot, events, person, followedPersonId, onFollow }: { snapshot: OfficeSnapshot; events: ActivityEvent[]; person: Person; followedPersonId: string | null; onFollow: (id: string | null) => void }) {
  const work = snapshot.work;
  const pulls = work.flatMap((item) => item.pulls ?? []);
  const issues = work.flatMap((item) => item.issues ?? []);
  const unknown = !work.some((item) => item.pulls !== null) || (snapshot.source.mode === "github" && !person.github);
  const unknownIssues = !work.some((item) => item.issues !== null) || (snapshot.source.mode === "github" && !person.github);
  const repositories = snapshot.repositories.filter((repository) => person.repositoryIds.includes(repository.id));
  return <>
    <div className="person-detail-top"><Portrait person={person} large /><div><span className="detail-role">{person.role}</span><p>{person.table ? `${person.table[0].toUpperCase()}${person.table.slice(1)} table` : person.homeRoomId === "devrel" ? "DevRel room" : person.homeRoomId === "commons" ? "Open contributors" : person.kind === "preview" ? "Preview project room" : "VOSS Labs"}</p></div></div>
    <div className="detail-actions"><button className={`button ${followedPersonId === person.id ? "following" : "primary"}`} onClick={() => onFollow(followedPersonId === person.id ? null : person.id)}><Icon name="fit" size={15} />{followedPersonId === person.id ? "Stop following" : "Follow person"}</button>{person.github && <a className="button" href={person.github.url} target="_blank" rel="noreferrer"><Icon name="github" size={16} />Profile</a>}</div>
    <div className="detail-facts"><span>Known project team</span><p>{repositories.length ? repositories.map((repository) => repository.name).join(", ") : "No confirmed project assignment."}</p>{person.assignment === "preview" && <SourceBadge preview />}{!person.github && person.kind !== "preview" && <p className="muted">GitHub identity not confirmed.</p>}</div>
    <div className="detail-source"><SourceBadge preview={snapshot.source.mode === "preview"} /><span>{snapshot.source.mode === "preview" ? "Work below is a preview scenario." : "Work below covers fetched repositories."}</span></div>
    <WorkList title="Authored pull requests" items={pulls.filter((item) => item.authorPersonId === person.id)} unknown={unknown} />
    <WorkList title="Assigned issues" items={issues.filter((item) => item.assigneePersonIds.includes(person.id))} unknown={unknownIssues} />
    <WorkList title="Requested reviews" items={pulls.filter((item) => item.requestedReviewerPersonIds.includes(person.id))} unknown={unknown} />
    <section className="work-group"><h3>Recent activity</h3>{events.filter((event) => event.personId === person.id).slice(0, 3).map((event) => <div className="detail-activity" key={event.id}><p>{event.text}</p><div><SourceBadge preview={event.source === "preview"} /><Timestamp value={event.occurredAt} />{event.url && <a href={event.url} target="_blank" rel="noreferrer" aria-label="View activity on GitHub"><Icon name="arrow" size={14} /></a>}</div></div>)}{!events.some((event) => event.personId === person.id) && <p className="unknown-state">No activity in this snapshot.</p>}</section>
  </>;
}

function RepositoryDetails({ snapshot, repository, pending }: { snapshot: OfficeSnapshot; repository: Repository; pending: boolean }) {
  const work = snapshot.work.find((item) => item.repositoryId === repository.id);
  const lead = snapshot.people.find((person) => person.id === repository.leadPersonId);
  const members = snapshot.people.filter((person) => repository.memberPersonIds.includes(person.id));
  return <>
    <p className="repository-description">{repository.description ?? "This repository has no published description."}</p>
    <div className="repository-tags"><span>{repository.language ?? "Language unavailable"}</span><SourceBadge preview={snapshot.source.mode === "preview"} /></div>
    <a className="button primary repository-link" href={repository.url} target="_blank" rel="noreferrer"><Icon name="github" size={17} />Open repository<Icon name="arrow" size={15} /></a>
    <div className="detail-facts"><span>{repository.assignment === "preview" ? "Simulated project team" : "Confirmed project team"}</span>{lead ? <p>{lead.name} · Project lead</p> : <p>Project lead not confirmed.</p>}{members.length ? <p>{members.map((person) => person.name).join(", ")}</p> : <p>Member assignments not confirmed.</p>}</div>
    {pending && <p className="loading-note" role="status">Loading captured project work…</p>}
    {work && work.status !== "ready" && <p className="detail-work-message">{work.message}</p>}
    <WorkList title="Open pull requests" items={(work?.pulls ?? []).filter((item) => item.state === "open")} unknown={!work || work.pulls === null} />
    <WorkList title="Open issues" items={(work?.issues ?? []).filter((item) => item.state === "open")} unknown={!work || work.issues === null} />
  </>;
}

export function Inspector({ snapshot, events, selection, followedPersonId, onFollow, onClose, mobile, pending }: InspectorProps) {
  const person = selection.kind === "person" ? snapshot.people.find((item) => item.id === selection.id) : undefined;
  const repository = selection.kind === "repository" ? snapshot.repositories.find((item) => item.id === selection.id) : undefined;
  const title = person?.name ?? repository?.name ?? "Selection unavailable";
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (!mobile) ref.current?.focus(); }, [selection.id, mobile]);
  const content = <div className="inspector-content">{person ? <PersonDetails snapshot={snapshot} events={events} person={person} followedPersonId={followedPersonId} onFollow={onFollow} /> : repository ? <RepositoryDetails snapshot={snapshot} repository={repository} pending={pending} /> : <p>This selection is not in the current snapshot.</p>}</div>;
  if (mobile) return <Modal title={title} onClose={onClose} className="inspector-modal">{content}</Modal>;
  return <aside className="inspector pixel-panel" aria-labelledby="inspector-title" tabIndex={-1} ref={ref}><div className="modal-heading"><h2 id="inspector-title">{title}</h2><button className="icon-button" aria-label="Close details" onClick={onClose}><Icon name="close" /></button></div>{content}</aside>;
}
