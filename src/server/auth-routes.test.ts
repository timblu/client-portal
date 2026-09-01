import request from "supertest";
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/lib/auth";
import { createApp } from "./app";
import { findUserByEmail, signInAs } from "./test-helpers";

describe("auth routes", () => {
  it("rejects magic-link requests without an email", async () => {
    const response = await request(createApp()).post("/api/auth/magic-link").send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/email/i);
  });

  it("returns not found for unknown magic-link users", async () => {
    const response = await request(createApp())
      .post("/api/auth/magic-link")
      .send({ email: "missing@example.test" });

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/no account/i);
  });

  it("returns a dev link for known users in development", async () => {
    const response = await request(createApp())
      .post("/api/auth/magic-link")
      .send({ email: "sam@agency.test" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.devLink).toBeTypeOf("string");
  });

  it("consumes a valid magic link and sets an HTTP-only session cookie", async () => {
    const agent = request.agent(createApp());
    const magic = await agent.post("/api/auth/magic-link").send({ email: "sam@agency.test" });
    const verify = await agent.get(`/auth/verify?token=${magic.body.devLink}`);

    expect(verify.status).toBe(302);
    expect(verify.headers.location).toBe("/staff");
    expect(verify.headers["set-cookie"]?.[0]).toMatch(new RegExp(`${SESSION_COOKIE}=`));
    expect(verify.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/i);
  });

  it("returns null for an unauthenticated session", async () => {
    const response = await request(createApp()).get("/api/session");

    expect(response.status).toBe(200);
    expect(response.body.user).toBeNull();
  });

  it("returns the signed-in user from the session endpoint", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "casey@northwind.test");

    const response = await agent.get("/api/session");

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("casey@northwind.test");
    expect(response.body.switchTargets.length).toBeGreaterThan(0);
  });

  it("clears the session cookie on logout", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "sam@agency.test");

    const logout = await agent.post("/auth/logout");
    expect(logout.status).toBe(302);

    const session = await agent.get("/api/session");
    expect(session.body.user).toBeNull();
  });

  it("switches development accounts", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "sam@agency.test");
    const devon = await findUserByEmail("devon@alpine.test");

    const switched = await agent.post("/api/dev/switch-user").send({ userId: devon.id });
    expect(switched.status).toBe(200);
    expect(switched.body.ok).toBe(true);

    const session = await agent.get("/api/session");
    expect(session.body.user.email).toBe("devon@alpine.test");
  });
});
