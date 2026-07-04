/**
 * File-backed store. Context lives in human-readable markdown inside each
 * planet's folder; dashboard state, telemetry and run logs live under
 * .dashboard/. Single-process, synchronous fs — deliberately simple.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  AgentEvent,
  JournalEntry,
  LogEntry,
  PlanetSnapshot,
  PlanetStatus,
  RunInfo,
  TelemetrySample,
  TodoItem,
} from "../types";
import { parseTodoMarkdown, serializeTodos } from "../todo";
import { CONTEXT_FILES, META_DIR, RUNS_DIR, ensureWorkspace, planetDir } from "./workspace";

const STATE_FILE = path.join(META_DIR, "state.json");
const JOURNAL_FILE = path.join(META_DIR, "JOURNAL.md");
const TELEMETRY_FILE = path.join(META_DIR, "telemetry.jsonl");
const RUN_INDEX_FILE = path.join(RUNS_DIR, "index.json");

interface DashState {
  statuses: Record<string, PlanetStatus>;
}

let ensured = false;
function ensure(): void {
  if (!ensured) {
    ensureWorkspace();
    ensured = true;
  }
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file: string, value: unknown): void {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function readText(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

/* ---------- planet context ---------- */

function contextPath(id: string, file: string): string {
  return path.join(planetDir(id), file);
}

export function getStatus(id: string): PlanetStatus {
  ensure();
  const state = readJson<DashState>(STATE_FILE, { statuses: {} });
  return state.statuses[id] ?? "in-progress";
}

export function setStatus(id: string, status: PlanetStatus): void {
  ensure();
  const state = readJson<DashState>(STATE_FILE, { statuses: {} });
  state.statuses[id] = status;
  writeJsonAtomic(STATE_FILE, state);
}

export function readPlanetSnapshot(id: string, activeRunId: string | null = null): PlanetSnapshot {
  ensure();
  return {
    id,
    status: getStatus(id),
    goal: readText(contextPath(id, CONTEXT_FILES.goal)),
    idea: readText(contextPath(id, CONTEXT_FILES.idea)),
    notes: readText(contextPath(id, CONTEXT_FILES.notes)),
    todos: parseTodoMarkdown(readText(contextPath(id, CONTEXT_FILES.todo))),
    logs: readLogs(id, 30),
    activeRunId,
  };
}

export function writeContextField(id: string, field: "goal" | "idea" | "notes", value: string): void {
  ensure();
  fs.writeFileSync(contextPath(id, CONTEXT_FILES[field]), value, "utf8");
}

export function writeTodos(id: string, todos: TodoItem[]): void {
  ensure();
  fs.writeFileSync(contextPath(id, CONTEXT_FILES.todo), serializeTodos(todos), "utf8");
}

/* ---------- per-planet log (daily note taking) ---------- */

const LOG_LINE_RE = /^- \[(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\] (.*)$/;

function formatLogLine(t: number, text: string): string {
  const d = new Date(t);
  const date = d.toISOString().slice(0, 10);
  const hm = d.toTimeString().slice(0, 5);
  return `- [${date} ${hm}] ${text.replace(/\r?\n/g, " ")}`;
}

export function appendLog(id: string, text: string): LogEntry {
  ensure();
  const entry: LogEntry = { t: Date.now(), text: text.trim() };
  fs.appendFileSync(
    contextPath(id, CONTEXT_FILES.log),
    formatLogLine(entry.t, entry.text) + "\n",
    "utf8",
  );
  return entry;
}

export function readLogs(id: string, limit = 30): LogEntry[] {
  ensure();
  const lines = readText(contextPath(id, CONTEXT_FILES.log)).split(/\r?\n/);
  const entries: LogEntry[] = [];
  for (const line of lines) {
    const m = line.match(LOG_LINE_RE);
    if (!m) continue;
    const t = new Date(`${m[1]}T${m[2]}:00`).getTime();
    entries.push({ t: Number.isNaN(t) ? 0 : t, text: m[3] });
  }
  return entries.slice(-limit).reverse(); // newest first
}

/* ---------- captain's journal (the Sun) ---------- */

export function appendJournal(text: string): JournalEntry {
  ensure();
  const entry: JournalEntry = { t: Date.now(), text: text.trim() };
  const today = new Date(entry.t).toISOString().slice(0, 10);
  const existing = readText(JOURNAL_FILE);
  const header = `## ${today}`;
  let out = existing;
  if (!existing.includes(header)) out += `\n${header}\n\n`;
  out += formatLogLine(entry.t, entry.text) + "\n";
  fs.writeFileSync(JOURNAL_FILE, out, "utf8");
  return entry;
}

export function readJournal(limit = 60): JournalEntry[] {
  ensure();
  const lines = readText(JOURNAL_FILE).split(/\r?\n/);
  const entries: JournalEntry[] = [];
  for (const line of lines) {
    const m = line.match(LOG_LINE_RE);
    if (!m) continue;
    const t = new Date(`${m[1]}T${m[2]}:00`).getTime();
    entries.push({ t: Number.isNaN(t) ? 0 : t, text: m[3] });
  }
  return entries.slice(-limit).reverse();
}

/* ---------- telemetry history ---------- */

export function appendTelemetry(samples: TelemetrySample[]): void {
  ensure();
  const lines = samples
    .filter((s) => typeof s.t === "number" && typeof s.score === "number")
    .map((s) => JSON.stringify({ t: s.t, score: Math.round(s.score) }))
    .join("\n");
  if (lines) fs.appendFileSync(TELEMETRY_FILE, lines + "\n", "utf8");
}

export function readTelemetry(sinceMs: number): TelemetrySample[] {
  ensure();
  const out: TelemetrySample[] = [];
  for (const line of readText(TELEMETRY_FILE).split("\n")) {
    if (!line.trim()) continue;
    try {
      const s = JSON.parse(line) as TelemetrySample;
      if (s.t >= sinceMs) out.push(s);
    } catch {
      /* skip corrupt line */
    }
  }
  return out;
}

/* ---------- agent runs ---------- */

export function createRun(planetId: string, task: string, provider: RunInfo["provider"]): RunInfo {
  ensure();
  const run: RunInfo = {
    id: crypto.randomUUID().slice(0, 8),
    planetId,
    task,
    provider,
    startedAt: Date.now(),
    status: "running",
  };
  const index = readJson<RunInfo[]>(RUN_INDEX_FILE, []);
  index.push(run);
  writeJsonAtomic(RUN_INDEX_FILE, index.slice(-200));
  return run;
}

export function finishRun(runId: string, status: RunInfo["status"]): void {
  const index = readJson<RunInfo[]>(RUN_INDEX_FILE, []);
  const run = index.find((r) => r.id === runId);
  if (run) {
    run.status = status;
    run.finishedAt = Date.now();
    writeJsonAtomic(RUN_INDEX_FILE, index);
  }
}

export function listRuns(planetId: string, limit = 20): RunInfo[] {
  ensure();
  return readJson<RunInfo[]>(RUN_INDEX_FILE, [])
    .filter((r) => r.planetId === planetId)
    .slice(-limit)
    .reverse();
}

export function appendRunEvent(event: AgentEvent): void {
  ensure();
  fs.appendFileSync(
    path.join(RUNS_DIR, `${event.runId}.jsonl`),
    JSON.stringify(event) + "\n",
    "utf8",
  );
}

export function readRunEvents(runId: string): AgentEvent[] {
  ensure();
  if (!/^[a-z0-9-]+$/i.test(runId)) return [];
  const out: AgentEvent[] = [];
  for (const line of readText(path.join(RUNS_DIR, `${runId}.jsonl`)).split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as AgentEvent);
    } catch {
      /* skip */
    }
  }
  return out;
}
