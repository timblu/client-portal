import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useApiAction } from "@/client/RouteState";
import { captureScreenshot, type CapturedScreenshot } from "@/client/api";
import { formatDateTime } from "@/lib/format";
import {
  isCrossOriginPrototypeUrl,
  locationKeyFromHref,
  navigateIframeToScreen,
  readIframeLocationKey,
  readScreenMessage,
} from "@/lib/prototype-bridge";
import type { ActiveVersion, Screenshot, Thread, VersionSummary } from "@/components/review/types";

/**
 * Shared review state and mutations for a deliverable version: prototype mode,
 * comment pinning/threads, compare, history, and screenshot capture for
 * cross-origin prototypes. Consumed by both the staff DeliverableViewer and the
 * client ClientDeliverableViewer so the two layouts stay behaviorally identical.
 *
 * Decision (approve/reject/request changes) and file-switcher state are
 * staff-only concerns and are intentionally kept out of this hook.
 */
export function useDeliverableReview({
  deliverableId,
  basePath,
  activeVersion,
  versions,
  onMutate,
}: {
  deliverableId: string;
  basePath: string;
  activeVersion: ActiveVersion;
  versions: VersionSummary[];
  onMutate?: () => void;
}) {
  const navigate = useNavigate();
  const runAction = useApiAction();
  const [, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [mode, setMode] = useState<"interact" | "comment">("comment");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<ActiveVersion | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
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

  function cancelDraftPin() {
    setDraftPin(null);
    setDraftBody("");
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

  function toggleThreadPinned(threadId: string, pinned: boolean) {
    startTransition(async () => {
      const result = await runAction("toggle-thread-pinned", { threadId, pinned });
      if (!result.ok) {
        setMutationError(result.error);
        return;
      }
      setMutationError(null);
      onMutate?.();
    });
  }

  function toggleThreadResolved(threadId: string, resolved: boolean) {
    startTransition(async () => {
      const result = await runAction("toggle-thread-resolved", { threadId, resolved });
      if (!result.ok) {
        setMutationError(result.error);
        return;
      }
      setMutationError(null);
      onMutate?.();
    });
  }

  return {
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
    setActiveThreadId,
    replyDrafts,
    setReplyDrafts,
    mutationError,
    setMutationError,
    prototypeScreen,
    activeScreenshotId,
    setActiveScreenshotId,
    captureStatus,
    captureError,
    refreshPreview,
    screenshots,
    activeScreenshot,
    threadScreenshotTag,
    sortedVersions,
    activeVersionIndex,
    hasPrevVersion,
    hasNextVersion,
    openThreadCount,
    isPrototype,
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
  };
}
