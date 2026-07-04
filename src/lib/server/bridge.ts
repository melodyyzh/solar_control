/**
 * Bridge between the custom server's module graph and Next's bundled route
 * handlers. Next compiles API routes into its own bundle, so a plain module
 * singleton would exist twice; both sides share instances via globalThis
 * instead (same process, same global object).
 */

import type { PlanetStatus, ServerMessage } from "../types";

export interface HubLike {
  broadcast(msg: ServerMessage): void;
}

export interface RunnerLike {
  activeRunId(planetId: string): string | null;
}

interface Bridge {
  hub?: HubLike;
  runner?: RunnerLike;
}

const KEY = "__solarDashBridge";

function bridge(): Bridge {
  const g = globalThis as unknown as Record<string, Bridge>;
  if (!g[KEY]) g[KEY] = {};
  return g[KEY];
}

export function registerHub(hub: HubLike, runner: RunnerLike): void {
  bridge().hub = hub;
  bridge().runner = runner;
}

export function getHub(): HubLike | undefined {
  return bridge().hub;
}

export function getRunner(): RunnerLike | undefined {
  return bridge().runner;
}

export function broadcastStatus(planetId: string, status: PlanetStatus): void {
  getHub()?.broadcast({ type: "status", planetId, status });
}
