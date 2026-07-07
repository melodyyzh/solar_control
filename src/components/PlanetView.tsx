"use client";

/**
 * The universal planet template, expanded fullscreen from its orbit node via
 * a shared layoutId. Tracker-first: status bar, roadmap, quick log, and the
 * agent terminal up front; Goal/Idea/Notes live in a collapsible section
 * (state persisted per planet in localStorage).
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { PlanetDef } from "@/lib/planets";
import { STATUS_COLORS } from "@/lib/planets";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type AgentEvent,
  type AgentProviderName,
  type PlanetSnapshot,
  type PlanetStatus,
  type RunInfo,
} from "@/lib/types";
import { nextTask } from "@/lib/todo";
import TodoRoadmap from "./TodoRoadmap";
import AgentTerminal from "./AgentTerminal";

export interface PlanetViewProps {
  def: PlanetDef;
  snapshot: PlanetSnapshot;
  events: AgentEvent[];
  activeRun: RunInfo | undefined;
  connected: boolean;
  onPatch: (body: Partial<{ goal: string; idea: string; notes: string; status: PlanetStatus }>) => Promise<void>;
  onSaveTodos: (todos: PlanetSnapshot["todos"]) => Promise<void>;
  onAddLog: (text: string) => Promise<void>;
  onRun: (task: string, provider: AgentProviderName) => void;
  onCancel: (runId: string) => void;
  onClose: () => void;
}

export default function PlanetView({
  def,
  snapshot,
  events,
  activeRun,
  connected,
  onPatch,
  onSaveTodos,
  onAddLog,
  onRun,
  onCancel,
  onClose,
}: PlanetViewProps) {
  const [logDraft, setLogDraft] = useState("");

  return (
    <motion.div
      layoutId={`planet-${def.id}`}
      className="fixed inset-0 z-30 overflow-hidden"
      style={{
        borderRadius: 24,
        background: `linear-gradient(180deg, color-mix(in srgb, ${def.colorDeep} 34%, #070b16) 0%, #070b16 34rem), #070b16`,
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
          {/* ---- status bar ---- */}
          <header className="mb-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onClose}
              aria-label="Back to orbit"
              className="flex h-9 w-9 items-center justify-center rounded-full border text-lg hover:bg-white/5"
              style={{ borderColor: "var(--edge-strong)", color: "var(--ink-2)" }}
            >
              ←
            </button>
            <span
              aria-hidden
              className="h-9 w-9 rounded-full"
              style={{
                background: `radial-gradient(circle at 32% 28%, ${def.bright} 0%, ${def.color} 45%, ${def.colorDeep} 100%)`,
                boxShadow: `0 0 14px 1px ${def.glow}`,
              }}
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-semibold">{def.name}</h2>
              <p className="truncate text-xs" style={{ color: "var(--ink-3)" }}>
                {def.tagline}
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_COLORS[snapshot.status] }}
              />
              <select
                value={snapshot.status}
                onChange={(e) => void onPatch({ status: e.target.value as PlanetStatus })}
                aria-label="Project status"
                className="field w-auto cursor-pointer py-2"
                style={{ background: "var(--surface-raised)" }}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </header>

          {/* ---- tracker-first column: roadmap + quick log, extras collapsed ---- */}
          <div className="mx-auto max-w-3xl space-y-6">
            <Panel title="Roadmap">
              <TodoRoadmap
                todos={snapshot.todos}
                accent={def.color}
                onChange={(todos) => void onSaveTodos(todos)}
              />
            </Panel>

            <Panel title="Quick log">
              <div className="flex gap-2">
                <input
                  value={logDraft}
                  onChange={(e) => setLogDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && logDraft.trim()) {
                      void onAddLog(logDraft.trim());
                      setLogDraft("");
                    }
                  }}
                  placeholder="Timestamped note — hit Enter"
                  className="field"
                />
              </div>
              {snapshot.logs.length > 0 && (
                <ul className="mt-3 max-h-44 space-y-1.5 overflow-y-auto">
                  {snapshot.logs.map((l, i) => (
                    <li key={`${l.t}-${i}`} className="flex gap-2 text-xs leading-relaxed">
                      <span className="shrink-0 font-mono" style={{ color: "var(--ink-3)" }}>
                        {new Date(l.t).toLocaleString(undefined, {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span style={{ color: "var(--ink-2)" }}>{l.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Agent feedback">
              <AgentTerminal
                def={def}
                events={events}
                activeRun={activeRun}
                connected={connected}
                defaultTask={nextTask(snapshot.todos)?.text ?? ""}
                onRun={onRun}
                onCancel={onCancel}
              />
            </Panel>

            <Collapse title="Goal · Ideas · Notes" storageKey={`planet:${def.id}:context`}>
              <AutosaveArea
                label="Goal"
                initial={snapshot.goal}
                rows={3}
                placeholder="What is this planet ultimately for?"
                onSave={(v) => onPatch({ goal: v })}
              />
              <AutosaveArea
                label="Idea"
                initial={snapshot.idea}
                rows={3}
                placeholder="Current hypotheses, sparks, directions…"
                onSave={(v) => onPatch({ idea: v })}
              />
              <AutosaveArea
                label="Notes / logs"
                initial={snapshot.notes}
                rows={6}
                placeholder="Working notes, results, references… (markdown welcome)"
                onSave={(v) => onPatch({ notes: v })}
              />
            </Collapse>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- building blocks ---------- */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--edge)", background: "rgba(16,23,40,0.55)" }}
    >
      <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--ink-3)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Collapse({
  title,
  storageKey,
  children,
}: {
  title: string;
  storageKey: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "1",
  );

  function toggle() {
    setOpen((o) => {
      const next = !o;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // private mode etc. — collapse state just won't persist
      }
      return next;
    });
  }

  return (
    <section>
      <button
        onClick={toggle}
        aria-expanded={open}
        className="mb-3 flex w-full items-center gap-2 text-left"
      >
        <span aria-hidden className="text-xs" style={{ color: "var(--ink-3)" }}>
          {open ? "▾" : "▸"}
        </span>
        <span
          className="text-[0.7rem] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--ink-3)" }}
        >
          {title}
        </span>
        <span aria-hidden className="ml-1 h-px flex-1" style={{ background: "var(--edge)" }} />
      </button>
      {open && <div className="space-y-6">{children}</div>}
    </section>
  );
}

function AutosaveArea({
  label,
  initial,
  rows,
  placeholder,
  onSave,
}: {
  label: string;
  initial: string;
  rows: number;
  placeholder: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const firstRender = useRef(true);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const valueRef = useRef(value);
  valueRef.current = value;
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    dirtyRef.current = true;
    setState("saving");
    const t = setTimeout(() => {
      dirtyRef.current = false;
      void onSaveRef.current(valueRef.current).then(() => setState("saved"));
    }, 700);
    return () => clearTimeout(t);
  }, [value]);

  // The debounce cleanup above cancels any pending save; without this flush,
  // edits made just before closing the panel (or the tab) would be lost.
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      void onSaveRef.current(valueRef.current);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--edge)", background: "rgba(16,23,40,0.55)" }}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--ink-3)" }}>
          {label}
        </h3>
        <span className="text-[0.65rem]" style={{ color: "var(--ink-3)" }}>
          {state === "saving" ? "saving…" : state === "saved" ? "saved ✓" : ""}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="field resize-y font-mono text-[0.8rem]"
      />
    </div>
  );
}
