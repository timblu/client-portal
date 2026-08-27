"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifyAllStaff, notifyCompany } from "@/lib/notifications";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");
  return user;
}

// ---------- Staff: company / member management ----------

export async function createCompany(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "STAFF") throw new Error("Only staff can create companies.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const company = await db.company.create({ data: { name } });
  revalidatePath("/staff");
  redirect(`/staff/companies/${company.id}`);
}

export async function inviteMember(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "STAFF") throw new Error("Only staff can invite members.");

  const companyId = String(formData.get("companyId") ?? "");
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const isApprover = formData.get("isApprover") === "on";
  if (!companyId || !email || !name) return;

  await db.user.upsert({
    where: { email },
    update: { companyId, name, isApprover },
    create: { email, name, role: "CLIENT", isApprover, companyId },
  });

  revalidatePath(`/staff/companies/${companyId}`);
}

export async function toggleApprover(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "STAFF") throw new Error("Only staff can change approver status.");

  const memberId = String(formData.get("memberId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const member = await db.user.findUnique({ where: { id: memberId } });
  if (!member) return;

  await db.user.update({ where: { id: memberId }, data: { isApprover: !member.isApprover } });
  revalidatePath(`/staff/companies/${companyId}`);
}

export async function createProject(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "STAFF") throw new Error("Only staff can create projects.");

  const companyId = String(formData.get("companyId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!companyId || !name) return;

  const project = await db.project.create({ data: { companyId, name } });
  revalidatePath(`/staff/companies/${companyId}`);
  redirect(`/staff/projects/${project.id}`);
}

// ---------- Staff: deliverables & versions ----------

export async function createDeliverable(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "STAFF") throw new Error("Only staff can create deliverables.");

  const projectId = String(formData.get("projectId") ?? "");
  const phaseId = String(formData.get("phaseId") ?? "") || null;
  const type = String(formData.get("type") ?? "DESIGN") as "DESIGN" | "DOC";
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "STATIC_IMAGE") as
    | "STATIC_IMAGE"
    | "STATIC_PDF"
    | "MARKDOWN"
    | "PROTOTYPE_URL";
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const prototypeUrl = String(formData.get("prototypeUrl") ?? "").trim();

  if (!projectId || !title) return;

  const deliverable = await db.deliverable.create({
    data: { projectId, phaseId, type, title },
  });

  await db.version.create({
    data: {
      deliverableId: deliverable.id,
      versionNumber: 1,
      kind,
      fileUrl: fileUrl || null,
      content: content || null,
      prototypeUrl: prototypeUrl || null,
    },
  });

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (project) {
    await notifyCompany(
      project.companyId,
      `New for review: ${title}`,
      `${title} is ready for your review on ${project.name}.`
    );
  }

  revalidatePath(`/staff/projects/${projectId}`);
  redirect(`/staff/deliverables/${deliverable.id}`);
}

export async function addVersion(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "STAFF") throw new Error("Only staff can add versions.");

  const deliverableId = String(formData.get("deliverableId") ?? "");
  const kind = String(formData.get("kind") ?? "STATIC_IMAGE") as
    | "STATIC_IMAGE"
    | "STATIC_PDF"
    | "MARKDOWN"
    | "PROTOTYPE_URL";
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const prototypeUrl = String(formData.get("prototypeUrl") ?? "").trim();
  if (!deliverableId) return;

  const latest = await db.version.findFirst({
    where: { deliverableId },
    orderBy: { versionNumber: "desc" },
  });

  const newVersion = await db.version.create({
    data: {
      deliverableId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      kind,
      fileUrl: fileUrl || null,
      content: content || null,
      prototypeUrl: prototypeUrl || null,
    },
  });

  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
    include: { project: true },
  });
  if (deliverable) {
    await notifyCompany(
      deliverable.project.companyId,
      `New version for review: ${deliverable.title}`,
      `v${newVersion.versionNumber} of ${deliverable.title} is ready for your review on ${deliverable.project.name}.`
    );
  }

  revalidatePath(`/staff/deliverables/${deliverableId}`);
  revalidatePath(`/client/deliverables/${deliverableId}`);
}

// ---------- Comments (shared by staff & client) ----------

export async function addThread(versionId: string, xPct: number, yPct: number, body: string) {
  const user = await requireUser();
  if (!body.trim()) return;

  const thread = await db.commentThread.create({
    data: { versionId, xPct, yPct },
  });
  await db.comment.create({
    data: { threadId: thread.id, authorId: user.id, body: body.trim() },
  });

  const version = await db.version.findUnique({
    where: { id: versionId },
    include: { deliverable: true },
  });
  if (version && user.role === "CLIENT") {
    await notifyAllStaff(
      `New comment: ${version.deliverable.title}`,
      `${user.name} left a comment on v${version.versionNumber} of ${version.deliverable.title}.`
    );
  }
  revalidatePath(`/staff/deliverables/${version?.deliverableId}`);
  revalidatePath(`/client/deliverables/${version?.deliverableId}`);
}

export async function addReply(threadId: string, body: string) {
  const user = await requireUser();
  if (!body.trim()) return;

  await db.comment.create({ data: { threadId, authorId: user.id, body: body.trim() } });

  const thread = await db.commentThread.findUnique({
    where: { id: threadId },
    include: { version: { include: { deliverable: true } } },
  });
  if (thread && user.role === "CLIENT") {
    await notifyAllStaff(
      `New reply: ${thread.version.deliverable.title}`,
      `${user.name} replied on a comment thread for ${thread.version.deliverable.title}.`
    );
  }
  revalidatePath(`/staff/deliverables/${thread?.version.deliverableId}`);
  revalidatePath(`/client/deliverables/${thread?.version.deliverableId}`);
}

export async function toggleThreadResolved(threadId: string, resolved: boolean) {
  await requireUser();
  const thread = await db.commentThread.update({
    where: { id: threadId },
    data: { resolved },
    include: { version: true },
  });
  revalidatePath(`/staff/deliverables/${thread.version.deliverableId}`);
  revalidatePath(`/client/deliverables/${thread.version.deliverableId}`);
}

export async function toggleThreadPinned(threadId: string, pinned: boolean) {
  await requireUser();
  const thread = await db.commentThread.update({
    where: { id: threadId },
    data: { pinnedToTop: pinned },
    include: { version: true },
  });
  revalidatePath(`/staff/deliverables/${thread.version.deliverableId}`);
  revalidatePath(`/client/deliverables/${thread.version.deliverableId}`);
}

// ---------- Approval decisions ----------

export async function submitDecision(
  versionId: string,
  decisionState: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
  comment: string
) {
  const user = await requireUser();
  if (user.role !== "CLIENT" || !user.isApprover) {
    throw new Error("Only an approver can record a decision.");
  }
  if (decisionState !== "APPROVED" && !comment.trim()) {
    throw new Error("A comment is required for changes requested or rejected.");
  }

  const version = await db.version.update({
    where: { id: versionId },
    data: {
      decisionState,
      decisionComment: comment.trim() || null,
      decidedById: user.id,
      decidedAt: new Date(),
    },
    include: { deliverable: true },
  });

  const verb =
    decisionState === "APPROVED" ? "approved" : decisionState === "REJECTED" ? "rejected" : "requested changes on";
  await notifyAllStaff(
    `${verb === "approved" ? "Approved" : verb === "rejected" ? "Rejected" : "Changes requested"}: ${version.deliverable.title}`,
    `${user.name} ${verb} v${version.versionNumber} of ${version.deliverable.title}.`
  );

  revalidatePath(`/client/deliverables/${version.deliverableId}`);
  revalidatePath(`/staff/deliverables/${version.deliverableId}`);
}
