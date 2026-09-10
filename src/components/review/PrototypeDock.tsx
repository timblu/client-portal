import { Maximize2, Minimize2, MessageCircle, MousePointerClick } from "lucide-react";

/**
 * Client-facing replacement for the staff Interact/Comment segmented control:
 * a floating pill dock with a true-fullscreen "Maximize" control, matching the
 * Zinc Design Portal prototype viewer.
 */
export function PrototypeDock({
  mode,
  onModeChange,
  isFullscreen,
  onToggleFullscreen,
}: {
  mode: "interact" | "comment";
  onModeChange: (mode: "interact" | "comment") => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  return (
    <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
      <div className="review-panel flex items-center gap-1 p-1 shadow-[var(--elevation-floating)]">
        <DockButton active={mode === "interact"} label="Interact" onClick={() => onModeChange("interact")}>
          <MousePointerClick size={18} />
        </DockButton>
        <DockButton active={mode === "comment"} label="Comment" onClick={() => onModeChange("comment")}>
          <MessageCircle size={18} />
        </DockButton>
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </div>
  );
}

function DockButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "flex h-9 items-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-3 text-xs font-semibold text-[var(--action-primary-fg)]"
          : "flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
      }
    >
      {children}
      {active ? <span>{label}</span> : null}
    </button>
  );
}
