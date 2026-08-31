import Link from "next/link";
import { AccountCluster } from "@/components/AccountCluster";
import { listSwitchTargets } from "@/lib/dev-accounts";

export async function TopNav({
  homeHref,
  roleLabel,
  userName,
  currentUserId,
}: {
  homeHref: string;
  roleLabel: string;
  userName: string;
  currentUserId: string;
  tag?: string;
}) {
  const switchTargets = await listSwitchTargets();

  return (
    <header className="bg-[var(--surface-page)]">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href={homeHref} className="text-sm font-semibold tracking-tight">
          Review Portal
        </Link>
        <AccountCluster
          userName={userName}
          roleLabel={roleLabel}
          currentUserId={currentUserId}
          switchTargets={switchTargets}
        />
      </div>
    </header>
  );
}
