import type { Request, Response, Router } from "express";
import { clearSession, consumeMagicLink, createMagicLink, createSession, getCurrentUser } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { devSwitchingEnabled, listSwitchTargets, resolveSwitchTarget } from "@/server/dev";
import { sendBadRequest, sendForbidden, sendNotFound } from "@/server/errors";
import { serializeUser } from "@/server/serialize";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "@/server/session";

export function registerAuthRoutes(router: Router) {
  router.post("/api/auth/magic-link", async (request: Request, response: Response) => {
    const email = String(request.body?.email ?? "")
      .toLowerCase()
      .trim();
    if (!email) {
      sendBadRequest(response, "Email is required.");
      return;
    }

    const result = await createMagicLink(email);
    if (!result) {
      if (process.env.NODE_ENV !== "production") {
        // Dev/test: return 404 so developers know the email isn't seeded.
        sendNotFound(response, "No account for that email.");
      } else {
        // M4: Production — always 200 to avoid user enumeration.
        // No rate limiting is applied here; see docs/superpowers/plans/ for the
        // deferred implementation note. If needed, add a deterministic token-bucket
        // implementation with unit tests before enabling it.
        response.status(200).json({ ok: true, email });
      }
      return;
    }

    response.status(200).json({
      ok: true,
      email,
      ...(devSwitchingEnabled() ? { devLink: result.token } : {}),
    });
  });

  router.get("/auth/verify", async (request: Request, response: Response) => {
    const token = String(request.query.token ?? "");
    if (!token) {
      response.redirect("/login?error=notfound");
      return;
    }

    const result = await consumeMagicLink(token);
    if ("error" in result) {
      response.redirect("/login?error=notfound");
      return;
    }

    setSessionCookie(response, result.session.token, result.session.expiresAt);
    const defaultDestination = result.user.role === "STAFF" ? "/staff" : "/client";
    const destination = safeRedirectPath(String(request.query.redirect ?? "")) ?? defaultDestination;
    response.redirect(destination);
  });

  router.post("/auth/logout", async (request: Request, response: Response) => {
    const token = getSessionToken(request);
    await clearSession(token);
    clearSessionCookie(response);
    response.redirect("/login");
  });

  router.get("/api/session", async (request: Request, response: Response) => {
    const token = getSessionToken(request);
    const user = await getCurrentUser(token);
    response.status(200).json({
      user: user ? serializeUser(user) : null,
      switchTargets: user && devSwitchingEnabled() ? await listSwitchTargets() : [],
    });
  });

  router.post("/api/dev/switch-user", async (request: Request, response: Response) => {
    if (!devSwitchingEnabled()) {
      sendForbidden(response, "Account switching is disabled.");
      return;
    }

    const userId = String(request.body?.userId ?? "");
    if (!userId) {
      sendBadRequest(response, "User is required.");
      return;
    }

    try {
      const target = await resolveSwitchTarget(userId);
      const currentToken = getSessionToken(request);
      await clearSession(currentToken);
      const session = await createSession(target.id);
      setSessionCookie(response, session.token, session.expiresAt);
      response.status(200).json({ ok: true, redirectTo: "/" });
    } catch (error) {
      sendBadRequest(response, error instanceof Error ? error.message : "Unable to switch user.");
    }
  });
}
