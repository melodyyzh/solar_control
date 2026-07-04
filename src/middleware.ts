import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dash_token";
const PUBLIC_PATHS = ["/login", "/api/login"];

export function middleware(req: NextRequest) {
  const required = process.env.DASH_TOKEN;
  if (!required) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (req.cookies.get(COOKIE_NAME)?.value === required) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const login = req.nextUrl.clone();
  login.pathname = "/login";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
