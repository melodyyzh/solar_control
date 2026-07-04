/**
 * Static definitions of the six orbiting project planets.
 *
 * `color` is the planet's identity color used anywhere it means something
 * (status board, labels, chart marks). The set was validated with the dataviz
 * palette validator on the dark surface #0a0f1e: lightness band, chroma floor,
 * CVD adjacent-pair separation and contrast all pass. `bright`/`colorDeep`
 * are decorative gradient companions for the planet spheres only.
 */

export interface PlanetDef {
  id: string;
  name: string;
  /** validated identity color (data/UI meaning) */
  color: string;
  /** luminous highlight for the sphere gradient (decorative) */
  bright: string;
  /** shadow side of the sphere gradient (decorative) */
  colorDeep: string;
  /** glow used for shadows and rings */
  glow: string;
  tagline: string;
}

export const PLANETS: PlanetDef[] = [
  {
    id: "best-deals",
    name: "Best deals",
    color: "#d97706",
    bright: "#fbbf24",
    colorDeep: "#78350f",
    glow: "rgba(217,119,6,0.45)",
    tagline: "Hunting value across the market",
  },
  {
    id: "robotics",
    name: "Robotics",
    color: "#0891b2",
    bright: "#22d3ee",
    colorDeep: "#164e63",
    glow: "rgba(8,145,178,0.45)",
    tagline: "Machines that move and sense",
  },
  {
    id: "nps",
    name: "np's",
    color: "#8b5cf6",
    bright: "#c4b5fd",
    colorDeep: "#4c1d95",
    glow: "rgba(139,92,246,0.45)",
    tagline: "Nanoparticle synthesis & studies",
  },
  {
    id: "perovskites",
    name: "Perovskites",
    color: "#059669",
    bright: "#34d399",
    colorDeep: "#064e3b",
    glow: "rgba(5,150,105,0.45)",
    tagline: "Next-gen photovoltaic crystals",
  },
  {
    id: "polymers",
    name: "Polymers",
    color: "#ec4899",
    bright: "#f9a8d4",
    colorDeep: "#831843",
    glow: "rgba(236,72,153,0.45)",
    tagline: "Long chains, long game",
  },
  {
    id: "semicond",
    name: "Semicond",
    color: "#3b82f6",
    bright: "#93c5fd",
    colorDeep: "#1e3a8a",
    glow: "rgba(59,130,246,0.45)",
    tagline: "Band gaps and devices",
  },
];

/** Validated status palette (dark surface); always paired with a text label. */
export const STATUS_COLORS = {
  "in-progress": "#3b82f6",
  "needs-feedback": "#d97706",
  "nothing-works": "#ef4444",
} as const;

export const PLANET_IDS = PLANETS.map((p) => p.id);

export function getPlanet(id: string): PlanetDef | undefined {
  return PLANETS.find((p) => p.id === id);
}

export function isPlanetId(id: string): boolean {
  return PLANETS.some((p) => p.id === id);
}
