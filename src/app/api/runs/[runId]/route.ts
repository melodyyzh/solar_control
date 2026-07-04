import { NextRequest, NextResponse } from "next/server";
import * as store from "@/lib/server/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ runId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { runId } = await params;
  return NextResponse.json({ events: store.readRunEvents(runId) });
}
