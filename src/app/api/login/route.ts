import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, tokenMatches } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  if (!tokenMatches(body?.token)) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, body?.token ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
