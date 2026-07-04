"use client";

/**
 * Interactive roadmap: a vertical metro-line of checkable milestones.
 * The first unchecked item is "next up" — the default payload for the agent.
 */

import { useState } from "react";
import type { TodoItem } from "@/lib/types";
import { nextTask } from "@/lib/todo";

export interface TodoRoadmapProps {
  todos: TodoItem[];
  accent: string;
  onChange: (todos: TodoItem[]) => void;
}

export default function TodoRoadmap({ todos, accent, onChange }: TodoRoadmapProps) {
  const [draft, setDraft] = useState("");
  const next = nextTask(todos);

  function toggle(idx: number) {
    onChange(todos.map((t, i) => (i === idx ? { ...t, done: !t.done } : t)));
  }
  function remove(idx: number) {
    onChange(todos.filter((_, i) => i !== idx));
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= todos.length) return;
    const copy = [...todos];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    onChange(copy);
  }
  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...todos, { id: String(todos.length), text, done: false }]);
    setDraft("");
  }

  return (
    <div>
      <ol className="relative">
        {todos.map((t, i) => {
          const isNext = next?.id === t.id && !t.done;
          return (
            <li key={`${i}-${t.text}`} className="group relative flex items-start gap-3 pb-1">
              {/* metro line */}
              {i < todos.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[9px] top-6 h-[calc(100%-14px)] w-px"
                  style={{ background: "var(--edge-strong)" }}
                />
              )}
              <button
                onClick={() => toggle(i)}
                aria-label={t.done ? `Mark "${t.text}" not done` : `Mark "${t.text}" done`}
                className="relative z-10 mt-1 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                style={{
                  borderColor: t.done ? accent : isNext ? accent : "var(--edge-strong)",
                  background: t.done ? accent : "transparent",
                }}
              >
                {t.done && (
                  <svg viewBox="0 0 10 8" className="h-2 w-2.5" aria-hidden>
                    <path d="M1 4l2.5 2.5L9 1" fill="none" stroke="#05070f" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>

              <div className="min-w-0 flex-1 py-0.5">
                <p
                  className="text-sm leading-snug"
                  style={{
                    color: t.done ? "var(--ink-3)" : "var(--ink)",
                    textDecoration: t.done ? "line-through" : "none",
                  }}
                >
                  {t.text}
                </p>
                {isNext && (
                  <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: accent }}>
                    ▸ next up
                  </p>
                )}
              </div>

              <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <IconBtn label="Move up" onClick={() => move(i, -1)}>↑</IconBtn>
                <IconBtn label="Move down" onClick={() => move(i, 1)}>↓</IconBtn>
                <IconBtn label="Delete" onClick={() => remove(i)}>×</IconBtn>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a milestone…"
          className="field"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="shrink-0 rounded-lg border px-3 text-sm font-medium transition-opacity disabled:opacity-35"
          style={{ borderColor: "var(--edge-strong)", color: "var(--ink)" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-sm hover:bg-white/10"
      style={{ color: "var(--ink-2)" }}
    >
      {children}
    </button>
  );
}
