import { NextRequest, NextResponse } from "next/server";
import * as store from "@/lib/server/store";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ entries: store.readJournal() });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  const entry = store.appendJournal(text);
  return NextResponse.json({ entry });
}
