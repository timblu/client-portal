import type { User } from "@prisma/client";
import type { Agent } from "supertest";
import { db } from "@/lib/db";
import { createMagicLink } from "@/lib/auth";

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

export async function signInAs(agent: Agent, email: string) {
  const result = await createMagicLink(email);
  if (!result) {
    throw new Error(`No user found for ${email}`);
  }

  const verify = await agent.get(`/auth/verify?token=${result.token}`);
  if (verify.status >= 400) {
    throw new Error(`Failed to sign in as ${email}: ${verify.status}`);
  }

  return result.user;
}

export async function findUserByEmail(email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Seed user missing: ${email}`);
  }
  return user;
}
