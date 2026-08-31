"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { switchToUser, type SwitchTarget } from "@/lib/dev-accounts";
import { initials } from "@/lib/format";

export function AccountCluster({
  userName,
  roleLabel,
  currentUserId,
  switchTargets = [],
}: {
  userName: string;
  roleLabel: string;
  currentUserId?: string;
  switchTargets?: SwitchTarget[];
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
        <div className="wf-panel absolute right-0 top-11 z-20 min-w-[220px] p-1.5">
          {switchTargets.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-1.5 text-[0.625rem] uppercase tracking-wide text-[var(--text-secondary)]">
                Switch account
              </p>
              {switchTargets.map((target) => {
                const isCurrent = target.id === currentUserId;
                return (
                  <form key={target.id} action={switchToUser}>
                    <input type="hidden" name="userId" value={target.id} />
                    <button
                      type="submit"
                      disabled={isCurrent}
                      aria-current={isCurrent ? "true" : undefined}
                      className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-sunken)] disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                    >
                      <span className="block font-medium text-[var(--text-primary)]">
                        {target.name}
                        {isCurrent && " · current"}
                      </span>
                      <span className="block text-[0.6875rem] text-[var(--text-secondary)]">
                        {target.companyName
                          ? `${target.roleLabel} · ${target.companyName}`
                          : target.roleLabel}
                      </span>
                    </button>
                  </form>
                );
              })}
              <div className="my-1.5 h-px bg-[var(--border-subtle)]" />
            </>
          )}
          <form action="/auth/logout" method="post">
            <button type="submit" className="wf-link-muted block w-full px-2 py-1.5 text-left">
              Sign out
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
