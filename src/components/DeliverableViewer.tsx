import { useEffect, useRef, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import { useApiAction } from "@/client/RouteState";
import { ArtifactSurface } from "@/components/review/ArtifactSurface";
import { ReviewCanvas } from "@/components/review/ReviewCanvas";
import { useDeliverableReview } from "@/components/review/useDeliverableReview";
import type { ActiveVersion, CurrentUser, SiblingDeliverable, VersionSummary } from "@/components/review/types";
import { DecisionBadge } from "@/components/DecisionBadge";
import { AccountCluster } from "@/components/AccountCluster";
import { formatDateTime, initials } from "@/lib/format";
import { screenLabel } from "@/lib/prototype-bridge";

const FILES_RAIL_KEY = "cp-files-rail-expanded";

function decisionShort(state: string) {
  return state === "PENDING" ? "pending" : state.toLowerCase().replace("_", " ");
}

function latestDecisionState(sibling: SiblingDeliverable) {
  return sibling.versions[sibling.versions.length - 1]?.decisionState ?? "PENDING";
}

function readFilesRailExpanded() {
  try {
    return sessionStorage.getItem(FILES_RAIL_KEY) === "true";
  } catch {
    return false;
  }
}

function persistFilesRailExpanded(expanded: boolean) {
  try {
    sessionStorage.setItem(FILES_RAIL_KEY, String(expanded));
  } catch {
    /* ignore */
  }
}

// Staff deliverable viewer — 3-column layout with decisions, the classic
// Interact/Comment segmented control, and the cross-origin capture banner.
// Shares its underlying review state/mutations (useDeliverableReview) and
// canvas rendering (ReviewCanvas) with the client-facing viewer so the two
// stay behaviorally consistent without duplicating logic.
export function DeliverableViewer({
  deliverableId,
  title,
  versions,
  activeVersion,
  currentUser,
  basePath,
  siblings = [],
  crumb,
  chrome,
  onMutate,
}: {
  deliverableId: string;
  title: string;
  versions: VersionSummary[];
  activeVersion: ActiveVersion;
  currentUser: CurrentUser;
  basePath: string;
  siblings?: SiblingDeliverable[];
  crumb?: { href: string; label: string };
  chrome?: { homeHref: string; userName: string; roleLabel: string };
  onMutate?: () => void;
}) {
  const runAction = useApiAction();
  const [, startTransition] = useTransition();
  const fileSwitcherRef = useRef<HTMLDivElement>(null);

  const [filesRailExpanded, setFilesRailExpanded] = useState(readFilesRailExpanded);
  const [fileSwitcherOpen, setFileSwitcherOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [decisionAction, setDecisionAction] = useState<
    "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | null
  >(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [confirmOpenThreads, setConfirmOpenThreads] = useState(false);

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
    replyDrafts,
    setReplyDrafts,
    mutationError,
    setMutationError,
    prototypeScreen,
    captureStatus,
    captureError,
    refreshPreview,
    screenshots,
    activeScreenshot,
    setActiveScreenshotId,
    threadScreenshotTag,
    sortedVersions,
    activeVersionIndex,
    hasPrevVersion,
    hasNextVersion,
    openThreadCount,
    canPin,
    isExternalPrototype,
    sortedThreads,
    selectThread,
    navigateToVersion,
    handleCanvasClick,
    cancelDraftPin,
    submitDraftPin,
    submitReply,
    toggleThreadPinned,
    toggleThreadResolved,
  } = useDeliverableReview({ deliverableId, basePath, activeVersion, versions, onMutate });

  const canDecide = currentUser.canDecide;

  const filteredSiblings = siblings.filter((s) =>
    s.title.toLowerCase().includes(fileSearch.trim().toLowerCase())
  );

  useEffect(() => {
    if (!fileSwitcherOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!fileSwitcherRef.current?.contains(e.target as Node)) {
        setFileSwitcherOpen(false);
        setFileSearch("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [fileSwitcherOpen]);

  function toggleFilesRailExpanded(expanded: boolean) {
    setFilesRailExpanded(expanded);
    persistFilesRailExpanded(expanded);
  }

  function confirmDecision() {
    if (!decisionAction) return;
    if (decisionAction !== "APPROVED" && !decisionComment.trim()) return;
    if (decisionAction === "APPROVED" && openThreadCount > 0 && !confirmOpenThreads) {
      setConfirmOpenThreads(true);
      return;
    }
    const action = decisionAction;
    const comment = decisionComment;
    setDecisionAction(null);
    setDecisionComment("");
    setConfirmOpenThreads(false);
    startTransition(async () => {
      const result = await runAction("submit-decision", {
        versionId: activeVersion.id,
        decisionState: action,
        comment,
      });
      if (!result.ok) {
        setMutationError(result.error);
        return;
      }
      setMutationError(null);
      onMutate?.();
    });
  }

  return (
    <div className="flex flex-1 flex-col bg-[var(--surface-page)]">
      {/* Deliverable bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          {chrome ? (
            <Link to={chrome.homeHref} className="text-sm font-semibold tracking-tight">
              Review Portal
            </Link>
          ) : null}
          {crumb ? (
            <Link to={crumb.href} className="wf-back shrink-0">
              ← {crumb.label}
            </Link>
          ) : null}
          <div ref={fileSwitcherRef} className="relative min-w-0">
            <div className="flex min-w-0 items-center gap-1">
              <h1 className="truncate text-sm font-semibold">{title}</h1>
              {siblings.length > 0 ? (
                <button
                  type="button"
                  className="wf-icon-btn shrink-0 text-[var(--text-secondary)]"
                  aria-label="Switch file"
                  aria-expanded={fileSwitcherOpen}
                  onClick={() => setFileSwitcherOpen((open) => !open)}
                >
                  ▾
                </button>
              ) : null}
            </div>
            {fileSwitcherOpen && siblings.length > 0 ? (
              <div className="absolute left-0 top-full z-30 mt-1 w-72 wf-panel">
                {siblings.length >= 8 ? (
                  <div className="border-b border-[var(--border-subtle)] p-2">
                    <input
                      type="search"
                      className="wf-input w-full text-xs"
                      placeholder="Search files…"
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                    />
                  </div>
                ) : null}
                <ul className="max-h-64 overflow-y-auto py-1">
                  {filteredSiblings.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`${basePath}/deliverables/${s.id}`}
                        className={`block px-3 py-2 text-xs hover:bg-[var(--surface-sunken)] ${
                          s.id === deliverableId ? "bg-[var(--surface-sunken)]" : ""
                        }`}
                        onClick={() => {
                          setFileSwitcherOpen(false);
                          setFileSearch("");
                        }}
                      >
                        <p className="truncate font-medium">{s.title}</p>
                        <p className="mt-0.5 text-[0.625rem] text-[var(--text-tertiary)]">
                          {s.type === "DESIGN" ? "Design" : "Doc"} · {decisionShort(latestDecisionState(s))}
                        </p>
                      </Link>
                    </li>
                  ))}
                  {filteredSiblings.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-[var(--text-secondary)]">No matches.</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DecisionBadge state={activeVersion.decisionState} />
          {canDecide ? (
            <div className="flex gap-2">
              <button className="wf-btn" onClick={() => setDecisionAction("CHANGES_REQUESTED")}>
                Request changes
              </button>
              <button className="wf-btn" onClick={() => setDecisionAction("REJECTED")}>
                Reject
              </button>
              <button className="wf-btn-solid" onClick={() => setDecisionAction("APPROVED")}>
                Approve
              </button>
            </div>
          ) : null}
          {chrome ? (
            <AccountCluster userName={chrome.userName} roleLabel={chrome.roleLabel} />
          ) : null}
        </div>
      </div>

      {mutationError ? (
        <div className="mx-5 mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-page)] px-5 py-3 text-sm text-[var(--text-secondary)]">
          {mutationError}
        </div>
      ) : null}

      {decisionAction ? (
        <div className="mx-5 mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-page)] px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide">
            {decisionAction === "APPROVED"
              ? "Approve this version"
              : decisionAction === "REJECTED"
              ? "Reject this version"
              : "Request changes"}
          </p>
          {decisionAction !== "APPROVED" ? (
            <textarea
              className="wf-input mt-2 w-full"
              rows={2}
              placeholder="Required: explain what needs to change"
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
            />
          ) : (
            <textarea
              className="wf-input mt-2 w-full"
              rows={2}
              placeholder="Optional note"
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
            />
          )}
          {confirmOpenThreads ? (
            <p className="mt-2 text-xs">
              {openThreadCount} comment thread{openThreadCount === 1 ? "" : "s"} still open. Approve
              anyway?
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              className="wf-btn-solid"
              onClick={confirmDecision}
              disabled={decisionAction !== "APPROVED" && !decisionComment.trim()}
            >
              {confirmOpenThreads ? "Approve anyway" : "Confirm"}
            </button>
            <button
              className="wf-btn"
              onClick={() => {
                setDecisionAction(null);
                setDecisionComment("");
                setConfirmOpenThreads(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {activeVersion.decisionState !== "PENDING" && activeVersion.decisionComment ? (
        <div className="px-5 pt-2 text-xs text-[var(--text-secondary)]">
          <span className="font-semibold">{activeVersion.decidedByName}:</span>{" "}
          {activeVersion.decisionComment}
        </div>
      ) : null}

      {/* Body: files rail + canvas column + comments */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        <FilesRail
          siblings={siblings}
          deliverableId={deliverableId}
          basePath={basePath}
          expanded={filesRailExpanded}
          onToggleExpanded={toggleFilesRailExpanded}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-page)] px-4 py-2">
            <button
              type="button"
              className="wf-icon-btn text-[var(--text-secondary)]"
              aria-label="Previous version"
              disabled={!hasPrevVersion}
              onClick={() => {
                if (hasPrevVersion) navigateToVersion(sortedVersions[activeVersionIndex - 1].id);
              }}
            >
              ‹
            </button>
            <span className="text-xs font-semibold tabular-nums">
              v{activeVersion.versionNumber}
            </span>
            <button
              type="button"
              className="wf-icon-btn text-[var(--text-secondary)]"
              aria-label="Next version"
              disabled={!hasNextVersion}
              onClick={() => {
                if (hasNextVersion) navigateToVersion(sortedVersions[activeVersionIndex + 1].id);
              }}
            >
              ›
            </button>
            <span className="text-[var(--text-tertiary)]">·</span>
            <button
              type="button"
              className={`text-xs font-medium ${
                compareEnabled ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              } hover:text-[var(--text-primary)]`}
              onClick={toggleCompare}
            >
              {compareEnabled ? "Exit compare" : "Compare"}
            </button>
            <span className="text-[var(--text-tertiary)]">·</span>
            <button
              type="button"
              className={`text-xs font-medium ${
                historyOpen ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              } hover:text-[var(--text-primary)]`}
              onClick={() => setHistoryOpen((open) => !open)}
            >
              History
            </button>
          </div>

          {historyOpen ? (
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-page)] px-4 py-2">
              <ul className="flex flex-wrap gap-2">
                {sortedVersions.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      className={`flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs transition-colors ${
                        v.id === activeVersion.id
                          ? "border-[var(--action-primary-bg)] bg-[var(--surface-sunken)]"
                          : "border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]"
                      }`}
                      onClick={() => navigateToVersion(v.id)}
                    >
                      <span className="font-semibold tabular-nums">v{v.versionNumber}</span>
                      <DecisionBadge state={v.decisionState} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {isExternalPrototype ? (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-page)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                <div>
                  {captureStatus === "capturing" ? (
                    "Capturing a preview of this page…"
                  ) : captureStatus === "error" ? (
                    captureError ?? "Unable to capture that page."
                  ) : activeScreenshot ? (
                    <>
                      Preview captured {formatDateTime(activeScreenshot.createdAt)}
                      {screenshots.length > 1 && activeScreenshot.id !== screenshots[0].id ? (
                        <>
                          {" "}
                          ·{" "}
                          <button
                            type="button"
                            className="wf-link-muted"
                            onClick={() => setActiveScreenshotId(screenshots[0].id)}
                          >
                            View latest capture
                          </button>
                        </>
                      ) : null}
                    </>
                  ) : (
                    "This prototype can't share its live URL — comments pin to a captured screenshot instead."
                  )}
                </div>
                <button
                  type="button"
                  className="wf-btn text-xs"
                  onClick={refreshPreview}
                  disabled={captureStatus === "capturing"}
                >
                  Refresh preview
                </button>
              </div>
            ) : null}
            {compareEnabled ? (
              <div className="flex min-h-full gap-3">
                <div className="min-w-0 flex-1">
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
                  />
                </div>
                <div className="min-w-0 flex-1 border-l border-[var(--border-subtle)] pl-3">
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
                    <div className="overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-page)]">
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
              />
            )}
          </div>
        </div>

        <div className="wf-panel w-80 shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5">
            <span className="text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              Comments ({activeVersion.threads.length})
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">{openThreadCount} open</span>
          </div>

          {sortedThreads.length === 0 ? (
            <p className="p-4 text-xs text-[var(--text-secondary)]">No comments on this version yet.</p>
          ) : (
            <ul>
              {sortedThreads.map((thread, idx) => (
                <li
                  key={thread.id}
                  onClick={() => selectThread(thread.id)}
                  className={`cursor-pointer border-b border-[var(--border-subtle)] p-4 ${
                    activeThreadId === thread.id ? "bg-[var(--surface-sunken)]" : ""
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--action-primary-bg)] text-[0.625rem] text-[var(--action-primary-bg)]">
                        {idx + 1}
                      </span>
                      {thread.screen ? <span className="wf-tag">{screenLabel(thread.screen)}</span> : null}
                      {threadScreenshotTag(thread) ? (
                        <span className="wf-tag">{threadScreenshotTag(thread)}</span>
                      ) : null}
                      {thread.pinnedToTop ? <span className="wf-tag">Pinned</span> : null}
                      {thread.resolved ? <span className="wf-tag">Resolved</span> : null}
                    </span>
                    <span className="flex gap-2.5">
                      <button
                        className="wf-link-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleThreadPinned(thread.id, !thread.pinnedToTop);
                        }}
                      >
                        {thread.pinnedToTop ? "Unpin" : "Pin"}
                      </button>
                      <button
                        className="wf-link-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleThreadResolved(thread.id, !thread.resolved);
                        }}
                      >
                        {thread.resolved ? "Reopen" : "Resolve"}
                      </button>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {thread.comments.map((c) => (
                      <div key={c.id} className="text-xs">
                        <div className="flex items-baseline gap-1.5">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--action-primary-bg)] text-[0.5625rem] text-[var(--action-primary-fg)]">
                            {initials(c.author.name)}
                          </span>
                          <span className="font-semibold">{c.author.name}</span>
                          <span className="text-[var(--text-tertiary)]">
                            {formatDateTime(c.createdAt)}
                          </span>
                        </div>
                        <p className="ml-5 mt-0.5 text-[var(--text-primary)]">{c.body}</p>
                      </div>
                    ))}
                  </div>

                  {activeThreadId === thread.id ? (
                    <div className="mt-2 ml-5">
                      <textarea
                        className="wf-input w-full"
                        rows={2}
                        placeholder="Reply"
                        value={replyDrafts[thread.id] ?? ""}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [thread.id]: e.target.value }))
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        className="wf-btn mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          submitReply(thread.id);
                        }}
                      >
                        Reply
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FilesRail({
  siblings,
  deliverableId,
  basePath,
  expanded,
  onToggleExpanded,
}: {
  siblings: SiblingDeliverable[];
  deliverableId: string;
  basePath: string;
  expanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}) {
  if (siblings.length === 0) return null;

  if (!expanded) {
    return (
      <div className="wf-panel flex w-12 shrink-0 flex-col overflow-hidden">
        <div className="flex justify-center border-b border-[var(--border-subtle)] py-2">
          <button
            type="button"
            className="wf-icon-btn text-[var(--text-secondary)]"
            aria-label="Expand files panel"
            onClick={() => onToggleExpanded(true)}
          >
            ›
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-1">
          {siblings.map((s) => (
            <li key={s.id}>
              <Link
                to={`${basePath}/deliverables/${s.id}`}
                title={s.title}
                className={`block border-b border-[var(--border-subtle)] px-1 py-2 text-center text-[0.5625rem] leading-tight last:border-b-0 hover:bg-[var(--surface-sunken)] ${
                  s.id === deliverableId
                    ? "border-l-[3px] border-l-[var(--action-primary-bg)] bg-[var(--surface-sunken)] font-semibold"
                    : "border-l-[3px] border-l-transparent text-[var(--text-secondary)]"
                }`}
              >
                <span className="line-clamp-3 break-all">{s.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="wf-panel w-56 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5">
        <span className="text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          Files
        </span>
        <button type="button" className="wf-toggle" onClick={() => onToggleExpanded(false)}>
          Collapse
        </button>
      </div>
      <ul>
        {siblings.map((s) => (
          <li key={s.id}>
            <Link
              to={`${basePath}/deliverables/${s.id}`}
              className={`block border-b border-[var(--border-subtle)] px-4 py-2.5 text-xs last:border-b-0 hover:bg-[var(--surface-sunken)] ${
                s.id === deliverableId
                  ? "border-l-[3px] border-l-[var(--action-primary-bg)] bg-[var(--surface-sunken)]"
                  : "border-l-[3px] border-l-transparent"
              }`}
            >
              <p className="truncate font-medium">{s.title}</p>
              <p
                className={`mt-0.5 text-[0.625rem] ${
                  s.id === deliverableId
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--text-tertiary)]"
                }`}
              >
                {s.type === "DESIGN" ? "Design" : "Doc"} · {decisionShort(latestDecisionState(s))}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
