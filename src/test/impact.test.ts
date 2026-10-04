import { describe, expect, it } from "vitest";
import { IMPACT, routeWeeks, speedup } from "@/lib/impact";

describe("The 10x case", () => {
  it("adds up each route from its steps", () => {
    expect(routeWeeks(IMPACT.routes.usual)).toEqual({ min: 50, max: 121 });
    expect(routeWeeks(IMPACT.routes.asclepius)).toEqual({ min: 4, max: 15 });
  });
  it("computes the speed-up range from the step numbers", () => {
    const s = speedup(IMPACT.routes);
    expect(s.low).toBeCloseTo(50 / 15);
    expect(s.high).toBeCloseTo(121 / 4);
    expect(s.mid).toBeCloseTo(85.5 / 9.5);
    expect(s.low).toBeLessThan(10);
    expect(s.high).toBeGreaterThan(10);
  });
  it("backs every step with a source link, an atlas connection, or a stated assumption", () => {
    for (const step of [...IMPACT.routes.usual, ...IMPACT.routes.asclepius]) {
      if (step.basis === "sourced") expect(step.href).toMatch(/^https:\/\//);
      if (step.basis === "atlas") expect(step.edgeId).toBeTruthy();
      if (step.basis === "assumption") expect(step.detail.length).toBeGreaterThan(20);
      expect(step.maxWeeks).toBeGreaterThanOrEqual(step.minWeeks);
    }
  });
});
