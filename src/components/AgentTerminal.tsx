"use client";

/**
 * Read-only terminal for the agent's live output plus the execution trigger.
 * Events stream in over the WebSocket; the final summary renders as markdown.
 */

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { PlanetDef } from "@/lib/planets";
import type { AgentEvent, AgentProviderName, RunInfo } from "@/lib/types";

export interface AgentTerminalProps {
  def: PlanetDef;
  events: AgentEvent[];
  activeRun: RunInfo | undefined;
  connected: boolean;
  defaultTask: string;
  onRun: (task: string, provider: AgentProviderName) => void;
  onCancel: (runId: string) => void;
}

export default function AgentTerminal({
  def,
  events,
  activeRun,
  connected,
  defaultTask,
  onRun,
  onCancel,
}: AgentTerminalProps) {
  const [task, setTask] = useState(defaultTask);
  const [provider, setProvider] = useState<AgentProviderName>("openai");
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  // follow defaultTask until the user edits
  const editedRef = useRef(false);
  useEffect(() => {
    if (!editedRef.current) setTask(defaultTask);
  }, [defaultTask]);

  useEffect(() => {
    if (!activeRun) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - activeRun.startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [activeRun]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  const running = Boolean(activeRun);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          value={task}
          onChange={(e) => {
            editedRef.current = true;
            setTask(e.target.value);
          }}
          placeholder="Task for the agent (defaults to the next roadmap item)"
          className="field min-w-40 flex-1"
          disabled={running}
        />
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as AgentProviderName)}
          disabled={running}
          aria-label="Agent provider"
          className="field w-auto shrink-0 cursor-pointer"
          style={{ background: "var(--surface-raised)" }}
        >
          <option value="openai">OpenAI</option>
          <option value="claude-code">Claude Code (exp.)</option>
        </select>
        {running ? (
          <button
            onClick={() => activeRun && onCancel(activeRun.id)}
            className="shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--status-nothing-works)", color: "var(--status-nothing-works)" }}
          >
            Abort · {elapsed}s
          </button>
        ) : (
          <button
            onClick={() => task.trim() && onRun(task.trim(), provider)}
            disabled={!connected || !task.trim()}
            title={connected ? "Execute this task in the project sandbox" : "Daemon link offline"}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-35"
            style={{ background: def.color }}
          >
            ▶ Execute
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        className="h-80 overflow-y-auto rounded-xl border p-3 font-mono text-xs leading-relaxed"
        style={{ borderColor: "var(--edge)", background: "rgba(3,6,14,0.8)" }}
        aria-live="polite"
        aria-label="Agent feedback"
      >
        {events.length === 0 && (
          <p style={{ color: "var(--ink-3)" }}>
            No agent activity yet. Point it at a roadmap item and hit Execute.
          </p>
        )}
        {events.map((e, i) => (
          <EventLine key={`${e.runId}-${i}`} event={e} accent={def.bright} />
        ))}
        {running && (
          <p className="mt-1 animate-pulse" style={{ color: "var(--ink-2)" }}>
            ▍working…
          </p>
        )}
      </div>

      <p className="mt-1.5 text-[0.68rem]" style={{ color: "var(--ink-3)" }}>
        Runs are sandboxed to <span className="font-mono">workspace/{def.id}/</span>. Agents may
        suggest schedule changes but can never touch your calendar — those need your explicit OK.
      </p>
    </div>
  );
}

function EventLine({ event, accent }: { event: AgentEvent; accent: string }) {
  switch (event.type) {
    case "run-started":
      return (
        <p className="mt-2 border-t pt-2 first:mt-0 first:border-t-0 first:pt-0" style={{ color: "var(--ink-3)", borderColor: "var(--edge)" }}>
          ── run {event.runId} · {new Date(event.t).toLocaleTimeString()} ──{"\n"}
          {event.data}
        </p>
      );
    case "assistant":
      return <p className="whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>{event.data}</p>;
    case "tool-call":
      return (
        <p className="whitespace-pre-wrap break-all">
          <span style={{ color: accent }}>⚙ </span>
          <span style={{ color: "var(--ink-2)" }}>{event.data}</span>
        </p>
      );
    case "tool-result":
      return <p className="whitespace-pre-wrap opacity-60" style={{ color: "var(--ink-3)" }}>{event.data}</p>;
    case "shell-stdout":
      return <span className="whitespace-pre-wrap" style={{ color: "var(--ink)" }}>{event.data}</span>;
    case "shell-stderr":
      return <span className="whitespace-pre-wrap" style={{ color: "#fca5a5" }}>{event.data}</span>;
    case "summary":
      return (
        <div className="my-2 rounded-lg border p-3" style={{ borderColor: "var(--edge-strong)", background: "rgba(148,163,184,0.05)" }}>
          <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: accent }}>
            Agent summary
          </p>
          <div className="md">
            <ReactMarkdown>{event.data}</ReactMarkdown>
          </div>
        </div>
      );
    case "error":
      return (
        <p className="whitespace-pre-wrap font-semibold" style={{ color: "var(--status-nothing-works)" }}>
          ✗ {event.data}
        </p>
      );
    case "run-finished":
      return (
        <p style={{ color: "var(--ink-3)" }}>── finished: {event.data} ──</p>
      );
    default:
      return null;
  }
}
