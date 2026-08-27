import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

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
