import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SOLUTION_DOC = `# Solution Approach — Storefront Redesign

## Summary
We are rebuilding the storefront home and checkout experience on the current commerce
platform, without a replatform. Scope is presentation-layer only for this phase.

## Key decisions
- Keep the existing checkout API; only the UI shell changes.
- Homepage hero content becomes a CMS-managed block instead of hardcoded markup.
- Feature grid is limited to three items to keep the fold height in check.
`;

const INTEGRATION_DOC = `# Integration Plan — Member Portal

## Systems involved
- Identity: existing SSO provider (no change)
- Orders: read-only sync from the fulfillment system, polling every 15 minutes
- Documents: served from existing document storage, linked by member ID

## Notes
This is a first pass; the fulfillment system's rate limits are still being confirmed with
their team.
`;

async function main() {
  await db.notification.deleteMany();
  await db.blockerComment.deleteMany();
  await db.blocker.deleteMany();
  await db.comment.deleteMany();
  await db.commentThread.deleteMany();
  await db.version.deleteMany();
  await db.deliverable.deleteMany();
  await db.projectMembership.deleteMany();
  await db.project.deleteMany();
  await db.phase.deleteMany();
  await db.session.deleteMany();
  await db.magicLink.deleteMany();
  await db.user.deleteMany();
  await db.company.deleteMany();

  const sam = await db.user.create({
    data: { email: "sam@agency.test", name: "Sam Rivera", role: "STAFF" },
  });
  await db.user.create({
    data: { email: "jordan@agency.test", name: "Jordan Lee", role: "STAFF" },
  });

  const northwind = await db.company.create({
    data: { name: "Northwind Retail", logoUrl: "/seed/northwind-logo.svg" },
  });
  const casey = await db.user.create({
    data: {
      email: "casey@northwind.test",
      name: "Casey Morgan",
      role: "CLIENT",
      companyRole: "MEMBER",
      companyId: northwind.id,
    },
  });
  const priya = await db.user.create({
    data: {
      email: "priya@northwind.test",
      name: "Priya Nair",
      role: "CLIENT",
      companyRole: "MEMBER",
      companyId: northwind.id,
    },
  });

  const storefront = await db.project.create({
    data: { name: "Storefront Redesign", companyId: northwind.id },
  });
  await db.project.create({ data: { name: "Loyalty Program", companyId: northwind.id } });

  await db.projectMembership.create({
    data: { userId: casey.id, projectId: storefront.id, role: "APPROVER" },
  });
  await db.projectMembership.create({
    data: { userId: priya.id, projectId: storefront.id, role: "REVIEWER" },
  });

  const homepage = await db.deliverable.create({
    data: {
      projectId: storefront.id,
      type: "DESIGN",
      title: "Homepage concept",
    },
  });
  const homepageV1 = await db.version.create({
    data: {
      deliverableId: homepage.id,
      versionNumber: 1,
      kind: "STATIC_IMAGE",
      fileUrl: "/seed/homepage-v1.svg",
      decisionState: "CHANGES_REQUESTED",
      decisionComment: "Hero CTA reads as secondary next to the image. Tighten copy and make the primary action heavier.",
      decidedById: casey.id,
      decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
  });
  await db.version.create({
    data: {
      deliverableId: homepage.id,
      versionNumber: 2,
      kind: "STATIC_IMAGE",
      fileUrl: "/seed/homepage-v2.svg",
      decisionState: "PENDING",
    },
  });

  const threadA = await db.commentThread.create({
    data: { versionId: homepageV1.id, xPct: 18, yPct: 33, resolved: true },
  });
  await db.comment.createMany({
    data: [
      { threadId: threadA.id, authorId: casey.id, body: "The primary CTA gets lost next to the hero image." },
      { threadId: threadA.id, authorId: sam.id, body: "Agreed — v2 makes it solid black and adds a secondary link." },
    ],
  });

  const threadB = await db.commentThread.create({
    data: { versionId: homepageV1.id, xPct: 68, yPct: 24, resolved: false, pinnedToTop: true },
  });
  await db.comment.create({
    data: { threadId: threadB.id, authorId: priya.id, body: "Is the hero image final, or still a placeholder box?" },
  });

  const checkoutProto = await db.deliverable.create({
    data: {
      projectId: storefront.id,
      type: "DESIGN",
      title: "Checkout flow prototype",
    },
  });
  await db.version.create({
    data: {
      deliverableId: checkoutProto.id,
      versionNumber: 1,
      kind: "PROTOTYPE_URL",
      prototypeUrl: "/proto/checkout",
      decisionState: "PENDING",
    },
  });

  const solutionDoc = await db.deliverable.create({
    data: {
      projectId: storefront.id,
      type: "DOC",
      title: "Solution approach",
    },
  });
  await db.version.create({
    data: {
      deliverableId: solutionDoc.id,
      versionNumber: 1,
      kind: "MARKDOWN",
      content: SOLUTION_DOC,
      decisionState: "APPROVED",
      decidedById: casey.id,
      decidedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
    },
  });

  const alpine = await db.company.create({
    data: { name: "Alpine Outfitters", logoUrl: "/seed/alpine-logo.svg" },
  });
  const devon = await db.user.create({
    data: {
      email: "devon@alpine.test",
      name: "Devon Blake",
      role: "CLIENT",
      companyRole: "MEMBER",
      companyId: alpine.id,
    },
  });

  const memberPortal = await db.project.create({
    data: { name: "Member Portal", companyId: alpine.id },
  });
  await db.projectMembership.create({
    data: { userId: devon.id, projectId: memberPortal.id, role: "APPROVER" },
  });

  const dashboardDeliverable = await db.deliverable.create({
    data: {
      projectId: memberPortal.id,
      type: "DESIGN",
      title: "Dashboard layout",
    },
  });
  await db.version.create({
    data: {
      deliverableId: dashboardDeliverable.id,
      versionNumber: 1,
      kind: "STATIC_IMAGE",
      fileUrl: "/seed/dashboard-v1.svg",
      decisionState: "PENDING",
    },
  });

  const integrationDoc = await db.deliverable.create({
    data: {
      projectId: memberPortal.id,
      type: "DOC",
      title: "Integration plan",
    },
  });
  await db.version.create({
    data: {
      deliverableId: integrationDoc.id,
      versionNumber: 1,
      kind: "MARKDOWN",
      content: INTEGRATION_DOC,
      decisionState: "PENDING",
    },
  });

  void devon;

  console.log("Seed complete.");
  console.log("Staff:      sam@agency.test");
  console.log("Northwind:  casey@northwind.test (Approver on Storefront), priya@northwind.test (Reviewer on Storefront)");
  console.log("Alpine:     devon@alpine.test (Approver on Member Portal)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
