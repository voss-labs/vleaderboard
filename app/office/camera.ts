import type { Container } from "pixi.js";
import type { Point } from "./layout";

export type CameraState = { x: number; y: number; scale: number };

export class Camera {
  private width = 1;
  private height = 1;
  private worldWidth = 1;
  private worldHeight = 1;
  private fitScale = 1;
  private pointers = new Map<number, Point>();
  private origin: Point | null = null;
  private moved = false;
  private pinch = 0;
  private dispose: (() => void)[] = [];

  constructor(private world: Container, private canvas: HTMLCanvasElement, private render: () => void, private manual: () => void, private select: (point: Point) => void, private hover: (point: Point | null) => void) {
    const point = (event: PointerEvent | WheelEvent): Point => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      this.pointers.set(event.pointerId, point(event));
      this.origin = point(event);
      this.moved = false;
      canvas.setPointerCapture(event.pointerId);
      this.pinch = this.distance();
      canvas.style.cursor = "grabbing";
    };
    const move = (event: PointerEvent) => {
      const current = point(event);
      const previous = this.pointers.get(event.pointerId);
      if (!previous) { this.hover(this.toWorld(current)); return; }
      this.pointers.set(event.pointerId, current);
      if (this.origin && Math.hypot(current.x - this.origin.x, current.y - this.origin.y) > 5) this.moved = true;
      if (this.pointers.size === 2) {
        this.manual();
        const distance = this.distance();
        if (this.pinch) this.zoom(distance / this.pinch, this.midpoint());
        this.pinch = distance;
        this.moved = true;
      } else {
        if (this.moved) this.manual();
        this.world.x += current.x - previous.x;
        this.world.y += current.y - previous.y;
        this.clamp();
        this.render();
      }
    };
    const up = (event: PointerEvent) => {
      if (!this.pointers.has(event.pointerId)) return;
      if (!this.moved && this.pointers.size === 1 && event.type === "pointerup") this.select(this.toWorld(point(event)));
      this.pointers.delete(event.pointerId);
      this.pinch = 0;
      canvas.style.cursor = "grab";
    };
    const wheel = (event: WheelEvent) => { event.preventDefault(); this.manual(); this.zoom(Math.exp(-event.deltaY * .0015), point(event)); };
    const leave = () => { if (!this.pointers.size) this.hover(null); };
    const listeners: [string, EventListener][] = [["pointerdown", down as EventListener], ["pointermove", move as EventListener], ["pointerup", up as EventListener], ["pointercancel", up as EventListener], ["pointerleave", leave], ["wheel", wheel as EventListener]];
    listeners.forEach(([name, listener]) => { canvas.addEventListener(name, listener, { passive: false }); this.dispose.push(() => canvas.removeEventListener(name, listener)); });
  }

  private distance(): number { const points = [...this.pointers.values()]; return points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0; }
  private midpoint(): Point { const points = [...this.pointers.values()]; return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }; }
  toWorld(point: Point): Point { return { x: (point.x - this.world.x) / this.world.scale.x, y: (point.y - this.world.y) / this.world.scale.y }; }
  state(): CameraState { return { x: this.world.x, y: this.world.y, scale: this.world.scale.x }; }
  restore(state: CameraState): void { this.world.position.set(state.x, state.y); this.world.scale.set(state.scale); this.clamp(); this.render(); }
  bounds(width: number, height: number): void { this.worldWidth = width; this.worldHeight = height; this.fitScale = Math.min((this.width - 18) / width, (this.height - 18) / height); }
  resize(width: number, height: number): void {
    const center = this.toWorld({ x: this.width / 2, y: this.height / 2 });
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    this.bounds(this.worldWidth, this.worldHeight);
    this.focus(center);
  }
  fit(): void {
    this.world.scale.set(this.fitScale);
    this.world.position.set((this.width - this.worldWidth * this.fitScale) / 2, (this.height - this.worldHeight * this.fitScale) / 2);
    this.render();
  }
  focus(point: Point): void { this.world.position.set(this.width / 2 - point.x * this.world.scale.x, this.height / 2 - point.y * this.world.scale.y); this.clamp(); this.render(); }
  zoom(factor: number, origin: Point = { x: this.width / 2, y: this.height / 2 }): void {
    const before = this.toWorld(origin);
    const scale = Math.max(this.fitScale * .65, Math.min(this.fitScale * 3, this.world.scale.x * factor));
    this.world.scale.set(scale);
    this.world.position.set(origin.x - before.x * scale, origin.y - before.y * scale);
    this.clamp();
    this.render();
  }
  private clamp(): void {
    const margin = 60;
    const ww = this.worldWidth * this.world.scale.x;
    const hh = this.worldHeight * this.world.scale.x;
    this.world.x = Math.min(this.width - margin, Math.max(margin - ww, this.world.x));
    this.world.y = Math.min(this.height - margin, Math.max(margin - hh, this.world.y));
  }
  destroy(): void { this.dispose.forEach(fn => fn()); this.pointers.clear(); }
}
