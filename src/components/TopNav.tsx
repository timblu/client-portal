import { Link } from "react-router-dom";
import { AccountCluster } from "@/components/AccountCluster";
import type { SwitchTarget } from "@/client/api";

export function TopNav({
  homeHref,
  roleLabel,
  userName,
  currentUserId,
  navLinks = [],
  switchTargets = [],
}: {
  homeHref: string;
  roleLabel: string;
  userName: string;
  currentUserId: string;
  tag?: string;
  navLinks?: { href: string; label: string }[];
  switchTargets?: SwitchTarget[];
}) {
  return (
    <header className="bg-[var(--surface-page)]">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-5">
          <Link to={homeHref} className="text-sm font-semibold tracking-tight">
            Review Portal
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
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
