import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("server application", () => {
  it("reports that the API is healthy", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
