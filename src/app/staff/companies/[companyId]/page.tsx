import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageShell, ListHead } from "@/components/PageShell";
import { CompanyLogo } from "@/components/CompanyLogo";
import { AccessSummaryTag } from "@/components/members/AccessSummaryTag";
import { toDirectoryMember } from "@/components/members/serialize";

const PREVIEW_LIMIT = 6;

export default async function StaffCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      members: {
        where: { removedAt: null },
        orderBy: { name: "asc" },
        include: {
          projectMemberships: { include: { project: true } },
        },
      },
      projects: {
        include: { deliverables: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!company) notFound();

  const preview = company.members.slice(0, PREVIEW_LIMIT);

  return (
    <PageShell>
      <div className="mb-8">
        <Link
          href="/staff"
          className="wf-back"
        >
          Companies
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-3">
            <CompanyLogo name={company.name} logoUrl={company.logoUrl} />
            <h1 className="text-[1.75rem] font-semibold tracking-tight">{company.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="wf-btn">
              New project
            </button>
            <Link href={`/staff/companies/${company.id}/members`} className="wf-btn-solid">
              Invite member
            </Link>
          </div>
        </div>
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
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
            Members
          </h2>
          <Link href={`/staff/companies/${company.id}/members`} className="wf-link-muted">
            Open directory
            {company.members.length > 0 ? ` · ${company.members.length}` : ""}
          </Link>
        </div>
        <div className="wf-list">
          <ListHead left="Name" right="Access" />
          {preview.map((member) => (
            <Link
              key={member.id}
              href={`/staff/companies/${company.id}/members/${member.id}`}
              className="wf-row flex items-center justify-between py-3.5 hover:bg-[var(--surface-sunken)]"
            >
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{member.email}</p>
              </div>
              <AccessSummaryTag member={toDirectoryMember(member)} />
            </Link>
          ))}
          {company.members.length === 0 ? (
            <p className="py-8 text-sm text-[var(--text-secondary)]">No members invited yet.</p>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
