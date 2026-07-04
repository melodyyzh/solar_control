import { NextRequest, NextResponse } from "next/server";
import { isPlanetId } from "@/lib/planets";
import type { TodoItem } from "@/lib/types";
import * as store from "@/lib/server/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isPlanetId(id)) return NextResponse.json({ error: "unknown planet" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { todos?: TodoItem[] } | null;
  if (!body || !Array.isArray(body.todos)) {
    return NextResponse.json({ error: "todos array required" }, { status: 400 });
  }
  const todos = body.todos
    .filter((t) => typeof t?.text === "string" && t.text.trim().length > 0)
    .map((t, i) => ({ id: String(i), text: t.text.trim(), done: Boolean(t.done) }));
  store.writeTodos(id, todos);
  return NextResponse.json({ todos });
}
