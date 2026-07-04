# TASK CONTEXT & SCOPE CONTROL
You are Fable 5, operating at maximum single-agent reasoning capacity. Do not spawn parallel agent swarms for this task. You are acting as an expert full-stack engineer and UI/UX designer. Your objective is to architect and implement a complete, highly visual, cross-platform web application called "My Solar System Dashboard."

This is a two-part architecture:
1. A Next.js (App Router, TypeScript, Tailwind, Framer Motion) frontend.
2. A Local Node.js Daemon for secure file execution via OpenAI Function Calling.

Take your time to think deeply about the mathematical layout constraints and state management before writing code. Execute the implementation sequentially. 

---

### Part 1: Visual Layout & Architecture ("My Solar System")

The dashboard utilizes a radial, node-based solar system layout. 
- Use viewport-relative mathematics to ensure mobile responsiveness without clipping. 
- Calculate the orbital radius $R$ based on $V_{\min} = \min(V_w, V_h)$ (roughly $40\text{vmin}$).
- Implement a chained CSS transform sequence (`transform: rotate(θ) translate(R) rotate(-θ);`) for the 6 planet nodes so the text inside remains perfectly horizontal as they orbit the center $(0,0)$.

#### The Central Hub: The Sun (Telemetry Engine)
- The Sun visualizes real-time user activity. State Title: `Connect to the energy cycle (work/rest)`.
- Implement a `useTelemetry` React hook that passively monitors `mousemove`, `keydown` velocity, and `visibilitychange`. 
- Throttle events into a rolling 10-second "Activity Density Score" (0-100).
- Tie this score to the Sun's Framer Motion variants:
  * High (80-100): Vibrant yellow/white, scales up, rapid pulsing.
  * Medium (30-79): Warm orange, slow rotation.
  * Low (0-29): Deep red or outline-only, animations paused.

#### The Orbiting Nodes (The Planets)
The 6 nodes are: `Best deals`, `Robotics`, `np's`, `Perovskites`, `Polymers`, and `Semicond`.
Clicking a node triggers a Framer Motion `layoutId` transition, expanding it into a full-screen, standardized template view.

**Universal Planet Template:**
- **Status Bar:** Dropdown with states: `Work in progress`, `Work done, need feedback`, `Nothing works`.
- **Expanded View:** - `Goal` and `Idea` (Text inputs).
  - `Todo` (Interactive roadmap component).
  - `Notes/logs` (Rich text area).
  - `Agent feedback` (Read-only markdown terminal for AI output).
  - **Execution Trigger:** A button that sends a payload to the Local Daemon to execute the current Roadmap task.

---

### Part 2: Local Daemon & Agent Orchestration

Implement a lightweight Node.js daemon meant to run locally on the user's PC.
- It must maintain a root workspace with 6 sub-directories matching the frontend planets.
- Expose a secure WebSocket connection to receive execution payloads from the Next.js frontend.

**The Execution Runtime:**
When the daemon receives an execution payload (containing the project path and Roadmap task), it must initialize an OpenAI Assistant/ChatCompletion thread equipped with the following tool calls:
- `read_file_structure(path)`
- `view_file_contents(path)`
- `write_or_edit_file(path, content)`
- `execute_shell_command(command)` (must run securely within the isolated project directory).

**Output & Guardrails:**
- The daemon must stream the agent's stdout/stderr and final summary back through the WebSocket to populate the frontend `Agent feedback` terminal in real-time.
- If a shell command fails (non-zero exit), programmatically update the frontend planet status to `Nothing works`.
- **Strict Guardrail:** The agent may suggest schedule optimizations based on telemetry logs, but it is strictly forbidden from writing or modifying any third-party calendar events automatically. It must require explicit user confirmation via the UI.

---

### Execution Directive
Proceed sequentially. First, scaffold the Next.js app and Framer Motion layout to verify the trigonometry and responsiveness. Second, implement the telemetry hook. Finally, build the daemon and AI orchestration layer. Ensure all code blocks are complete, production-ready TypeScript. Write tests for the layout mathematics.
