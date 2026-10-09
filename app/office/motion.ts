import type { Point } from "./layout";

export type Traveler = { route: Point[]; index: number; x: number; y: number; wait: number; done: boolean; direction: number };

export function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

export function nextVisitSeconds(seed: number, returning = false): number {
  return (returning ? 90 : 45) * 60 + (seed % ((returning ? 90 : 75) * 60));
}

export function createTraveler(route: Point[]): Traveler | null {
  if (route.length < 2) return null;
  return { route, index: 1, x: route[0].x, y: route[0].y, wait: 0, done: false, direction: 0 };
}

export function advanceTraveler(traveler: Traveler, seconds: number, speed = 19): Traveler {
  if (traveler.done || seconds <= 0) return traveler;
  const next = { ...traveler };
  let remaining = Math.min(seconds, 1);
  while (remaining > 0 && !next.done) {
    if (next.wait > 0) {
      const used = Math.min(remaining, next.wait);
      next.wait -= used;
      remaining -= used;
      continue;
    }
    const target = next.route[next.index];
    const dx = target.x - next.x;
    const dy = target.y - next.y;
    const distance = Math.hypot(dx, dy);
    const available = remaining * speed;
    next.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 0 : 2);
    if (distance > available) {
      next.x += dx / distance * available;
      next.y += dy / distance * available;
      remaining = 0;
    } else {
      next.x = target.x;
      next.y = target.y;
      remaining -= distance / speed;
      next.wait = target.hold ?? 0;
      next.index += 1;
      next.done = next.index >= next.route.length;
    }
  }
  return next;
}

export function workPose(seed: number, seconds: number): { typing: boolean; bob: number; frame: number } {
  const cycle = 11 + seed % 14;
  const phase = (seconds + seed % cycle) % cycle;
  const typing = phase < 2 + seed % 4;
  return { typing, bob: typing ? Math.round(Math.sin(seconds * 8 + seed) * 1.1) : 0, frame: Math.floor(seconds / 3 + seed) % 3 };
}

export function activeDelta(last: number | null, now: number, stopped: boolean): number {
  return stopped || last === null ? 0 : Math.max(0, Math.min((now - last) / 1000, .05));
}

export function frameDue(last: number | null, now: number): boolean {
  return last === null || now - last >= 1000 / 30;
}
