import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApiAction } from "@/client/RouteState";
import { captureScreenshot, type CapturedScreenshot } from "@/client/api";
import { DecisionBadge } from "@/components/DecisionBadge";
import { AccountCluster } from "@/components/AccountCluster";
import { formatDateTime, initials } from "@/lib/format";
import {
  isCrossOriginPrototypeUrl,
  locationKeyFromHref,
  navigateIframeToScreen,
  readIframeLocationKey,
  readScreenMessage,
  screenLabel,
} from "@/lib/prototype-bridge";

const FILES_RAIL_KEY = "cp-files-rail-expanded";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string; role: string };
};

type Thread = {
  id: string;
  xPct: number | null;
  yPct: number | null;
  screen: string | null;
  screenshotId: string | null;
  resolved: boolean;
  pinnedToTop: boolean;
  comments: Comment[];
};

type Screenshot = {
  id: string;
  sourceUrl: string;
  pageLabel: string | null;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
};

type VersionSummary = { id: string; versionNumber: number; decisionState: string };

type ActiveVersion = {
  id: string;
  versionNumber: number;
  kind: "STATIC_IMAGE" | "STATIC_PDF" | "MARKDOWN" | "PROTOTYPE_URL";
  fileUrl: string | null;
  content: string | null;
  prototypeUrl: string | null;
  decisionState: string;
  decisionComment: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  threads: Thread[];
  screenshots: Screenshot[];
};

type CurrentUser = { id: string; name: string; role: "STAFF" | "CLIENT"; canDecide: boolean };

type SiblingDeliverable = {
  id: string;
  title: string;
  type: "DESIGN" | "DOC";
  decisionState: string;
};

function decisionShort(state: string) {
  return state === "PENDING" ? "pending" : state.toLowerCase().replace("_", " ");
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
  const navigate = useNavigate();
  const runAction = useApiAction();
  const [, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileSwitcherRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [mode, setMode] = useState<"interact" | "comment">("comment");
  const [filesRailExpanded, setFilesRailExpanded] = useState(readFilesRailExpanded);
  const [fileSwitcherOpen, setFileSwitcherOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<ActiveVersion | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [decisionAction, setDecisionAction] = useState<
    "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | null
  >(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [confirmOpenThreads, setConfirmOpenThreads] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [prototypeScreen, setPrototypeScreen] = useState<string | null>(null);
  const [activeScreenshotId, setActiveScreenshotId] = useState<string | null>(null);
  const [optimisticScreenshot, setOptimisticScreenshot] = useState<CapturedScreenshot | null>(null);
  const [captureStatus, setCaptureStatus] = useState<"idle" | "capturing" | "error">("idle");
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [screenResetVersionId, setScreenResetVersionId] = useState(activeVersion.id);
  if (activeVersion.id !== screenResetVersionId) {
    setScreenResetVersionId(activeVersion.id);
    setPrototypeScreen(null);
    setActiveScreenshotId(null);
    setOptimisticScreenshot(null);
    setCaptureStatus("idle");
    setCaptureError(null);
  }

  const apiBase = `/api${basePath}`;
  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => a.versionNumber - b.versionNumber),
    [versions]
  );
  const activeVersionIndex = sortedVersions.findIndex((v) => v.id === activeVersion.id);
  const hasPrevVersion = activeVersionIndex > 0;
  const hasNextVersion = activeVersionIndex < sortedVersions.length - 1;

  const openThreadCount = activeVersion.threads.filter((t) => !t.resolved).length;
  const canDecide = currentUser.canDecide;
  const isPrototype = activeVersion.kind === "PROTOTYPE_URL";
  const canPin = !isPrototype || mode === "comment";
  const isExternalPrototype = isPrototype && isCrossOriginPrototypeUrl(activeVersion.prototypeUrl);

  // Cross-origin prototypes (Figma Make, Framer, external staging links, etc.) can't share
  // their live URL with us, so comments pin to a server-captured screenshot instead of the
  // iframe. `optimisticScreenshot` shows a just-captured image immediately, before the
  // parent's data refetch (onMutate) lands it in activeVersion.screenshots.
  const screenshots = useMemo(() => {
    const known = activeVersion.screenshots ?? [];
    if (optimisticScreenshot && !known.some((s) => s.id === optimisticScreenshot.id)) {
      return [optimisticScreenshot, ...known];
    }
    return known;
  }, [activeVersion.screenshots, optimisticScreenshot]);

  const activeScreenshot = useMemo(
    () => screenshots.find((s) => s.id === activeScreenshotId) ?? screenshots[0] ?? null,
    [screenshots, activeScreenshotId]
  );

  const screenshotById = useMemo(() => {
    const map = new Map<string, Screenshot>();
    for (const shot of screenshots) map.set(shot.id, shot);
    return map;
  }, [screenshots]);

  function threadScreenshotTag(thread: Thread): string | null {
    if (!thread.screenshotId) return null;
    const shot = screenshotById.get(thread.screenshotId);
    if (!shot) return "Preview";
    return screenshots[0]?.id === shot.id ? "Current preview" : `Older preview · ${formatDateTime(shot.createdAt)}`;
  }

  const sortedThreads = useMemo(
    () =>
      [...activeVersion.threads].sort((a, b) => {
        if (a.pinnedToTop !== b.pinnedToTop) return a.pinnedToTop ? -1 : 1;
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        return 0;
      }),
    [activeVersion.threads]
  );

  const filteredSiblings = useMemo(() => {
    const query = fileSearch.trim().toLowerCase();
    if (!query) return siblings;
    return siblings.filter((s) => s.title.toLowerCase().includes(query));
  }, [siblings, fileSearch]);

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

  useEffect(() => {
    if (!compareEnabled || !compareVersionId || compareVersionId === activeVersion.id) {
      setCompareVersion(null);
      setCompareLoading(false);
      return;
    }

    let cancelled = false;
    setCompareLoading(true);
    fetch(`${apiBase}/deliverables/${deliverableId}?version=${encodeURIComponent(compareVersionId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load compare version");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setCompareVersion(data.activeVersion as ActiveVersion);
      })
      .catch(() => {
        if (!cancelled) setCompareVersion(null);
      })
      .finally(() => {
        if (!cancelled) setCompareLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [compareEnabled, compareVersionId, activeVersion.id, apiBase, deliverableId]);

  // Same-origin prototypes only — their iframe URL is readable, so comments key off the
  // actual page path/hash. Cross-origin prototypes use the screenshot capture flow below.
  useEffect(() => {
    if (!isPrototype || isExternalPrototype) return;

    function syncFromIframe() {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const key = readIframeLocationKey(iframe);
      if (key) setPrototypeScreen(key);
    }

    function onMessage(e: MessageEvent) {
      const screen = readScreenMessage(e.data);
      if (screen) setPrototypeScreen(locationKeyFromHref(screen));
    }

    syncFromIframe();
    const interval = window.setInterval(syncFromIframe, 300);
    const iframe = iframeRef.current;
    iframe?.addEventListener("load", syncFromIframe);
    window.addEventListener("message", onMessage);
    return () => {
      window.clearInterval(interval);
      iframe?.removeEventListener("load", syncFromIframe);
      window.removeEventListener("message", onMessage);
    };
  }, [isPrototype, isExternalPrototype, activeVersion.id]);

  // Cross-origin prototypes: auto-capture a screenshot the first time this version is
  // opened with no captures yet. Refresh (below) re-runs this without overwriting old rows.
  useEffect(() => {
    if (!isExternalPrototype) return;
    if (screenshots.length > 0) return;
    if (!activeVersion.prototypeUrl) return;

    let cancelled = false;
    const versionId = activeVersion.id;
    const url: string = activeVersion.prototypeUrl;

    async function run() {
      setCaptureStatus("capturing");
      setCaptureError(null);
      const result = await captureScreenshot(versionId, url).catch(
        () => ({ ok: false as const, error: "Unable to capture that page.", status: 0 })
      );
      if (cancelled) return;
      if (!result.ok) {
        setCaptureStatus("error");
        setCaptureError(result.error);
        return;
      }
      setCaptureStatus("idle");
      setOptimisticScreenshot(result.screenshot);
      setActiveScreenshotId(result.screenshot.id);
      onMutate?.();
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [isExternalPrototype, screenshots.length, activeVersion.id, activeVersion.prototypeUrl, onMutate]);

  function refreshPreview() {
    if (!activeVersion.prototypeUrl) return;
    setCaptureStatus("capturing");
    setCaptureError(null);
    captureScreenshot(activeVersion.id, activeVersion.prototypeUrl)
      .then((result) => {
        if (!result.ok) {
          setCaptureStatus("error");
          setCaptureError(result.error);
          return;
        }
        setCaptureStatus("idle");
        setOptimisticScreenshot(result.screenshot);
        setActiveScreenshotId(result.screenshot.id);
        onMutate?.();
      })
      .catch(() => {
        setCaptureStatus("error");
        setCaptureError("Unable to capture that page.");
      });
  }

  function selectThread(threadId: string) {
    setActiveThreadId(threadId);
    const thread = activeVersion.threads.find((t) => t.id === threadId);
    if (!thread) return;

    if (isExternalPrototype && thread.screenshotId) {
      // Switch the canvas to whichever screenshot this thread was pinned on, so the pin
      // lines up (older threads may belong to a capture that's since been refreshed).
      if (thread.screenshotId !== activeScreenshot?.id) {
        setActiveScreenshotId(thread.screenshotId);
      }
      setMode("comment");
      return;
    }

    if (isPrototype && !isExternalPrototype && thread.screen && thread.screen !== prototypeScreen && iframeRef.current) {
      navigateIframeToScreen(iframeRef.current, thread.screen, activeVersion.prototypeUrl);
    }
  }

  function navigateToVersion(versionId: string) {
    navigate(`${basePath}/deliverables/${deliverableId}?version=${versionId}`);
  }

  function toggleFilesRailExpanded(expanded: boolean) {
    setFilesRailExpanded(expanded);
    persistFilesRailExpanded(expanded);
  }

  function toggleCompare() {
    if (compareEnabled) {
      setCompareEnabled(false);
      return;
    }
    const prev = sortedVersions[activeVersionIndex - 1];
    const fallback = sortedVersions.find((v) => v.id !== activeVersion.id);
    setCompareVersionId(prev?.id ?? fallback?.id ?? null);
    setCompareEnabled(true);
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canPin) return;
    // Cross-origin canvas is the captured image — no pinning while a capture is in
    // flight, failed, or hasn't happened yet.
    if (isExternalPrototype && (!activeScreenshot || captureStatus !== "idle")) return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDraftPin({ x, y });
    setActiveThreadId(null);
  }

  function submitDraftPin() {
    if (!draftPin || !draftBody.trim()) return;
    const body = draftBody;
    const { x, y } = draftPin;
    setDraftPin(null);
    setDraftBody("");
    startTransition(async () => {
      const result = await runAction("add-thread", {
        versionId: activeVersion.id,
        xPct: x,
        yPct: y,
        screen: isPrototype && !isExternalPrototype ? prototypeScreen : undefined,
        screenshotId: isExternalPrototype ? activeScreenshot?.id : undefined,
        body,
      });
      if (!result.ok) {
        setMutationError(result.error);
        return;
      }
      setMutationError(null);
      onMutate?.();
    });
  }

  function submitReply(threadId: string) {
    const body = replyDrafts[threadId];
    if (!body?.trim()) return;
    setReplyDrafts((prev) => ({ ...prev, [threadId]: "" }));
    startTransition(async () => {
      const result = await runAction("add-reply", { threadId, body });
      if (!result.ok) {
        setMutationError(result.error);
        return;
      }
      setMutationError(null);
      onMutate?.();
    });
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
                          {s.type === "DESIGN" ? "Design" : "Doc"} · {decisionShort(s.decisionState)}
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
                    onCancelDraft={() => {
                      setDraftPin(null);
                      setDraftBody("");
                    }}
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
                onCancelDraft={() => {
                  setDraftPin(null);
                  setDraftBody("");
                }}
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
                          startTransition(async () => {
                            const result = await runAction("toggle-thread-pinned", {
                              threadId: thread.id,
                              pinned: !thread.pinnedToTop,
                            });
                            if (!result.ok) {
                              setMutationError(result.error);
                              return;
                            }
                            setMutationError(null);
                            onMutate?.();
                          });
                        }}
                      >
                        {thread.pinnedToTop ? "Unpin" : "Pin"}
                      </button>
                      <button
                        className="wf-link-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          startTransition(async () => {
                            const result = await runAction("toggle-thread-resolved", {
                              threadId: thread.id,
                              resolved: !thread.resolved,
                            });
                            if (!result.ok) {
                              setMutationError(result.error);
                              return;
                            }
                            setMutationError(null);
                            onMutate?.();
                          });
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
                {s.type === "DESIGN" ? "Design" : "Doc"} · {decisionShort(s.decisionState)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewCanvas({
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
    <div className="mx-auto max-w-4xl">
      <div
        ref={canvasRef}
        onClick={onCanvasClick}
        className={`relative overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-page)] ${
          canPin ? "cursor-crosshair" : ""
        }`}
      >
        {showingScreenshotSurface ? (
          <ScreenshotSurface
            screenshot={activeScreenshot}
            captureStatus={captureStatus}
            captureError={captureError}
            onRefreshPreview={onRefreshPreview}
          />
        ) : (
          <ArtifactSurface version={version} interactMode={mode === "interact"} iframeRef={iframeRef} />
        )}

        {isPrototype ? (
          <PrototypeModeControl mode={mode} onModeChange={onModeChange} />
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

function ScreenshotSurface({
  screenshot,
  captureStatus,
  captureError,
  onRefreshPreview,
}: {
  screenshot: Screenshot | null;
  captureStatus: "idle" | "capturing" | "error";
  captureError: string | null;
  onRefreshPreview: () => void;
}) {
  if (captureStatus === "capturing" || (!screenshot && captureStatus !== "error")) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center text-sm text-[var(--text-secondary)]">
        Capturing a preview of this page…
      </div>
    );
  }

  if (captureStatus === "error" || !screenshot) {
    return (
      <div className="flex h-[600px] w-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-[var(--text-secondary)]">
        <p>{captureError ?? "Unable to capture that page."}</p>
        <button
          type="button"
          className="wf-btn text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onRefreshPreview();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <img
      src={screenshot.imageUrl}
      alt="Captured prototype preview"
      className="block w-full select-none"
      draggable={false}
    />
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

function ArtifactSurface({
  version,
  interactMode,
  iframeRef,
}: {
  version: ActiveVersion;
  interactMode: boolean;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}) {
  if (version.kind === "STATIC_IMAGE") {
    return (
      <img
        src={version.fileUrl ?? ""}
        alt="Design version"
        className="block w-full select-none"
        draggable={false}
      />
    );
  }

  if (version.kind === "STATIC_PDF") {
    return (
      <object data={version.fileUrl ?? ""} type="application/pdf" className="h-[720px] w-full">
        <p className="p-6 text-sm text-[var(--text-secondary)]">
          PDF preview unavailable — {version.fileUrl}
        </p>
      </object>
    );
  }

  if (version.kind === "MARKDOWN") {
    return (
      <div className="min-h-[500px] whitespace-pre-wrap p-8 font-mono text-sm leading-relaxed">
        {version.content}
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full">
      <iframe
        ref={iframeRef}
        src={version.prototypeUrl ?? ""}
        className="h-full w-full border-0"
        title="Hosted prototype"
      />
      {!interactMode ? <div className="absolute inset-0" aria-hidden /> : null}
    </div>
  );
}
