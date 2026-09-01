import type { Response } from "express";

export function sendError(response: Response, status: number, message: string) {
  response.status(status).json({ error: message });
}

export function sendUnauthorized(response: Response) {
  sendError(response, 401, "Not signed in.");
}

export function sendForbidden(response: Response, message = "Forbidden.") {
  sendError(response, 403, message);
}

export function sendNotFound(response: Response, message = "Not found.") {
  sendError(response, 404, message);
}

export function sendBadRequest(response: Response, message: string) {
  sendError(response, 400, message);
}
