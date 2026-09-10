import { useState } from "react";
import { ArtifactSurface } from "@/components/review/ArtifactSurface";
import { CompanyHeader } from "@/components/review/CompanyHeader";
import { PrototypeDock } from "@/components/review/PrototypeDock";
import { ProjectsRail } from "@/components/review/ProjectsRail";
import { ReviewCanvas } from "@/components/review/ReviewCanvas";
import { useDeliverableReview } from "@/components/review/useDeliverableReview";
import { useFullscreen } from "@/components/review/useFullscreen";
import { ViewerCard } from "@/components/review/ViewerCard";
import { ViewerToolbar } from "@/components/review/ViewerToolbar";
import type { ActiveVersion, CompanySummary, SiblingDeliverable, VersionSummary } from "@/components/review/types";

const PROJECTS_RAIL_KEY = "cp-projects-rail-expanded";

function readProjectsRailExpanded() {
  try {
    return sessionStorage.getItem(PROJECTS_RAIL_KEY) !== "false";
  } catch {
    return true;
  }
}

function persistProjectsRailExpanded(expanded: boolean) {
  try {
    sessionStorage.setItem(PROJECTS_RAIL_KEY, String(expanded));
  } catch {
    /* ignore */
  }
}

// Client-facing deliverable viewer (Zinc Design Portal redesign). Decisions
// (approve/reject/request changes) are staff-only and intentionally absent
// here, and cross-origin prototypes capture screenshots silently — with no
// capture-status banner shown to clients.
export function ClientDeliverableViewer({
  deliverableId,
  title,
  versions,
  activeVersion,
  basePath,
  siblings = [],
  company,
  onMutate,
}: {
  deliverableId: string;
  title: string;
  versions: VersionSummary[];
  activeVersion: ActiveVersion;
  basePath: string;
  siblings?: SiblingDeliverable[];
  company?: CompanySummary;
  onMutate?: () => void;
}) {
  const [railExpanded, setRailExpanded] = useState(readProjectsRailExpanded);
  const {
    canvasRef,
    iframeRef,
    mode,
    setMode,
    compareEnabled,
    compareVersionId,
    setCompareVersionId,
    compareVersion,
    compareLoading,
    toggleCompare,
    historyOpen,
    setHistoryOpen,
    draftPin,
    draftBody,
    setDraftBody,
    activeThreadId,
    mutationError,
    prototypeScreen,
    captureStatus,
    captureError,
    refreshPreview,
    activeScreenshot,
    sortedVersions,
    activeVersionIndex,
    hasPrevVersion,
    hasNextVersion,
    isPrototype,
    canPin,
    isExternalPrototype,
    sortedThreads,
    selectThread,
    navigateToVersion,
    handleCanvasClick,
    cancelDraftPin,
    submitDraftPin,
  } = useDeliverableReview({ deliverableId, basePath, activeVersion, versions, onMutate });

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(canvasRef);

  function toggleRailExpanded(expanded: boolean) {
    setRailExpanded(expanded);
    persistProjectsRailExpanded(expanded);
  }

  const dock = isPrototype
    ? () => (
        <PrototypeDock
          mode={mode}
          onModeChange={setMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )
    : undefined;

  return (
    <div className="review-page flex min-h-0 flex-1 flex-col overflow-hidden">
      {company ? <CompanyHeader name={company.name} logoUrl={company.logoUrl} /> : null}

      {mutationError ? (
        <div className="mx-4 mb-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2 text-sm text-[var(--text-secondary)]">
          {mutationError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden px-4 pb-4">
        <ProjectsRail
          deliverables={siblings}
          activeDeliverableId={deliverableId}
          activeVersionId={activeVersion.id}
          basePath={basePath}
          expanded={railExpanded}
          onToggleExpanded={toggleRailExpanded}
        />

        <ViewerCard>
          <ViewerToolbar
            title={title}
            versionNumber={activeVersion.versionNumber}
            hasPrevVersion={hasPrevVersion}
            hasNextVersion={hasNextVersion}
            onPrevVersion={() => {
              if (hasPrevVersion) navigateToVersion(sortedVersions[activeVersionIndex - 1].id);
            }}
            onNextVersion={() => {
              if (hasNextVersion) navigateToVersion(sortedVersions[activeVersionIndex + 1].id);
            }}
            compareEnabled={compareEnabled}
            onToggleCompare={toggleCompare}
            historyOpen={historyOpen}
            onToggleHistory={() => setHistoryOpen((open) => !open)}
            commentCount={activeVersion.threads.length}
          />

          {historyOpen ? (
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2">
              <ul className="flex flex-wrap gap-2">
                {sortedVersions.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                        v.id === activeVersion.id
                          ? "border-[var(--action-primary-bg)] bg-[var(--surface-selected)]"
                          : "border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]"
                      }`}
                      onClick={() => navigateToVersion(v.id)}
                    >
                      v{v.versionNumber}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            {compareEnabled ? (
              <div className="flex min-h-0 flex-1 gap-3">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <p className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
                    v{activeVersion.versionNumber}
                  </p>
                  <ReviewCanvas
                    version={activeVersion}
                    mode={mode}
                    onModeChange={setMode}
                    canvasRef={canvasRef}
                    canPin={canPin}
                    onCanvasClick={handleCanvasClick}
                    sortedThreads={sortedThreads}
                    activeThreadId={activeThreadId}
                    onThreadSelect={selectThread}
                    draftPin={draftPin}
                    draftBody={draftBody}
                    onDraftBodyChange={setDraftBody}
                    onCancelDraft={cancelDraftPin}
                    onSubmitDraft={submitDraftPin}
                    prototypeScreen={prototypeScreen}
                    iframeRef={iframeRef}
                    isExternalPrototype={isExternalPrototype}
                    activeScreenshot={activeScreenshot}
                    captureStatus={captureStatus}
                    captureError={captureError}
                    onRefreshPreview={refreshPreview}
                    fullBleed
                    renderDock={dock}
                  />
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-[var(--border-subtle)] pl-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
                      Compare
                    </p>
                    <select
                      className="wf-input wf-select max-w-[10rem] text-xs"
                      value={compareVersionId ?? ""}
                      onChange={(e) => setCompareVersionId(e.target.value)}
                      aria-label="Compare with version"
                    >
                      {sortedVersions
                        .filter((v) => v.id !== activeVersion.id)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            v{v.versionNumber}
                          </option>
                        ))}
                    </select>
                  </div>
                  {compareLoading ? (
                    <p className="text-xs text-[var(--text-secondary)]">Loading…</p>
                  ) : compareVersion ? (
                    <div className="min-h-0 flex-1 overflow-auto rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-page)]">
                      <ArtifactSurface version={compareVersion} interactMode={true} />
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)]">Select a version to compare.</p>
                  )}
                </div>
              </div>
            ) : (
              <ReviewCanvas
                version={activeVersion}
                mode={mode}
                onModeChange={setMode}
                canvasRef={canvasRef}
                canPin={canPin}
                onCanvasClick={handleCanvasClick}
                sortedThreads={sortedThreads}
                activeThreadId={activeThreadId}
                onThreadSelect={selectThread}
                draftPin={draftPin}
                draftBody={draftBody}
                onDraftBodyChange={setDraftBody}
                onCancelDraft={cancelDraftPin}
                onSubmitDraft={submitDraftPin}
                prototypeScreen={prototypeScreen}
                iframeRef={iframeRef}
                isExternalPrototype={isExternalPrototype}
                activeScreenshot={activeScreenshot}
                captureStatus={captureStatus}
                captureError={captureError}
                onRefreshPreview={refreshPreview}
                fullBleed
                renderDock={dock}
              />
            )}
          </div>
        </ViewerCard>
      </div>
    </div>
  );
}
