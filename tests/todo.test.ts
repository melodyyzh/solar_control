import { describe, it, expect } from "vitest";
import { parseTodoMarkdown, serializeTodos, nextTask, roadmapProgress } from "../src/lib/todo";

describe("parseTodoMarkdown", () => {
  it("parses checked and unchecked items, ignoring prose", () => {
    const md = [
      "# Roadmap",
      "",
      "some intro text",
      "- [ ] build the reactor",
      "- [x] read the paper",
      "* [X] star-style checked item",
      "- not a checkbox",
      "  - [ ] indented item",
    ].join("\n");
    const items = parseTodoMarkdown(md);
    expect(items.map((i) => i.text)).toEqual([
      "build the reactor",
      "read the paper",
      "star-style checked item",
      "indented item",
    ]);
    expect(items.map((i) => i.done)).toEqual([false, true, true, false]);
  });

  it("round-trips through serializeTodos", () => {
    const items = parseTodoMarkdown("- [ ] a\n- [x] b\n");
    const md = serializeTodos(items);
    expect(parseTodoMarkdown(md)).toEqual(items);
  });

  it("handles empty and checkbox-free documents", () => {
    expect(parseTodoMarkdown("")).toEqual([]);
    expect(parseTodoMarkdown("just notes\nno list here")).toEqual([]);
  });
});

describe("nextTask", () => {
  it("returns the first unchecked item", () => {
    const items = parseTodoMarkdown("- [x] done\n- [ ] next up\n- [ ] later");
    expect(nextTask(items)?.text).toBe("next up");
  });

  it("returns undefined when everything is done", () => {
    const items = parseTodoMarkdown("- [x] a\n- [x] b");
    expect(nextTask(items)).toBeUndefined();
  });
});

describe("roadmapProgress", () => {
  it("is 0 for empty, fraction otherwise", () => {
    expect(roadmapProgress([])).toBe(0);
    const items = parseTodoMarkdown("- [x] a\n- [ ] b\n- [x] c\n- [ ] d");
    expect(roadmapProgress(items)).toBeCloseTo(0.5, 10);
  });
});
