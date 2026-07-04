/**
 * TODO.md roadmap parsing/serialization. The roadmap lives on disk as a plain
 * GitHub-flavored markdown checklist so both the human and the agent can read
 * and edit it with any tool.
 */

import type { TodoItem } from "./types";

const CHECKBOX_RE = /^\s*[-*]\s*\[([ xX])\]\s*(.*)$/;

/** Parse markdown checklist lines into todo items; ignores everything else. */
export function parseTodoMarkdown(md: string): TodoItem[] {
  const items: TodoItem[] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(CHECKBOX_RE);
    if (!m) continue;
    const text = m[2].trim();
    if (!text) continue;
    items.push({ id: String(items.length), text, done: m[1].toLowerCase() === "x" });
  }
  return items;
}

/** Serialize todo items back to a markdown checklist (with a small header). */
export function serializeTodos(items: TodoItem[]): string {
  const lines = items.map((it) => `- [${it.done ? "x" : " "}] ${it.text}`);
  return `# Roadmap\n\n${lines.join("\n")}\n`;
}

/** The next task an agent should pick up: first unchecked item. */
export function nextTask(items: TodoItem[]): TodoItem | undefined {
  return items.find((it) => !it.done);
}

/** Roadmap progress in [0, 1]; 0 for an empty roadmap. */
export function roadmapProgress(items: TodoItem[]): number {
  if (items.length === 0) return 0;
  return items.filter((it) => it.done).length / items.length;
}
