import assert from "node:assert/strict";
import test from "node:test";
import { createPreviewSnapshot } from "../app/data/preview.ts";
import { createLayout, visitRoute } from "../app/office/layout.ts";
import { activeDelta, advanceTraveler, createTraveler, frameDue, hash, nextVisitSeconds, scheduledVisit, workPose } from "../app/office/motion.ts";

test("main office keeps confirmed hierarchy and six project stations", () => {
  const snapshot = createPreviewSnapshot(new Date("2026-10-09T08:00:00Z"));
  const layout = createLayout(snapshot, { kind: "office" });
  assert.equal(layout.rooms.filter(room => room.kind === "project").length, 4);
  assert.equal(layout.seats.filter(seat => seat.roomId.startsWith("repo:")).length, 24);
  assert.equal(layout.seats.filter(seat => seat.roomId === "core").length, 8);
  assert.equal(layout.seats.filter(seat => seat.roomId === "devrel").length, 2);
  assert.ok(layout.rooms.find(room => room.id === "commons")!.x < layout.rooms.find(room => room.id === "devrel")!.x);
  assert.ok(layout.width / layout.height > 1);
});

test("visit routes use room doors and orthogonal corridor waypoints", () => {
  const layout = createLayout(createPreviewSnapshot(new Date()), { kind: "office" });
  for (const seat of layout.seats.filter(seat => seat.roomId.startsWith("repo:"))) {
    const route = visitRoute(layout, seat);
    const room = layout.rooms.find(room => room.id === seat.roomId)!;
    assert.deepEqual({ x: route.at(-1)!.x, y: route.at(-1)!.y }, { x: seat.x, y: seat.y });
    assert.ok(route.some(point => point.x === room.x + room.w / 2 && point.y === room.y + room.h + 16));
    assert.ok(route.some(point => point.x === 600 && point.y === 404));
    assert.ok(route.some(point => point.x === 310 && point.y === 188));
    assert.equal(route.filter(point => point.hold === 30).length, 2);
    route.slice(1).forEach((point, i) => assert.ok(point.x === route[i].x || point.y === route[i].y));
  }
});

test("overflow commons people get a visible seat for inspection and follow", () => {
  const snapshot = createPreviewSnapshot(new Date());
  const people = Array.from({ length: 12 }, (_, i) => ({ ...snapshot.people[0], id: `github:${i}`, name: `Contributor ${i}`, homeRoomId: "commons", repositoryIds: [] }));
  snapshot.people.push(...people);
  const normal = createLayout(snapshot, { kind: "office" });
  const focused = createLayout(snapshot, { kind: "office" }, ["github:11", "github:10"]);
  const seats = focused.seats.filter(seat => seat.roomId === "commons");
  assert.equal(seats.length, 6);
  assert.ok(seats.some(seat => seat.personId === "github:11"));
  assert.ok(seats.some(seat => seat.personId === "github:10"));
  assert.deepEqual(seats.slice(0, 4), normal.seats.filter(seat => seat.roomId === "commons").slice(0, 4));
  assert.deepEqual(createLayout(snapshot, { kind: "office" }, ["github:0"]).seats, normal.seats);
});

test("travel advances slowly and obeys stop durations", () => {
  const initial = createTraveler([{ x: 0, y: 0 }, { x: 19, y: 0, hold: 2 }, { x: 19, y: 19 }])!;
  const arrived = advanceTraveler(initial, 1);
  assert.equal(arrived.x, 19);
  assert.equal(arrived.y, 0);
  assert.equal(arrived.wait, 2);
  const stopped = advanceTraveler(arrived, 1);
  assert.equal(stopped.y, 0);
  assert.equal(stopped.wait, 1);
  const resumed = advanceTraveler(advanceTraveler(stopped, 1), .5);
  assert.equal(resumed.y, 9.5);
  assert.equal(initial.x, 0);
  assert.equal(createTraveler([]), null);
});

test("hidden and paused frames discard wall time without catchup", () => {
  assert.equal(activeDelta(100, 7_200_100, true), 0);
  assert.equal(activeDelta(null, 7_200_100, false), 0);
  assert.equal(activeDelta(100, 7_200_100, false), .05);
  assert.equal(activeDelta(200, 100, false), 0);
});

test("ambient rendering caps at thirty frames per second", () => {
  assert.equal(frameDue(null, 100), true);
  assert.equal(frameDue(100, 108), false);
  assert.equal(frameDue(100, 132), false);
  assert.equal(frameDue(100, 134), true);
  assert.equal(frameDue(100, 1000), true);
});

test("seeded work varies and visits keep long quiet intervals", () => {
  const seed = hash("preview:vroom:1");
  assert.equal(seed, hash("preview:vroom:1"));
  assert.ok(nextVisitSeconds(seed) >= 45 * 60 && nextVisitSeconds(seed) <= 120 * 60);
  assert.ok(nextVisitSeconds(seed, true) >= 90 * 60 && nextVisitSeconds(seed, true) <= 180 * 60);
  const poses = Array.from({ length: 40 }, (_, seconds) => workPose(seed, seconds));
  assert.ok(poses.some(pose => pose.typing));
  assert.ok(poses.some(pose => !pose.typing));
});

test("rebuilding after a completed visit retains the repeat deadline", () => {
  const seed = hash("preview:vroom:1");
  const initial = scheduledVisit(seed, 0);
  const completedAt = initial + 300;
  const repeat = scheduledVisit(seed, completedAt, null, true);
  const rebuiltAt = completedAt + 60;
  const rebuilt = scheduledVisit(seed, rebuiltAt, repeat);
  assert.equal(rebuilt, repeat);
  assert.ok(rebuilt > rebuiltAt);
  assert.ok(rebuilt - completedAt >= 90 * 60);
  assert.ok(rebuilt - completedAt <= 180 * 60);
  assert.equal(scheduledVisit(seed, rebuiltAt) - rebuiltAt, nextVisitSeconds(seed));
});
