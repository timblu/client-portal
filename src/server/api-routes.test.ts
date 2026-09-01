import request from "supertest";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createApp } from "./app";
import { findUserByEmail, signInAs } from "./test-helpers";

describe("api routes", () => {
  it("returns 401 for unauthenticated staff queries", async () => {
    const response = await request(createApp()).get("/api/staff/companies");
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/signed in/i);
  });

  it("returns 403 when a client requests staff routes", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "casey@northwind.test");

    const response = await agent.get("/api/staff/companies");
    expect(response.status).toBe(403);
  });

  it("returns 404 for cross-company client project access", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "casey@northwind.test");

    const alpineProject = await db.project.findFirst({
      where: { company: { name: "Alpine Outfitters" } },
    });
    expect(alpineProject).toBeTruthy();

    const response = await agent.get(`/api/client/projects/${alpineProject!.id}`);
    expect(response.status).toBe(404);
  });

  it("allows staff to load member management data", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "sam@agency.test");

    const company = await db.company.findFirst({ where: { name: "Northwind Retail" } });
    const response = await agent.get(`/api/staff/companies/${company!.id}/members`);

    expect(response.status).toBe(200);
    expect(response.body.members.length).toBeGreaterThan(0);
  });

  it("allows company admins to load member management data", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "alex@northwind.test");

    const response = await agent.get("/api/client/members");
    expect(response.status).toBe(200);
    expect(response.body.members.length).toBeGreaterThan(0);
  });

  it("forbids reviewers from submitting approval decisions", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "priya@northwind.test");

    const version = await db.version.findFirst({
      where: { decisionState: "PENDING" },
      include: { deliverable: { include: { project: { include: { company: true } } } } },
    });
    expect(version).toBeTruthy();

    const response = await agent.post("/api/actions/submit-decision").send({
      versionId: version!.id,
      decisionState: "APPROVED",
      comment: "",
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/approver/i);
  });

  it("allows approvers to submit approval decisions", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "casey@northwind.test");

    const version = await db.version.findFirst({
      where: {
        decisionState: "PENDING",
        deliverable: { project: { company: { name: "Northwind Retail" } } },
      },
    });
    expect(version).toBeTruthy();

    const response = await agent.post("/api/actions/submit-decision").send({
      versionId: version!.id,
      decisionState: "APPROVED",
      comment: "",
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("allows staff to invite a member", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "sam@agency.test");
    const company = await db.company.findFirst({ where: { name: "Alpine Outfitters" } });
    const project = await db.project.findFirst({ where: { companyId: company!.id } });

    const response = await agent.post("/api/actions/invite-member").send({
      companyId: company!.id,
      email: "new.member@alpine.test",
      name: "New Member",
      companyRole: "MEMBER",
      memberships: [{ projectId: project!.id, role: "REVIEWER" }],
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("returns bootstrap data for signed-in users", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "sam@agency.test");

    const response = await agent.get("/api/bootstrap");
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("sam@agency.test");
    expect(response.body.switchTargets.length).toBeGreaterThan(0);
  });

  it("blocks non-admin clients from the members directory", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "casey@northwind.test");

    const response = await agent.get("/api/client/members");
    expect(response.status).toBe(403);
  });

  it("supports account switching through the action endpoint", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "sam@agency.test");
    const devon = await findUserByEmail("devon@alpine.test");

    const response = await agent.post("/api/actions/switch-user").send({ userId: devon.id });
    expect(response.status).toBe(200);
    expect(response.body.data).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/"token"/);

    const session = await agent.get("/api/session");
    expect(session.body.user.email).toBe("devon@alpine.test");
  });

  it("returns 403 when a client tries to invite a member", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "casey@northwind.test");
    const company = await db.company.findFirst({ where: { name: "Northwind Retail" } });
    const project = await db.project.findFirst({ where: { companyId: company!.id } });

    const response = await agent.post("/api/actions/invite-member").send({
      companyId: company!.id,
      email: "blocked@northwind.test",
      name: "Blocked Member",
      companyRole: "MEMBER",
      memberships: [{ projectId: project!.id, role: "REVIEWER" }],
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/cannot manage members/i);
  });

  it("returns 404 for deliverables outside a reviewer's assigned projects", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "priya@northwind.test");

    const loyaltyProject = await db.project.findFirst({ where: { name: "Loyalty Program" } });
    expect(loyaltyProject).toBeTruthy();

    const deliverable = await db.deliverable.create({
      data: {
        projectId: loyaltyProject!.id,
        type: "DESIGN",
        title: "Loyalty landing page",
      },
    });
    await db.version.create({
      data: {
        deliverableId: deliverable.id,
        versionNumber: 1,
        kind: "STATIC_IMAGE",
        fileUrl: "/seed/homepage-v1.svg",
      },
    });

    const response = await agent.get(`/api/client/deliverables/${deliverable.id}`);
    expect(response.status).toBe(404);
  });

  it("returns 404 when changing role for a member without project access (I3)", async () => {
    // priya@northwind.test is a MEMBER but has no access to Loyalty Program → membership missing
    const agent = request.agent(createApp());
    await signInAs(agent, "sam@agency.test");
    const company = await db.company.findFirst({ where: { name: "Northwind Retail" } });
    const member = await findUserByEmail("priya@northwind.test");
    const project = await db.project.findFirst({
      where: { companyId: company!.id, name: "Loyalty Program" },
    });

    const response = await agent.post("/api/actions/change-project-role").send({
      companyId: company!.id,
      memberId: member.id,
      projectId: project!.id,
      role: "APPROVER",
    });

    // I3: no membership found → 404 with useful message instead of 500
    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/does not have access/i);
  });

  it("returns 400 for an invalid role value in change-project-role (I3/I5)", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "sam@agency.test");
    const company = await db.company.findFirst({ where: { name: "Northwind Retail" } });
    const member = await findUserByEmail("priya@northwind.test");
    const project = await db.project.findFirst({ where: { companyId: company!.id } });

    const response = await agent.post("/api/actions/change-project-role").send({
      companyId: company!.id,
      memberId: member.id,
      projectId: project!.id,
      role: "OWNER", // invalid
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/invalid project role/i);
  });

  it("preserves nullable thread coordinates in deliverable responses", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "sam@agency.test");

    const version = await db.version.findFirst({
      where: { deliverable: { title: "Homepage concept" } },
      orderBy: { versionNumber: "asc" },
    });
    expect(version).toBeTruthy();

    const thread = await db.commentThread.create({
      data: { versionId: version!.id, xPct: null, yPct: null },
    });
    await db.comment.create({
      data: { threadId: thread.id, authorId: (await findUserByEmail("sam@agency.test")).id, body: "General note" },
    });

    const response = await agent.get(
      `/api/staff/deliverables/${version!.deliverableId}?version=${version!.id}`
    );
    expect(response.status).toBe(200);

    const generalThread = response.body.activeVersion.threads.find(
      (item: { id: string }) => item.id === thread.id
    );
    expect(generalThread.xPct).toBeNull();
    expect(generalThread.yPct).toBeNull();
  });

  it("persists the prototype screen for comments added on a PROTOTYPE_URL version", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "priya@northwind.test");

    const version = await db.version.findFirst({
      where: { deliverable: { title: "Checkout flow prototype" } },
    });
    expect(version).toBeTruthy();

    const response = await agent.post("/api/actions/add-thread").send({
      versionId: version!.id,
      xPct: 50,
      yPct: 40,
      screen: "shipping",
      body: "Should this field be required?",
    });
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);

    const deliverableResponse = await agent.get(
      `/api/client/deliverables/${version!.deliverableId}?version=${version!.id}`
    );
    const newThread = deliverableResponse.body.activeVersion.threads.find(
      (item: { comments: { body: string }[] }) =>
        item.comments.some((c) => c.body === "Should this field be required?")
    );
    expect(newThread.screen).toBe("shipping");
  });

  it("ignores the screen field for comments on non-prototype versions", async () => {
    const agent = request.agent(createApp());
    await signInAs(agent, "sam@agency.test");

    const version = await db.version.findFirst({
      where: { deliverable: { title: "Homepage concept" } },
      orderBy: { versionNumber: "asc" },
    });
    expect(version).toBeTruthy();

    const response = await agent.post("/api/actions/add-thread").send({
      versionId: version!.id,
      xPct: 10,
      yPct: 10,
      screen: "shipping",
      body: "This should stay unscoped.",
    });
    expect(response.status).toBe(200);

    const deliverableResponse = await agent.get(
      `/api/staff/deliverables/${version!.deliverableId}?version=${version!.id}`
    );
    const newThread = deliverableResponse.body.activeVersion.threads.find(
      (item: { comments: { body: string }[] }) =>
        item.comments.some((c) => c.body === "This should stay unscoped.")
    );
    expect(newThread.screen).toBeNull();
  });
});
