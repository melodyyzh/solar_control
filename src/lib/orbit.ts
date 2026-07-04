/**
 * Pure layout mathematics for the radial "solar system".
 *
 * Every planet node is absolutely positioned at the exact center of the
 * orbital stage and displaced with a chained transform:
 *
 *     transform: rotate(θ) translate(R) rotate(-θ)
 *
 * The first rotation swings the displacement axis to angle θ, the translate
 * pushes the node out to radius R along that axis, and the final counter
 * rotation cancels the first so the node's content (text) stays perfectly
 * horizontal. The net rotation applied to the node's local coordinate frame
 * is exactly zero for any θ.
 */

export interface OrbitalPosition {
  /** angle in degrees, 0° = +x axis, screen-clockwise positive */
  angleDeg: number;
  /** cartesian offset from the orbit center, same unit as radius */
  x: number;
  y: number;
  /** CSS chained transform string */
  transform: string;
}

/** Angle of planet `index` out of `count`, evenly spaced, starting at the top. */
export function planetAngle(index: number, count: number, startDeg = -90): number {
  if (count <= 0) throw new Error("count must be positive");
  return startDeg + (360 / count) * index;
}

/**
 * Chained CSS transform that displaces a centered node to angle θ at radius R
 * while keeping its contents horizontal. `radius` may be a number (px) or any
 * CSS length string (e.g. "37vmin", "var(--orbit-r)").
 */
export function chainedTransform(angleDeg: number, radius: number | string): string {
  const r = typeof radius === "number" ? `${radius}px` : radius;
  return `rotate(${angleDeg}deg) translate(${r}) rotate(${-angleDeg}deg)`;
}

/** Net rotation experienced by node content under the chained transform. */
export function netTextRotation(angleDeg: number): number {
  return angleDeg + -angleDeg; // rotate(θ) then rotate(-θ)
}

/** Full orbital position (angle, cartesian coords, transform) for one planet. */
export function orbitalPosition(
  index: number,
  count: number,
  radius: number,
  startDeg = -90,
  phaseDeg = 0,
): OrbitalPosition {
  const angleDeg = planetAngle(index, count, startDeg) + phaseDeg;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    angleDeg,
    x: radius * Math.cos(rad),
    y: radius * Math.sin(rad),
    transform: chainedTransform(angleDeg, radius),
  };
}

/**
 * Largest node diameter (same unit as radius) such that adjacent nodes on the
 * orbit never overlap: the chord between neighbours is 2·R·sin(π/n).
 */
export function maxNodeDiameter(count: number, radius: number): number {
  if (count < 2) return Infinity;
  return 2 * radius * Math.sin(Math.PI / count);
}

/**
 * Largest orbit radius, in vmin units, that keeps a node of `nodeDiameterVmin`
 * fully inside the viewport with `marginVmin` of breathing room:
 *   R + d/2 + margin ≤ 50vmin  (half of the smaller viewport side)
 */
export function safeOrbitRadiusVmin(nodeDiameterVmin: number, marginVmin = 2): number {
  return 50 - nodeDiameterVmin / 2 - marginVmin;
}

/** Node diameter used by the UI, in vmin. */
export const NODE_DIAMETER_VMIN = 22;

/**
 * Orbit radius used by the UI, in vmin: the spec's ~40vmin, clamped so the
 * nodes can never clip the viewport edge.
 */
export const ORBIT_RADIUS_VMIN = Math.min(40, safeOrbitRadiusVmin(NODE_DIAMETER_VMIN));
