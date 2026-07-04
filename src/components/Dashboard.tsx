"use client";

/**
 * Top-level orchestrator: loads planet snapshots, runs the telemetry engine,
 * maintains the daemon WebSocket, and swaps between the orbital stage and the
 * expanded planet / mission-control views.
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PLANETS, getPlanet } from "@/lib/planets";
import type {
  AgentEvent,
  AgentProviderName,
  PlanetSnapshot,
  PlanetStatus,
  RunInfo,
  TodoItem,
} from "@/lib/types";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useSocket } from "@/hooks/useSocket";
import Starfield from "./Starfield";
import SolarSystem from "./SolarSystem";
import PlanetView from "./PlanetView";
import SunView from "./SunView";

const TERMINAL_CAP = 500;

export default function Dashboard() {
  const [planets, setPlanets] = useState<Record<string, PlanetSnapshot> | null>(null);
  const [selected, setSelected] = useState<string | null>(null); // planet id | "sun"
  const [terminals, setTerminals] = useState<Record<string, AgentEvent[]>>({});
  const [activeRuns, setActiveRuns] = useState<Record<string, RunInfo>>({});
  const [toast, setToast] = useState<string | null>(null);
  const { score, band } = useTelemetry();

  const refreshPlanet = useCallback(async (id: string) => {
    const res = await fetch(`/api/planets/${id}`).catch(() => null);
    if (!res?.ok) return;
    const { planet } = (await res.json()) as { planet: PlanetSnapshot };
    setPlanets((prev) => (prev ? { ...prev, [id]: planet } : prev));
  }, []);

  useEffect(() => {
    void fetch("/api/planets")
      .then((r) => r.json())
      .then((j: { planets: PlanetSnapshot[] }) => {
        const map: Record<string, PlanetSnapshot> = {};
        for (const p of j.planets) map[p.id] = p;
        setPlanets(map);
      })
      .catch(() => setToast("Could not load the solar system. Is the server healthy?"));
  }, []);

  const socket = useSocket({
    onEvent: (e) =>
      setTerminals((prev) => ({
        ...prev,
        [e.planetId]: [...(prev[e.planetId] ?? []), e].slice(-TERMINAL_CAP),
      })),
    onStatus: (planetId, status: PlanetStatus) =>
      setPlanets((prev) =>
        prev ? { ...prev, [planetId]: { ...prev[planetId], status } } : prev,
      ),
    onRunState: (run) => {
      setActiveRuns((prev) => {
        const next = { ...prev };
        if (run.status === "running") next[run.planetId] = run;
        else delete next[run.planetId];
        return next;
      });
      setPlanets((prev) =>
        prev
          ? {
              ...prev,
              [run.planetId]: {
                ...prev[run.planetId],
                activeRunId: run.status === "running" ? run.id : null,
              },
            }
          : prev,
      );
      // the agent may have edited TODO.md / notes — re-read after it lands
      if (run.status !== "running") void refreshPlanet(run.planetId);
    },
    onError: (message) => setToast(message),
  });

  // replay the latest past run into an empty terminal when opening a planet
  const seedTerminal = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/planets/${id}/runs`).catch(() => null);
      if (!res?.ok) return;
      const { runs } = (await res.json()) as { runs: RunInfo[] };
      const last = runs[0];
      if (!last) return;
      const evRes = await fetch(`/api/runs/${last.id}`).catch(() => null);
      if (!evRes?.ok) return;
      const { events } = (await evRes.json()) as { events: AgentEvent[] };
      setTerminals((prev) =>
        prev[id]?.length ? prev : { ...prev, [id]: events.slice(-TERMINAL_CAP) },
      );
    },
    [],
  );

  const handleSelect = useCallback(
    (id: string) => {
      setSelected(id);
      if (id !== "sun" && !terminals[id]?.length) void seedTerminal(id);
    },
    [terminals, seedTerminal],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const patchPlanet = useCallback(
    async (id: string, body: Partial<{ goal: string; idea: string; notes: string; status: PlanetStatus }>) => {
      if (body.status) {
        setPlanets((prev) =>
          prev ? { ...prev, [id]: { ...prev[id], status: body.status! } } : prev,
        );
      }
      await fetch(`/api/planets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => setToast("Save failed — check the connection."));
    },
    [],
  );

  const saveTodos = useCallback(async (id: string, todos: TodoItem[]) => {
    setPlanets((prev) => (prev ? { ...prev, [id]: { ...prev[id], todos } } : prev));
    const res = await fetch(`/api/planets/${id}/todos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todos }),
    }).catch(() => null);
    if (res?.ok) {
      const json = (await res.json()) as { todos: TodoItem[] };
      setPlanets((prev) => (prev ? { ...prev, [id]: { ...prev[id], todos: json.todos } } : prev));
    } else {
      setToast("Roadmap save failed.");
    }
  }, []);

  const addLog = useCallback(async (id: string, text: string) => {
    const res = await fetch(`/api/planets/${id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => null);
    if (res?.ok) {
      const { entry } = (await res.json()) as { entry: { t: number; text: string } };
      setPlanets((prev) =>
        prev ? { ...prev, [id]: { ...prev[id], logs: [entry, ...prev[id].logs] } } : prev,
      );
    }
  }, []);

  if (!planets) {
    return (
      <main className="flex h-dvh items-center justify-center">
        <Starfield />
        <p className="animate-pulse text-sm" style={{ color: "var(--ink-2)" }}>
          igniting the sun…
        </p>
      </main>
    );
  }

  const selectedDef = selected && selected !== "sun" ? getPlanet(selected) : undefined;

  return (
    <main>
      <Starfield />

      <SolarSystem
        planets={planets}
        score={score}
        band={band}
        selected={selected}
        onSelect={handleSelect}
      />

      <AnimatePresence>
        {selectedDef && planets[selectedDef.id] && (
          <PlanetView
            key={selectedDef.id}
            def={selectedDef}
            snapshot={planets[selectedDef.id]}
            events={terminals[selectedDef.id] ?? []}
            activeRun={activeRuns[selectedDef.id]}
            connected={socket.connected}
            onPatch={(body) => patchPlanet(selectedDef.id, body)}
            onSaveTodos={(todos) => saveTodos(selectedDef.id, todos)}
            onAddLog={(text) => addLog(selectedDef.id, text)}
            onRun={(task, provider: AgentProviderName) => socket.run(selectedDef.id, task, provider)}
            onCancel={(runId) => socket.cancel(runId)}
            onClose={() => setSelected(null)}
          />
        )}
        {selected === "sun" && (
          <SunView
            key="sun"
            planets={planets}
            score={score}
            band={band}
            onSelectPlanet={handleSelect}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* daemon link indicator */}
      {!socket.connected && (
        <div
          className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--edge-strong)", background: "var(--surface-overlay)", color: "var(--ink-2)" }}
        >
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--status-nothing-works)" }} />
          daemon link offline — reconnecting
        </div>
      )}

      {/* number of agents at work, visible from orbit */}
      {Object.keys(activeRuns).length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--edge-strong)", background: "var(--surface-overlay)", color: "var(--ink-2)" }}
        >
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--status-in-progress)" }} />
          {Object.keys(activeRuns).length} agent{Object.keys(activeRuns).length > 1 ? "s" : ""} at work
        </div>
      )}

      {toast && (
        <div
          role="alert"
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm"
          style={{ borderColor: "var(--status-nothing-works)", background: "var(--surface-overlay)", color: "var(--ink)" }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}
