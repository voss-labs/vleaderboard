import type { OfficeSnapshot, WorldView } from "../data/types";

export type Point = { x: number; y: number; hold?: number };
export type Room = { id: string; name: string; x: number; y: number; w: number; h: number; kind: "lead" | "core" | "project" | "commons" | "devrel"; repositoryId?: string };
export type Seat = Point & { personId: string; roomId: string; desk: boolean; facing: number; label: string };
export type Layout = { width: number; height: number; rooms: Room[]; seats: Seat[]; dedicated: boolean };

export function createLayout(snapshot: OfficeSnapshot, view: WorldView, focusedCommonsIds: string[] = []): Layout {
  const dedicated = view.kind === "repository";
  const rooms: Room[] = dedicated ? [{ id: `repo:${view.repositoryId}`, repositoryId: view.repositoryId, name: snapshot.repositories.find(r => r.id === view.repositoryId)?.name ?? "Project room", x: 40, y: 48, w: 740, h: 380, kind: "project" }] : [
    { id: "maintainer", name: "MAINTAINER", x: 40, y: 32, w: 540, h: 140, kind: "lead" },
    { id: "co-maintainer", name: "CO-MAINTAINER", x: 620, y: 32, w: 540, h: 140, kind: "lead" },
    { id: "core", name: "CORE TEAM", x: 40, y: 204, w: 1120, h: 184, kind: "core" },
    ...Array.from({ length: 4 }, (_, i): Room => {
      const id = snapshot.mainRepositoryIds[i];
      return { id: id ? `repo:${id}` : `available:${i}`, repositoryId: id, name: snapshot.repositories.find(r => r.id === id)?.name ?? "AVAILABLE ROOM", x: i % 2 ? 620 : 40, y: 420 + Math.floor(i / 2) * 222, w: 540, h: 190, kind: "project" };
    }),
    { id: "commons", name: "OPEN CONTRIBUTORS", x: 40, y: 864, w: 540, h: 154, kind: "commons" },
    { id: "devrel", name: "DEVREL STUDIO", x: 620, y: 864, w: 540, h: 154, kind: "devrel" },
  ];
  const seats: Seat[] = [];
  for (const room of rooms) {
    const people = snapshot.people.filter(p => p.homeRoomId === room.id);
    if (room.kind === "lead") {
      people.forEach(p => seats.push({ personId: p.id, roomId: room.id, x: room.x + room.w / 2, y: room.y + 74, desk: true, facing: 0, label: p.name }));
    } else if (room.kind === "core") {
      for (const [table, x, width] of [["engineering", 84, 428], ["community", 544, 250], ["research", 824, 250]] as const) {
        const group = people.filter(p => p.table === table);
        group.forEach((p, i) => seats.push({ personId: p.id, roomId: room.id, x: room.x + x + ((i + .5) / Math.max(group.length, 1)) * width, y: room.y + 86, desk: false, facing: 0, label: p.name.split(" ")[0] }));
      }
    } else if (room.kind === "project") {
      const repository = snapshot.repositories.find(r => r.id === room.repositoryId);
      const ids = repository ? [repository.leadPersonId, ...repository.memberPersonIds].filter((id): id is string => !!id) : [];
      const assigned = ids.map(id => snapshot.people.find(p => p.id === id)).filter(p => !!p);
      const occupants = assigned.length ? assigned : people;
      occupants.slice(0, 6).forEach((p, i) => {
        const space = dedicated ? 220 : 166;
        seats.push({ personId: p.id, roomId: room.id, x: room.x + (dedicated ? 148 : 104) + i % 3 * space, y: room.y + (dedicated ? 142 : 73) + Math.floor(i / 3) * (dedicated ? 158 : 80), desk: true, facing: 0, label: i === 0 ? "LEAD" : p.name.split(" ")[0] });
      });
    } else if (room.kind === "devrel") {
      people.slice(0, 2).forEach((p, i) => seats.push({ personId: p.id, roomId: room.id, x: room.x + (i ? 432 : 235), y: room.y + (i ? 94 : 100), desk: false, facing: i ? 2 : 1, label: p.name.split(" ")[0] }));
    } else {
      const visible = people.slice(0, 6);
      let slot = visible.length - 1;
      for (const id of focusedCommonsIds) {
        const person = people.find(p => p.id === id);
        if (!person || visible.some(p => p.id === id)) continue;
        while (slot >= 0 && focusedCommonsIds.includes(visible[slot].id)) slot--;
        if (slot >= 0) visible[slot--] = person;
      }
      visible.forEach((p, i) => seats.push({ personId: p.id, roomId: room.id, x: room.x + 105 + i % 3 * 148, y: room.y + 83 + Math.floor(i / 3) * 48, desk: i < 3, facing: 0, label: p.name.split(" ")[0] }));
    }
  }
  return { width: dedicated ? 820 : 1200, height: dedicated ? 470 : 1050, rooms, seats, dedicated };
}

export function visitRoute(layout: Layout, seat: Seat): Point[] {
  const room = layout.rooms.find(r => r.id === seat.roomId);
  if (!room || room.kind !== "project" || layout.dedicated) return [];
  const door = { x: room.x + room.w / 2, y: room.y + room.h + 16, hold: 2 };
  const outward: Point[] = [seat, { x: seat.x + 75, y: seat.y }, { x: seat.x + 75, y: room.y + room.h - 1 }, { x: door.x, y: room.y + room.h - 1 }, door, { x: 600, y: door.y }, { x: 600, y: 404, hold: 2 }, { x: 600, y: 374 }, { x: 126, y: 374, hold: 30 }, { x: 600, y: 374 }, { x: 600, y: 404 }, { x: 20, y: 404 }, { x: 20, y: 188 }, { x: 310, y: 188, hold: 2 }, { x: 310, y: 164 }, { x: 192, y: 164 }, { x: 192, y: 142, hold: 30 }];
  return [...outward, ...outward.slice(0, -1).reverse().map(p => ({ x: p.x, y: p.y, hold: p.hold === 30 ? 0 : p.hold }))];
}
