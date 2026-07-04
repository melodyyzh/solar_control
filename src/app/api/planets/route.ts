import { NextResponse } from "next/server";
import { PLANETS } from "@/lib/planets";
import { readPlanetSnapshot } from "@/lib/server/store";
import { getRunner } from "@/lib/server/bridge";

export const dynamic = "force-dynamic";

export function GET() {
  const runner = getRunner();
  const planets = PLANETS.map((p) =>
    readPlanetSnapshot(p.id, runner?.activeRunId(p.id) ?? null),
  );
  return NextResponse.json({ planets });
}
