"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/TopNav";

export function TopNavGate(
  props: React.ComponentProps<typeof TopNav> & { hideOn?: string }
) {
  const pathname = usePathname();
  const { hideOn = "/deliverables/", ...nav } = props;
  if (pathname.includes(hideOn)) return null;
  return <TopNav {...nav} />;
}
