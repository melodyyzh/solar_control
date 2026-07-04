# ☀ My Solar System Dashboard

A radial mission-control for six research projects. Each project is a planet
orbiting a Sun that visualizes **your own live activity**; every planet owns a
real directory on disk where an AI agent (OpenAI function-calling loop, or an
experimental local Claude Code session) executes roadmap tasks while you watch
its output stream into the dashboard.

```
┌── any device, anywhere ──┐
│ https://<your-tunnel-url>│
└──────────┬───────────────┘
           │  Tailscale / cloudflared
┌──────────▼──────────────────────────────┐
│ THIS PC — one process, one port          │
│  Next.js UI  +  /ws agent daemon         │
│  workspace/                              │
│    best-deals/ robotics/ nps/            │
│    perovskites/ polymers/ semicond/      │
│      GOAL.md IDEAS.md TODO.md            │
│      NOTES.md LOG.md papers/             │
│    .dashboard/  (journal, telemetry,     │
│                  statuses, run logs)     │
└──────────────────────────────────────────┘
```

## Quick start

```bash
cp .env.example .env        # add your OPENAI_API_KEY
npm install
npm run build
npm start                   # → http://localhost:3000
```

`npm run dev` gives hot reload. `npm test` runs the layout-math test suite.

On first start the server seeds `workspace/` with the six planet directories.
Drop papers into any planet's `papers/` folder — agents can read them. All of
your notes are plain markdown files in those folders; nothing is locked in a
database.

## The pieces

- **The Sun** — passively watches mouse/keyboard/visibility, computes a rolling
  10-second Activity Density Score (0–100), and burns bright (80+), glows warm
  (30–79) or fades to embers (<30). Click it for **Mission Control**: the daily
  captain's journal, a fleet status board, and your 24h activity chart.
- **Planets** — click to expand: status dropdown (`Work in progress` /
  `Work done, need feedback` / `Nothing works`), Goal & Idea, an interactive
  roadmap (stored as a markdown checklist in `TODO.md`), notes, a timestamped
  quick-log, and the **agent terminal**.
- **Agents** — hit *Execute* to send a task (defaults to the next unchecked
  roadmap item) to the daemon. The agent gets four sandboxed tools —
  `read_file_structure`, `view_file_contents`, `write_or_edit_file`,
  `execute_shell_command` — locked to that planet's directory. Output streams
  live over the WebSocket. A failing shell command automatically flips the
  planet to *Nothing works*.
- **Guardrail** — agents may *suggest* schedule optimizations but are forbidden
  from touching any calendar; any schedule change needs your explicit OK.

## Access from anywhere

The whole app is one process on one port, so any tunnel works.

**Tailscale (recommended — private, free):**
```bash
sudo tailscale up
tailscale serve --bg 3000     # → https://<machine>.<tailnet>.ts.net
```
Install Tailscale on your phone/laptop and the URL works worldwide. No token
needed — the tailnet is already private.

**Cloudflare tunnel (public URL — set a token!):**
```bash
# in .env:  DASH_TOKEN=<long random string>   then restart
cloudflared tunnel --url http://localhost:3000
```
With `DASH_TOKEN` set, every browser and WebSocket connection must log in once;
the token lives in an httpOnly cookie.

**Run it as a service (systemd):**
```ini
# /etc/systemd/system/solar-dashboard.service
[Unit]
Description=My Solar System Dashboard
After=network.target

[Service]
WorkingDirectory=/home/ya/sci/dashboarda
EnvironmentFile=/home/ya/sci/dashboarda/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
User=ya

[Install]
WantedBy=multi-user.target
```

## Configuration (.env)

| Variable | Meaning | Default |
|---|---|---|
| `OPENAI_API_KEY` | key for the agent runtime | — (required for runs) |
| `OPENAI_MODEL` | chat-completions model | `gpt-5-mini` |
| `OPENAI_BASE_URL` | any OpenAI-compatible endpoint (OpenRouter, Ollama…) | `https://api.openai.com/v1` |
| `DASH_TOKEN` | access token; unset = open (localhost/tailnet) | unset |
| `WORKSPACE_DIR` | root of the six project dirs | `./workspace` |
| `PORT` | listen port | `3000` |

The experimental **Claude Code** provider (dropdown in the agent terminal)
shells out to a locally installed `claude` CLI instead of the OpenAI API.

## Layout mathematics

Planets are positioned with a chained transform
`rotate(θ) translate(R) rotate(−θ)` so labels stay horizontal at any orbital
phase. The orbit radius is `min(40, 50 − d/2 − margin)` vmin, which provably
never clips the viewport and never lets adjacent nodes overlap
(`chord = 2R·sin(π/6) = R ≥ d`). See `src/lib/orbit.ts` and `tests/orbit.test.ts`.
