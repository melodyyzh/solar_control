/** Pluggable agent-provider interface: OpenAI today, anything tomorrow. */

import type { AgentEventType, AgentProviderName } from "../../src/lib/types";

export interface AgentRunContext {
  planetId: string;
  planetName: string;
  task: string;
  /** absolute path of the planet's sandboxed project directory */
  projectDir: string;
  /** concatenated GOAL/IDEAS/TODO/recent-notes snapshot */
  contextBundle: string;
  emit: (type: AgentEventType, data: string) => void;
  isCancelled: () => boolean;
  /** called whenever a shell command exits non-zero */
  onShellFailure: (command: string, code: number | null) => void;
  /** registers a teardown hook fired on cancellation */
  onCancel: (fn: () => void) => void;
}

export interface AgentProvider {
  readonly name: AgentProviderName;
  run(ctx: AgentRunContext): Promise<{ summary: string }>;
}

export class RunCancelledError extends Error {
  constructor() {
    super("Run cancelled by the manager");
    this.name = "RunCancelledError";
  }
}
