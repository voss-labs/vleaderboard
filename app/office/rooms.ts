import { Container, Graphics } from "pixi.js";
import { furniture, plaque, text, tileFloor, type Art } from "./art";
import type { Layout, Room } from "./layout";

export type RoomArt = { screens: { x: number; y: number }[]; slide: Graphics | null };

function shell(parent: Container, room: Room): void {
  const { x, y, w, h } = room;
  const walls = new Graphics();
  walls.rect(x + 5, y + 5, w, h).fill({ color: 0x253331, alpha: .32 });
  parent.addChild(walls);
  tileFloor(parent, x, y + 14, w, h - 14, room.kind === "lead", x + y);
  const wall = new Graphics();
  wall.rect(x - 6, y - 9, w + 12, 28).fill(0x393f3d).rect(x - 2, y - 5, w + 4, 18).fill(0xe1d8bd).rect(x, y + 11, w, 5).fill(0x8f8e78).rect(x, y + 4, w, 3).fill(0xeee5cc);
  wall.rect(x - 6, y + 14, 7, h - 14).fill(0x4e5853).rect(x - 2, y + 18, 3, h - 20).fill(0xe4dcc4);
  wall.rect(x + w - 1, y + 14, 7, h - 14).fill(0x4e5853).rect(x + w - 1, y + 18, 3, h - 20).fill(0xe4dcc4);
  const gap = 38;
  wall.rect(x - 6, y + h, w / 2 - gap / 2 + 6, 7).fill(0x39433f).rect(x + w / 2 + gap / 2, y + h, w / 2 - gap / 2 + 6, 7).fill(0x39433f);
  wall.rect(x - 2, y + h, w / 2 - gap / 2 + 2, 2).fill(0xa6ac95).rect(x + w / 2 + gap / 2, y + h, w / 2 - gap / 2 + 2, 2).fill(0xa6ac95);
  wall.rect(x + w / 2 - gap / 2, y + h - 2, gap, 7).fill(0xb29058).rect(x + w / 2 - gap / 2 + 3, y + h, gap - 6, 2).fill(0xd6ba87);
  parent.addChild(wall);
  plaque(parent, room.name.slice(0, 25), x + w / 2, y + 3, Math.min(310, Math.max(156, room.name.length * 10 + 28)));
}

function project(parent: Container, art: Art, room: Room, layout: Layout, screens: RoomArt["screens"]): void {
  const { x, y, w, h } = room;
  const dedicated = layout.dedicated;
  furniture(parent, art, 2, x + 32, y + 82, 55, 74);
  furniture(parent, art, 3, x + w - 28, y + h - 7, 58, 68);
  furniture(parent, art, 7, x + w - 48, y + 62, 56, 55);
  for (let i = 0; i < 6; i++) {
    const sx = x + (dedicated ? 148 : 104) + i % 3 * (dedicated ? 220 : 166);
    const sy = y + (dedicated ? 142 : 73) + Math.floor(i / 3) * (dedicated ? 158 : 80);
    furniture(parent, art, 5, sx, sy + 15, 46, 52).zIndex = sy - 4;
    furniture(parent, art, 0, sx, sy + 32, dedicated ? 162 : 133, dedicated ? 118 : 93);
    screens.push({ x: sx, y: sy });
    const occupied = layout.seats.some(seat => seat.roomId === room.id && seat.x === sx && seat.y === sy);
    if (!occupied) text(parent, i === 0 ? "LEAD · AVAILABLE" : "AVAILABLE", sx, sy + 35, 7, 0x53605d);
  }
}

export function buildRooms(background: Container, objects: Container, art: Art, layout: Layout): RoomArt {
  const screens: RoomArt["screens"] = [];
  let slide: Graphics | null = null;
  const outline = new Graphics().roundRect(7, 7, layout.width - 14, layout.height - 14, 6).fill(0x485852).stroke({ color: 0x73827a, width: 3 });
  background.addChild(outline);
  tileFloor(background, 15, 15, layout.width - 30, layout.height - 30, false, 37);
  for (const room of layout.rooms) {
    shell(background, room);
    const { x, y, w, h } = room;
    if (room.kind === "lead") {
      background.addChild(new Graphics().rect(x + 155, y + 62, 230, 68).fill(0xb76643).stroke({ color: 0xdfa168, width: 3 }).rect(x + 162, y + 68, 216, 56).stroke({ color: 0xe2ba86, width: 1 }));
      furniture(objects, art, 13, x + 81, y + 76, 70, 78).zIndex = y + 25;
      furniture(objects, art, 2, x + w - 58, y + 114, 78, 91);
      furniture(objects, art, 3, x + 38, y + 130, 61, 77);
      furniture(objects, art, 3, x + w - 122, y + 87, 41, 49);
      furniture(objects, art, 5, x + w / 2, y + 90, 53, 57).zIndex = y + 68;
      furniture(objects, art, 0, x + w / 2, y + 114, 192, 116);
      furniture(objects, art, 7, x + 137, y + 62, 53, 49).zIndex = y + 30;
      screens.push({ x: x + w / 2, y: y + 80 });
    } else if (room.kind === "core") {
      for (const [name, xx, ww] of [["ENGINEERING", 84, 428], ["COMMUNITY", 544, 250], ["RESEARCH", 824, 250]] as const) {
        text(background, name, x + xx + ww / 2, y + 37, 11, 0x4c6159);
        furniture(objects, art, 1, x + xx + ww / 2, y + 136, ww - 30, 126);
        for (let i = 0; i < (name === "ENGINEERING" ? 4 : 2); i++) furniture(objects, art, 5, x + xx + (i + .5) * ww / (name === "ENGINEERING" ? 4 : 2), y + 151, 36, 44);
      }
      furniture(objects, art, 6, x + 32, y + 148, 37, 57);
      furniture(objects, art, 3, x + w - 26, y + 151, 49, 60);
    } else if (room.kind === "project") project(objects, art, room, layout, screens);
    else if (room.kind === "commons") {
      furniture(objects, art, 4, x + 60, y + 102, 92, 79);
      furniture(objects, art, 14, x + w - 62, y + 62, 81, 66);
      furniture(objects, art, 11, x + 75, y + 144, 82, 49);
      furniture(objects, art, 15, x + w - 71, y + 132, 68, 44);
      furniture(objects, art, 3, x + 22, y + h - 8, 42, 57);
      for (let i = 0; i < 3; i++) {
        const sx = x + 105 + i * 148;
        furniture(objects, art, 0, sx, y + 117, 123, 85);
        screens.push({ x: sx, y: y + 85 });
      }
    } else {
      furniture(objects, art, 8, x + 110, y + 123, 156, 131);
      furniture(objects, art, 9, x + 241, y + 139, 75, 90);
      furniture(objects, art, 1, x + 357, y + 147, 196, 94);
      furniture(objects, art, 7, x + w - 112, y + 90, 144, 118).zIndex = y + 50;
      furniture(objects, art, 3, x + w - 22, y + h - 6, 53, 64);
      slide = new Graphics();
      slide.position.set(x + 61, y + 39);
      slide.zIndex = y + 124;
      objects.addChild(slide);
      text(background, "SHARE · PLAN · BUILD", x + 368, y + 133, 9, 0x557069);
    }
  }
  if (!layout.dedicated) {
    for (const y of [188, 404, 626, 848]) background.addChild(new Graphics().rect(582, y - 6, 36, 12).fill(0x83958d).rect(592, y - 4, 16, 8).fill(0xc8b88d));
    for (const y of [190, 406, 628, 850]) { furniture(objects, art, 3, 1180, y + 11, 34, 44); }
    text(background, "VOSS LABS", 1114, 1034, 10, 0xd8dbc4);
  }
  return { screens, slide };
}
