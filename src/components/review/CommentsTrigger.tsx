// Visual placeholder only — the full slide-over comments panel is wired up once
// its Figma components are available. For now this shows the thread count so
// clients see comment activity without staff-only decision UI.
export function CommentsTrigger({ count }: { count: number }) {
  return (
    <div
      className="ml-auto flex h-8 items-center gap-2 rounded-[var(--radius-card)] bg-[var(--surface-selected)] px-3 text-xs font-medium text-[var(--text-primary)]"
      title="Comments panel coming soon"
    >
      <span>Comments</span>
      <span className="flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--action-primary-bg)] px-1 text-[0.625rem] font-semibold text-[var(--action-primary-fg)]">
        {count}
      </span>
    </div>
  );
}
