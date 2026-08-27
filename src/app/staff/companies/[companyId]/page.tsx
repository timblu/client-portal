import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createProject, inviteMember, toggleApprover } from "@/lib/actions";
import { PageShell, ListHead } from "@/components/PageShell";

export default async function StaffCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      projects: {
        include: { deliverables: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!company) notFound();

  return (
    <PageShell>
      <div className="mb-8">
        <Link
          href="/staff"
          className="wf-back"
        >
          Companies
        </Link>
        <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight">{company.name}</h1>
      </div>

      <section className="mb-12">
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          Projects
        </h2>
        <div className="wf-list">
          <ListHead left="Name" />
          {company.projects.map((project) => (
            <Link
              key={project.id}
              href={`/staff/projects/${project.id}`}
              className="wf-row flex items-center justify-between py-2.5 hover:bg-[var(--surface-sunken)]"
            >
              <div>
                <p className="text-sm font-medium">{project.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {project.deliverables.length} deliverable{project.deliverables.length === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
          {company.projects.length === 0 ? (
            <p className="py-8 text-sm text-[var(--text-secondary)]">No projects yet.</p>
          ) : null}
        </div>
        <form action={createProject} className="mt-4 flex max-w-sm gap-2">
          <input type="hidden" name="companyId" value={company.id} />
          <input name="name" placeholder="New project name" required className="wf-input flex-1" />
          <button type="submit" className="wf-btn">
            Add
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          Members
        </h2>
        <div className="wf-list">
          <ListHead left="Name" right="Role" />
          {company.members.map((member) => (
            <div key={member.id} className="wf-row flex items-center justify-between py-3.5">
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{member.email}</p>
              </div>
              <form action={toggleApprover}>
                <input type="hidden" name="memberId" value={member.id} />
                <input type="hidden" name="companyId" value={company.id} />
                <button type="submit" className="wf-tag hover:underline">
                  {member.isApprover ? "Approver" : "Comment only"}
                </button>
              </form>
            </div>
          ))}
          {company.members.length === 0 ? (
            <p className="py-8 text-sm text-[var(--text-secondary)]">No members invited yet.</p>
          ) : null}
        </div>

        <form action={inviteMember} className="mt-6 flex flex-wrap items-end gap-3">
          <input type="hidden" name="companyId" value={company.id} />
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              Name
            </label>
            <input name="name" required className="wf-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              Email
            </label>
            <input name="email" type="email" required className="wf-input" />
          </div>
          <label className="flex items-center gap-1.5 pb-2 text-xs text-[var(--text-secondary)]">
            <input type="checkbox" name="isApprover" />
            Approver
          </label>
          <button type="submit" className="wf-btn-solid">
            Invite
          </button>
        </form>
      </section>
    </PageShell>
  );
}
