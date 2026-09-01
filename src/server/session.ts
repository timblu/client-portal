import type { CookieOptions, Request, Response } from "express";
import { SESSION_COOKIE } from "@/lib/auth";

export function getSessionToken(request: Request): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return undefined;
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date) {
  const options: CookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  };
  response.cookie(SESSION_COOKIE, token, options);
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
