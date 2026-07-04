"use client";

/**
 * Mission Control — expands from the Sun. Daily captain's journal (the
 * cross-project note-taking surface), a status board of all six planets, and
 * the 24h activity chart.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PLANETS, STATUS_COLORS } from "@/lib/planets";
import {
  STATUS_LABELS,
  type JournalEntry,
  type PlanetSnapshot,
  type TelemetrySample,
} from "@/lib/types";
import { roadmapProgress } from "@/lib/todo";
import { BAND_TITLES, type EnergyBand } from "@/lib/score";
import ActivityChart from "./ActivityChart";

export interface SunViewProps {
  planets: Record<string, PlanetSnapshot>;
  score: number;
  band: EnergyBand;
  onSelectPlanet: (id: string) => void;
  onClose: () => void;
}

export default function SunView({ planets, score, band, onSelectPlanet, onClose }: SunViewProps) {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [samples, setSamples] = useState<TelemetrySample[] | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    void fetch("/api/journal")
      .then((r) => r.json())
      .then((j: { entries: JournalEntry[] }) => setEntries(j.entries))
      .catch(() => setEntries([]));
    void fetch("/api/telemetry?hours=24")
      .then((r) => r.json())
      .then((j: { samples: TelemetrySample[] }) => setSamples(j.samples))
      .catch(() => setSamples([]));
  }, []);

  async function addEntry() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => null);
    if (res?.ok) {
      const { entry } = (await res.json()) as { entry: JournalEntry };
      setEntries((prev) => [entry, ...(prev ?? [])]);
    }
  }

  return (
    <motion.div
      layoutId="sun"
      className="fixed inset-0 z-30 overflow-hidden"
      style={{
        borderRadius: 24,
        background:
          "linear-gradient(180deg, color-mix(in srgb, #78350f 26%, #070b16) 0%, #070b16 30rem), #070b16",
      }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.16, duration: 0.25 } }}
        exit={{ opacity: 0, transition: { duration: 0.08 } }}
        className="h-full overflow-y-auto"
      >
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-8">
          <header className="mb-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onClose}
              aria-label="Back to orbit"
              className="flex h-9 w-9 items-center justify-center rounded-full border text-lg hover:bg-white/5"
              style={{ borderColor: "var(--edge-strong)", color: "var(--ink-2)" }}
            >
              ←
            </button>
            <span aria-hidden className="text-2xl">☀</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold">Mission Control</h2>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                Connect to the energy cycle (work/rest)
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                {score}
              </p>
              <p className="text-[0.65rem]" style={{ color: "var(--ink-3)" }}>
                {BAND_TITLES[band]}
              </p>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ---- captain's journal ---- */}
            <section
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--edge)", background: "rgba(16,23,40,0.55)" }}
            >
              <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--ink-3)" }}>
                Captain&apos;s journal — {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void addEntry();
                  }
                }}
                rows={3}
                placeholder="What happened today? Enter to log, Shift+Enter for a new line."
                className="field resize-y"
              />
              <ul className="mt-4 max-h-80 space-y-2.5 overflow-y-auto">
                {entries === null && (
                  <li className="text-xs" style={{ color: "var(--ink-3)" }}>loading…</li>
                )}
                {entries?.length === 0 && (
                  <li className="text-xs" style={{ color: "var(--ink-3)" }}>
                    Nothing logged yet. The journal keeps you honest across all six worlds.
                  </li>
                )}
                {entries?.map((e, i) => (
                  <li key={`${e.t}-${i}`} className="flex gap-2 text-sm leading-relaxed">
                    <span className="shrink-0 pt-0.5 font-mono text-[0.68rem]" style={{ color: "var(--ink-3)" }}>
                      {new Date(e.t).toLocaleString(undefined, {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span style={{ color: "var(--ink-2)" }}>{e.text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-6">
              {/* ---- planet status board ---- */}
              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--edge)", background: "rgba(16,23,40,0.55)" }}
              >
                <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--ink-3)" }}>
                  Fleet status
                </h3>
                <ul className="space-y-1">
                  {PLANETS.map((p) => {
                    const snap = planets[p.id];
                    const progress = Math.round(roadmapProgress(snap?.todos ?? []) * 100);
                    const status = snap?.status ?? "in-progress";
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => onSelectPlanet(p.id)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
                        >
                          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                          <span className="w-28 shrink-0 truncate text-sm font-medium">{p.name}</span>
                          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs" style={{ color: "var(--ink-2)" }}>
                            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[status] }} />
                            <span className="truncate">
                              {snap?.activeRunId ? "agent running…" : STATUS_LABELS[status]}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-[0.68rem] tabular-nums" style={{ color: "var(--ink-3)" }}>
                            {progress}%
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* ---- activity chart ---- */}
              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--edge)", background: "rgba(16,23,40,0.55)" }}
              >
                <h3 className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--ink-3)" }}>
                  Activity density — last 24h
                </h3>
                {samples === null ? (
                  <p className="py-8 text-center text-xs" style={{ color: "var(--ink-3)" }}>loading…</p>
                ) : (
                  <ActivityChart samples={samples} />
                )}
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
