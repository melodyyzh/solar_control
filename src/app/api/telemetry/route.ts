import { NextRequest, NextResponse } from "next/server";
import type { TelemetrySample } from "@/lib/types";
import * as store from "@/lib/server/store";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const hours = Math.min(24 * 7, Math.max(1, Number(req.nextUrl.searchParams.get("hours") ?? 24)));
  const samples = store.readTelemetry(Date.now() - hours * 3_600_000);
  return NextResponse.json({ samples });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { samples?: TelemetrySample[] } | null;
  if (!body || !Array.isArray(body.samples)) {
    return NextResponse.json({ error: "samples array required" }, { status: 400 });
  }
  store.appendTelemetry(body.samples.slice(0, 500));
  return NextResponse.json({ ok: true });
}
