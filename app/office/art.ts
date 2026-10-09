import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";

export type Art = { characters: Texture[]; furniture: Texture[]; destroy: () => void };

export async function loadArt(): Promise<Art> {
  const sheets = await Promise.all([Assets.load<Texture>("/office/characters.png"), Assets.load<Texture>("/office/furniture.png")]);
  const frames = sheets.map(sheet => {
    sheet.source.scaleMode = "nearest";
    return Array.from({ length: 16 }, (_, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = Math.floor(col * sheet.width / 4);
      const y = Math.floor(row * sheet.height / 4);
      return new Texture({ source: sheet.source, frame: new Rectangle(x, y, Math.floor((col + 1) * sheet.width / 4) - x, Math.floor((row + 1) * sheet.height / 4) - y) });
    });
  });
  return { characters: frames[0], furniture: frames[1], destroy: () => frames.flat().forEach(frame => frame.destroy(false)) };
}

export function furniture(parent: Container, art: Art, frame: number, x: number, y: number, width: number, height = width): Sprite {
  const sprite = new Sprite(art.furniture[frame]);
  sprite.anchor.set(.5, 1);
  sprite.position.set(Math.round(x), Math.round(y));
  sprite.width = width;
  sprite.height = height;
  sprite.zIndex = y;
  parent.addChild(sprite);
  return sprite;
}

export function text(parent: Container, value: string, x: number, y: number, size = 14, color = 0x26333b, weight: "normal" | "bold" = "bold"): Text {
  const label = new Text({ text: value, style: { fontFamily: "Geist Mono, monospace", fontSize: size, fontWeight: weight, fill: color, letterSpacing: 1 } });
  label.anchor.set(.5, .5);
  label.position.set(x, y);
  parent.addChild(label);
  return label;
}

export function plaque(parent: Container, value: string, x: number, y: number, width = 180): void {
  const shape = new Graphics().rect(x - width / 2 + 3, y - 13 + 4, width, 26).fill(0x394148).rect(x - width / 2, y - 13, width, 26).fill(0xfb7a3c).stroke({ color: 0x463428, width: 2 });
  shape.rect(x - width / 2 + 3, y - 10, width - 6, 2).fill(0xffb879);
  parent.addChild(shape);
  text(parent, value, x, y, 14, 0x281f1c);
}

export function tileFloor(parent: Container, x: number, y: number, w: number, h: number, warm: boolean, seed: number): void {
  const floor = new Graphics();
  const palette = warm ? [0xd5c6aa, 0xdacdb6, 0xd0c2ab, 0xd9ccb3] : [0x9aaca8, 0xa6b7b0, 0x9caeaa, 0xa7b5af];
  const size = 24;
  for (let row = 0; row < Math.ceil(h / size); row++) {
    for (let col = 0; col < Math.ceil(w / size); col++) {
      const xx = x + col * size;
      const yy = y + row * size;
      const ww = Math.min(size, x + w - xx);
      const hh = Math.min(size, y + h - yy);
      floor.rect(xx, yy, ww, hh).fill(palette[(row * 13 + col * 7 + seed) % 4]);
      floor.rect(xx, yy, ww, 1).fill({ color: 0xe5e1cd, alpha: .28 });
      floor.rect(xx, yy, 1, hh).fill({ color: 0x546e68, alpha: .24 });
      if ((row * 7 + col + seed) % 5 === 0 && ww > 10 && hh > 10) floor.rect(xx + 5, yy + 8, 5, 1).fill({ color: 0x637a70, alpha: .12 });
    }
  }
  parent.addChild(floor);
}
