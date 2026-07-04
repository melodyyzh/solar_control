"use client";

/**
 * The radial stage: Sun at the center, six planets drifting slowly along a
 * shared orbit. A single motion value carries the orbital phase; it eases to
 * a halt while any view is open and resumes on return.
 */

import { useRef } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { PLANETS } from "@/lib/planets";
import { ORBIT_RADIUS_VMIN } from "@/lib/orbit";
import type { PlanetSnapshot } from "@/lib/types";
import type { EnergyBand } from "@/lib/score";
import Sun from "./Sun";
import PlanetNode from "./PlanetNode";

const DRIFT_DEG_PER_SEC = 360 / 420; // one lap every 7 minutes

export interface SolarSystemProps {
  planets: Record<string, PlanetSnapshot>;
  score: number;
  band: EnergyBand;
  selected: string | null; // planet id or "sun"
  onSelect: (id: string) => void;
}

export default function SolarSystem({ planets, score, band, selected, onSelect }: SolarSystemProps) {
  const phase = useMotionValue(0);
  const speedRef = useRef(DRIFT_DEG_PER_SEC);

  useAnimationFrame((_, delta) => {
    const target = selected ? 0 : DRIFT_DEG_PER_SEC;
    // ease speed toward target so pausing/resuming is smooth
    speedRef.current += (target - speedRef.current) * Math.min(1, delta / 400);
    if (Math.abs(speedRef.current) > 1e-4) {
      phase.set((phase.get() + (speedRef.current * delta) / 1000) % 360);
    }
  });

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/* orbit ring */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 rounded-full border border-dashed"
        style={{
          width: `${ORBIT_RADIUS_VMIN * 2}vmin`,
          height: `${ORBIT_RADIUS_VMIN * 2}vmin`,
          marginLeft: `${-ORBIT_RADIUS_VMIN}vmin`,
          marginTop: `${-ORBIT_RADIUS_VMIN}vmin`,
          borderColor: "rgba(148,163,184,0.13)",
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      <header className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-baseline justify-between px-6 pt-5">
        <h1 className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--ink-2)" }}>
          My Solar System
        </h1>
        <p className="hidden text-xs sm:block" style={{ color: "var(--ink-3)" }}>
          six worlds · one sun · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </p>
      </header>

      <Sun score={score} band={band} onOpen={() => onSelect("sun")} />

      {PLANETS.map((def, i) => (
        <PlanetNode
          key={def.id}
          def={def}
          snapshot={planets[def.id]}
          index={i}
          count={PLANETS.length}
          phase={phase}
          hidden={selected === def.id}
          onOpen={() => onSelect(def.id)}
        />
      ))}
    </div>
  );
}
