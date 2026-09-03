import path from "node:path";
import express, { type Application, type NextFunction, type Request, type Response } from "express";
import { registerApiRoutes } from "@/server/api-routes";
import { registerAuthRoutes } from "@/server/auth-routes";
import { sendNotFound } from "@/server/errors";

const SCREENSHOTS_DIR = path.join(process.cwd(), "data", "screenshots");

export function registerErrorHandler(app: Application) {
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    console.error(error);
    response.status(500).json({ error: "Internal server error." });
  });
}

export function createApp(options?: { distDir?: string; setup?: (app: Application) => void }) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Captured prototype screenshots (see src/server/screenshot.ts). Served in every
  // environment — Vite proxies /captures to this server in dev (vite.config.ts).
  app.use("/captures", express.static(SCREENSHOTS_DIR));

  const router = express.Router();
  registerAuthRoutes(router);
  registerApiRoutes(router);
  app.use(router);

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  if (process.env.NODE_ENV === "production") {
    const distDir = options?.distDir ?? path.join(process.cwd(), "dist");
    app.use(express.static(distDir));
    // M2: Use exact prefix exclusion (/api/ or /api$, /auth/ or /auth$) so /apifoo or /authority
    // still reach the SPA fallback.
    app.get(/^(?!\/(api|auth)(\/|$))/, (_request, response) => {
      response.sendFile("index.html", { root: distDir });
    });
  }

  // Custom test/integration setup routes are registered here so they take priority over the
  // M1 catch-all below.
  options?.setup?.(app);

  // M1: Catch-all for unknown /api/* paths → JSON 404 (applies in all environments).
  // Must be last API handler so that all registered routes (including setup routes) have
  // priority. Uses a string prefix for Express 5 compatibility.
  app.use("/api", (_request, response) => {
    sendNotFound(response, "API endpoint not found.");
  });

  registerErrorHandler(app);

  return app;
}
