import { formatAccessSummary } from "@/components/members/formatAccessSummary";
import type { DirectoryMember } from "@/components/members/types";

export function AccessSummaryTag({ member }: { member: DirectoryMember }) {
  const summary = formatAccessSummary(member);
  const color =
    summary.kind === "admin" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]";

  return (
    <span className={`max-w-[18rem] text-right text-[0.6875rem] ${color}`} aria-label={summary.ariaLabel}>
      {summary.lead}
      {summary.moreCount > 0 ? (
        <>
          {" · "}
          <span className="text-[var(--text-tertiary)]">+{summary.moreCount} more</span>
        </>
      ) : null}
    </span>
  );
}
