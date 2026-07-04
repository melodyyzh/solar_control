/** WebSocket hub: fan-out of agent/status events, intake of run commands. */

import type { WebSocket, WebSocketServer } from "ws";
import type { ClientMessage, ServerMessage } from "../src/lib/types";
import { isPlanetId } from "../src/lib/planets";
import type { AgentRunner } from "./agent/runner";

export class Hub {
  private clients = new Set<WebSocket>();
  private runner: AgentRunner | null = null;

  setRunner(runner: AgentRunner): void {
    this.runner = runner;
  }

  broadcast(msg: ServerMessage): void {
    const payload = JSON.stringify(msg);
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }

  attach(wss: WebSocketServer): void {
    wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      ws.on("close", () => this.clients.delete(ws));
      ws.on("error", () => this.clients.delete(ws));
      ws.on("message", (raw) => {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(String(raw)) as ClientMessage;
        } catch {
          return;
        }
        try {
          this.handle(msg);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          ws.send(JSON.stringify({ type: "error", message } satisfies ServerMessage));
        }
      });
    });
  }

  private handle(msg: ClientMessage): void {
    if (!this.runner) throw new Error("Agent runner not ready yet.");
    switch (msg.type) {
      case "run": {
        if (!isPlanetId(msg.planetId)) throw new Error(`Unknown planet: ${msg.planetId}`);
        const task = String(msg.task ?? "").trim();
        if (!task) throw new Error("Cannot start a run with an empty task.");
        this.runner.start(msg.planetId, task, msg.provider);
        break;
      }
      case "cancel":
        this.runner.cancel(String(msg.runId));
        break;
    }
  }
}
