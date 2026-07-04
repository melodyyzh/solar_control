/**
 * Telemetry scoring math for the Sun.
 *
 * The client counts interaction events (mousemove, keydown, scroll, click)
 * into one-second buckets. The Activity Density Score is the event rate over
 * a rolling 10-second window, saturating at SATURATION_EVENTS_PER_SEC.
 */

export const WINDOW_MS = 10_000;
/** event rate that maps to a score of 100 */
export const SATURATION_EVENTS_PER_SEC = 8;

export interface ActivityBucket {
  /** epoch ms of the bucket */
  t: number;
  /** events counted during that bucket */
  events: number;
}

export function activityScore(
  buckets: ActivityBucket[],
  now: number,
  windowMs: number = WINDOW_MS,
): number {
  let events = 0;
  for (const b of buckets) {
    if (now - b.t <= windowMs && b.t <= now) events += b.events;
  }
  const perSecond = events / (windowMs / 1000);
  const score = Math.round((perSecond / SATURATION_EVENTS_PER_SEC) * 100);
  return Math.max(0, Math.min(100, score));
}

export type EnergyBand = "high" | "medium" | "low";

/** Spec bands: High 80-100, Medium 30-79, Low 0-29. */
export function energyBand(score: number): EnergyBand {
  if (score >= 80) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export const BAND_TITLES: Record<EnergyBand, string> = {
  high: "Burning bright — deep work detected",
  medium: "Steady glow — cruising",
  low: "Embers — resting or away",
};
