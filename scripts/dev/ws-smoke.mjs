// WebSocket smoke test: starts a run on robotics, sends an invalid planet to
// exercise the error path, and prints every message until the run finishes.
// Expects the dashboard on :3777 (see mock-openai.mjs header for the recipe).
import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3777/ws");
const seen = [];
const done = new Promise((resolve) => {
  ws.on("open", () => {
    console.log("OPEN");
    ws.send(JSON.stringify({ type: "run", planetId: "robotics", task: "calibrate servos", provider: "openai" }));
    ws.send(JSON.stringify({ type: "run", planetId: "pluto", task: "nope" })); // error path
  });
  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    seen.push(msg);
    console.log("MSG:", msg.type, msg.type === "event" ? `${msg.event.type}: ${String(msg.event.data).slice(0, 90)}` : JSON.stringify(msg).slice(0, 120));
    if (msg.type === "run-state" && msg.run.status !== "running") resolve();
  });
  setTimeout(resolve, 15000);
});
await done;
ws.close();
console.log("TOTAL MESSAGES:", seen.length);
