"use server";

import { redirect } from "next/navigation";
import { createMagicLink } from "@/lib/auth";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email) redirect("/login?error=required");

  const result = await createMagicLink(email);
  if (!result) {
    redirect(`/login?error=notfound&email=${encodeURIComponent(email)}`);
  }

  redirect(`/login?sent=1&email=${encodeURIComponent(email)}&devlink=${result.token}`);
}
