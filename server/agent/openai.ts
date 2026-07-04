/**
 * OpenAI provider: a chat-completions function-calling loop over the four
 * sandboxed tools. Uses plain fetch — no SDK dependency.
 */

import type { AgentProvider, AgentRunContext } from "./provider";
import { RunCancelledError } from "./provider";
import { TOOL_DEFS, createToolRuntime } from "./tools";
import { buildSystemPrompt, buildTaskMessage } from "./prompt";

/** Any OpenAI-compatible endpoint works (OpenRouter, Ollama, vLLM, …). */
const BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const API_URL = `${BASE_URL}/chat/completions`;
const MAX_TURNS = 40;
const MAX_TOOL_RESULT_CHARS = 16_000;

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + `\n… (truncated, ${s.length} chars total)` : s;
}

async function chat(messages: ChatMessage[], model: string, apiKey: string): Promise<ChatMessage> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, tools: TOOL_DEFS }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI API ${res.status}: ${truncate(body, 600)}`);
  }
  const json = (await res.json()) as { choices?: { message?: ChatMessage }[] };
  const msg = json.choices?.[0]?.message;
  if (!msg) throw new Error("OpenAI API returned no message.");
  return msg;
}

export const openAIProvider: AgentProvider = {
  name: "openai",

  async run(ctx: AgentRunContext): Promise<{ summary: string }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set. Add it to .env and restart the server.");
    }
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    const tools = createToolRuntime(ctx.projectDir, ctx.emit, ctx.onShellFailure);
    ctx.onCancel(() => tools.abort());

    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(ctx.planetName) },
      { role: "user", content: buildTaskMessage(ctx.task, ctx.contextBundle) },
    ];

    ctx.emit("assistant", `⟡ engaging ${model} on task: ${ctx.task}`);

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (ctx.isCancelled()) throw new RunCancelledError();

      const msg = await chat(messages, model, apiKey);
      messages.push(msg);

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        const summary = msg.content?.trim() || "(the agent returned no summary)";
        ctx.emit("summary", summary);
        return { summary };
      }

      if (msg.content?.trim()) ctx.emit("assistant", msg.content.trim());

      for (const tc of toolCalls) {
        if (ctx.isCancelled()) throw new RunCancelledError();
        ctx.emit("tool-call", `${tc.function.name} ${truncate(tc.function.arguments ?? "", 500)}`);
        const result = await tools.execute(tc.function.name, tc.function.arguments ?? "{}");
        // shell output already streamed chunk-by-chunk; other tools report here
        if (tc.function.name !== "execute_shell_command") {
          ctx.emit("tool-result", truncate(result, 1_500));
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: truncate(result, MAX_TOOL_RESULT_CHARS),
        });
      }
    }

    const summary = "Reached the maximum number of agent turns without a final summary. Consider splitting the task into smaller roadmap items.";
    ctx.emit("summary", summary);
    return { summary };
  },
};
