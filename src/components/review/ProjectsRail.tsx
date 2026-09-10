import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link } from "react-router-dom";
import type { SiblingDeliverable } from "@/components/review/types";

export function ProjectsRail({
  deliverables,
  activeDeliverableId,
  activeVersionId,
  basePath,
  expanded,
  onToggleExpanded,
}: {
  deliverables: SiblingDeliverable[];
  activeDeliverableId: string;
  activeVersionId: string;
  basePath: string;
  expanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}) {
  if (deliverables.length === 0) return null;

  if (!expanded) {
    return (
      <div className="review-panel flex w-12 shrink-0 flex-col overflow-hidden">
        <div className="flex justify-center border-b border-[var(--border-subtle)] py-2">
          <button
            type="button"
            className="wf-icon-btn text-[var(--text-secondary)]"
            aria-label="Expand projects panel"
            onClick={() => onToggleExpanded(true)}
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-1">
          {deliverables.map((d) => (
            <li key={d.id}>
              <Link
                to={`${basePath}/deliverables/${d.id}`}
                title={d.title}
                className={`block border-l-[3px] px-1 py-2 text-center text-[0.5625rem] leading-tight hover:bg-[var(--surface-sunken)] ${
                  d.id === activeDeliverableId
                    ? "border-l-[var(--action-primary-bg)] bg-[var(--surface-sunken)] font-semibold"
                    : "border-l-transparent text-[var(--text-secondary)]"
                }`}
              >
                <span className="line-clamp-3 break-all">{d.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="review-panel flex w-60 shrink-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-4">
        <span className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-primary)]">
          Projects
        </span>
        <button
          type="button"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Collapse projects panel"
          onClick={() => onToggleExpanded(false)}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {deliverables.map((d) => {
          const isActive = d.id === activeDeliverableId;
          if (!isActive) {
            return (
              <li key={d.id}>
                <Link
                  to={`${basePath}/deliverables/${d.id}`}
                  className="block truncate rounded-[var(--radius-card)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                >
                  {d.title}
                </Link>
              </li>
            );
          }
          return (
            <li key={d.id} className="rounded-[var(--radius-card)] bg-[var(--surface-selected)]">
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
                <span className="truncate">{d.title}</span>
                <ChevronDown size={14} />
              </div>
              <ul className="flex flex-col gap-0.5 px-3 pb-2">
                {d.versions.map((v) => (
                  <li key={v.id}>
                    <Link
                      to={`${basePath}/deliverables/${d.id}?version=${v.id}`}
                      className={`block rounded px-2 py-1 text-[0.6875rem] ${
                        v.id === activeVersionId
                          ? "bg-[var(--surface-selected-strong)] font-medium text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-selected-strong)]"
                      }`}
                    >
                      v{v.versionNumber}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
