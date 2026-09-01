import { db } from "@/lib/db";
import { isCompanyAdmin, type AccessUser } from "@/lib/access";

export async function assertCanManageMembers(actor: AccessUser, companyId: string) {
  if (actor.role === "STAFF") return;
  if (isCompanyAdmin(actor) && actor.companyId === companyId) return;
  throw new Error("You cannot manage members for this company.");
}

export async function assertLastAdminMutation(
  actor: AccessUser,
  companyId: string,
  memberId: string,
  confirmedLastAdmin: boolean
) {
  if (!(await isLastCompanyAdmin(companyId, memberId))) return;
  if (actor.role !== "STAFF") {
    throw new Error("Only Company Admin — can't be demoted or removed. Promote another Member first.");
  }
  if (!confirmedLastAdmin) {
    throw new Error("Confirm this action on the last Company Admin.");
  }
}

export async function isLastCompanyAdmin(companyId: string, memberId: string) {
  const member = await db.user.findUnique({ where: { id: memberId } });
  if (!member || member.companyRole !== "COMPANY_ADMIN" || member.removedAt) return false;
  const adminCount = await db.user.count({
    where: { companyId, companyRole: "COMPANY_ADMIN", removedAt: null },
  });
  return adminCount === 1;
}

export async function requireActiveCompanyMember(memberId: string, companyId: string) {
  const member = await db.user.findUnique({ where: { id: memberId } });
  if (
    !member ||
    member.role !== "CLIENT" ||
    member.companyId !== companyId ||
    member.removedAt
  ) {
    throw new Error("Member not found.");
  }
  return member;
}

// M8: memberPathsToRefresh removed — mutations no longer return a refreshPaths payload.
// Client uses revalidate() from useRevalidate() after successful mutations.
