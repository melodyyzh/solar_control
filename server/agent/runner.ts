/**
 * Run lifecycle: one concurrent run per planet, events persisted to
 * .dashboard/runs/ and broadcast live over the WebSocket hub. A failing shell
 * command flips the planet status to "nothing-works" (per spec).
 */

import type {
  AgentEvent,
  AgentEventType,
  AgentProviderName,
  RunInfo,
  ServerMessage,
} from "../../src/lib/types";
import { getPlanet } from "../../src/lib/planets";
import { planetDir } from "../../src/lib/server/workspace";
import * as store from "../../src/lib/server/store";
import type { AgentProvider } from "./provider";
import { RunCancelledError } from "./provider";
import { openAIProvider } from "./openai";
import { claudeCodeProvider } from "./claude";

const PROVIDERS: Record<AgentProviderName, AgentProvider> = {
  openai: openAIProvider,
  "claude-code": claudeCodeProvider,
};

const CONTEXT_SNIPPET = 4_000;

interface ActiveRun {
  run: RunInfo;
  cancelled: boolean;
  cancelHooks: (() => void)[];
}

export class AgentRunner {
  private active = new Map<string, ActiveRun>(); // keyed by planetId
  constructor(private broadcast: (msg: ServerMessage) => void) {}

  activeRunId(planetId: string): string | null {
    return this.active.get(planetId)?.run.id ?? null;
  }

  cancel(runId: string): boolean {
    for (const a of this.active.values()) {
      if (a.run.id === runId) {
        a.cancelled = true;
        for (const hook of a.cancelHooks) {
          try {
            hook();
          } catch {
            /* best effort */
          }
        }
        return true;
      }
    }
    return false;
  }

  start(planetId: string, task: string, providerName: AgentProviderName = "openai"): RunInfo {
    const planet = getPlanet(planetId);
    if (!planet) throw new Error(`Unknown planet: ${planetId}`);
    if (this.active.has(planetId)) {
      throw new Error(`${planet.name} already has an agent running. Cancel it first.`);
    }
    const provider = PROVIDERS[providerName] ?? openAIProvider;
    const run = store.createRun(planetId, task, provider.name);
    const state: ActiveRun = { run, cancelled: false, cancelHooks: [] };
    this.active.set(planetId, state);

    const emit = (type: AgentEventType, data: string) => {
      const event: AgentEvent = { runId: run.id, planetId, t: Date.now(), type, data };
      store.appendRunEvent(event);
      this.broadcast({ type: "event", event });
    };

    this.broadcast({ type: "run-state", run });
    emit("run-started", `task: ${task}\nprovider: ${provider.name}`);

    const snapshot = store.readPlanetSnapshot(planetId);
    const contextBundle = [
      `### GOAL.md\n${snapshot.goal.slice(0, CONTEXT_SNIPPET)}`,
      `### IDEAS.md\n${snapshot.idea.slice(0, CONTEXT_SNIPPET)}`,
      `### TODO.md (roadmap)\n${snapshot.todos.map((t) => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n") || "(empty)"}`,
      `### Recent notes\n${snapshot.notes.slice(0, CONTEXT_SNIPPET)}`,
      `### Recent log entries\n${snapshot.logs.slice(0, 10).map((l) => `- ${l.text}`).join("\n") || "(none)"}`,
    ].join("\n\n");

    const finish = (status: RunInfo["status"]) => {
      this.active.delete(planetId);
      store.finishRun(run.id, status);
      const done: RunInfo = { ...run, status, finishedAt: Date.now() };
      emit("run-finished", status);
      this.broadcast({ type: "run-state", run: done });
    };

    provider
      .run({
        planetId,
        planetName: planet.name,
        task,
        projectDir: planetDir(planetId),
        contextBundle,
        emit,
        isCancelled: () => state.cancelled,
        onCancel: (fn) => state.cancelHooks.push(fn),
        onShellFailure: () => {
          // Spec: a failing shell command flips the planet to "Nothing works".
          store.setStatus(planetId, "nothing-works");
          this.broadcast({ type: "status", planetId, status: "nothing-works" });
        },
      })
      .then(() => finish("done"))
      .catch((err: unknown) => {
        if (state.cancelled || err instanceof RunCancelledError) {
          finish("cancelled");
        } else {
          emit("error", err instanceof Error ? err.message : String(err));
          finish("error");
        }
      });

    return run;
  }
}
