import { Application, Container, Graphics, Sprite, Text } from "pixi.js";
import type { ActivityEvent, SceneProps, Selection } from "../data/types";
import { loadArt, text, type Art } from "./art";
import { Camera, type CameraState } from "./camera";
import { createLayout, visitRoute, type Layout, type Point, type Seat } from "./layout";
import { activeDelta, advanceTraveler, createTraveler, frameDue, hash, nextVisitSeconds, workPose, type Traveler } from "./motion";
import { buildRooms, type RoomArt } from "./rooms";

type Actor = { seat: Seat; sprite: Sprite; label: Container; seed: number; palette: number; nextVisit: number };
type Bubble = { personId: string; node: Container; expires: number };
export type OfficeScene = { update: (props: SceneProps) => void; destroy: () => void };

export async function createOfficeScene(host: HTMLElement, readProps: () => SceneProps, canceled: () => boolean = () => false): Promise<OfficeScene | null> {
  const app = new Application();
  await app.init({ width: Math.max(host.clientWidth, 1), height: Math.max(host.clientHeight, 1), backgroundColor: 0x18231f, antialias: false, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoStart: false, preference: "webgl" });
  if (canceled()) { app.destroy({ removeView: true }, { children: true }); return null; }
  let art: Art;
  try { art = await loadArt(); } catch (error) { app.destroy({ removeView: true }, { children: true }); throw error; }
  if (canceled()) { app.destroy({ removeView: true }, { children: true }); art.destroy(); return null; }
  const canvas = app.canvas;
  canvas.style.cssText = "display:block; width:100%; height:100%; touch-action:none; cursor:grab; image-rendering:pixelated";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  const world = new Container();
  app.stage.addChild(world);
  let props = readProps();
  let layout: Layout;
  let roomArt: RoomArt;
  let actors: Actor[] = [];
  let objects = new Container();
  let overlay = new Container();
  let highlight = new Graphics();
  let monitor = new Graphics();
  let hovered: string | null = null;
  let bubbles: Bubble[] = [];
  let queue: ActivityEvent[] = [];
  const seen = new Set(props.snapshot.activity.map(event => event.id));
  let seconds = 0;
  let nextBubble = 18;
  let visit: { actor: Actor; traveler: Traveler } | null = null;
  let raf = 0;
  let last: number | null = null;
  let destroyed = false;
  let signature = "";
  let cameraNonce = props.cameraCommand?.nonce ?? -1;
  let visitNonce = props.previewVisitNonce;
  let mainCamera: CameraState | null = null;
  let lastView = props.view.kind;
  let lastViewKey = "";
  let focusedCommonsIds: string[] = [];
  const render = () => { if (!destroyed) app.render(); };
  const actorPoint = (actor: Actor): Point => ({ x: actor.sprite.x, y: actor.sprite.y });
  const hit = (point: Point): Selection => {
    const actor = [...actors].reverse().find(a => Math.abs(a.sprite.x - point.x) < 23 && point.y > a.sprite.y - 69 && point.y < a.sprite.y + 14);
    if (actor) return { kind: "person", id: actor.seat.personId };
    const room = layout.rooms.find(r => r.repositoryId && point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y - 12 && point.y <= r.y + r.h);
    return room?.repositoryId ? { kind: "repository", id: room.repositoryId } : null;
  };
  const camera = new Camera(world, canvas, render, () => readProps().onFollowChange(null), point => readProps().onSelect(hit(point)), point => {
    const selection = point ? hit(point) : null;
    const id = selection?.kind === "person" ? selection.id : null;
    if (id === hovered) return;
    hovered = id;
    canvas.style.cursor = selection ? "pointer" : "grab";
    drawSelection();
    render();
  });

  function drawSelection(): void {
    highlight.clear();
    for (const actor of actors) {
      const selected = props.selection?.kind === "person" && props.selection.id === actor.seat.personId;
      const hover = hovered === actor.seat.personId;
      actor.label.visible = selected || hover || actor.seat.roomId.includes("maintainer") || actor.seat.roomId === "core" || actor.seat.roomId === "devrel";
      if (selected || hover) highlight.ellipse(actor.sprite.x, actor.sprite.y - 3, selected ? 25 : 21, 8).stroke({ color: selected ? 0xffa062 : 0xe9e4c9, width: selected ? 3 : 2 });
    }
    if (props.selection?.kind === "repository") {
      const room = layout.rooms.find(r => r.repositoryId === props.selection?.id);
      if (room) highlight.rect(room.x - 4, room.y - 7, room.w + 8, room.h + 12).stroke({ color: 0xff9457, width: 3 });
    }
  }

  function rebuild(): void {
    const priorCamera = camera.state();
    const viewKey = props.view.kind === "office" ? "office" : props.view.repositoryId;
    const background = new Container();
    world.removeChildren().forEach(child => child.destroy({ children: true }));
    objects = new Container();
    objects.sortableChildren = true;
    overlay = new Container();
    highlight = new Graphics();
    monitor = new Graphics();
    layout = createLayout(props.snapshot, props.view, focusedCommonsIds);
    world.addChild(background, objects, monitor, highlight, overlay);
    roomArt = buildRooms(background, objects, art, layout);
    actors = layout.seats.map(seat => {
      const person = props.snapshot.people.find(p => p.id === seat.personId)!;
      const palette = person.palette % 4;
      const sprite = new Sprite(art.characters[palette * 4 + seat.facing]);
      sprite.anchor.set(.5, 1);
      sprite.width = seat.roomId.includes("maintainer") ? 94 : 79;
      sprite.height = seat.roomId.includes("maintainer") ? 94 : 79;
      sprite.position.set(seat.x, seat.y);
      sprite.zIndex = seat.y;
      objects.addChild(sprite);
      const label = new Container();
      const fullName = seat.roomId.includes("maintainer");
      const value = fullName ? person.name : seat.label;
      const width = value.length * (fullName ? 6.7 : 5.2) + 14;
      label.addChild(new Graphics().roundRect(-width / 2, -8, width, 16, 2).fill({ color: 0xefe5ca, alpha: .94 }).stroke({ color: 0x6b6451, width: 1 }));
      text(label, value, 0, 0, fullName ? 11 : 8, 0x323930);
      label.position.set(seat.x, seat.y + (fullName ? 55 : seat.roomId === "core" ? 70 : 35));
      overlay.addChild(label);
      const seed = hash(person.id);
      return { seat, sprite, label, seed, palette, nextVisit: nextVisitSeconds(seed) };
    });
    bubbles = [];
    queue = [];
    if (visit) props.onVisitActiveChange(false);
    visit = null;
    camera.bounds(layout.width, layout.height);
    if (lastView === "office" && props.view.kind === "repository") mainCamera = camera.state();
    if (lastView === "repository" && props.view.kind === "office" && mainCamera) camera.restore(mainCamera);
    else if (lastViewKey === viewKey) camera.restore(priorCamera);
    else camera.fit();
    lastView = props.view.kind;
    lastViewKey = viewKey;
    animateArt();
  }

  function addBubble(event: ActivityEvent): void {
    const actor = actors.find(a => a.seat.personId === event.personId);
    if (!actor || bubbles.some(b => b.personId === event.personId)) return;
    const node = new Container();
    const message = `${event.source === "preview" ? "Simulated · " : ""}${event.text}`.slice(0, 42);
    const width = Math.max(130, message.length * 5.4 + 16);
    node.addChild(new Graphics().roundRect(-width / 2, -30, width, 27, 3).fill(0xf9f1dc).stroke({ color: event.source === "preview" ? 0xdc784c : 0x658b70, width: 2 }).poly([-5, -3, 0, 4, 5, -3]).fill(0xf9f1dc));
    text(node, message, 0, -17, 9, 0x29362d, "normal");
    overlay.addChild(node);
    node.position.set(actor.sprite.x, actor.sprite.y - 73);
    bubbles.push({ personId: event.personId, node, expires: seconds + 6 });
  }

  function previewEvent(actor: Actor, kind: ActivityEvent["kind"], message: string): ActivityEvent {
    return { id: `simulation:${actor.seat.personId}:${kind}:${Math.round(seconds * 1000)}`, personId: actor.seat.personId, repositoryId: props.snapshot.people.find(p => p.id === actor.seat.personId)?.repositoryIds[0] ?? null, kind, text: message, occurredAt: new Date().toISOString(), source: "preview", url: null, fresh: true };
  }

  function startVisit(candidate?: Actor): void {
    if (visit || props.reducedMotion || layout.dedicated) return;
    const actor = candidate ?? actors.find(a => props.snapshot.repositories.some(r => r.name === "vroom" && a.seat.roomId === `repo:${r.id}`)) ?? actors.find(a => a.seat.roomId.startsWith("repo:") && visitRoute(layout, a.seat).length);
    if (!actor) return;
    const traveler = createTraveler(visitRoute(layout, actor.seat));
    if (!traveler) return;
    visit = { actor, traveler };
    props.onVisitActiveChange(true);
    const event = previewEvent(actor, "visit", "Visiting the core team");
    addBubble(event);
    props.onPreviewEvent(event);
  }

  function animateArt(): void {
    monitor.clear();
    for (const [i, screen] of roomArt.screens.entries()) {
      const phase = Math.floor(seconds / 4 + i) % 3;
      for (const dx of [-31, 18]) {
        monitor.rect(screen.x + dx, screen.y - 23, 23, 10).fill(0x243e45);
        for (let line = 0; line < 3; line++) monitor.rect(screen.x + dx + 3, screen.y - 21 + line * 3, 5 + (i + phase + line) % 4 * 3, 1).fill(line === phase ? 0xfb9b65 : 0x79b1a6);
      }
    }
    if (roomArt.slide) {
      const slide = roomArt.slide;
      const frame = Math.floor(seconds / 27) % 3;
      slide.clear().rect(0, 0, 98, 57).fill(0xf2ead3);
      slide.rect(7, 6, 58, 4).fill(0x435d60);
      for (let i = 0; i < 4; i++) {
        if (frame === 0) slide.rect(9 + i * 20, 44 - i * 8, 13, 7 + i * 8).fill(i > 1 ? 0xf47d42 : 0x70a2a5);
        else if (frame === 1) slide.rect(9, 18 + i * 8, 6, 4).fill(0xf47d42).rect(20, 18 + i * 8, 60 - i * 7, 3).fill(0x7a8e8c);
        else slide.circle(17 + i * 21, 43 - i * 7, 4).fill(0xf47d42).rect(13 + i * 21, 47 - i * 7, 24, 2).fill(0x6d9395);
      }
    }
    for (const actor of actors) {
      if (visit?.actor === actor) {
        actor.sprite.position.set(Math.round(visit.traveler.x), Math.round(visit.traveler.y));
        actor.sprite.texture = art.characters[actor.palette * 4 + visit.traveler.direction];
        actor.sprite.rotation = visit.traveler.wait > 0 ? 0 : Math.sin(seconds * 5) * .025;
        actor.label.position.set(actor.sprite.x, actor.sprite.y + 20);
      } else {
        actor.label.position.set(actor.seat.x, actor.seat.y + (actor.seat.roomId.includes("maintainer") ? 55 : actor.seat.roomId === "core" ? 70 : 35));
        const pose = workPose(actor.seed, seconds);
        actor.sprite.y = actor.seat.y + pose.bob;
        const devrel = actor.seat.roomId === "devrel";
        actor.sprite.texture = art.characters[actor.palette * 4 + (devrel && Math.floor(seconds / 61) % 2 ? (actor.seat.facing === 1 ? 0 : 3) : actor.seat.facing)];
        actor.sprite.rotation = pose.typing ? Math.sin(seconds * 5 + actor.seed) * .012 : 0;
      }
      actor.sprite.zIndex = actor.sprite.y;
    }
    for (const bubble of bubbles) {
      const actor = actors.find(a => a.seat.personId === bubble.personId);
      if (actor) bubble.node.position.set(actor.sprite.x, actor.sprite.y - 73);
    }
    drawSelection();
  }

  function tick(now: number): void {
    raf = 0;
    if (destroyed || stopped()) { last = null; return; }
    if (!frameDue(last, now)) { raf = requestAnimationFrame(tick); return; }
    const dt = activeDelta(last, now, false);
    last = now;
    seconds += dt;
    if (visit) {
      visit.traveler = advanceTraveler(visit.traveler, dt);
      if (visit.traveler.done) {
        const actor = visit.actor;
        actor.sprite.position.set(actor.seat.x, actor.seat.y);
        actor.sprite.rotation = 0;
        actor.label.position.set(actor.seat.x, actor.seat.y + 35);
        actor.nextVisit = seconds + nextVisitSeconds(actor.seed + Math.floor(seconds), true);
        visit = null;
        props.onVisitActiveChange(false);
      }
    } else {
      const due = actors.find(a => a.seat.roomId.startsWith("repo:") && seconds >= a.nextVisit);
      if (due) startVisit(due);
    }
    bubbles = bubbles.filter(bubble => { if (bubble.expires > seconds) return true; bubble.node.destroy({ children: true }); return false; });
    if (bubbles.length < 2 && queue.length) addBubble(queue.shift()!);
    if (seconds >= nextBubble && actors.length) {
      const actor = actors[hash(String(Math.floor(seconds))) % actors.length];
      const kinds = ["committed", "planning", "merged", "opened"] as const;
      const kind = kinds[Math.floor(seconds) % kinds.length];
      const event = previewEvent(actor, kind, kind === "opened" ? "Opened a pull request" : kind === "planning" ? "Next plan" : kind === "merged" ? "Merged a preview PR" : "Saved a commit");
      if (bubbles.length < 2) addBubble(event);
      props.onPreviewEvent(event);
      nextBubble = seconds + 35 + actor.seed % 46;
    }
    animateArt();
    const followed = actors.find(actor => actor.seat.personId === props.followedPersonId);
    if (followed) camera.focus(actorPoint(followed));
    else render();
    raf = requestAnimationFrame(tick);
  }

  function stopped(): boolean { return props.paused || props.reducedMotion || document.hidden; }
  function syncPlayback(): void {
    if (stopped()) { cancelAnimationFrame(raf); raf = 0; last = null; }
    else if (!raf) { last = null; raf = requestAnimationFrame(tick); }
    render();
  }
  const visibility = () => syncPlayback();
  document.addEventListener("visibilitychange", visibility);
  const resize = new ResizeObserver(() => {
    if (destroyed) return;
    app.renderer.resize(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1));
    camera.resize(app.screen.width, app.screen.height);
    const actor = actors.find(a => a.seat.personId === props.followedPersonId);
    if (actor) camera.focus(actorPoint(actor));
    render();
  });
  camera.resize(app.screen.width, app.screen.height);
  resize.observe(host);

  const update = (next: SceneProps): void => {
    const wasReduced = props.reducedMotion;
    props = next;
    const personIds = [props.followedPersonId, props.selection?.kind === "person" ? props.selection.id : null];
    for (const id of personIds) {
      if (id && props.snapshot.people.some(p => p.id === id && p.homeRoomId === "commons") && !actors.some(a => a.seat.personId === id)) focusedCommonsIds = [...new Set([id, ...focusedCommonsIds])].slice(0, 2);
    }
    const key = JSON.stringify([props.view, focusedCommonsIds, props.snapshot.mainRepositoryIds, props.snapshot.people.map(p => [p.id, p.homeRoomId]), props.snapshot.repositories.map(r => [r.id, r.leadPersonId, r.memberPersonIds])]);
    if (key !== signature) { signature = key; rebuild(); }
    if (props.reducedMotion && !wasReduced && visit) {
      visit.actor.sprite.position.set(visit.actor.seat.x, visit.actor.seat.y);
      visit = null;
      props.onVisitActiveChange(false);
      animateArt();
    }
    if (props.cameraCommand && props.cameraCommand.nonce !== cameraNonce) {
      cameraNonce = props.cameraCommand.nonce;
      props.onFollowChange(null);
      if (props.cameraCommand.kind === "fit") camera.fit();
      else if (props.cameraCommand.kind === "zoom-in") camera.zoom(1.25);
      else if (props.cameraCommand.kind === "zoom-out") camera.zoom(.8);
      else {
        const actor = actors.find(a => props.selection?.kind === "person" && props.selection.id === a.seat.personId);
        const room = layout.rooms.find(r => props.selection?.kind === "repository" && r.repositoryId === props.selection.id);
        if (actor) camera.focus(actorPoint(actor));
        else if (room) camera.focus({ x: room.x + room.w / 2, y: room.y + room.h / 2 });
      }
    }
    if (props.previewVisitNonce !== visitNonce) { visitNonce = props.previewVisitNonce; startVisit(); }
    for (const event of props.snapshot.activity) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      if (event.fresh && queue.length < 8) queue.push(event);
    }
    const followed = actors.find(a => a.seat.personId === props.followedPersonId);
    if (followed) camera.focus(actorPoint(followed));
    drawSelection();
    syncPlayback();
  };
  update(props);
  return { update, destroy: () => { if (destroyed) return; destroyed = true; cancelAnimationFrame(raf); resize.disconnect(); document.removeEventListener("visibilitychange", visibility); camera.destroy(); app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false }); art.destroy(); } };
}
