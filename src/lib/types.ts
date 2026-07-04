/** Shared types used by the frontend, the API routes and the agent daemon. */

export type PlanetStatus = "in-progress" | "needs-feedback" | "nothing-works";

export const STATUS_LABELS: Record<PlanetStatus, string> = {
  "in-progress": "Work in progress",
  "needs-feedback": "Work done, need feedback",
  "nothing-works": "Nothing works",
};

export const STATUS_ORDER: PlanetStatus[] = [
  "in-progress",
  "needs-feedback",
  "nothing-works",
];

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface LogEntry {
  /** epoch ms */
  t: number;
  text: string;
}

/** Everything the expanded planet template needs, read from the planet's files. */
export interface PlanetSnapshot {
  id: string;
  status: PlanetStatus;
  goal: string;
  idea: string;
  notes: string;
  todos: TodoItem[];
  logs: LogEntry[];
  /** id of the run currently executing for this planet, if any */
  activeRunId: string | null;
}

export type AgentProviderName = "openai" | "claude-code";

export type AgentEventType =
  | "run-started"
  | "assistant"
  | "tool-call"
  | "tool-result"
  | "shell-stdout"
  | "shell-stderr"
  | "summary"
  | "error"
  | "run-finished";

export interface AgentEvent {
  runId: string;
  planetId: string;
  /** epoch ms */
  t: number;
  type: AgentEventType;
  data: string;
}

export type RunStatus = "running" | "done" | "error" | "cancelled";

export interface RunInfo {
  id: string;
  planetId: string;
  task: string;
  provider: AgentProviderName;
  startedAt: number;
  finishedAt?: number;
  status: RunStatus;
}

export interface TelemetrySample {
  /** epoch ms */
  t: number;
  /** activity density score 0-100 */
  score: number;
}

export interface JournalEntry {
  t: number;
  text: string;
}

/* ---------- WebSocket protocol ---------- */

export type ClientMessage =
  | { type: "run"; planetId: string; task: string; provider?: AgentProviderName }
  | { type: "cancel"; runId: string };

export type ServerMessage =
  | { type: "event"; event: AgentEvent }
  | { type: "status"; planetId: string; status: PlanetStatus }
  | { type: "run-state"; run: RunInfo }
  | { type: "error"; message: string };
