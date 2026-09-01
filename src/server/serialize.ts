import type { User } from "@prisma/client";

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    companyRole: user.companyRole,
    removedAt: user.removedAt?.toISOString() ?? null,
  };
}
