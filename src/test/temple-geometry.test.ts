import { describe, expect, it } from "vitest";
import { OPHIUCHUS, ROD, fieldStars, headAngle, nearestStars, serpentSegments, voluteSpiral } from "@/lib/temple-geometry";

describe("serpentSegments", () => {
  it("coils around the staff, passing both in front of and behind it", () => {
    const segs = serpentSegments(0);
    expect(segs).toHaveLength(ROD.segments);
    expect(segs.some((s) => s.front)).toBe(true);
    expect(segs.some((s) => !s.front)).toBe(true);
    for (const s of segs) expect(Math.abs(s.x1 - ROD.cx)).toBeLessThanOrEqual(ROD.amplitude + 1e-9);
  });

  it("tapers from head to tail", () => {
    const segs = serpentSegments(0);
    expect(segs[0]!.width).toBeGreaterThan(segs[segs.length - 1]!.width);
  });

  it("is deterministic for a given phase", () => {
    expect(serpentSegments(1.3)).toEqual(serpentSegments(1.3));
  });
});

describe("headAngle", () => {
  it("is level without a target and clamps extreme angles", () => {
    expect(headAngle({ x: 0, y: 0 }, null)).toBe(0);
    expect(headAngle({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0);
    expect(headAngle({ x: 0, y: 0 }, { x: 0, y: 100 })).toBe(40);
    expect(headAngle({ x: 0, y: 0 }, { x: 0, y: -100 })).toBe(-40);
  });
});

describe("constellation and sky", () => {
  it("only draws lines between stars that exist", () => {
    for (const [a, b] of OPHIUCHUS.lines) {
      expect(OPHIUCHUS.stars[a]).toBeDefined();
      expect(OPHIUCHUS.stars[b]).toBeDefined();
    }
  });

  it("places the same field stars on every render", () => {
    expect(fieldStars(5)).toEqual(fieldStars(5));
    for (const s of fieldStars(20)) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThan(1);
    }
  });

  it("finds the nearest stars within the radius", () => {
    const stars = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 500, y: 0 }];
    expect(nearestStars({ x: 40, y: 0 }, stars, 100)).toEqual([1, 0]);
    expect(nearestStars({ x: 1000, y: 1000 }, stars, 100)).toEqual([]);
  });

  it("draws a volute spiral path", () => {
    expect(voluteSpiral(20, 20, 10, 1)).toMatch(/^M[\d.]+ [\d.]+( L[\d.-]+ [\d.-]+)+$/);
  });
});
