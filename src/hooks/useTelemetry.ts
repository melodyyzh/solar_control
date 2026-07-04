"use client";

/**
 * Passive activity telemetry for the Sun. Counts interaction events
 * (mousemove throttled to 10/s, keydown, wheel, pointerdown, touchmove) into
 * one-second buckets, computes the rolling 10s Activity Density Score, and
 * ships a compressed sample to the server every 20s for history.
 */

import { useEffect, useRef, useState } from "react";
import { activityScore, energyBand, type ActivityBucket, type EnergyBand } from "@/lib/score";

const TICK_MS = 1_000;
const REPORT_EVERY_TICKS = 20;
const MOUSE_THROTTLE_MS = 100;

export interface Telemetry {
  score: number;
  band: EnergyBand;
}

export function useTelemetry(): Telemetry {
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    let counter = 0;
    let lastMouse = 0;
    let hidden = document.visibilityState === "hidden";
    let ticks = 0;
    let reportAccumulator: number[] = [];
    const buckets: ActivityBucket[] = [];

    const bump = () => {
      if (!hidden) counter++;
    };
    const onMouse = () => {
      const now = performance.now();
      if (now - lastMouse >= MOUSE_THROTTLE_MS) {
        lastMouse = now;
        bump();
      }
    };
    const onVisibility = () => {
      hidden = document.visibilityState === "hidden";
      if (hidden) {
        counter = 0;
        buckets.length = 0; // rest immediately when the tab sleeps
      }
    };

    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("touchmove", onMouse, { passive: true });
    window.addEventListener("keydown", bump);
    window.addEventListener("wheel", bump, { passive: true });
    window.addEventListener("pointerdown", bump, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    const interval = setInterval(() => {
      const now = Date.now();
      buckets.push({ t: now, events: counter });
      counter = 0;
      while (buckets.length > 0 && now - buckets[0].t > 12_000) buckets.shift();

      const s = activityScore(buckets, now);
      scoreRef.current = s;
      setScore(s);
      reportAccumulator.push(s);

      ticks++;
      if (ticks % REPORT_EVERY_TICKS === 0) {
        const avg = Math.round(
          reportAccumulator.reduce((a, b) => a + b, 0) / reportAccumulator.length,
        );
        reportAccumulator = [];
        void fetch("/api/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ samples: [{ t: now, score: avg }] }),
          keepalive: true,
        }).catch(() => undefined);
      }
    }, TICK_MS);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onMouse);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("wheel", bump);
      window.removeEventListener("pointerdown", bump);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { score, band: energyBand(score) };
}
