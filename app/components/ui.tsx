import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { Person } from "../data/types";

export function Icon({ name, size = 18 }: { name: "close" | "chevron-left" | "chevron-right" | "arrow" | "search" | "grid" | "fit" | "plus" | "minus" | "pause" | "play" | "people" | "activity" | "github"; size?: number }) {
  const paths = {
    close: "M6 6l12 12M18 6L6 18",
    "chevron-left": "m14 5-7 7 7 7",
    "chevron-right": "m10 5 7 7-7 7",
    arrow: "M7 17 17 7M7 7h10v10",
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    fit: "M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M8 8h8v8H8z",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
    pause: "M8 5v14M16 5v14",
    play: "m8 4 12 8-12 8z",
    people: "M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-3a6 6 0 0 1 12 0v3M16 4a4 4 0 0 1 0 8M18 15a5 5 0 0 1 4 5v1",
    activity: "M2 12h5l3-8 4 16 3-8h5",
    github: "M9 19c-4 1-4-2-6-2M15 22v-4a3 3 0 0 0-1-3c3 0 6-1 6-5a5 5 0 0 0-1-3 5 5 0 0 0 0-4s-1 0-4 2a14 14 0 0 0-7 0C5 3 4 3 4 3a5 5 0 0 0 0 4 5 5 0 0 0-1 3c0 4 3 5 6 5a3 3 0 0 0-1 3v4",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export function Portrait({ person, large = false }: { person: Person; large?: boolean }) {
  return <span className={`portrait${large ? " portrait-large" : ""}`} style={{ "--portrait-row": `${(person.palette % 4) * 100 / 3}%` } as CSSProperties} aria-hidden="true" />;
}

export function Modal({ title, children, onClose, className = "" }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`modal pixel-panel ${className}`} onCancel={(event) => { event.preventDefault(); closeRef.current(); }} onClick={(event) => { if (event.target === event.currentTarget) closeRef.current(); }} aria-labelledby="modal-title">
    <div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label={`Close ${title}`}><Icon name="close" /></button></div>
    {children}
  </dialog>;
}

export function SourceBadge({ preview }: { preview: boolean }) {
  return <span className={`source-badge${preview ? " simulated" : ""}`}>{preview ? "Simulated" : "GitHub"}</span>;
}

export function timestamp(value: string | null) {
  if (!value) return "Not captured";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
  return `${day} ${date.toISOString().slice(11, 16)} UTC`;
}

export function Timestamp({ value }: { value: string | null }) {
  if (!value || !Number.isFinite(Date.parse(value))) return <span>{timestamp(value)}</span>;
  const full = new Date(value).toISOString().replace("T", " ").replace("Z", " UTC");
  return <time dateTime={value} title={full} aria-label={full}>{timestamp(value)}</time>;
}
