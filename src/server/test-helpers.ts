import type { Agent } from "supertest";
import { createMagicLink } from "@/lib/auth";
import { db } from "@/lib/db";

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
