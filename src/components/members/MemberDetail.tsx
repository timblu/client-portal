"use client";

import { useRef, useState, useTransition } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiAction } from "@/client/api";
import { useRevalidate } from "@/client/RouteState";
import { ConfirmDialog } from "@/components/members/ConfirmDialog";
import type { DirectoryMember, DirectoryProject } from "@/components/members/types";

const LAST_ADMIN_HELP = "Only Company Admin — can't be demoted or removed. Promote another Member first.";

function demoteBanner(count: number) {
  if (count === 0) return "Downgraded to Member. No projects to update.";
  if (count === 1) return "Downgraded to Reviewer on 1 project.";
  return `Downgraded to Reviewer on ${count} projects.`;
}

export function MemberDetail({
  companyId,
  member,
  projects,
  isLastAdmin,
  variant = "staff",
  backHref,
  backLabel,
}: {
  companyId: string;
  member: DirectoryMember;
  projects: DirectoryProject[];
  isLastAdmin: boolean;
  variant?: "staff" | "client";
  backHref: string;
  backLabel: string;
}) {
  const navigate = useNavigate();
  const revalidate = useRevalidate();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(member.name);
  const [banner, setBanner] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"promote" | "demote" | "remove" | null>(null);
  const [lastAdminChecked, setLastAdminChecked] = useState(false);
  const lastProjectDetails = useRef<Record<string, HTMLDetailsElement | null>>({});

  const isAdmin = member.companyRole === "COMPANY_ADMIN";
  const clientLastAdminLock = variant === "client" && isLastAdmin;
  const assignedCount = member.projectMemberships.length;

  function run(action: () => Promise<void>) {
    startTransition(() => {
      void action();
    });
  }

  function memberBody(extra: Record<string, unknown> = {}) {
    return {
      companyId,
      memberId: member.id,
      ...extra,
    };
  }

  return (
    <div>
      <Link to={backHref} className="wf-back">
        {backLabel}
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{member.name}</h1>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {isAdmin ? "Company Admin" : "Member"}
        </span>
        {clientLastAdminLock ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="wf-btn opacity-[0.35]"
              aria-disabled="true"
              aria-describedby="last-admin-help"
              onClick={(e) => e.preventDefault()}
            >
              Demote to Member
            </button>
            <p id="last-admin-help" className="text-xs text-[var(--text-secondary)]">
              {LAST_ADMIN_HELP}
            </p>
          </div>
        ) : (
          <button
            type="button"
            className="wf-btn"
            onClick={() => {
              setLastAdminChecked(false);
              setConfirm(isAdmin ? "demote" : "promote");
            }}
          >
            {isAdmin ? "Demote to Member" : "Promote to Company Admin"}
          </button>
        )}
      </div>

      {banner ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{banner}</p> : null}

      <section className="mt-10 border-t border-[var(--border-subtle)] pt-8">
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          Identity
        </h2>
        <form
          className="grid max-w-xl gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const result = await apiAction("update-member-name", memberBody({ name }));
              if (result.ok) revalidate();
            });
          }}
        >
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]" htmlFor="member-name">
              Name
            </label>
            <input
              id="member-name"
              className="wf-input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Email</label>
            <p className="text-sm text-[var(--text-secondary)]">{member.email}</p>
          </div>
          <button type="submit" className="wf-btn w-fit">
            Save name
          </button>
        </form>
      </section>

      <section
        className={`mt-10 border-t pt-8 ${
          isAdmin ? "wf-dash border-[var(--border-subtle)]" : "border-[var(--border-subtle)]"
        }`}
      >
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          Project access
        </h2>
        {isAdmin ? (
          <p className="text-sm text-[var(--text-primary)]">
            Approver on all current and future projects — automatic, not editable. Demote to Member to manage
            project access individually.
          </p>
        ) : (
          <div className="wf-list">
            {projects.map((project) => {
              const membership = member.projectMemberships.find((m) => m.projectId === project.id);
              const isLastProject = Boolean(membership) && assignedCount === 1;
              return (
                <div key={project.id} className="wf-row flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <p className="text-sm font-medium">{project.name}</p>
                  {membership ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="wf-input wf-select"
                        aria-label={`Role on ${project.name}`}
                        value={membership.role}
                        onChange={(e) => {
                          run(async () => {
                            const result = await apiAction(
                              "change-project-role",
                              memberBody({ projectId: project.id, role: e.target.value })
                            );
                            if (result.ok) revalidate();
                          });
                        }}
                      >
                        <option value="REVIEWER">Reviewer</option>
                        <option value="APPROVER">Approver</option>
                      </select>
                      {isLastProject ? (
                        <details
                          ref={(el) => {
                            lastProjectDetails.current[project.id] = el;
                          }}
                          className="relative"
                        >
                          <summary className="wf-btn cursor-pointer">Remove</summary>
                          <div className="wf-panel absolute right-0 z-10 mt-2 w-72 p-3">
                            <p className="text-sm text-[var(--text-secondary)]">
                              Removing {project.name} leaves {member.name} with no project access. They stay on
                              the roster as a Member.
                            </p>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                className="wf-btn-solid"
                                onClick={() => {
                                  run(async () => {
                                    const result = await apiAction(
                                      "remove-project-access",
                                      memberBody({ projectId: project.id })
                                    );
                                    if (result.ok) revalidate();
                                  });
                                }}
                              >
                                Remove
                              </button>
                              <button
                                type="button"
                                className="wf-btn"
                                onClick={() => lastProjectDetails.current[project.id]?.removeAttribute("open")}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </details>
                      ) : (
                        <button
                          type="button"
                          className="wf-btn"
                          onClick={() => {
                            run(async () => {
                              const result = await apiAction(
                                "remove-project-access",
                                memberBody({ projectId: project.id })
                              );
                              if (result.ok) revalidate();
                            });
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text-secondary)]">Not assigned</span>
                      <button
                        type="button"
                        className="wf-btn"
                        onClick={() => {
                          run(async () => {
                            const result = await apiAction(
                              "add-project-access",
                              memberBody({ projectId: project.id })
                            );
                            if (result.ok) revalidate();
                          });
                        }}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {projects.length === 0 ? (
              <p className="py-8 text-sm text-[var(--text-secondary)]">No projects yet.</p>
            ) : null}
          </div>
        )}
      </section>

      <section className="mt-10 border-t border-[var(--border-subtle)] pt-8">
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          Remove from company
        </h2>
        {clientLastAdminLock ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="wf-btn opacity-[0.35]"
              aria-disabled="true"
              aria-describedby="last-admin-remove-help"
              onClick={(e) => e.preventDefault()}
            >
              Remove from company
            </button>
            <p id="last-admin-remove-help" className="text-xs text-[var(--text-secondary)]">
              {LAST_ADMIN_HELP}
            </p>
          </div>
        ) : (
          <button
            type="button"
            className="wf-btn"
            onClick={() => {
              setLastAdminChecked(false);
              setConfirm("remove");
            }}
          >
            Remove from company
          </button>
        )}
      </section>

      <ConfirmDialog
        open={confirm === "promote"}
        title="Promote to Company Admin?"
        confirmLabel="Promote"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          run(async () => {
            const result = await apiAction("promote-to-company-admin", memberBody());
            if (result.ok) revalidate();
          });
        }}
      >
        <p>
          {member.name} gets Approver access to all current and future projects — automatically, without being
          added to each one individually.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "demote"}
        title={variant === "staff" && isLastAdmin ? "Demote the last Company Admin?" : "Demote to Member?"}
        confirmLabel="Demote"
        onCancel={() => {
          setConfirm(null);
          setLastAdminChecked(false);
        }}
        onConfirm={() => {
          setConfirm(null);
          run(async () => {
            const result = await apiAction("demote-to-member", {
              ...memberBody(),
              confirmedLastAdmin: variant === "staff" && isLastAdmin ? true : undefined,
            });
            if (result.ok) {
              const data = result.data as { projectCount?: number } | undefined;
              setBanner(demoteBanner(data?.projectCount ?? 0));
              revalidate();
            }
          });
        }}
        checkbox={
          variant === "staff" && isLastAdmin
            ? {
                id: "confirm-last-admin-demote",
                label:
                  "Yes — demote the only Company Admin. No one will have automatic access to every project.",
                checked: lastAdminChecked,
                onChange: setLastAdminChecked,
              }
            : undefined
        }
      >
        <p>
          {variant === "staff" && isLastAdmin
            ? `${member.name} is the only Company Admin. Demoting them leaves no one with automatic Approver access to every project — future projects will need admins assigned manually.`
            : `${member.name} keeps Reviewer access on every project they're on now, but loses Approver access and won't be added to future projects automatically.`}
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "remove"}
        title={
          variant === "staff" && isLastAdmin
            ? "Remove the last Company Admin?"
            : `Remove ${member.name} from the company?`
        }
        confirmLabel="Remove"
        onCancel={() => {
          setConfirm(null);
          setLastAdminChecked(false);
        }}
        onConfirm={() => {
          setConfirm(null);
          run(async () => {
            const result = await apiAction("remove-member-from-company", {
              ...memberBody(),
              confirmedLastAdmin: variant === "staff" && isLastAdmin ? true : undefined,
            });
            if (result.ok && result.redirectTo) {
              navigate(result.redirectTo);
              return;
            }
            if (result.ok) revalidate();
          });
        }}
        checkbox={
          variant === "staff" && isLastAdmin
            ? {
                id: "confirm-last-admin-remove",
                label:
                  "Yes — remove the only Company Admin. No one will have automatic access to every project.",
                checked: lastAdminChecked,
                onChange: setLastAdminChecked,
              }
            : undefined
        }
      >
        <p>
          {variant === "staff" && isLastAdmin
            ? `${member.name} is the only Company Admin. Removing them leaves no one with automatic Approver access to every project, and ${member.name} loses access to everything immediately.`
            : `${member.name} loses access to every project immediately. Their past comments and decisions stay visible, attributed to them and marked (removed).`}
        </p>
      </ConfirmDialog>
    </div>
  );
}
