import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isCompanyAdmin } from "@/lib/access-pure";
// Re-export pure types and helpers so server code can import from one place.
export type { AccessUser, AccessProject } from "@/lib/access-pure";
export { isCompanyAdmin } from "@/lib/access-pure";
import type { AccessUser, AccessProject } from "@/lib/access-pure";

export async function canAccessProject(user: AccessUser, project: AccessProject): Promise<boolean> {
  if (user.role === "STAFF") return true;
  if (user.role !== "CLIENT" || user.removedAt) return false;
  if (isCompanyAdmin(user)) return user.companyId === project.companyId;

  const membership = await db.projectMembership.findUnique({
    where: { userId_projectId: { userId: user.id, projectId: project.id } },
  });
  return membership != null && user.companyId === project.companyId;
}

export async function canApproveProject(user: AccessUser, project: AccessProject): Promise<boolean> {
  if (user.role !== "CLIENT" || user.removedAt) return false;
  if (isCompanyAdmin(user)) return user.companyId === project.companyId;

  const membership = await db.projectMembership.findUnique({
    where: { userId_projectId: { userId: user.id, projectId: project.id } },
  });
  return membership?.role === "APPROVER" && user.companyId === project.companyId;
}

export function visibleProjectsWhere(user: AccessUser): Prisma.ProjectWhereInput {
  if (user.role !== "CLIENT" || user.removedAt || !user.companyId) {
    return { id: { in: [] } };
  }
  if (isCompanyAdmin(user)) {
    return { companyId: user.companyId };
  }
  return {
    companyId: user.companyId,
    memberships: { some: { userId: user.id } },
  };
}
