import { NextRequest, NextResponse } from "next/server";
import { isPlanetId } from "@/lib/planets";
import * as store from "@/lib/server/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isPlanetId(id)) return NextResponse.json({ error: "unknown planet" }, { status: 404 });
  return NextResponse.json({ runs: store.listRuns(id) });
}
