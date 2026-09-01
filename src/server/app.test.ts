import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";

const hiddenDistDir = path.join(process.cwd(), ".test-dist", "dist");

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(path.join(process.cwd(), ".test-dist"), { force: true, recursive: true });
});

describe("server application", () => {
  it("reports that the API is healthy", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("returns JSON for unhandled route errors", async () => {
    const app = createApp({
      setup: (application) => {
        application.get("/api/test-error", () => {
          throw new Error("boom");
        });
      },
    });

    const response = await request(app).get("/api/test-error");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error." });
  });

  it("serves the SPA fallback when the dist directory has a hidden ancestor", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await mkdir(hiddenDistDir, { recursive: true });
    await writeFile(path.join(hiddenDistDir, "index.html"), "<main>Review Portal</main>");

    const response = await request(createApp({ distDir: hiddenDistDir })).get("/staff");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Review Portal");
  });
});
