import { ChevronLeft, ChevronRight } from "lucide-react";

export function VersionPill({
  versionNumber,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  versionNumber: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--border-subtle)] p-0.5">
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] disabled:opacity-40"
        aria-label="Previous version"
        disabled={!hasPrev}
        onClick={onPrev}
      >
        <ChevronLeft size={14} />
      </button>
      <span className="px-1 text-xs font-semibold tabular-nums text-[var(--text-primary)]">
        v{versionNumber}
      </span>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] disabled:opacity-40"
        aria-label="Next version"
        disabled={!hasNext}
        onClick={onNext}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
