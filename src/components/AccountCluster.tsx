"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { initials } from "@/lib/format";

export function AccountCluster({
  userName,
  roleLabel,
}: {
  userName: string;
  roleLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <details className="relative">
        <summary
          className="wf-avatar cursor-pointer list-none"
          title={`${userName} · ${roleLabel}`}
          aria-label={`${userName}, account menu`}
        >
          {initials(userName)}
        </summary>
        <form
          action="/auth/logout"
          method="post"
          className="wf-panel absolute right-0 top-11 z-20 min-w-[140px] p-1.5"
        >
          <button type="submit" className="wf-link-muted block w-full px-2 py-1.5 text-left">
            Sign out
          </button>
        </form>
      </details>
    </div>
  );
}
