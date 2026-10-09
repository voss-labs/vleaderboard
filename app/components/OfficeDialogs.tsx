import { useState } from "react";
import type { ActivityEvent, OfficeSnapshot, Selection } from "../data/types";
import { Icon, Modal, Portrait, SourceBadge, Timestamp } from "./ui";

type DialogProps = { snapshot: OfficeSnapshot; onClose: () => void; onSelect: (selection: Selection) => void };

export function RoomDirectory({ snapshot, onClose, onSelect }: DialogProps) {
  const [query, setQuery] = useState("");
  const rooms = snapshot.repositories.filter((repository) => `${repository.name} ${repository.description ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <Modal title="All rooms" onClose={onClose} className="directory-modal">
    <p className="modal-intro">Find a project. Step into its room.</p>
    <label className="search-field"><Icon name="search" /><span className="sr-only">Search repository rooms</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" type="search" /></label>
    <div className="directory-summary"><span>{rooms.length} rooms</span><span>{snapshot.catalogComplete ? "Complete catalog" : "Partial catalog"}</span></div>
    <div className="directory-list">
      {rooms.map((repository) => <button key={repository.id} className="directory-row" onClick={() => { onSelect({ kind: "repository", id: repository.id }); onClose(); }}>
        <span className="directory-room-icon"><Icon name="grid" size={22} /></span><span><strong>{repository.name}</strong><small>{repository.description ?? "Description not published."}</small><span className="directory-meta">{repository.language ?? "Language unavailable"}{repository.archived ? " · Archived" : ""}{repository.fork && <span className="directory-badge">Fork</span>}</span></span><span className="room-location">{snapshot.mainRepositoryIds.includes(repository.id) ? "Main floor" : "Visit room"}<Icon name="chevron-right" size={14} /></span>
      </button>)}
      {!rooms.length && <div className="empty-state"><strong>No matching rooms</strong><p>Try a different project name.</p></div>}
    </div>
  </Modal>;
}

export function PeopleDirectory({ snapshot, onClose, onSelect }: DialogProps) {
  const [query, setQuery] = useState("");
  const people = snapshot.people.filter((person) => `${person.name} ${person.role}`.toLowerCase().includes(query.toLowerCase()));
  return <Modal title="People in the office" onClose={onClose} className="people-modal">
    <p className="modal-intro">Meet the team and explore their captured work.</p>
    <label className="search-field"><Icon name="search" /><span className="sr-only">Search people</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names or roles" type="search" /></label>
    <div className="people-list">
      {people.map((person) => <button key={person.id} className="person-row" onClick={() => { onSelect({ kind: "person", id: person.id }); onClose(); }}><Portrait person={person} /><span><strong>{person.name}</strong><small>{person.role}</small></span>{person.kind === "preview" && <SourceBadge preview />}<Icon name="chevron-right" size={15} /></button>)}
      {!people.length && <div className="empty-state"><strong>No matching people</strong><p>Try a different name or role.</p></div>}
    </div>
  </Modal>;
}

export function ActivityLog({ snapshot, events, onClose, onSelect }: DialogProps & { events: ActivityEvent[] }) {
  return <Modal title="Office activity" onClose={onClose} className="activity-modal">
    <p className="modal-intro">Captured GitHub work and clearly labeled office stories.</p>
    <div className="activity-list">
      {events.map((event) => {
        const person = snapshot.people.find((item) => item.id === event.personId);
        const repository = snapshot.repositories.find((item) => item.id === event.repositoryId);
        return <article className="activity-row" key={event.id}>
          {person && <Portrait person={person} />}<div><div className="activity-person">{person ? <button onClick={() => { onSelect({ kind: "person", id: person.id }); onClose(); }}>{person.name}</button> : <strong>Office story</strong>}<SourceBadge preview={event.source === "preview"} /></div><p>{event.text}</p><span className="activity-meta"><Timestamp value={event.occurredAt} />{repository && <span>{repository.name}</span>}{event.url && <a href={event.url} target="_blank" rel="noreferrer">View on GitHub <Icon name="arrow" size={12} /></a>}</span></div>
        </article>;
      })}
      {!events.length && <div className="empty-state"><strong>No captured activity</strong><p>Refresh the snapshot to check for public GitHub work.</p></div>}
    </div>
  </Modal>;
}
