import { useEffect, useRef, useState } from "react";
import type { SceneProps } from "../data/types";
import type { OfficeScene } from "./scene";

export function OfficeWorld(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const instance = useRef<OfficeScene | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  latest.current = props;

  useEffect(() => {
    let canceled = false;
    let scene: OfficeScene | null = null;
    const element = host.current;
    if (!element) return;
    void import("./scene").then(module => canceled ? null : module.createOfficeScene(element, () => latest.current, () => canceled)).then(created => {
      if (!created) return;
      scene = created;
      if (canceled) { created.destroy(); return; }
      instance.current = created;
      created.update(latest.current);
      setState("ready");
      latest.current.onReady();
    }).catch(() => {
      if (canceled) return;
      setState("error");
      latest.current.onError("The office renderer could not start. People and project details remain available in the panels.");
    });
    return () => { canceled = true; instance.current = null; scene?.destroy(); };
  }, []);

  useEffect(() => { instance.current?.update(props); }, [props]);

  return <div ref={host} className="office-canvas" style={{ width: "100%", height: "100%", position: "relative", minHeight: 280, overflow: "hidden" }} aria-label="Interactive pixel office. Use the people and project panels for keyboard navigation.">
    {state !== "ready" && <div className="office-renderer-status" role="status" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#c7cfc8", fontSize: 13 }}>{state === "loading" ? "Opening the office…" : "Office preview unavailable"}</div>}
  </div>;
}
