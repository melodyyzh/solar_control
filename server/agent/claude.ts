/**
 * Experimental Claude Code provider: drives a headless `claude -p` session in
 * the project directory and relays its stream-json events. Requires the
 * Claude Code CLI to be installed and authenticated on this machine.
 */

import { spawn } from "node:child_process";
import type { AgentProvider, AgentRunContext } from "./provider";
import { buildSystemPrompt, buildTaskMessage } from "./prompt";

export const claudeCodeProvider: AgentProvider = {
  name: "claude-code",

  run(ctx: AgentRunContext): Promise<{ summary: string }> {
    return new Promise((resolve, reject) => {
      const prompt = `${buildSystemPrompt(ctx.planetName)}\n\n${buildTaskMessage(ctx.task, ctx.contextBundle)}`;
      const child = spawn(
        "claude",
        [
          "-p",
          prompt,
          "--output-format",
          "stream-json",
          "--verbose",
          "--permission-mode",
          "acceptEdits",
        ],
        { cwd: ctx.projectDir, stdio: ["ignore", "pipe", "pipe"] },
      );

      ctx.onCancel(() => child.kill("SIGTERM"));
      ctx.emit("assistant", "⟡ engaging local Claude Code session (experimental)");

      let summary = "";
      let buffer = "";

      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            const evt = JSON.parse(line) as {
              type?: string;
              result?: string;
              message?: { content?: { type: string; text?: string; name?: string; input?: unknown }[] };
            };
            if (evt.type === "assistant" && evt.message?.content) {
              for (const block of evt.message.content) {
                if (block.type === "text" && block.text) ctx.emit("assistant", block.text);
                if (block.type === "tool_use" && block.name) {
                  ctx.emit("tool-call", `${block.name} ${JSON.stringify(block.input ?? {}).slice(0, 400)}`);
                }
              }
            } else if (evt.type === "result" && typeof evt.result === "string") {
              summary = evt.result;
            }
          } catch {
            ctx.emit("shell-stdout", line + "\n");
          }
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        ctx.emit("shell-stderr", chunk.toString("utf8"));
      });

      child.on("error", (err) => {
        reject(
          new Error(
            `Could not start the Claude Code CLI (${err.message}). Install it with: npm install -g @anthropic-ai/claude-code`,
          ),
        );
      });

      child.on("close", (code) => {
        if (ctx.isCancelled()) {
          reject(new Error("Run cancelled by the manager"));
        } else if (code !== 0 && !summary) {
          ctx.onShellFailure("claude -p …", code);
          reject(new Error(`Claude Code exited with code ${code}`));
        } else {
          const finalSummary = summary || "(Claude Code session ended without a result payload)";
          ctx.emit("summary", finalSummary);
          resolve({ summary: finalSummary });
        }
      });
    });
  },
};
