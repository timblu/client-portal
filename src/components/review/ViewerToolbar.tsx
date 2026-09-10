import { History, SquareSplitHorizontal } from "lucide-react";
import { CommentsTrigger } from "@/components/review/CommentsTrigger";
import { VersionPill } from "@/components/review/VersionPill";

export function ViewerToolbar({
  title,
  versionNumber,
  hasPrevVersion,
  hasNextVersion,
  onPrevVersion,
  onNextVersion,
  compareEnabled,
  onToggleCompare,
  historyOpen,
  onToggleHistory,
  commentCount,
}: {
  title: string;
  versionNumber: number;
  hasPrevVersion: boolean;
  hasNextVersion: boolean;
  onPrevVersion: () => void;
  onNextVersion: () => void;
  compareEnabled: boolean;
  onToggleCompare: () => void;
  historyOpen: boolean;
  onToggleHistory: () => void;
  commentCount: number;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3">
      <VersionPill
        versionNumber={versionNumber}
        hasPrev={hasPrevVersion}
        hasNext={hasNextVersion}
        onPrev={onPrevVersion}
        onNext={onNextVersion}
      />
      <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleCompare}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            compareEnabled ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
          } hover:text-[var(--text-primary)]`}
        >
          <SquareSplitHorizontal size={15} />
          Compare
        </button>
        <button
          type="button"
          onClick={onToggleHistory}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            historyOpen ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
          } hover:text-[var(--text-primary)]`}
        >
          <History size={15} />
          History
        </button>
      </div>
      <CommentsTrigger count={commentCount} />
    </div>
  );
}
