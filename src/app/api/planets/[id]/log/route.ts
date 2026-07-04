import { NextRequest, NextResponse } from "next/server";
import { isPlanetId } from "@/lib/planets";
import * as store from "@/lib/server/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isPlanetId(id)) return NextResponse.json({ error: "unknown planet" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const entry = store.appendLog(id, text);
  return NextResponse.json({ entry });
}
