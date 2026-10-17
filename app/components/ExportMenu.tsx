import { useEffect, useRef, useState } from "react";
import { exportFileName, leaderboardMarkdown, leaderboardPrintDocument, type LeaderboardExport } from "../data/leaderboard-export";

type Props = {
  disabled: boolean;
  periodLabel: string;
  to: string;
  build: () => LeaderboardExport;
};

function download(contents: string, type: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const settle = (promise: Promise<unknown>, timeout: number) => Promise.race([promise.catch(() => undefined), new Promise((resolve) => setTimeout(resolve, timeout))]);

async function printDocument(markup: string, title: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: "794px", height: "1123px", border: "0" });
  const loaded = new Promise((resolve) => frame.addEventListener("load", resolve, { once: true }));
  frame.srcdoc = markup;
  document.body.appendChild(frame);
  await loaded;
  const view = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!view || !doc) { frame.remove(); throw new Error("The PDF view could not be prepared."); }
  doc.title = title;
  const images = [...doc.images].filter((image) => !image.complete)
    .map((image) => new Promise((resolve) => { image.onload = image.onerror = resolve; }));
  await settle(Promise.all([doc.fonts.ready, ...images]), 5000);
  view.addEventListener("afterprint", () => setTimeout(() => frame.remove(), 0), { once: true });
  setTimeout(() => frame.remove(), 120000);
  view.focus();
  view.print();
}

export function ExportMenu({ disabled, periodLabel, to, build }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const exportMarkdown = () => {
    setOpen(false);
    download(leaderboardMarkdown(build()), "text/markdown;charset=utf-8", exportFileName(periodLabel, to, "md"));
    setStatus("Markdown downloaded.");
  };
  const exportPdf = async () => {
    setOpen(false);
    setStatus("Preparing PDF…");
    try {
      await printDocument(leaderboardPrintDocument(build()), exportFileName(periodLabel, to, "pdf").replace(/\.pdf$/, ""));
      setStatus("Choose “Save as PDF” in the print dialog.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "The PDF could not be prepared.");
    }
  };

  return <div className="export-menu" ref={ref}>
    <button className="export-trigger" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen((value) => !value)}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 17v4h16v-4" /></svg>
      Export
    </button>
    {open && <div className="export-options" role="menu" aria-label="Export leaderboard">
      <button role="menuitem" onClick={exportMarkdown}><strong>Markdown</strong><span>.md table for READMEs and docs</span></button>
      <button role="menuitem" onClick={() => void exportPdf()}><strong>PDF</strong><span>Styled report with activity calendars</span></button>
      <p className="export-note">Contributors with 0 changed lines are left out.</p>
    </div>}
    <span className="sr-only" role="status">{status}</span>
  </div>;
}
