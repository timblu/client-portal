/**
 * Pure, browser-safe access helpers — no Prisma, no DB imports.
 * Import these in client code; import from @/lib/access in server code.
 */

export type AccessUser = {
  id: string;
  role: "STAFF" | "CLIENT";
  companyId: string | null;
  companyRole: "COMPANY_ADMIN" | "MEMBER" | null;
  removedAt: Date | null;
};

export type AccessProject = {
  id: string;
  companyId: string;
};

export function isCompanyAdmin(user: AccessUser): boolean {
  return user.companyRole === "COMPANY_ADMIN" && user.removedAt == null;
}
