import Link from "next/link";
import { AccountCluster } from "@/components/AccountCluster";
import { listSwitchTargets } from "@/lib/dev-accounts";

export async function TopNav({
  homeHref,
  roleLabel,
  userName,
  currentUserId,
  navLinks = [],
}: {
  homeHref: string;
  roleLabel: string;
  userName: string;
  currentUserId: string;
  tag?: string;
  navLinks?: { href: string; label: string }[];
}) {
  const switchTargets = await listSwitchTargets();

  return (
    <header className="bg-[var(--surface-page)]">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-5">
          <Link href={homeHref} className="text-sm font-semibold tracking-tight">
            Review Portal
          </Link>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              {link.label}
            </Link>
          ))}
        </div>
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
