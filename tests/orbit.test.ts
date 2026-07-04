import { describe, it, expect } from "vitest";
import {
  planetAngle,
  chainedTransform,
  netTextRotation,
  orbitalPosition,
  maxNodeDiameter,
  safeOrbitRadiusVmin,
  NODE_DIAMETER_VMIN,
  ORBIT_RADIUS_VMIN,
} from "../src/lib/orbit";

const COUNT = 6;

describe("planetAngle", () => {
  it("spaces 6 planets exactly 60 degrees apart starting at the top", () => {
    const angles = Array.from({ length: COUNT }, (_, i) => planetAngle(i, COUNT));
    expect(angles).toEqual([-90, -30, 30, 90, 150, 210]);
  });

  it("throws on non-positive count", () => {
    expect(() => planetAngle(0, 0)).toThrow();
  });
});

describe("chainedTransform", () => {
  it("emits the rotate → translate → counter-rotate sequence", () => {
    expect(chainedTransform(30, 100)).toBe("rotate(30deg) translate(100px) rotate(-30deg)");
  });

  it("passes CSS length strings through untouched", () => {
    expect(chainedTransform(-90, "37vmin")).toBe(
      "rotate(-90deg) translate(37vmin) rotate(90deg)",
    );
  });

  it("applies zero net rotation to node content for any angle", () => {
    for (const a of [-90, -30, 0, 45, 137.5, 210, 360]) {
      expect(netTextRotation(a)).toBe(0);
    }
  });
});

describe("orbitalPosition", () => {
  it("places every planet exactly on the orbit circle", () => {
    const R = 40;
    for (let i = 0; i < COUNT; i++) {
      const { x, y } = orbitalPosition(i, COUNT, R);
      expect(Math.hypot(x, y)).toBeCloseTo(R, 10);
    }
  });

  it("puts planet 0 at the top of the circle (negative y, zero x)", () => {
    const { x, y } = orbitalPosition(0, COUNT, 40);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(-40, 10);
  });

  it("advances positions smoothly with orbital phase", () => {
    const a = orbitalPosition(0, COUNT, 40, -90, 0);
    const b = orbitalPosition(0, COUNT, 40, -90, 60);
    // after drifting 60°, planet 0 sits where planet 1 started
    const one = orbitalPosition(1, COUNT, 40);
    expect(b.x).toBeCloseTo(one.x, 10);
    expect(b.y).toBeCloseTo(one.y, 10);
    expect(a.angleDeg + 60).toBeCloseTo(b.angleDeg, 10);
  });
});

describe("collision and clipping constraints", () => {
  it("adjacent-node chord for 6 planets equals the radius", () => {
    // 2·R·sin(π/6) = R
    expect(maxNodeDiameter(6, 40)).toBeCloseTo(40, 10);
  });

  it("UI node diameter never exceeds the no-overlap bound", () => {
    expect(NODE_DIAMETER_VMIN).toBeLessThanOrEqual(
      maxNodeDiameter(COUNT, ORBIT_RADIUS_VMIN),
    );
  });

  it("UI orbit keeps nodes fully inside the viewport", () => {
    // farthest point of any node from center must stay within 50vmin
    expect(ORBIT_RADIUS_VMIN + NODE_DIAMETER_VMIN / 2).toBeLessThanOrEqual(50);
  });

  it("safe radius formula leaves the requested margin", () => {
    const r = safeOrbitRadiusVmin(20, 5);
    expect(r + 20 / 2 + 5).toBeCloseTo(50, 10);
  });

  it("UI radius honors the ~40vmin spec, clamped to the safe bound", () => {
    expect(ORBIT_RADIUS_VMIN).toBeLessThanOrEqual(40);
    expect(ORBIT_RADIUS_VMIN).toBe(
      Math.min(40, safeOrbitRadiusVmin(NODE_DIAMETER_VMIN)),
    );
  });
});
