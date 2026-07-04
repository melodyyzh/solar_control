"use client";

/**
 * One orbiting planet node. An outer (plain) div carries the chained orbital
 * transform — rotate(θ) translate(R) rotate(-θ) — as a live motion value so
 * the node drifts along its orbit with its text perfectly horizontal. The
 * inner motion.div carries the layoutId used for the expand-to-fullscreen
 * transition, kept separate so Framer's FLIP never fights the orbital math.
 */

import { motion, useTransform, type MotionValue } from "framer-motion";
import type { PlanetDef } from "@/lib/planets";
import { STATUS_COLORS } from "@/lib/planets";
import { chainedTransform, planetAngle, ORBIT_RADIUS_VMIN } from "@/lib/orbit";
import { STATUS_LABELS, type PlanetSnapshot } from "@/lib/types";
import { roadmapProgress } from "@/lib/todo";

export interface PlanetNodeProps {
  def: PlanetDef;
  snapshot: PlanetSnapshot | undefined;
  index: number;
  count: number;
  phase: MotionValue<number>;
  hidden: boolean;
  onOpen: () => void;
}

const SIZE = `clamp(84px, 22vmin, 190px)`;

export default function PlanetNode({
  def,
  snapshot,
  index,
  count,
  phase,
  hidden,
  onOpen,
}: PlanetNodeProps) {
  const baseAngle = planetAngle(index, count);
  const transform = useTransform(phase, (p) =>
    chainedTransform(baseAngle + p, `${ORBIT_RADIUS_VMIN}vmin`),
  );

  const status = snapshot?.status ?? "in-progress";
  const progress = roadmapProgress(snapshot?.todos ?? []);
  const running = Boolean(snapshot?.activeRunId);

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        width: SIZE,
        height: SIZE,
        marginLeft: `calc(${SIZE} / -2)`,
        marginTop: `calc(${SIZE} / -2)`,
        transform,
        visibility: hidden ? "hidden" : "visible",
      }}
    >
      <motion.button
        layoutId={`planet-${def.id}`}
        onClick={onOpen}
        aria-label={`Open ${def.name} — ${STATUS_LABELS[status]}`}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.96 }}
        className="group relative flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-full"
        style={{
          borderRadius: "50%",
          background: `radial-gradient(circle at 32% 28%, ${def.bright} 0%, ${def.color} 45%, ${def.colorDeep} 100%)`,
          boxShadow: `0 0 24px 2px ${def.glow}, inset -8px -10px 24px rgba(0,0,0,0.45)`,
        }}
      >
        {/* active agent ring */}
        {running && (
          <motion.span
            aria-hidden
            className="absolute -inset-1.5 rounded-full border-2"
            style={{ borderColor: def.bright }}
            animate={{ opacity: [0.9, 0.25, 0.9], scale: [1, 1.06, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <span
          className="px-2 text-center font-semibold leading-tight text-white"
          style={{
            fontSize: "clamp(0.7rem, 2.6vmin, 1.05rem)",
            textShadow: "0 1px 6px rgba(0,0,0,0.65)",
          }}
        >
          {def.name}
        </span>

        {/* status dot + short label (color never alone: label text present) */}
        <span
          className="mt-1 flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{ background: "rgba(3,6,14,0.55)" }}
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: STATUS_COLORS[status] }}
          />
          <span
            className="whitespace-nowrap font-medium"
            style={{ fontSize: "clamp(0.5rem, 1.7vmin, 0.65rem)", color: "var(--ink-2)" }}
          >
            {running ? "agent running" : STATUS_LABELS[status]}
          </span>
        </span>

        {/* roadmap progress arc along the bottom */}
        {progress > 0 && (
          <span
            aria-hidden
            className="absolute inset-x-[18%] bottom-[10%] h-1 overflow-hidden rounded-full"
            style={{ background: "rgba(3,6,14,0.5)" }}
          >
            <span
              className="block h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.round(progress * 100)}%`, background: "rgba(255,255,255,0.85)" }}
            />
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}
