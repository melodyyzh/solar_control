/**
 * The four sandboxed tools exposed to the agent. All file access is confined
 * to the planet's project directory; shell commands run with cwd locked to it.
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { resolveInside } from "../../src/lib/server/workspace";
import type { AgentEventType } from "../../src/lib/types";

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const TOOL_DEFS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "read_file_structure",
      description:
        "List the file/directory tree of the project (or a subdirectory), depth-limited. Use this first to orient yourself.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path inside the project. Default: project root." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "view_file_contents",
      description: "Read a text file inside the project.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path of the file to read." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_or_edit_file",
      description:
        "Create or overwrite a file inside the project with the given full content. Parent directories are created automatically.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path of the file to write." },
          content: { type: "string", description: "Complete new file content." },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_shell_command",
      description:
        "Run a bash command with the working directory locked to the project root. Output is streamed to the manager. 3 minute timeout.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The bash command to execute." },
        },
        required: ["command"],
      },
    },
  },
];

const MAX_TREE_ENTRIES = 400;
const MAX_FILE_BYTES = 60_000;
const MAX_SHELL_OUTPUT = 20_000;
const SHELL_TIMEOUT_MS = 180_000;
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "__pycache__", ".venv", "venv"]);

function listTree(root: string, dir: string, depth: number, lines: string[]): void {
  if (depth > 4 || lines.length >= MAX_TREE_ENTRIES) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    if (lines.length >= MAX_TREE_ENTRIES) {
      lines.push("… (truncated)");
      return;
    }
    const rel = path.relative(root, path.join(dir, e.name));
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) {
        lines.push(`${rel}/ (skipped)`);
        continue;
      }
      lines.push(`${rel}/`);
      listTree(root, path.join(dir, e.name), depth + 1, lines);
    } else {
      let size = 0;
      try {
        size = fs.statSync(path.join(dir, e.name)).size;
      } catch {
        /* ignore */
      }
      lines.push(`${rel} (${size} B)`);
    }
  }
}

export interface ToolRuntime {
  execute(name: string, argsJson: string): Promise<string>;
  /** kills any in-flight shell command (used on cancel) */
  abort(): void;
}

export function createToolRuntime(
  projectDir: string,
  emit: (type: AgentEventType, data: string) => void,
  onShellFailure: (command: string, code: number | null) => void,
): ToolRuntime {
  let activeChild: ReturnType<typeof spawn> | null = null;
  let aborted = false;

  async function execute(name: string, argsJson: string): Promise<string> {
    let args: Record<string, unknown> = {};
    try {
      args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
    } catch {
      return "ERROR: tool arguments were not valid JSON.";
    }

    try {
      switch (name) {
        case "read_file_structure": {
          const rel = typeof args.path === "string" && args.path ? args.path : ".";
          const target = resolveInside(projectDir, rel);
          const lines: string[] = [];
          listTree(projectDir, target, 0, lines);
          return lines.length ? lines.join("\n") : "(empty directory)";
        }
        case "view_file_contents": {
          const target = resolveInside(projectDir, String(args.path ?? ""));
          const stat = fs.statSync(target);
          if (stat.size > MAX_FILE_BYTES) {
            const fd = fs.openSync(target, "r");
            const buf = Buffer.alloc(MAX_FILE_BYTES);
            fs.readSync(fd, buf, 0, MAX_FILE_BYTES, 0);
            fs.closeSync(fd);
            return buf.toString("utf8") + `\n… (truncated at ${MAX_FILE_BYTES} bytes of ${stat.size})`;
          }
          return fs.readFileSync(target, "utf8");
        }
        case "write_or_edit_file": {
          const target = resolveInside(projectDir, String(args.path ?? ""));
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, String(args.content ?? ""), "utf8");
          return `Wrote ${Buffer.byteLength(String(args.content ?? ""))} bytes to ${path.relative(projectDir, target)}`;
        }
        case "execute_shell_command": {
          const command = String(args.command ?? "").trim();
          if (!command) return "ERROR: empty command.";
          return await runShell(command);
        }
        default:
          return `ERROR: unknown tool "${name}".`;
      }
    } catch (err) {
      return `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  function runShell(command: string): Promise<string> {
    return new Promise((resolve) => {
      const child = spawn("/bin/bash", ["-c", command], {
        cwd: projectDir,
        env: { ...process.env, PWD: projectDir },
        stdio: ["ignore", "pipe", "pipe"],
      });
      activeChild = child;
      let out = "";
      let killedByTimeout = false;

      const timer = setTimeout(() => {
        killedByTimeout = true;
        child.kill("SIGKILL");
      }, SHELL_TIMEOUT_MS);

      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf8");
        out += text;
        emit("shell-stdout", text);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf8");
        out += text;
        emit("shell-stderr", text);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        activeChild = null;
        const tail = out.length > MAX_SHELL_OUTPUT ? "…" + out.slice(-MAX_SHELL_OUTPUT) : out;
        if (killedByTimeout) {
          onShellFailure(command, code);
          resolve(`COMMAND TIMED OUT after ${SHELL_TIMEOUT_MS / 1000}s.\n${tail}`);
        } else if (aborted) {
          resolve(`COMMAND CANCELLED by the manager.\n${tail}`);
        } else if (code !== 0) {
          onShellFailure(command, code);
          resolve(`EXIT CODE ${code}\n${tail}`);
        } else {
          resolve(tail || "(no output, exit 0)");
        }
      });
      child.on("error", (err) => {
        clearTimeout(timer);
        activeChild = null;
        resolve(`ERROR spawning command: ${err.message}`);
      });
    });
  }

  return {
    execute,
    abort() {
      aborted = true;
      activeChild?.kill("SIGKILL");
    },
  };
}
