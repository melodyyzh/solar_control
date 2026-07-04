"use client";

/**
 * The central Sun — a live activity meter. Its state title per spec:
 * "Connect to the energy cycle (work/rest)". Three Framer Motion variants
 * driven by the rolling Activity Density Score:
 *   high (80-100)  vibrant yellow/white, scaled up, rapid pulsing
 *   medium (30-79) warm orange, slow rotation
 *   low (0-29)     deep red, outline-only, animations paused
 */

import { motion } from "framer-motion";
import type { EnergyBand } from "@/lib/score";
import { BAND_TITLES } from "@/lib/score";

const CORE: Record<EnergyBand, string> = {
  high: "radial-gradient(circle at 38% 35%, #fffdf4 0%, #fde68a 38%, #f59e0b 72%, #b45309 100%)",
  medium: "radial-gradient(circle at 38% 35%, #fed7aa 0%, #fb923c 45%, #c2410c 85%, #7c2d12 100%)",
  low: "radial-gradient(circle at 50% 50%, rgba(127,29,29,0.5) 0%, rgba(69,10,10,0.35) 60%, transparent 100%)",
};

const GLOW: Record<EnergyBand, string> = {
  high: "0 0 60px 18px rgba(251,191,36,0.5), 0 0 140px 50px rgba(251,191,36,0.22)",
  medium: "0 0 40px 10px rgba(249,115,22,0.35), 0 0 90px 30px rgba(249,115,22,0.14)",
  low: "0 0 24px 4px rgba(239,68,68,0.18)",
};

const coreVariants = {
  high: {
    scale: [1.06, 1.14, 1.06],
    transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" as const },
  },
  medium: {
    scale: 1,
    transition: { duration: 0.8, ease: "easeOut" as const },
  },
  low: {
    scale: 0.94,
    transition: { duration: 1.2, ease: "easeOut" as const },
  },
};

const coronaVariants = {
  high: {
    rotate: 360,
    opacity: 0.9,
    transition: { rotate: { duration: 14, repeat: Infinity, ease: "linear" as const } },
  },
  medium: {
    rotate: 360,
    opacity: 0.55,
    transition: { rotate: { duration: 48, repeat: Infinity, ease: "linear" as const } },
  },
  // animations paused in low
  low: { rotate: 0, opacity: 0.25, transition: { duration: 1 } },
};

export interface SunProps {
  score: number;
  band: EnergyBand;
  onOpen: () => void;
}

export default function Sun({ score, band, onOpen }: SunProps) {
  return (
    <div
      className="absolute left-1/2 top-1/2 flex flex-col items-center"
      style={{
        width: "min(24vmin, 190px)",
        height: "min(24vmin, 190px)",
        marginLeft: "calc(min(24vmin, 190px) / -2)",
        marginTop: "calc(min(24vmin, 190px) / -2)",
      }}
    >
      <motion.button
        layoutId="sun"
        onClick={onOpen}
        aria-label={`Open mission control. Activity score ${score} of 100.`}
        title="Connect to the energy cycle (work/rest)"
        className="relative h-full w-full cursor-pointer rounded-full"
        animate={band}
        initial={false}
      >
        {/* corona */}
        <motion.span
          aria-hidden
          variants={coronaVariants}
          className="absolute -inset-[14%] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(251,191,36,0.28) 25deg, transparent 60deg, rgba(251,146,60,0.22) 120deg, transparent 160deg, rgba(251,191,36,0.28) 215deg, transparent 260deg, rgba(251,146,60,0.2) 320deg, transparent 360deg)",
            filter: "blur(6px)",
          }}
        />
        {/* core */}
        <motion.span
          aria-hidden
          variants={coreVariants}
          className="absolute inset-0 flex items-center justify-center rounded-full"
          style={{
            background: CORE[band],
            boxShadow: GLOW[band],
            border: band === "low" ? "2px solid rgba(239,68,68,0.55)" : "2px solid transparent",
          }}
        >
          <span
            className="select-none font-mono text-xl font-bold tabular-nums"
            style={{ color: band === "low" ? "#fca5a5" : "rgba(30,20,0,0.75)" }}
          >
            {score}
          </span>
        </motion.span>
      </motion.button>

      <div className="pointer-events-none absolute top-full mt-3 w-40 text-center sm:w-56">
        <p className="hidden text-[0.7rem] uppercase tracking-[0.18em] sm:block" style={{ color: "var(--ink-3)" }}>
          Connect to the energy cycle
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--ink-2)" }}>
          {BAND_TITLES[band]}
        </p>
      </div>
    </div>
  );
}
