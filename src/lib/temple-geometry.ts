export type Point = { x: number; y: number };

export interface SerpentSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  front: boolean;
}

export interface SerpentOptions {
  cx: number;
  top: number;
  bottom: number;
  turns: number;
  amplitude: number;
  segments: number;
}

export const ROD: SerpentOptions = { cx: 60, top: 58, bottom: 300, turns: 3.25, amplitude: 24, segments: 120 };

/** The serpent as short segments, each marked as passing in front of or behind the staff. */
export function serpentSegments(phase: number, o: SerpentOptions = ROD): SerpentSegment[] {
  const pts = Array.from({ length: o.segments + 1 }, (_, i) => {
    const t = i / o.segments;
    const angle = 2 * Math.PI * o.turns * t + phase + Math.PI / 2;
    const amp = o.amplitude * (1 - 0.45 * t);
    return { x: o.cx + amp * Math.sin(angle), y: o.top + (o.bottom - o.top) * t, depth: Math.cos(angle), t };
  });
  return pts.slice(1).map((p, i) => {
    const q = pts[i]!;
    return { x1: q.x, y1: q.y, x2: p.x, y2: p.y, width: 9 - 6 * q.t, front: (q.depth + p.depth) / 2 >= 0 };
  });
}

/** Head angle in degrees, turned toward a target and clamped so the serpent never looks backwards. */
export function headAngle(head: Point, target: Point | null, maxDeg = 40): number {
  if (!target) return 0;
  const deg = (Math.atan2(target.y - head.y, target.x - head.x) * 180) / Math.PI;
  return Math.max(-maxDeg, Math.min(maxDeg, deg));
}

/** Archimedean spiral for an Ionic volute, from the outer edge inwards. */
export function voluteSpiral(cx: number, cy: number, radius: number, dir: 1 | -1, turns = 2.4, steps = 90): string {
  const end = 2 * Math.PI * turns;
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const th = (end * i) / steps;
    const r = radius * (1 - th / (end * 1.12));
    return `${(cx + dir * r * Math.cos(th - Math.PI / 2)).toFixed(2)} ${(cy + r * Math.sin(th - Math.PI / 2)).toFixed(2)}`;
  });
  return `M${pts.join(" L")}`;
}

/** Ophiuchus, the serpent bearer: Asclepius placed among the stars, holding Serpens. Unit coordinates. */
export const OPHIUCHUS: { stars: (Point & { mag: number })[]; lines: [number, number][] } = {
  stars: [
    { x: 0.5, y: 0.1, mag: 1 },
    { x: 0.41, y: 0.22, mag: 0.8 },
    { x: 0.6, y: 0.24, mag: 0.8 },
    { x: 0.37, y: 0.47, mag: 0.7 },
    { x: 0.64, y: 0.46, mag: 0.75 },
    { x: 0.43, y: 0.7, mag: 0.85 },
    { x: 0.59, y: 0.72, mag: 0.9 },
    { x: 0.71, y: 0.4, mag: 0.6 },
    { x: 0.78, y: 0.32, mag: 0.65 },
    { x: 0.85, y: 0.25, mag: 0.7 },
    { x: 0.92, y: 0.16, mag: 0.8 },
    { x: 0.28, y: 0.54, mag: 0.6 },
    { x: 0.18, y: 0.5, mag: 0.65 },
    { x: 0.1, y: 0.6, mag: 0.6 },
    { x: 0.05, y: 0.74, mag: 0.75 },
  ],
  lines: [
    [0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 6],
    [4, 7], [7, 8], [8, 9], [9, 10],
    [3, 11], [11, 12], [12, 13], [13, 14],
  ],
};

/** Deterministic background stars so server and client render the same sky. */
export function fieldStars(count: number, seed = 7): (Point & { r: number; delay: number })[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  return Array.from({ length: count }, () => ({ x: rand(), y: rand(), r: 0.6 + rand() * 1.1, delay: rand() * 6 }));
}

/** Indices of the constellation stars within `radius` px of the pointer, nearest first. */
export function nearestStars(pointer: Point, stars: Point[], radius: number, limit = 2): number[] {
  return stars
    .map((s, i) => ({ i, d: Math.hypot(s.x - pointer.x, s.y - pointer.y) }))
    .filter((s) => s.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((s) => s.i);
}
