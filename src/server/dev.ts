import { db } from "@/lib/db";

export type SwitchTarget = {
  id: string;
  name: string;
  roleLabel: string;
  companyName: string | null;
};

export function devSwitchingEnabled() {
  return process.env.NODE_ENV !== "production";
}

export async function listSwitchTargets(): Promise<SwitchTarget[]> {
  if (!devSwitchingEnabled()) return [];

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { company: { select: { name: true } } },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    roleLabel:
      user.role === "STAFF"
        ? "staff"
        : user.companyRole === "COMPANY_ADMIN"
          ? "company admin"
          : "member",
    companyName: user.company?.name ?? null,
  }));
}

export async function resolveSwitchTarget(userId: string) {
  if (!devSwitchingEnabled()) {
    throw new Error("Account switching is disabled.");
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    throw new Error("Unknown account.");
  }

  return target;
}
