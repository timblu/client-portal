import type { Request, Response, NextFunction } from "express";
import { getCurrentUser } from "@/lib/auth";
import { getSessionToken } from "@/server/session";

export async function attachUser(request: Request, _response: Response, next: NextFunction) {
  const token = getSessionToken(request);
  request.user = (await getCurrentUser(token)) ?? undefined;
  next();
}

export async function requireUser(request: Request, response: Response, next: NextFunction) {
  const token = getSessionToken(request);
  const user = await getCurrentUser(token);
  if (!user) {
    response.status(401).json({ error: "Not signed in." });
    return;
  }
  request.user = user;
  next();
}
