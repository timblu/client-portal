import { useMemo, useRef, useState, useTransition } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApiAction } from "@/client/RouteState";
import { DecisionBadge } from "@/components/DecisionBadge";
import { AccountCluster } from "@/components/AccountCluster";
import { formatDateTime, initials } from "@/lib/format";

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
  resolved: boolean;
  pinnedToTop: boolean;
  comments: Comment[];
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
};

type CurrentUser = { id: string; name: string; role: "STAFF" | "CLIENT"; canDecide: boolean };

type SiblingDeliverable = {
  id: string;
  title: string;
  type: "DESIGN" | "DOC";
  decisionState: string;
};

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
  const runAction = useApiAction(); // I6: centralized 401 handling
  const [, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"interact" | "comment">("comment");
  const [galleryOpen, setGalleryOpen] = useState(true);
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

  const openThreadCount = activeVersion.threads.filter((t) => !t.resolved).length;
  const canDecide = currentUser.canDecide;
  const isPrototype = activeVersion.kind === "PROTOTYPE_URL";
  const canPin = !isPrototype || mode === "comment";

  const sortedThreads = useMemo(
    () =>
      [...activeVersion.threads].sort((a, b) => {
        if (a.pinnedToTop !== b.pinnedToTop) return a.pinnedToTop ? -1 : 1;
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        return 0;
      }),
    [activeVersion.threads]
  );

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canPin) return;
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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-3">
          {chrome ? (
            <Link to={chrome.homeHref} className="text-sm font-semibold tracking-tight">
              Review Portal
            </Link>
          ) : null}
          {crumb ? (
            <Link to={crumb.href} className="wf-back">
              {crumb.label}
            </Link>
          ) : null}
          <div>
            <h1 className="text-sm font-semibold">{title}</h1>
          </div>
          {!galleryOpen ? (
            <button className="wf-toggle" onClick={() => setGalleryOpen(true)}>
              Files
            </button>
          ) : null}
          <select
            className="wf-input wf-select text-xs"
            value={activeVersion.id}
            onChange={(e) =>
              navigate(`${basePath}/deliverables/${deliverableId}?version=${e.target.value}`)
            }
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                Version {v.versionNumber}
              </option>
            ))}
          </select>
          {isPrototype ? (
            <div className="wf-segment text-xs">
              <button
                data-active={mode === "interact"}
                className="px-3 py-1.5 transition-colors"
                onClick={() => setMode("interact")}
              >
                Interact
              </button>
              <button
                data-active={mode === "comment"}
                className="px-3 py-1.5 transition-colors"
                onClick={() => setMode("comment")}
              >
                Comment
              </button>
            </div>
          ) : null}
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
        <div className="mx-5 mb-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-page)] px-5 py-3 text-sm text-[var(--text-secondary)]">
          {mutationError}
        </div>
      ) : null}

      {decisionAction ? (
        <div className="mx-5 mb-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-page)] px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide">
            {decisionAction === "APPROVED" ? "Approve this version" : decisionAction === "REJECTED" ? "Reject this version" : "Request changes"}
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
              {openThreadCount} comment thread{openThreadCount === 1 ? "" : "s"} still open. Approve anyway?
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
        <div className="px-5 pb-2 text-xs text-[var(--text-secondary)]">
          <span className="font-semibold">{activeVersion.decidedByName}:</span>{" "}
          {activeVersion.decisionComment}
        </div>
      ) : null}

      {/* Body: gallery + canvas + sidebar */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        {galleryOpen ? (
          <div className="wf-panel w-56 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5">
              <span className="text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
                Files
              </span>
              <button className="wf-toggle" onClick={() => setGalleryOpen(false)}>
                Hide
              </button>
            </div>
            <ul>
              {siblings.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`${basePath}/deliverables/${s.id}`}
                    className={`block border-b border-[var(--border-subtle)] px-4 py-2.5 text-xs last:border-b-0 hover:bg-[var(--surface-sunken)] ${
                      s.id === deliverableId ? "border-l-[3px] border-l-[var(--action-primary-bg)] bg-[var(--surface-sunken)]" : "border-l-[3px] border-l-transparent"
                    }`}
                  >
                    <p className="truncate font-medium">{s.title}</p>
                    <p className={`mt-0.5 text-[0.625rem] ${s.id === deliverableId ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]"}`}>
                      {s.type === "DESIGN" ? "Design" : "Doc"} ·{" "}
                      {s.decisionState === "PENDING" ? "pending" : s.decisionState.toLowerCase().replace("_", " ")}
                    </p>
                  </Link>
                </li>
              ))}
              {siblings.length === 0 ? (
                <li className="px-3 py-2.5 text-xs text-[var(--text-secondary)]">No other files yet.</li>
              ) : null}
            </ul>
          </div>
        ) : null}
        <div className="relative min-w-0 flex-1 overflow-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-8">
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={`relative mx-auto max-w-4xl overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-page)] ${canPin ? "cursor-crosshair" : ""}`}
          >
            <ArtifactSurface version={activeVersion} interactMode={mode === "interact"} />

            {sortedThreads.map((thread, idx) =>
              thread.xPct == null || thread.yPct == null ? null : (
                <button
                  key={thread.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveThreadId(thread.id);
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
              )
            )}

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
                    onChange={(e) => setDraftBody(e.target.value)}
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      className="wf-btn"
                      onClick={() => {
                        setDraftPin(null);
                        setDraftBody("");
                      }}
                    >
                      Cancel
                    </button>
                    <button className="wf-btn-solid" onClick={submitDraftPin} disabled={!draftBody.trim()}>
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {canPin ? (
            <p className="mx-auto mt-3 max-w-4xl text-center text-xs text-[var(--text-secondary)]">
              Click anywhere on the file to leave a comment.
            </p>
          ) : null}
        </div>

        {/* Comments sidebar */}
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
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`cursor-pointer border-b border-[var(--border-subtle)] p-4 ${
                    activeThreadId === thread.id ? "bg-[var(--surface-sunken)]" : ""
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--action-primary-bg)] text-[0.625rem] text-[var(--action-primary-bg)]">
                        {idx + 1}
                      </span>
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
                          <span className="text-[var(--text-tertiary)]">{formatDateTime(c.createdAt)}</span>
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

function ArtifactSurface({
  version,
  interactMode,
}: {
  version: ActiveVersion;
  interactMode: boolean;
}) {
  if (version.kind === "STATIC_IMAGE") {
    return <img src={version.fileUrl ?? ""} alt="Design version" className="block w-full select-none" draggable={false} />;
  }

  if (version.kind === "STATIC_PDF") {
    return (
      <object data={version.fileUrl ?? ""} type="application/pdf" className="h-[720px] w-full">
        <p className="p-6 text-sm text-[var(--text-secondary)]">PDF preview unavailable — {version.fileUrl}</p>
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
        src={version.prototypeUrl ?? ""}
        className="h-full w-full border-0"
        title="Hosted prototype"
      />
      {!interactMode ? (
        <div className="absolute inset-0" aria-hidden />
      ) : null}
    </div>
  );
}
