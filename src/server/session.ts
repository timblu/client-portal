import type { CookieOptions, Request, Response } from "express";
import { SESSION_COOKIE } from "@/lib/auth";

function sessionCookieOptions(expiresAt?: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

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
  response.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}
