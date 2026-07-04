/**
 * Workspace layout on disk. Each planet owns a real directory the agent works
 * in; all dashboard bookkeeping lives under .dashboard/ so project folders
 * stay clean.
 *
 *   $WORKSPACE_DIR/
 *     best-deals/ … semicond/     ← one per planet
 *       GOAL.md IDEAS.md TODO.md NOTES.md LOG.md papers/
 *     .dashboard/
 *       state.json                ← statuses & misc
 *       JOURNAL.md                ← daily captain's log (the Sun)
 *       telemetry.jsonl           ← activity score history
 *       runs/<runId>.jsonl        ← agent run event streams
 *       runs/index.json           ← run metadata
 */

import fs from "node:fs";
import path from "node:path";
import { PLANETS, isPlanetId } from "../planets";

export const WORKSPACE_DIR = path.resolve(
  process.env.WORKSPACE_DIR ?? path.join(process.cwd(), "workspace"),
);
export const META_DIR = path.join(WORKSPACE_DIR, ".dashboard");
export const RUNS_DIR = path.join(META_DIR, "runs");

export const CONTEXT_FILES = {
  goal: "GOAL.md",
  idea: "IDEAS.md",
  todo: "TODO.md",
  notes: "NOTES.md",
  log: "LOG.md",
} as const;

export function planetDir(id: string): string {
  if (!isPlanetId(id)) throw new Error(`Unknown planet: ${id}`);
  return path.join(WORKSPACE_DIR, id);
}

const SEEDS: Record<string, (name: string) => string> = {
  [CONTEXT_FILES.goal]: (n) => `# Goal — ${n}\n\n`,
  [CONTEXT_FILES.idea]: (n) => `# Ideas — ${n}\n\n`,
  [CONTEXT_FILES.todo]: () => `# Roadmap\n\n- [ ] Define the first concrete milestone\n`,
  [CONTEXT_FILES.notes]: (n) => `# Notes — ${n}\n\n`,
  [CONTEXT_FILES.log]: (n) => `# Log — ${n}\n\n`,
};

/** Idempotently create the workspace tree and seed missing files. */
export function ensureWorkspace(): void {
  fs.mkdirSync(RUNS_DIR, { recursive: true });
  for (const p of PLANETS) {
    const dir = path.join(WORKSPACE_DIR, p.id);
    fs.mkdirSync(path.join(dir, "papers"), { recursive: true });
    for (const [file, seed] of Object.entries(SEEDS)) {
      const fp = path.join(dir, file);
      if (!fs.existsSync(fp)) fs.writeFileSync(fp, seed(p.name), "utf8");
    }
  }
  const journal = path.join(META_DIR, "JOURNAL.md");
  if (!fs.existsSync(journal)) {
    fs.writeFileSync(journal, "# Captain's log\n\n", "utf8");
  }
}

/**
 * Resolve a path supplied by the agent, guaranteeing it stays inside the
 * planet's directory. Throws on escape attempts.
 */
export function resolveInside(projectDir: string, relPath: string): string {
  const resolved = path.resolve(projectDir, relPath);
  const root = path.resolve(projectDir);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Path escapes the project sandbox: ${relPath}`);
  }
  return resolved;
}
