# My Solar System Dashboard — agent notes

Radial mission-control for six research projects. One Node process serves the
Next.js UI **and** the agent daemon's WebSocket on a single port. Read
`docs/HISTORY.md` for how it got here and `docs/FUTURE_WORK.md` before
planning new features.

## Commands

```bash
npm run dev        # hot-reload dev server (custom server, not `next dev`)
npm run build      # required before `npm start`
npm start          # production
npm test           # vitest — layout math, todo parsing, telemetry scoring
npm run typecheck  # tsc --noEmit
```

There is no lint config; `tsc` + tests are the gate. Always run both after
changes, and `npm run build` before calling anything done — route handlers and
the middleware only break at build time.

## Architecture (the parts that bite)

- `server/index.ts` is a **custom server**: Next request handler + `ws`
  WebSocketServer share one `http.Server`. `/ws` upgrades go to the hub;
  everything else goes to `app.getUpgradeHandler()` (Next HMR in dev).
- **`src/lib/server/bridge.ts` is load-bearing.** Next bundles API routes into
  its own module graph, so module singletons exist twice. The hub and runner
  are registered on `globalThis` by the custom server and fetched by routes
  via `getHub()`/`getRunner()`. Never share server state through plain module
  scope; always go through the bridge.
- **Files are the database.** Planet context lives in
  `workspace/<planet>/{GOAL,IDEAS,TODO,NOTES,LOG}.md`; dashboard bookkeeping
  (statuses, journal, telemetry JSONL, run event JSONL) in
  `workspace/.dashboard/`. `store.ts` is synchronous fs — fine because there
  is exactly one process. Don't run two instances on one workspace.
- **Agent providers** implement `AgentProvider` (`server/agent/provider.ts`).
  `openai.ts` is a fetch-based chat-completions tool loop (no SDK);
  `claude.ts` shells out to the `claude` CLI (experimental, never tested
  against the real CLI). Tools in `tools.ts` are sandboxed via
  `resolveInside()` — path escapes throw; shell runs with cwd locked to the
  planet dir, 180s timeout.
- Spec behavior: any non-zero shell exit flips the planet status to
  `nothing-works` and broadcasts it. Max 40 agent turns per run. One
  concurrent run per planet.
- WS protocol types live in `src/lib/types.ts` (`ClientMessage` /
  `ServerMessage`). Keep them in sync with `useSocket.ts` and `server/ws.ts`.

## Frontend conventions

- **Orbital math is pure and tested** (`src/lib/orbit.ts`,
  `tests/orbit.test.ts`). Planets are positioned by
  `rotate(θ) translate(R) rotate(−θ)`; the outer wrapper div owns that
  transform (margin-centered, not translate-centered) while the **inner**
  motion element owns the `layoutId` — keep those separate or Framer's FLIP
  fights the orbit.
- Orbit drift makes planets "unstable" to Playwright — use `force: true`
  clicks in browser tests.
- **Colors are validated.** Planet identity + status colors passed the dataviz
  palette validator against surface `#0a0f1e` (lightness band, chroma, CVD,
  contrast). If you add UI colors with meaning, validate them the same way;
  decorative gradient companions (`bright`/`colorDeep`) are exempt. Text
  always wears ink tokens (`--ink`, `--ink-2`, `--ink-3`), never series color.
- Next 15 idioms: route handler `params` are Promises (`await params`);
  middleware runs on edge (no node:crypto there).

## Environment

`.env` (see `.env.example`): `OPENAI_API_KEY`, `OPENAI_MODEL` (default
`gpt-5-mini`), `OPENAI_BASE_URL` (any OpenAI-compatible endpoint),
`DASH_TOKEN` (unset = no auth), `WORKSPACE_DIR`, `PORT`.
`workspace/` and `.env` are gitignored; `workspace/` self-seeds on boot.
