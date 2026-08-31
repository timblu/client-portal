import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isCompanyAdmin } from "@/lib/access";

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STAFF") redirect("/client");
  return user;
}

export async function requireClient() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CLIENT") redirect("/staff");
  return user;
}

export async function requireCompanyAdmin() {
  const user = await requireClient();
  if (!isCompanyAdmin(user) || !user.companyId) notFound();
  return user;
}
