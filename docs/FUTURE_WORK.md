# Future work

Ordered roughly by value-for-effort. Known limitations are listed at the
bottom — several map directly to items here.

## Near term (high value, small)

- **Git-track the workspace.** `git init` in `workspace/` and auto-commit
  after each agent run and on a timer — free history/undo for notes and
  agent edits. (The repo itself is also not a git repo yet; `git init` both.)
- **Papers ingestion.** Agents can already list `papers/`, but PDFs are
  binary. Add a `read_paper(path)` tool that extracts text (e.g. `pdftotext`
  or a small JS extractor) so dropped papers become real context.
- **Run history browser.** The API already serves past runs
  (`/api/planets/:id/runs`, `/api/runs/:runId`); the terminal only replays
  the latest. Add a run picker in the Agent panel.
- **Notify when a run finishes.** The manager will walk away during long
  runs. Web Push, or a simple ntfy.sh webhook configured via env, fired from
  `runner.ts` `finish()`.
- **PWA manifest** so the tunnel URL installs as an app on the phone.
- **Verify the Claude Code provider** against the real CLI and decide its
  permission mode (currently `acceptEdits`).

## Medium term

- **Token-level streaming.** The OpenAI provider is non-streaming per turn
  (shell output already streams). Switch to SSE streaming for assistant
  text so summaries type out live.
- **Per-planet agent settings** (model, provider, max turns) stored in
  `state.json`, editable in the planet view instead of env-only.
- **Calendar suggestion confirm-flow.** The guardrail is prompt-level today;
  the spec imagines UI confirmation. Add a structured
  `propose_schedule_change` tool whose payloads render as accept/dismiss
  cards — accepted ones just append to NOTES/LOG (never touch calendars).
- **Telemetry insights.** Weekly view, work/rest cycle detection, "best deep
  work hours" summary in Mission Control; optionally feed it to the agent as
  the spec suggests (suggestions only).
- **Run queue** instead of rejecting when a planet is busy; possibly
  multi-planet parallel runs with a global concurrency cap.
- **E2E test suite.** Formalize `scripts/dev/` (mock-openai.mjs,
  ws-smoke.mjs, browser-drive.mjs — the exact harness used to verify the
  initial build) into `tests/e2e/` with assertions instead of eyeballs.

## Ideas parking lot

- Comets: one-off tasks that aren't planets — small bodies that fly through
  the system and burn up when done.
- Moons: sub-projects orbiting a planet.
- Cross-planet agent ("the astronomer") that reads all six LOG.md files and
  writes a weekly digest into the journal.
- Voice quick-log from the phone (Web Speech API → `/api/planets/:id/log`).

## Known limitations (as built 2026-07-02)

- One concurrent run per planet; no queue.
- Any non-zero shell exit flips status to `nothing-works` (spec-mandated,
  aggressive — agents legitimately run failing commands while debugging).
- Shell commands: 180s timeout each; run capped at 40 turns; tool results
  truncated (16k chars to model, 20k tail from shell).
- Telemetry only accumulates while the dashboard tab is open.
- Terminal keeps the last 500 events per planet in memory client-side.
- Login endpoint has no rate limiting (mitigate: long DASH_TOKEN, or stay on
  a tailnet); middleware token compare is not constant-time (edge runtime).
- store.ts is synchronous single-process fs; two server instances on one
  workspace will race.
- No PDF/text extraction for `papers/` yet (see above).
- Sun/high-energy pulse animation keeps running when the tab is visible but
  idle at high score decay boundaries — cosmetic only.
