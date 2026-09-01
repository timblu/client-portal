import type { Request, Response, NextFunction } from "express";
import { getCurrentUser } from "@/lib/auth";
import { sendUnauthorized } from "@/server/errors";
import { getSessionToken } from "@/server/session";

export async function requireUser(request: Request, response: Response, next: NextFunction) {
  const token = getSessionToken(request);
  const user = await getCurrentUser(token);
  if (!user) {
    sendUnauthorized(response);
    return;
  }
  request.user = user;
  next();
}
