# Build history

## 2026-07-02 — Initial build (full system, one session)

Built from `initial_prompt.md` (the spec) and `prompt.md` (the intent: an
"ultimate tool" for managing six research projects with per-project AI agents,
daily note taking, accessible from any device).

### Decisions

Three scoping questions were put to the manager, who was AFK; the build
proceeded on the recommended options. **These stand until overridden:**

1. **Remote access — single self-hosted process + tunnel.** One custom server
   (`server/index.ts`) hosts the Next.js UI and the `/ws` agent daemon on one
   port, so one Tailscale/cloudflared URL reaches everything. The spec's
   "separate local daemon" became a module inside the same process
   (`server/agent/*`), structured so it could be split out later. Rationale:
   one URL, one process to babysit, agents get direct access to real files.
   Alternative not taken: Vercel frontend + hosted DB + tunneled daemon.
2. **Agent brain — OpenAI chat-completions tool loop** (fetch-based, no SDK),
   per the spec and the manager's OpenAI credits. Providers are pluggable
   (`AgentProvider` interface); an experimental Claude Code provider shells
   out to the local `claude` CLI. `OPENAI_BASE_URL` accepts any compatible
   endpoint (OpenRouter, Ollama, vLLM).
3. **Storage — markdown files in each planet's folder** (GOAL/IDEAS/TODO/
   NOTES/LOG.md + `papers/`), dashboard bookkeeping in `workspace/.dashboard/`
   (state.json, JOURNAL.md, telemetry.jsonl, runs/*.jsonl). No database:
   agents read context natively, everything is git-able and greppable.

Creative additions beyond the spec: Mission Control view on the Sun (daily
captain's journal + fleet status board + 24h activity chart), timestamped
quick-log per planet, run history replay into the terminal, orbital drift
(planets slowly orbit; pauses while a view is open), token auth + login page
for public tunnels.

### Verification performed

- 25 vitest tests: orbit trigonometry (60° spacing, on-circle positions, zero
  net text rotation, no-overlap chord, no-clip radius), TODO.md round-trip,
  telemetry score bands.
- `tsc --noEmit` clean; production build clean.
- REST smoke test of every endpoint via curl.
- **End-to-end agent run against a scripted mock OpenAI server**: verified
  cwd locked to `workspace/robotics/` (pwd), `../../../etc/passwd` escape
  blocked by the sandbox, failing command (`false`) flipped status to
  `nothing-works` and broadcast it over WS, summary + run lifecycle events
  streamed and persisted.
- Headless-Chrome screenshots: orbital view (desktop), active-Sun state after
  synthetic mouse activity (score 30, orange), Robotics planet view (terminal
  replaying run history), Mission Control, and a 390px mobile viewport (no
  clipping; Sun subtitle was overlapping planets → fixed by hiding the long
  title line below `sm`). Screenshots lived in the session scratchpad and are
  not retained.
- Colors validated with the dataviz palette validator on surface `#0a0f1e`
  (planet set worst adjacent deutan ΔE 14.5; status set passes; original
  lighter Tailwind-300/400 shades failed the lightness band and were snapped
  to 500/600 steps).

### State at end of session

Working tree complete, not a git repository, never committed. Server verified
booting clean on port 3000 with pristine workspace seeding. `.env` not
created — `OPENAI_API_KEY` still needed for real agent runs. Claude Code
provider written but never exercised against the real CLI.
