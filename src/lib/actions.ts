"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProject, canApproveProject } from "@/lib/access";
import {
  assertCanManageMembers,
  isLastCompanyAdmin,
  revalidateMemberPaths,
  requireActiveCompanyMember,
} from "@/lib/members";
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

export async function inviteMember(formData: FormData): Promise<{ error?: string } | void> {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return { error: "Company is required." };
  await assertCanManageMembers(user, companyId);
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const companyRole = String(formData.get("companyRole") ?? "MEMBER");
  if (!companyId || !email || !name) return { error: "Name and email are required." };
  if (companyRole !== "MEMBER" && companyRole !== "COMPANY_ADMIN") {
    return { error: "Invalid company role." };
  }

  let memberships: { projectId: string; role: "REVIEWER" | "APPROVER" }[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("memberships") ?? "[]")) as {
      projectId: string;
      role: "REVIEWER" | "APPROVER";
    }[];
    memberships = Array.isArray(parsed) ? parsed : [];
  } catch {
    return { error: "Invalid project access." };
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    include: { projects: { select: { id: true } } },
  });
  if (!company) return { error: "Company not found." };

  if (companyRole === "MEMBER") {
    if (memberships.length === 0) return { error: "Select at least one project." };
    const validIds = new Set(company.projects.map((p) => p.id));
    for (const membership of memberships) {
      if (!validIds.has(membership.projectId)) {
        return { error: "Choose projects that belong to this company." };
      }
      if (membership.role !== "REVIEWER" && membership.role !== "APPROVER") {
        return { error: "Invalid project role." };
      }
    }
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === "STAFF") return { error: "That email belongs to a staff account." };
    if (existing.companyId && existing.companyId !== companyId) {
      return { error: "That email belongs to another company." };
    }
    if (existing.companyId === companyId && !existing.removedAt) {
      return { error: "That person is already a member." };
    }
  }

  const member = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: {
          name,
          role: "CLIENT",
          companyId,
          companyRole,
          removedAt: null,
        },
      })
    : await db.user.create({
        data: { email, name, role: "CLIENT", companyId, companyRole },
      });

  await db.projectMembership.deleteMany({ where: { userId: member.id } });
  if (companyRole === "MEMBER") {
    await db.projectMembership.createMany({
      data: memberships.map((m) => ({
        userId: member.id,
        projectId: m.projectId,
        role: m.role,
      })),
    });
  }

  revalidateMemberPaths(companyId);
}

export async function updateMemberName(formData: FormData) {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  await assertCanManageMembers(user, companyId);
  if (!name) return;
  await requireActiveCompanyMember(memberId, companyId);
  await db.user.update({ where: { id: memberId }, data: { name } });
  revalidateMemberPaths(companyId, memberId);
}

export async function promoteToCompanyAdmin(formData: FormData) {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  await assertCanManageMembers(user, companyId);
  await requireActiveCompanyMember(memberId, companyId);
  await db.$transaction([
    db.projectMembership.deleteMany({ where: { userId: memberId } }),
    db.user.update({ where: { id: memberId }, data: { companyRole: "COMPANY_ADMIN" } }),
  ]);
  revalidateMemberPaths(companyId, memberId);
}

export async function demoteToMember(formData: FormData): Promise<{ projectCount: number }> {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const confirmedLastAdmin = formData.get("confirmedLastAdmin") === "true";
  await assertCanManageMembers(user, companyId);
  await requireActiveCompanyMember(memberId, companyId);

  if ((await isLastCompanyAdmin(companyId, memberId)) && !confirmedLastAdmin) {
    throw new Error("Confirm demoting the last Company Admin.");
  }

  const projects = await db.project.findMany({ where: { companyId }, select: { id: true } });
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: memberId }, data: { companyRole: "MEMBER" } });
    await tx.projectMembership.deleteMany({ where: { userId: memberId } });
    if (projects.length > 0) {
      await tx.projectMembership.createMany({
        data: projects.map((project) => ({
          userId: memberId,
          projectId: project.id,
          role: "REVIEWER" as const,
        })),
      });
    }
  });
  revalidateMemberPaths(companyId, memberId);
  return { projectCount: projects.length };
}

export async function addProjectAccess(formData: FormData) {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  await assertCanManageMembers(user, companyId);
  const member = await requireActiveCompanyMember(memberId, companyId);
  if (member.companyRole === "COMPANY_ADMIN") {
    throw new Error("Company Admin access is automatic.");
  }
  const project = await db.project.findFirst({ where: { id: projectId, companyId } });
  if (!project) throw new Error("Project not found.");
  await db.projectMembership.upsert({
    where: { userId_projectId: { userId: memberId, projectId } },
    update: {},
    create: { userId: memberId, projectId, role: "REVIEWER" },
  });
  revalidateMemberPaths(companyId, memberId);
}

export async function removeProjectAccess(formData: FormData) {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  await assertCanManageMembers(user, companyId);
  const member = await requireActiveCompanyMember(memberId, companyId);
  if (member.companyRole === "COMPANY_ADMIN") {
    throw new Error("Company Admin access is automatic.");
  }
  await db.projectMembership.deleteMany({ where: { userId: memberId, projectId } });
  revalidateMemberPaths(companyId, memberId);
}

export async function changeProjectRole(formData: FormData) {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const role = String(formData.get("role") ?? "");
  await assertCanManageMembers(user, companyId);
  const member = await requireActiveCompanyMember(memberId, companyId);
  if (member.companyRole === "COMPANY_ADMIN") {
    throw new Error("Company Admin access is automatic.");
  }
  if (role !== "REVIEWER" && role !== "APPROVER") throw new Error("Invalid project role.");
  await db.projectMembership.update({
    where: { userId_projectId: { userId: memberId, projectId } },
    data: { role },
  });
  revalidateMemberPaths(companyId, memberId);
}

export async function removeMemberFromCompany(formData: FormData) {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const confirmedLastAdmin = formData.get("confirmedLastAdmin") === "true";
  await assertCanManageMembers(user, companyId);
  await requireActiveCompanyMember(memberId, companyId);

  if ((await isLastCompanyAdmin(companyId, memberId)) && !confirmedLastAdmin) {
    throw new Error("Confirm removing the last Company Admin.");
  }

  await db.$transaction([
    db.projectMembership.deleteMany({ where: { userId: memberId } }),
    db.user.update({
      where: { id: memberId },
      data: { removedAt: new Date() },
    }),
  ]);
  revalidateMemberPaths(companyId, memberId);
  redirect(`/staff/companies/${companyId}/members`);
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

async function requireProjectAccessForVersion(user: Awaited<ReturnType<typeof requireUser>>, versionId: string) {
  const version = await db.version.findUnique({
    where: { id: versionId },
    include: { deliverable: { include: { project: true } } },
  });
  if (!version) throw new Error("Version not found.");
  if (!(await canAccessProject(user, version.deliverable.project))) {
    throw new Error("You cannot access this project.");
  }
  return version;
}

async function requireProjectAccessForThread(user: Awaited<ReturnType<typeof requireUser>>, threadId: string) {
  const thread = await db.commentThread.findUnique({
    where: { id: threadId },
    include: { version: { include: { deliverable: { include: { project: true } } } } },
  });
  if (!thread) throw new Error("Thread not found.");
  if (!(await canAccessProject(user, thread.version.deliverable.project))) {
    throw new Error("You cannot access this project.");
  }
  return thread;
}

export async function addThread(versionId: string, xPct: number, yPct: number, body: string) {
  const user = await requireUser();
  if (!body.trim()) return;

  const version = await requireProjectAccessForVersion(user, versionId);

  const thread = await db.commentThread.create({
    data: { versionId, xPct, yPct },
  });
  await db.comment.create({
    data: { threadId: thread.id, authorId: user.id, body: body.trim() },
  });

  if (user.role === "CLIENT") {
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

  const thread = await requireProjectAccessForThread(user, threadId);
  await db.comment.create({ data: { threadId, authorId: user.id, body: body.trim() } });

  if (user.role === "CLIENT") {
    await notifyAllStaff(
      `New reply: ${thread.version.deliverable.title}`,
      `${user.name} replied on a comment thread for ${thread.version.deliverable.title}.`
    );
  }
  revalidatePath(`/staff/deliverables/${thread?.version.deliverableId}`);
  revalidatePath(`/client/deliverables/${thread?.version.deliverableId}`);
}

export async function toggleThreadResolved(threadId: string, resolved: boolean) {
  const user = await requireUser();
  await requireProjectAccessForThread(user, threadId);
  const thread = await db.commentThread.update({
    where: { id: threadId },
    data: { resolved },
    include: { version: true },
  });
  revalidatePath(`/staff/deliverables/${thread.version.deliverableId}`);
  revalidatePath(`/client/deliverables/${thread.version.deliverableId}`);
}

export async function toggleThreadPinned(threadId: string, pinned: boolean) {
  const user = await requireUser();
  await requireProjectAccessForThread(user, threadId);
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
  const existing = await db.version.findUnique({
    where: { id: versionId },
    include: { deliverable: { include: { project: true } } },
  });
  if (!existing) throw new Error("Version not found.");
  if (!(await canApproveProject(user, existing.deliverable.project))) {
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
