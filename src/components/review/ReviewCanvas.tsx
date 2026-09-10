import { ArtifactSurface } from "@/components/review/ArtifactSurface";
import { ScreenshotSurface } from "@/components/review/ScreenshotSurface";
import { screenLabel } from "@/lib/prototype-bridge";
import type { ActiveVersion, Screenshot, Thread } from "@/components/review/types";

export function ReviewCanvas({
  version,
  mode,
  onModeChange,
  canvasRef,
  canPin,
  onCanvasClick,
  sortedThreads,
  activeThreadId,
  onThreadSelect,
  draftPin,
  draftBody,
  onDraftBodyChange,
  onCancelDraft,
  onSubmitDraft,
  prototypeScreen,
  iframeRef,
  isExternalPrototype,
  activeScreenshot,
  captureStatus,
  captureError,
  onRefreshPreview,
  fullBleed = false,
  renderDock,
}: {
  version: ActiveVersion;
  mode: "interact" | "comment";
  onModeChange: (mode: "interact" | "comment") => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  canPin: boolean;
  onCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  sortedThreads: Thread[];
  activeThreadId: string | null;
  onThreadSelect: (id: string) => void;
  draftPin: { x: number; y: number } | null;
  draftBody: string;
  onDraftBodyChange: (value: string) => void;
  onCancelDraft: () => void;
  onSubmitDraft: () => void;
  prototypeScreen: string | null;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  isExternalPrototype: boolean;
  activeScreenshot: Screenshot | null;
  captureStatus: "idle" | "capturing" | "error";
  captureError: string | null;
  onRefreshPreview: () => void;
  /** Client viewer: fill the available height instead of the staff viewer's centered, max-w-4xl column. */
  fullBleed?: boolean;
  /** Overrides the default staff Interact/Comment segmented control (e.g. the client PrototypeDock). */
  renderDock?: () => React.ReactNode;
}) {
  const isPrototype = version.kind === "PROTOTYPE_URL";
  const showingScreenshotSurface = isExternalPrototype && mode === "comment";
  const canvasThreads = !isPrototype
    ? sortedThreads
    : isExternalPrototype
    ? showingScreenshotSurface && activeScreenshot
      ? sortedThreads.filter((t) => t.screenshotId === activeScreenshot.id)
      : []
    : sortedThreads.filter((t) => t.screen == null || t.screen === prototypeScreen);

  return (
    <div className={fullBleed ? "flex h-full min-h-0 w-full flex-col" : "mx-auto max-w-4xl"}>
      <div
        ref={canvasRef}
        onClick={onCanvasClick}
        className={`relative overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-page)] ${
          fullBleed ? "min-h-0 flex-1" : ""
        } ${canPin ? "cursor-crosshair" : ""}`}
      >
        {showingScreenshotSurface ? (
          <ScreenshotSurface
            screenshot={activeScreenshot}
            captureStatus={captureStatus}
            captureError={captureError}
            onRefreshPreview={onRefreshPreview}
          />
        ) : (
          <ArtifactSurface version={version} interactMode={mode === "interact"} iframeRef={iframeRef} fill={fullBleed} />
        )}

        {isPrototype ? (
          renderDock ? renderDock() : <PrototypeModeControl mode={mode} onModeChange={onModeChange} />
        ) : null}

        {canvasThreads.map((thread) => {
          const idx = sortedThreads.indexOf(thread);
          return thread.xPct == null || thread.yPct == null ? null : (
            <button
              key={thread.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onThreadSelect(thread.id);
              }}
              style={{ left: `${thread.xPct}%`, top: `${thread.yPct}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border text-[0.6875rem] font-semibold ${
                thread.resolved
                  ? "border-[var(--text-tertiary)] bg-[var(--surface-page)] text-[var(--text-secondary)]"
                  : activeThreadId === thread.id
                  ? "border-[var(--action-primary-bg)] bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]"
                  : "border-[var(--action-primary-bg)] bg-[var(--surface-page)] text-[var(--action-primary-bg)]"
              }`}
            >
              {idx + 1}
            </button>
          );
        })}

        {draftPin ? (
          <div
            style={{ left: `${draftPin.x}%`, top: `${draftPin.y}%` }}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--action-primary-bg)] bg-[var(--surface-page)] text-[0.6875rem] font-semibold text-[var(--action-primary-bg)]">
              +
            </div>
            <div className="absolute left-1/2 top-7 w-64 -translate-x-1/2 wf-panel p-3">
              <textarea
                autoFocus
                className="wf-input w-full"
                rows={2}
                placeholder="Leave a comment"
                value={draftBody}
                onChange={(e) => onDraftBodyChange(e.target.value)}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" className="wf-btn" onClick={onCancelDraft}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="wf-btn-solid"
                  onClick={onSubmitDraft}
                  disabled={!draftBody.trim()}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {canPin ? (
        <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">
          {isExternalPrototype
            ? "Click anywhere on the captured preview to leave a comment."
            : isPrototype && prototypeScreen
            ? `Click to leave a comment on the ${screenLabel(prototypeScreen)} page.`
            : "Click anywhere on the file to leave a comment."}
        </p>
      ) : null}
    </div>
  );
}

function PrototypeModeControl({
  mode,
  onModeChange,
}: {
  mode: "interact" | "comment";
  onModeChange: (mode: "interact" | "comment") => void;
}) {
  return (
    <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
      <div className="wf-segment text-xs shadow-[var(--elevation-card)]">
        <button
          type="button"
          data-active={mode === "interact"}
          className="px-3 py-1.5 transition-colors"
          onClick={() => onModeChange("interact")}
        >
          Interact
        </button>
        <button
          type="button"
          data-active={mode === "comment"}
          className="px-3 py-1.5 transition-colors"
          onClick={() => onModeChange("comment")}
        >
          Comment
        </button>
      </div>
    </div>
  );
}
