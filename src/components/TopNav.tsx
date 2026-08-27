import Link from "next/link";
import { AccountCluster } from "@/components/AccountCluster";

export function TopNav({
  homeHref,
  roleLabel,
  userName,
}: {
  homeHref: string;
  roleLabel: string;
  userName: string;
  tag?: string;
}) {
  return (
    <header className="bg-[var(--surface-page)]">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href={homeHref} className="text-sm font-semibold tracking-tight">
          Review Portal
        </Link>
        <AccountCluster userName={userName} roleLabel={roleLabel} />
      </div>
    </header>
  );
}
