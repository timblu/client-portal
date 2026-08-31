import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { AccessUser } from "@/lib/access";

export async function assertCanManageMembers(actor: AccessUser, companyId: string) {
  if (actor.role === "STAFF") return;
  throw new Error("Only staff can manage members.");
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

export function revalidateMemberPaths(companyId: string, memberId?: string) {
  revalidatePath(`/staff/companies/${companyId}`);
  revalidatePath(`/staff/companies/${companyId}/members`);
  if (memberId) revalidatePath(`/staff/companies/${companyId}/members/${memberId}`);
}
