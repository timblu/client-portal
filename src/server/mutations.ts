import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessProject, canApproveProject, type AccessUser } from "@/lib/access";
import {
  assertCanManageMembers,
  assertLastAdminMutation,
  requireActiveCompanyMember,
} from "@/lib/members";
import { notifyAllStaff, notifyCompany } from "@/lib/notifications";
import { clearSession, createSession } from "@/lib/auth";
import { resolveSwitchTarget } from "@/server/dev";
import type { MutationErrorCode } from "@/server/mutation-errors";

export type MutationResult =
  | { ok: true; redirectTo?: string; data?: unknown; session?: { token: string; expiresAt: Date } }
  | { ok: false; error: string; code?: MutationErrorCode };

function asAccessUser(user: User): AccessUser {
  return {
    id: user.id,
    role: user.role,
    companyId: user.companyId,
    companyRole: user.companyRole,
    removedAt: user.removedAt,
  };
}

function success(redirectTo?: string, data?: unknown): MutationResult {
  return { ok: true, redirectTo, data };
}

function failure(error: string, code?: MutationErrorCode): MutationResult {
  return code ? { ok: false, error, code } : { ok: false, error };
}

export async function createCompany(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  if (actor.role !== "STAFF") return failure("Only staff can create companies.", "FORBIDDEN");

  const name = String(body.name ?? "").trim();
  if (!name) return failure("Company name is required.");

  const company = await db.company.create({ data: { name } });
  return success(`/staff/companies/${company.id}`);
}

export async function inviteMember(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const companyId = String(body.companyId ?? "");
  if (!companyId) return failure("Company is required.");

  try {
    await assertCanManageMembers(asAccessUser(actor), companyId);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Forbidden.");
  }

  const email = String(body.email ?? "").toLowerCase().trim();
  const name = String(body.name ?? "").trim();
  const companyRole = String(body.companyRole ?? "MEMBER");
  if (!email || !name) return failure("Name and email are required.");
  if (companyRole !== "MEMBER" && companyRole !== "COMPANY_ADMIN") {
    return failure("Invalid company role.");
  }

  let memberships: { projectId: string; role: "REVIEWER" | "APPROVER" }[] = [];
  if (Array.isArray(body.memberships)) {
    memberships = body.memberships as { projectId: string; role: "REVIEWER" | "APPROVER" }[];
  } else if (typeof body.memberships === "string") {
    try {
      const parsed = JSON.parse(body.memberships) as {
        projectId: string;
        role: "REVIEWER" | "APPROVER";
      }[];
      memberships = Array.isArray(parsed) ? parsed : [];
    } catch {
      return failure("Invalid project access.");
    }
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    include: { projects: { select: { id: true } } },
  });
  if (!company) return failure("Company not found.");

  if (companyRole === "MEMBER") {
    if (memberships.length === 0) return failure("Select at least one project.");
    const validIds = new Set(company.projects.map((project) => project.id));
    for (const membership of memberships) {
      if (!validIds.has(membership.projectId)) {
        return failure("Choose projects that belong to this company.");
      }
      if (membership.role !== "REVIEWER" && membership.role !== "APPROVER") {
        return failure("Invalid project role.");
      }
    }
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === "STAFF") return failure("That email belongs to a staff account.");
    if (existing.companyId && existing.companyId !== companyId) {
      return failure("That email belongs to another company.");
    }
    if (existing.companyId === companyId && !existing.removedAt) {
      return failure("That person is already a member.");
    }
  }

  const member = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: {
          name,
          role: "CLIENT",
          companyId,
          companyRole: companyRole as "MEMBER" | "COMPANY_ADMIN",
          removedAt: null,
        },
      })
    : await db.user.create({
        data: {
          email,
          name,
          role: "CLIENT",
          companyId,
          companyRole: companyRole as "MEMBER" | "COMPANY_ADMIN",
        },
      });

  await db.projectMembership.deleteMany({ where: { userId: member.id } });
  if (companyRole === "MEMBER") {
    await db.projectMembership.createMany({
      data: memberships.map((membership) => ({
        userId: member.id,
        projectId: membership.projectId,
        role: membership.role,
      })),
    });
  }

  return success(); // M8: refreshPaths removed; client uses revalidate()
}

export async function updateMemberName(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const companyId = String(body.companyId ?? "");
  const memberId = String(body.memberId ?? "");
  const name = String(body.name ?? "").trim();

  try {
    await assertCanManageMembers(asAccessUser(actor), companyId);
    if (!name) return failure("Name is required.");
    await requireActiveCompanyMember(memberId, companyId);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Forbidden.");
  }

  await db.user.update({ where: { id: memberId }, data: { name } });
  return success(); // M8
}

export async function promoteToCompanyAdmin(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const companyId = String(body.companyId ?? "");
  const memberId = String(body.memberId ?? "");

  try {
    await assertCanManageMembers(asAccessUser(actor), companyId);
    await requireActiveCompanyMember(memberId, companyId);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Forbidden.");
  }

  await db.$transaction([
    db.projectMembership.deleteMany({ where: { userId: memberId } }),
    db.user.update({ where: { id: memberId }, data: { companyRole: "COMPANY_ADMIN" } }),
  ]);
  return success(); // M8
}

export async function demoteToMember(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const companyId = String(body.companyId ?? "");
  const memberId = String(body.memberId ?? "");
  const confirmedLastAdmin = body.confirmedLastAdmin === true || body.confirmedLastAdmin === "true";

  try {
    await assertCanManageMembers(asAccessUser(actor), companyId);
    await requireActiveCompanyMember(memberId, companyId);
    await assertLastAdminMutation(asAccessUser(actor), companyId, memberId, confirmedLastAdmin);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Forbidden.");
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

  return success(undefined, { projectCount: projects.length }); // M8: refreshPaths removed
}

export async function addProjectAccess(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const companyId = String(body.companyId ?? "");
  const memberId = String(body.memberId ?? "");
  const projectId = String(body.projectId ?? "");

  try {
    await assertCanManageMembers(asAccessUser(actor), companyId);
    const member = await requireActiveCompanyMember(memberId, companyId);
    if (member.companyRole === "COMPANY_ADMIN") {
      return failure("Company Admin access is automatic.");
    }
    const project = await db.project.findFirst({ where: { id: projectId, companyId } });
    if (!project) return failure("Project not found.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Forbidden.");
  }

  await db.projectMembership.upsert({
    where: { userId_projectId: { userId: memberId, projectId } },
    update: {},
    create: { userId: memberId, projectId, role: "REVIEWER" },
  });
  return success(); // M8
}

export async function removeProjectAccess(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const companyId = String(body.companyId ?? "");
  const memberId = String(body.memberId ?? "");
  const projectId = String(body.projectId ?? "");

  try {
    await assertCanManageMembers(asAccessUser(actor), companyId);
    const member = await requireActiveCompanyMember(memberId, companyId);
    if (member.companyRole === "COMPANY_ADMIN") {
      return failure("Company Admin access is automatic.");
    }
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Forbidden.");
  }

  await db.projectMembership.deleteMany({ where: { userId: memberId, projectId } });
  return success(); // M8
}

export async function changeProjectRole(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const companyId = String(body.companyId ?? "");
  const memberId = String(body.memberId ?? "");
  const projectId = String(body.projectId ?? "");
  const role = String(body.role ?? "");

  // I3: validate inputs up-front to avoid unexpected DB errors
  if (!companyId || !memberId || !projectId) return failure("companyId, memberId, and projectId are required.");
  if (role !== "REVIEWER" && role !== "APPROVER") return failure("Invalid project role.");

  try {
    await assertCanManageMembers(asAccessUser(actor), companyId);
    const member = await requireActiveCompanyMember(memberId, companyId);
    if (member.companyRole === "COMPANY_ADMIN") {
      return failure("Company Admin access is automatic.");
    }
    // I3: check membership exists before calling update (avoids Prisma P2025 → 500)
    const membership = await db.projectMembership.findUnique({
      where: { userId_projectId: { userId: memberId, projectId } },
    });
    if (!membership) return failure("Member does not have access to this project.", "NOT_FOUND");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Forbidden.");
  }

  await db.projectMembership.update({
    where: { userId_projectId: { userId: memberId, projectId } },
    data: { role: role as "REVIEWER" | "APPROVER" },
  });
  return success(); // M8
}

export async function removeMemberFromCompany(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const companyId = String(body.companyId ?? "");
  const memberId = String(body.memberId ?? "");
  const confirmedLastAdmin = body.confirmedLastAdmin === true || body.confirmedLastAdmin === "true";

  try {
    await assertCanManageMembers(asAccessUser(actor), companyId);
    await requireActiveCompanyMember(memberId, companyId);
    await assertLastAdminMutation(asAccessUser(actor), companyId, memberId, confirmedLastAdmin);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Forbidden.");
  }

  await db.$transaction([
    db.projectMembership.deleteMany({ where: { userId: memberId } }),
    db.user.update({ where: { id: memberId }, data: { removedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: memberId } }), // M5: revoke all sessions on removal
  ]);

  return success(
    actor.role === "STAFF" ? `/staff/companies/${companyId}/members` : "/client/members"
    // M8: refreshPaths removed; client uses revalidate()
  );
}

export async function createProject(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  if (actor.role !== "STAFF") return failure("Only staff can create projects.", "FORBIDDEN");

  const companyId = String(body.companyId ?? "");
  const name = String(body.name ?? "").trim();
  if (!companyId || !name) return failure("Company and project name are required.");

  // I5: validate the company exists before creating
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) return failure("Company not found.", "NOT_FOUND");

  const project = await db.project.create({ data: { companyId, name } });
  return success(`/staff/projects/${project.id}`);
}

const VALID_DELIVERABLE_TYPES = ["DESIGN", "DOC"] as const;
const VALID_VERSION_KINDS = ["STATIC_IMAGE", "STATIC_PDF", "MARKDOWN", "PROTOTYPE_URL"] as const;

export async function createDeliverable(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  if (actor.role !== "STAFF") return failure("Only staff can create deliverables.", "FORBIDDEN");

  const projectId = String(body.projectId ?? "");
  const phaseId = String(body.phaseId ?? "") || null;
  const type = String(body.type ?? "DESIGN");
  const title = String(body.title ?? "").trim();
  const kind = String(body.kind ?? "STATIC_IMAGE");
  const fileUrl = String(body.fileUrl ?? "").trim();
  const content = String(body.content ?? "").trim();
  const prototypeUrl = String(body.prototypeUrl ?? "").trim();

  if (!projectId || !title) return failure("Project and title are required.");
  // I5: validate enums to prevent silent data corruption
  if (!VALID_DELIVERABLE_TYPES.includes(type as "DESIGN" | "DOC"))
    return failure("Invalid deliverable type. Must be DESIGN or DOC.");
  if (!VALID_VERSION_KINDS.includes(kind as "STATIC_IMAGE" | "STATIC_PDF" | "MARKDOWN" | "PROTOTYPE_URL"))
    return failure("Invalid version kind.");
  // I5: validate project exists
  const projectForDeliverable = await db.project.findUnique({ where: { id: projectId } });
  if (!projectForDeliverable) return failure("Project not found.", "NOT_FOUND");

  const deliverable = await db.deliverable.create({
    data: { projectId, phaseId, type: type as "DESIGN" | "DOC", title },
  });

  await db.version.create({
    data: {
      deliverableId: deliverable.id,
      versionNumber: 1,
      kind: kind as "STATIC_IMAGE" | "STATIC_PDF" | "MARKDOWN" | "PROTOTYPE_URL",
      fileUrl: fileUrl || null,
      content: content || null,
      prototypeUrl: prototypeUrl || null,
    },
  });

  await notifyCompany(
    projectForDeliverable.companyId,
    `New for review: ${title}`,
    `${title} is ready for your review on ${projectForDeliverable.name}.`
  );

  return success(`/staff/deliverables/${deliverable.id}`);
}

export async function addVersion(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  if (actor.role !== "STAFF") return failure("Only staff can add versions.", "FORBIDDEN");

  const deliverableId = String(body.deliverableId ?? "");
  const kind = String(body.kind ?? "STATIC_IMAGE");
  const fileUrl = String(body.fileUrl ?? "").trim();
  const content = String(body.content ?? "").trim();
  const prototypeUrl = String(body.prototypeUrl ?? "").trim();
  if (!deliverableId) return failure("Deliverable is required.");
  // I5: validate kind enum
  if (!VALID_VERSION_KINDS.includes(kind as "STATIC_IMAGE" | "STATIC_PDF" | "MARKDOWN" | "PROTOTYPE_URL"))
    return failure("Invalid version kind.");
  // I5: validate deliverable exists to avoid silent errors
  const deliverableRecord = await db.deliverable.findUnique({ where: { id: deliverableId } });
  if (!deliverableRecord) return failure("Deliverable not found.", "NOT_FOUND");

  const latest = await db.version.findFirst({
    where: { deliverableId },
    orderBy: { versionNumber: "desc" },
  });

  const newVersion = await db.version.create({
    data: {
      deliverableId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      kind: kind as "STATIC_IMAGE" | "STATIC_PDF" | "MARKDOWN" | "PROTOTYPE_URL",
      fileUrl: fileUrl || null,
      content: content || null,
      prototypeUrl: prototypeUrl || null,
    },
  });

  // I5: deliverableRecord already fetched above; use it with project for notification
  const deliverableWithProject = await db.deliverable.findUnique({
    where: { id: deliverableId },
    include: { project: true },
  });
  if (deliverableWithProject) {
    await notifyCompany(
      deliverableWithProject.project.companyId,
      `New version for review: ${deliverableWithProject.title}`,
      `v${newVersion.versionNumber} of ${deliverableWithProject.title} is ready for your review on ${deliverableWithProject.project.name}.`
    );
  }

  return success();
}

async function requireProjectAccessForVersion(actor: User, versionId: string) {
  const version = await db.version.findUnique({
    where: { id: versionId },
    include: { deliverable: { include: { project: true } } },
  });
  if (!version) throw new Error("Version not found.");
  if (!(await canAccessProject(asAccessUser(actor), version.deliverable.project))) {
    throw new Error("You cannot access this project.");
  }
  return version;
}

async function requireProjectAccessForThread(actor: User, threadId: string) {
  const thread = await db.commentThread.findUnique({
    where: { id: threadId },
    include: { version: { include: { deliverable: { include: { project: true } } } } },
  });
  if (!thread) throw new Error("Thread not found.");
  if (!(await canAccessProject(asAccessUser(actor), thread.version.deliverable.project))) {
    throw new Error("You cannot access this project.");
  }
  return thread;
}

export async function addThread(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const versionId = String(body.versionId ?? "");
  const xPct = Number(body.xPct);
  const yPct = Number(body.yPct);
  const commentBody = String(body.body ?? "").trim();
  if (!commentBody) return failure("Comment body is required.");

  try {
    const version = await requireProjectAccessForVersion(actor, versionId);
    const rawScreen = String(body.screen ?? "").trim().slice(0, 100);
    const screen = version.kind === "PROTOTYPE_URL" && rawScreen ? rawScreen : null;
    const thread = await db.commentThread.create({
      data: { versionId, xPct, yPct, screen },
    });
    await db.comment.create({
      data: { threadId: thread.id, authorId: actor.id, body: commentBody },
    });

    if (actor.role === "CLIENT") {
      await notifyAllStaff(
        `New comment: ${version.deliverable.title}`,
        `${actor.name} left a comment on v${version.versionNumber} of ${version.deliverable.title}.`
      );
    }
    return success();
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Unable to add thread.");
  }
}

export async function addReply(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const threadId = String(body.threadId ?? "");
  const commentBody = String(body.body ?? "").trim();
  if (!commentBody) return failure("Comment body is required.");

  try {
    const thread = await requireProjectAccessForThread(actor, threadId);
    await db.comment.create({ data: { threadId, authorId: actor.id, body: commentBody } });

    if (actor.role === "CLIENT") {
      await notifyAllStaff(
        `New reply: ${thread.version.deliverable.title}`,
        `${actor.name} replied on a comment thread for ${thread.version.deliverable.title}.`
      );
    }
    return success();
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Unable to add reply.");
  }
}

export async function toggleThreadResolved(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const threadId = String(body.threadId ?? "");
  const resolved = body.resolved === true || body.resolved === "true";

  try {
    await requireProjectAccessForThread(actor, threadId);
    await db.commentThread.update({
      where: { id: threadId },
      data: { resolved },
    });
    return success();
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Unable to update thread.");
  }
}

export async function toggleThreadPinned(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const threadId = String(body.threadId ?? "");
  const pinned = body.pinned === true || body.pinned === "true";

  try {
    await requireProjectAccessForThread(actor, threadId);
    await db.commentThread.update({
      where: { id: threadId },
      data: { pinnedToTop: pinned },
    });
    return success();
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Unable to update thread.");
  }
}

const VALID_DECISION_STATES = ["APPROVED", "CHANGES_REQUESTED", "REJECTED"] as const;

export async function submitDecision(actor: User, body: Record<string, unknown>): Promise<MutationResult> {
  const versionId = String(body.versionId ?? "");
  const decisionState = String(body.decisionState ?? "");
  const comment = String(body.comment ?? "");

  // I5: validate enum before hitting DB
  if (!VALID_DECISION_STATES.includes(decisionState as "APPROVED" | "CHANGES_REQUESTED" | "REJECTED"))
    return failure("Invalid decision state. Must be APPROVED, CHANGES_REQUESTED, or REJECTED.");

  const existing = await db.version.findUnique({
    where: { id: versionId },
    include: { deliverable: { include: { project: true } } },
  });
  if (!existing) return failure("Version not found.", "NOT_FOUND");
  if (!(await canApproveProject(asAccessUser(actor), existing.deliverable.project))) {
    return failure("Only an approver can record a decision.", "FORBIDDEN");
  }
  if (decisionState !== "APPROVED" && !comment.trim()) {
    return failure("A comment is required for changes requested or rejected.");
  }

  const version = await db.version.update({
    where: { id: versionId },
    data: {
      decisionState: decisionState as "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
      decisionComment: comment.trim() || null,
      decidedById: actor.id,
      decidedAt: new Date(),
    },
    include: { deliverable: true },
  });

  const verb =
    decisionState === "APPROVED"
      ? "approved"
      : decisionState === "REJECTED"
        ? "rejected"
        : "requested changes on";
  await notifyAllStaff(
    `${verb === "approved" ? "Approved" : verb === "rejected" ? "Rejected" : "Changes requested"}: ${version.deliverable.title}`,
    `${actor.name} ${verb} v${version.versionNumber} of ${version.deliverable.title}.`
  );

  return success();
}

export async function switchUser(
  actor: User,
  body: Record<string, unknown>,
  currentSessionToken?: string | null
): Promise<MutationResult> {
  void actor;
  const userId = String(body.userId ?? "");
  if (!userId) return failure("User is required.");

  try {
    const target = await resolveSwitchTarget(userId);
    await clearSession(currentSessionToken);
    const session = await createSession(target.id);
    return { ok: true, redirectTo: "/", session };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Unable to switch user.");
  }
}

const mutationHandlers = {
  "create-company": createCompany,
  "invite-member": inviteMember,
  "update-member-name": updateMemberName,
  "promote-to-company-admin": promoteToCompanyAdmin,
  "demote-to-member": demoteToMember,
  "add-project-access": addProjectAccess,
  "remove-project-access": removeProjectAccess,
  "change-project-role": changeProjectRole,
  "remove-member-from-company": removeMemberFromCompany,
  "create-project": createProject,
  "create-deliverable": createDeliverable,
  "add-version": addVersion,
  "add-thread": addThread,
  "add-reply": addReply,
  "toggle-thread-resolved": toggleThreadResolved,
  "toggle-thread-pinned": toggleThreadPinned,
  "submit-decision": submitDecision,
  "switch-user": switchUser,
} as const;

export type MutationAction = keyof typeof mutationHandlers;

export function isMutationAction(action: string): action is MutationAction {
  return action in mutationHandlers;
}

export async function runMutation(
  action: MutationAction,
  actor: User,
  body: Record<string, unknown>,
  currentSessionToken?: string | null
): Promise<MutationResult> {
  if (action === "switch-user") {
    return switchUser(actor, body, currentSessionToken);
  }
  return mutationHandlers[action](actor, body);
}
