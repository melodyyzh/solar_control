/**
 * Custom server: Next.js request handling and the agent daemon's WebSocket
 * endpoint share one HTTP server and one port, so a single Tailscale/tunnel
 * URL reaches everything from any device.
 */

import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { Hub } from "./ws";
import { AgentRunner } from "./agent/runner";
import { ensureWorkspace, WORKSPACE_DIR } from "../src/lib/server/workspace";
import { registerHub } from "../src/lib/server/bridge";
import { tokenFromCookieHeader, tokenMatches } from "../src/lib/server/auth";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";

async function main(): Promise<void> {
  ensureWorkspace();

  const app = next({ dev, hostname, port });
  await app.prepare();
  const handle = app.getRequestHandler();
  const nextUpgrade = app.getUpgradeHandler();

  const hub = new Hub();
  const runner = new AgentRunner((msg) => hub.broadcast(msg));
  hub.setRunner(runner);
  registerHub(hub, runner); // shares instances with Next-bundled API routes

  const server = createServer((req, res) => handle(req, res));
  const wss = new WebSocketServer({ noServer: true });
  hub.attach(wss);

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (pathname === "/ws") {
      const token =
        tokenFromCookieHeader(req.headers.cookie) ??
        new URL(req.url ?? "/", "http://localhost").searchParams.get("token");
      if (!tokenMatches(token)) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    } else {
      // Next.js HMR websocket in dev
      void nextUpgrade(req, socket, head);
    }
  });

  server.listen(port, hostname, () => {
    console.log(`☀  Solar dashboard ready on http://${hostname}:${port} (${dev ? "dev" : "production"})`);
    console.log(`   workspace: ${WORKSPACE_DIR}`);
    console.log(`   auth: ${process.env.DASH_TOKEN ? "token required" : "open (set DASH_TOKEN to lock down)"}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
