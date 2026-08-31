"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clearSession, createSession } from "@/lib/auth";

export type SwitchTarget = {
  id: string;
  name: string;
  roleLabel: string;
  companyName: string | null;
};

function switchingEnabled() {
  return process.env.NODE_ENV !== "production";
}

export async function listSwitchTargets(): Promise<SwitchTarget[]> {
  if (!switchingEnabled()) return [];

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

export async function switchToUser(formData: FormData) {
  if (!switchingEnabled()) throw new Error("Account switching is disabled.");

  const userId = String(formData.get("userId") ?? "");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("Unknown account.");

  await clearSession();
  await createSession(target.id);

  // `/` routes to /staff or /client by role, so this works across role changes.
  redirect("/");
}
