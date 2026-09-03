import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createApp } from "./app";
import { findUserByEmail, signInAs } from "./test-helpers";
import { ScreenshotCaptureError } from "./screenshot";

// Capture is a real headless-browser call (src/server/screenshot.ts) — mock it here so
// API tests exercise the DB/access-check plumbing without launching Chromium.
let captureCallCount = 0;
vi.mock("./screenshot", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./screenshot")>();
  return {
    ...actual,
    capturePrototypeScreenshot: vi.fn(async (_url: string) => {
      captureCallCount += 1;
      return {
        id: `mock-shot-${captureCallCount}`,
        imageUrl: `/captures/mock-shot-${captureCallCount}.png`,
        width: 1280,
        height: 2400,
      };
    }),
  };
});

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
      screen: "/proto/checkout/shipping",
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
    expect(newThread.screen).toBe("/proto/checkout/shipping");
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
      screen: "/proto/checkout/shipping",
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

  describe("screenshot-based comment pinning", () => {
    it("captures a screenshot for a prototype version and returns image metadata", async () => {
      const agent = request.agent(createApp());
      await signInAs(agent, "priya@northwind.test");

      const version = await db.version.findFirst({
        where: { deliverable: { title: "Checkout flow prototype" } },
      });
      expect(version).toBeTruthy();

      const response = await agent.post("/api/screenshots").send({
        versionId: version!.id,
        url: "https://ui-ux-wireframes-690056f8c48f.herokuapp.com/",
      });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.screenshot.imageUrl).toMatch(/^\/captures\//);
      expect(response.body.screenshot.width).toBe(1280);
      expect(response.body.screenshot.height).toBe(2400);

      const stored = await db.prototypeScreenshot.findUnique({
        where: { id: response.body.screenshot.id },
      });
      expect(stored).toBeTruthy();
      expect(stored!.versionId).toBe(version!.id);
      expect(stored!.sourceUrl).toBe("https://ui-ux-wireframes-690056f8c48f.herokuapp.com/");
    });

    it("includes captured screenshots on the deliverable payload", async () => {
      const agent = request.agent(createApp());
      await signInAs(agent, "priya@northwind.test");

      const version = await db.version.findFirst({
        where: { deliverable: { title: "Checkout flow prototype" } },
      });
      expect(version).toBeTruthy();

      const capture = await agent.post("/api/screenshots").send({
        versionId: version!.id,
        url: "https://example-prototype.test/",
      });
      expect(capture.status).toBe(200);

      const deliverableResponse = await agent.get(
        `/api/client/deliverables/${version!.deliverableId}?version=${version!.id}`
      );
      expect(deliverableResponse.status).toBe(200);
      const shot = deliverableResponse.body.activeVersion.screenshots.find(
        (item: { id: string }) => item.id === capture.body.screenshot.id
      );
      expect(shot).toBeTruthy();
      expect(shot.sourceUrl).toBe("https://example-prototype.test/");
    });

    it("rejects screenshot capture for non-prototype versions", async () => {
      const agent = request.agent(createApp());
      await signInAs(agent, "sam@agency.test");

      const version = await db.version.findFirst({
        where: { deliverable: { title: "Homepage concept" } },
        orderBy: { versionNumber: "asc" },
      });
      expect(version).toBeTruthy();

      const response = await agent.post("/api/screenshots").send({
        versionId: version!.id,
        url: "https://example.test/",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/hosted prototype/i);
    });

    it("returns a clear error when capture fails, instead of a silent blank image", async () => {
      const agent = request.agent(createApp());
      await signInAs(agent, "priya@northwind.test");

      const version = await db.version.findFirst({
        where: { deliverable: { title: "Checkout flow prototype" } },
      });
      expect(version).toBeTruthy();

      const { capturePrototypeScreenshot } = await import("./screenshot");
      vi.mocked(capturePrototypeScreenshot).mockRejectedValueOnce(
        new ScreenshotCaptureError("Timed out loading that page. It may be slow, or require sign-in.")
      );

      const response = await agent.post("/api/screenshots").send({
        versionId: version!.id,
        url: "https://slow-prototype.test/",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/timed out/i);
    });

    it("round-trips screenshotId on add-thread and ignores screen when a screenshot is pinned", async () => {
      const agent = request.agent(createApp());
      await signInAs(agent, "priya@northwind.test");

      const version = await db.version.findFirst({
        where: { deliverable: { title: "Checkout flow prototype" } },
      });
      expect(version).toBeTruthy();

      const capture = await agent.post("/api/screenshots").send({
        versionId: version!.id,
        url: "https://external-proto.test/",
      });
      expect(capture.status).toBe(200);
      const screenshotId = capture.body.screenshot.id;

      const addThread = await agent.post("/api/actions/add-thread").send({
        versionId: version!.id,
        xPct: 25,
        yPct: 60,
        screenshotId,
        screen: "/should/be/ignored",
        body: "Is this button above the fold?",
      });
      expect(addThread.status).toBe(200);
      expect(addThread.body.ok).toBe(true);

      const deliverableResponse = await agent.get(
        `/api/client/deliverables/${version!.deliverableId}?version=${version!.id}`
      );
      const newThread = deliverableResponse.body.activeVersion.threads.find(
        (item: { comments: { body: string }[] }) =>
          item.comments.some((c) => c.body === "Is this button above the fold?")
      );
      expect(newThread).toBeTruthy();
      expect(newThread.screenshotId).toBe(screenshotId);
      expect(newThread.screen).toBeNull();
    });

    it("rejects add-thread when the screenshotId belongs to a different version", async () => {
      const agent = request.agent(createApp());
      await signInAs(agent, "priya@northwind.test");

      const checkoutVersion = await db.version.findFirst({
        where: { deliverable: { title: "Checkout flow prototype" } },
      });
      const homepageVersion = await db.version.findFirst({
        where: { deliverable: { title: "Homepage concept" } },
        orderBy: { versionNumber: "asc" },
      });
      expect(checkoutVersion).toBeTruthy();
      expect(homepageVersion).toBeTruthy();

      const capture = await agent.post("/api/screenshots").send({
        versionId: checkoutVersion!.id,
        url: "https://mismatched-version.test/",
      });
      expect(capture.status).toBe(200);

      const response = await agent.post("/api/actions/add-thread").send({
        versionId: homepageVersion!.id,
        xPct: 10,
        yPct: 10,
        screenshotId: capture.body.screenshot.id,
        body: "This should be rejected.",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/no longer belongs/i);
    });

    it("refresh preview creates a second screenshot row without deleting the first", async () => {
      const agent = request.agent(createApp());
      await signInAs(agent, "priya@northwind.test");

      const version = await db.version.findFirst({
        where: { deliverable: { title: "Checkout flow prototype" } },
      });
      expect(version).toBeTruthy();

      const first = await agent.post("/api/screenshots").send({
        versionId: version!.id,
        url: "https://refresh-me.test/",
      });
      expect(first.status).toBe(200);

      const second = await agent.post("/api/screenshots").send({
        versionId: version!.id,
        url: "https://refresh-me.test/",
      });
      expect(second.status).toBe(200);
      expect(second.body.screenshot.id).not.toBe(first.body.screenshot.id);

      const stillThere = await db.prototypeScreenshot.findUnique({
        where: { id: first.body.screenshot.id },
      });
      expect(stillThere).toBeTruthy();

      const deliverableResponse = await agent.get(
        `/api/client/deliverables/${version!.deliverableId}?version=${version!.id}`
      );
      const ids = deliverableResponse.body.activeVersion.screenshots.map(
        (item: { id: string }) => item.id
      );
      expect(ids).toEqual(
        expect.arrayContaining([first.body.screenshot.id, second.body.screenshot.id])
      );
    });
  });
});
