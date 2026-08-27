import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=notfound", request.url));
  }

  const result = await consumeMagicLink(token);
  if ("error" in result) {
    return NextResponse.redirect(
      new URL(`/login?error=notfound`, request.url)
    );
  }

  const dest = result.user.role === "STAFF" ? "/staff" : "/client";
  return NextResponse.redirect(new URL(dest, request.url));
}
