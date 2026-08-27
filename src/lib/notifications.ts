import { db } from "@/lib/db";

/**
 * Email is the only notification channel in v1. No SMTP/provider is wired up, so a "send"
 * is logged as a row instead — visible at /staff/notifications and /client/notifications,
 * the same dev-inbox pattern used for magic links.
 */
export async function notify(toUserId: string, subject: string, body: string) {
  await db.notification.create({ data: { toUserId, subject, body } });
}

export async function notifyCompany(companyId: string, subject: string, body: string) {
  const members = await db.user.findMany({ where: { companyId }, select: { id: true } });
  if (members.length === 0) return;
  await db.notification.createMany({
    data: members.map((m) => ({ toUserId: m.id, subject, body })),
  });
}

export async function notifyAllStaff(subject: string, body: string) {
  const staff = await db.user.findMany({ where: { role: "STAFF" }, select: { id: true } });
  if (staff.length === 0) return;
  await db.notification.createMany({
    data: staff.map((s) => ({ toUserId: s.id, subject, body })),
  });
}
