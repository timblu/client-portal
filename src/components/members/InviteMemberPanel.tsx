import { useMemo, useState, useTransition } from "react";
import { apiAction } from "@/client/api";
import { useRevalidate } from "@/client/RouteState";
import { ConfirmDialog } from "@/components/members/ConfirmDialog";
import type { DirectoryProject } from "@/components/members/types";

type CompanyRoleChoice = "MEMBER" | "COMPANY_ADMIN";
type ProjectRoleChoice = "REVIEWER" | "APPROVER";

const ADMIN_NOTICE =
  "Gets Approver access to all current and future projects — automatically, without being added to each one individually.";

export function InviteMemberPanel({
  companyId,
  projects,
  onClose,
}: {
  companyId: string;
  projects: DirectoryProject[];
  onClose: () => void;
}) {
  const revalidate = useRevalidate();
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyRole, setCompanyRole] = useState<CompanyRoleChoice>(
    projects.length === 0 ? "COMPANY_ADMIN" : "MEMBER"
  );
  const [selected, setSelected] = useState<Record<string, ProjectRoleChoice>>({});
  const [singleRole, setSingleRole] = useState<ProjectRoleChoice>("REVIEWER");
  const [error, setError] = useState<string | null>(null);
  const [confirmAdmin, setConfirmAdmin] = useState(false);

  const memberships = useMemo(() => {
    if (companyRole !== "MEMBER") return [];
    if (projects.length === 1) {
      return [{ projectId: projects[0].id, role: singleRole }];
    }
    return Object.entries(selected).map(([projectId, role]) => ({ projectId, role }));
  }, [companyRole, projects, selected, singleRole]);

  function toggleProject(projectId: string, checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) next[projectId] = prev[projectId] ?? "REVIEWER";
      else delete next[projectId];
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (companyRole === "MEMBER" && projects.length === 0) return;
    if (companyRole === "MEMBER" && memberships.length === 0) {
      setError("Select at least one project.");
      return;
    }
    if (!name.trim() || !email.trim()) return;

    const result = await apiAction("invite-member", {
      companyId,
      name: name.trim(),
      email: email.trim(),
      companyRole,
      memberships,
    });

    if (!result.ok) {
      setError(result.error);
      setConfirmAdmin(false);
      return;
    }

    onClose();
    revalidate();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (companyRole === "COMPANY_ADMIN") {
      setConfirmAdmin(true);
      return;
    }
    startTransition(() => {
      void submit();
    });
  }

  return (
    <div className="wf-panel mb-4 p-5">
      <form onSubmit={handleSubmit} className="grid max-w-xl gap-4">
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]" htmlFor="invite-name">
            Name
          </label>
          <input
            id="invite-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="wf-input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]" htmlFor="invite-email">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="wf-input w-full"
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-[var(--text-secondary)]">Company role</p>
          <div className="wf-segment w-fit text-xs">
            <button
              type="button"
              data-active={companyRole === "MEMBER"}
              className="px-3 py-1.5"
              disabled={projects.length === 0}
              title={projects.length === 0 ? "Requires at least one project." : undefined}
              onClick={() => setCompanyRole("MEMBER")}
            >
              Member
            </button>
            <button
              type="button"
              data-active={companyRole === "COMPANY_ADMIN"}
              className="px-3 py-1.5"
              onClick={() => setCompanyRole("COMPANY_ADMIN")}
            >
              Company Admin
            </button>
          </div>
          {projects.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Requires at least one project. This company has no projects yet — you can only invite as Company Admin.
            </p>
          ) : null}
        </div>

        {companyRole === "COMPANY_ADMIN" ? (
          <p className="text-sm text-[var(--text-secondary)]">{ADMIN_NOTICE}</p>
        ) : projects.length === 1 ? (
          <div>
            <p className="text-sm text-[var(--text-secondary)]">
              Only one project exists — {projects[0].name} will be assigned automatically.
            </p>
            <select
              className="wf-input wf-select mt-2"
              aria-label="Project role"
              value={singleRole}
              onChange={(e) => setSingleRole(e.target.value as ProjectRoleChoice)}
            >
              <option value="REVIEWER">Reviewer</option>
              <option value="APPROVER">Approver</option>
            </select>
          </div>
        ) : projects.length > 1 ? (
          <fieldset>
            <legend className="mb-2 text-xs text-[var(--text-secondary)]">Projects</legend>
            <ul className="grid gap-2">
              {projects.map((project) => {
                const checked = project.id in selected;
                return (
                  <li key={project.id} className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleProject(project.id, e.target.checked)}
                      />
                      {project.name}
                    </label>
                    <select
                      className="wf-input wf-select"
                      disabled={!checked}
                      aria-label={`Role on ${project.name}`}
                      value={selected[project.id] ?? "REVIEWER"}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [project.id]: e.target.value as ProjectRoleChoice }))
                      }
                    >
                      <option value="REVIEWER">Reviewer</option>
                      <option value="APPROVER">Approver</option>
                    </select>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : null}

        {error ? <p className="text-sm text-[var(--text-secondary)]">{error}</p> : null}

        <div className="flex items-center gap-2">
          <button type="submit" className="wf-btn-solid">
            {companyRole === "COMPANY_ADMIN" ? "Invite as Company Admin" : "Invite member"}
          </button>
          <button type="button" className="wf-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmAdmin}
        title="Invite as Company Admin?"
        confirmLabel="Invite"
        onCancel={() => setConfirmAdmin(false)}
        onConfirm={() => {
          setConfirmAdmin(false);
          startTransition(() => {
            void submit();
          });
        }}
      >
        <p>{ADMIN_NOTICE}</p>
      </ConfirmDialog>
    </div>
  );
}
