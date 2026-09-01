import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

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
});
