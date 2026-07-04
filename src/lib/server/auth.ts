/**
 * Single-user token auth. If DASH_TOKEN is unset the dashboard is open
 * (fine on localhost or a private tailnet); if set, the login page stores it
 * in an httpOnly cookie and every HTTP + WebSocket request must carry it.
 */

import crypto from "node:crypto";

export const COOKIE_NAME = "dash_token";

export function requiredToken(): string | undefined {
  const t = process.env.DASH_TOKEN;
  return t && t.length > 0 ? t : undefined;
}

export function tokenMatches(candidate: string | undefined | null): boolean {
  const required = requiredToken();
  if (!required) return true;
  if (!candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(required);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Extract the token cookie from a raw Cookie header (used for WS upgrade). */
export function tokenFromCookieHeader(header: string | undefined): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
