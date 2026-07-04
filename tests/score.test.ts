import { describe, it, expect } from "vitest";
import { activityScore, energyBand, SATURATION_EVENTS_PER_SEC, WINDOW_MS } from "../src/lib/score";

describe("activityScore", () => {
  const now = 1_000_000;

  it("is 0 with no activity", () => {
    expect(activityScore([], now)).toBe(0);
  });

  it("saturates at 100 for very fast interaction", () => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      t: now - i * 1000,
      events: SATURATION_EVENTS_PER_SEC * 5,
    }));
    expect(activityScore(buckets, now)).toBe(100);
  });

  it("scores 100 exactly at the saturation rate", () => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      t: now - i * 1000,
      events: SATURATION_EVENTS_PER_SEC,
    }));
    expect(activityScore(buckets, now)).toBe(100);
  });

  it("scores 50 at half the saturation rate", () => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      t: now - i * 1000,
      events: SATURATION_EVENTS_PER_SEC / 2,
    }));
    expect(activityScore(buckets, now)).toBe(50);
  });

  it("ignores buckets outside the rolling window and in the future", () => {
    const buckets = [
      { t: now - WINDOW_MS - 1, events: 1000 },
      { t: now + 5000, events: 1000 },
      { t: now - 500, events: SATURATION_EVENTS_PER_SEC * 10 },
    ];
    // only the last bucket counts: 80 events over 10s = 8/s = 100
    expect(activityScore(buckets, now)).toBe(100);
  });
});

describe("energyBand", () => {
  it("matches the spec band edges", () => {
    expect(energyBand(0)).toBe("low");
    expect(energyBand(29)).toBe("low");
    expect(energyBand(30)).toBe("medium");
    expect(energyBand(79)).toBe("medium");
    expect(energyBand(80)).toBe("high");
    expect(energyBand(100)).toBe("high");
  });
});
