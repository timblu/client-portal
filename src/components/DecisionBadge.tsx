import { decisionLabel } from "@/lib/format";

const STATE_STYLE: Record<string, { bg: string; fg: string }> = {
  APPROVED: { bg: "var(--status-success-bg)", fg: "var(--status-success-fg)" },
  CHANGES_REQUESTED: { bg: "var(--status-warning-bg)", fg: "var(--status-warning-fg)" },
  REJECTED: { bg: "var(--status-error-bg)", fg: "var(--status-error-fg)" },
  PENDING: { bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
};

export function DecisionBadge({ state }: { state: string }) {
  const style = STATE_STYLE[state] ?? STATE_STYLE.PENDING;

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.04em]"
      style={{ background: style.bg, color: style.fg }}
    >
      {decisionLabel(state)}
    </span>
  );
}
