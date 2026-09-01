import { randomBytes } from "crypto";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "cp_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
export const MAGIC_LINK_TTL_MS = 1000 * 60 * 15; // 15 minutes

function generateToken() {
  return randomBytes(24).toString("hex");
}

export async function createMagicLink(email: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;

  const token = generateToken();
  await db.magicLink.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    },
  });

  return { token, user };
}

export async function createSession(userId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({ data: { token, userId, expiresAt } });

  return { token, expiresAt };
}

export async function consumeMagicLink(token: string) {
  const link = await db.magicLink.findUnique({ where: { token }, include: { user: true } });
  if (!link) return { error: "This link is invalid." as const };
  if (link.usedAt) return { error: "This link has already been used." as const };
  if (link.expiresAt < new Date()) return { error: "This link has expired." as const };

  await db.magicLink.update({ where: { id: link.id }, data: { usedAt: new Date() } });
  const session = await createSession(link.userId);

  return { user: link.user, session };
}

export async function getCurrentUser(sessionToken: string | null | undefined) {
  if (!sessionToken) return null;

  const session = await db.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  return session.user;
}

export async function clearSession(sessionToken: string | null | undefined) {
  if (sessionToken) {
    await db.session.deleteMany({ where: { token: sessionToken } });
  }
}
