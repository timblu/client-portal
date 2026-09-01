import path from "node:path";
import express, { type Application, type NextFunction, type Request, type Response } from "express";
import { registerApiRoutes } from "@/server/api-routes";
import { registerAuthRoutes } from "@/server/auth-routes";

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
    app.get(/^(?!\/api|\/auth).*/, (_request, response) => {
      response.sendFile(path.join(distDir, "index.html"));
    });
  }

  options?.setup?.(app);
  registerErrorHandler(app);

  return app;
}
