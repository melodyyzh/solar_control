// Mock OpenAI chat-completions server used to exercise the agent loop without
// spending credits. Scripts a 4-turn run: shell echo+pwd, sandbox escape
// attempt, failing command (must flip status to nothing-works), summary.
//
// Usage:
//   node scripts/dev/mock-openai.mjs &
//   PORT=3777 OPENAI_API_KEY=test OPENAI_BASE_URL=http://localhost:3778/v1 npm start
//   node scripts/dev/ws-smoke.mjs
import http from "node:http";

let call = 0;
const turns = [
  {
    tool_calls: [{ id: "c1", type: "function", function: { name: "execute_shell_command", arguments: JSON.stringify({ command: "echo hello from the sandbox && pwd" }) } }],
    content: "Let me check where I am.",
  },
  {
    tool_calls: [{ id: "c2", type: "function", function: { name: "view_file_contents", arguments: JSON.stringify({ path: "../../../etc/passwd" }) } }],
    content: null,
  },
  {
    tool_calls: [{ id: "c3", type: "function", function: { name: "execute_shell_command", arguments: JSON.stringify({ command: "false" }) } }],
    content: null,
  },
  {
    tool_calls: undefined,
    content: "## Summary\n\nSandbox verified: escape blocked, failure detected. **All checks exercised.**",
  },
];

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const t = turns[Math.min(call, turns.length - 1)];
      call++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: t.content, tool_calls: t.tool_calls } }] }));
    });
  })
  .listen(3778, () => console.log("mock openai on :3778"));
