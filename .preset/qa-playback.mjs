import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { createPreviewSnapshot } from "../app/data/preview.ts";
import { Camera } from "../app/office/camera.ts";
import { createLayout, visitRoute } from "../app/office/layout.ts";
import * as motion from "../app/office/motion.ts";

class Node {
  children = [];
  x = 0;
  y = 0;
  scale = { x: 1, y: 1, set: value => { this.scale.x = value; this.scale.y = value; } };
  position = { set: (x, y) => { this.x = x; this.y = y; } };
  anchor = { set() {} };
  addChild(...nodes) { this.children.push(...nodes); }
  removeChildren() { return this.children.splice(0); }
  destroy() {}
}

class Graphics extends Node {
  clear() { return this; }
  ellipse() { return this; }
  rect() { return this; }
  roundRect() { return this; }
  poly() { return this; }
  fill() { return this; }
  stroke() { return this; }
}

const frames = new Map();
let nextFrame = 0;
let renderCount = 0;
let artDestroyed = false;
let appDestroyed = false;
const visibility = new Map();
const doc = { hidden: false, addEventListener: (name, fn) => visibility.set(name, fn), removeEventListener: name => visibility.delete(name) };
const canvas = { style: {}, setAttribute() {}, addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) };

class Application {
  stage = new Node();
  screen = { width: 900, height: 600 };
  canvas = canvas;
  renderer = { resize() {} };
  async init() {}
  render() { renderCount += 1; }
  destroy() { appDestroyed = true; }
}

let props = {
  snapshot: createPreviewSnapshot(new Date("2026-10-09T08:00:00Z")),
  selection: null, view: { kind: "office" }, followedPersonId: null,
  paused: false, reducedMotion: false, cameraCommand: null, previewVisitNonce: 0,
  onFollowChange() {}, onSelect() {}, onPreviewEvent() {},
  onVisitActiveChange(active) { props.visitActive = active; },
};
const source = (await readFile(new URL("../app/office/scene.ts", import.meta.url), "utf8")).replace(/^import .*\n/gm, "");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/export /g, "");
const context = vm.createContext({
  ...motion, Application, Container: Node, Graphics, Sprite: Node, Text: Node, Camera,
  createLayout, visitRoute, text() {},
  loadArt: async () => ({ characters: Array(16).fill({}), destroy() { artDestroyed = true; } }),
  buildRooms: () => ({ screens: [], slide: null }),
  window: { devicePixelRatio: 1 }, document: doc,
  ResizeObserver: class { observe() {} disconnect() {} },
  requestAnimationFrame(fn) { const id = ++nextFrame; frames.set(id, fn); return id; },
  cancelAnimationFrame(id) { frames.delete(id); },
});
const createOfficeScene = vm.runInContext(`${compiled}\ncreateOfficeScene;`, context);
const scene = await createOfficeScene({ clientWidth: 900, clientHeight: 600, appendChild() {} }, () => props);
assert.equal(frames.size, 1);
for (const [id, tick] of [...frames]) { frames.delete(id); tick(1000); }
assert.equal(frames.size, 1);
props = { ...props, reducedMotion: true };
scene.update(props);
assert.equal(frames.size, 0);
const frozenRenderCount = renderCount;
props = { ...props, previewVisitNonce: 1, cameraCommand: { kind: "zoom-in", nonce: 1 } };
scene.update(props);
assert.equal(frames.size, 0);
assert.ok(renderCount > frozenRenderCount);
assert.notEqual(props.visitActive, true);
props = { ...props, reducedMotion: false, previewVisitNonce: 2 };
scene.update(props);
assert.equal(props.visitActive, true);
assert.equal(frames.size, 1);
props = { ...props, reducedMotion: true };
scene.update(props);
assert.equal(props.visitActive, false);
assert.equal(frames.size, 0);
props = { ...props, reducedMotion: false, paused: true };
scene.update(props);
assert.equal(frames.size, 0);
props = { ...props, paused: false };
scene.update(props);
assert.equal(frames.size, 1);
doc.hidden = true;
visibility.get("visibilitychange")();
assert.equal(frames.size, 0);
doc.hidden = false;
visibility.get("visibilitychange")();
assert.equal(frames.size, 1);
scene.destroy();
assert.equal(frames.size, 0);
assert.equal(visibility.size, 0);
assert.equal(artDestroyed, true);
assert.equal(appDestroyed, true);
console.log("PASS: actual scene update stops reduced-motion, pause and hidden playback; allows manual rendering; cancels visits and cleans lifecycle.");
