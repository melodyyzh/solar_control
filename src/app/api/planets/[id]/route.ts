import { NextRequest, NextResponse } from "next/server";
import { isPlanetId } from "@/lib/planets";
import { STATUS_ORDER, type PlanetStatus } from "@/lib/types";
import * as store from "@/lib/server/store";
import { broadcastStatus, getRunner } from "@/lib/server/bridge";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isPlanetId(id)) return NextResponse.json({ error: "unknown planet" }, { status: 404 });
  return NextResponse.json({
    planet: store.readPlanetSnapshot(id, getRunner()?.activeRunId(id) ?? null),
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isPlanetId(id)) return NextResponse.json({ error: "unknown planet" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Partial<{
    goal: string;
    idea: string;
    notes: string;
    status: PlanetStatus;
  }>;

  for (const field of ["goal", "idea", "notes"] as const) {
    if (typeof body[field] === "string") store.writeContextField(id, field, body[field]);
  }
  if (body.status !== undefined) {
    if (!STATUS_ORDER.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    store.setStatus(id, body.status);
    broadcastStatus(id, body.status);
  }
  return NextResponse.json({ ok: true });
}
