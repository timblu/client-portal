import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/guards";
import { db } from "@/lib/db";
import { PageHeader, PageShell, ListHead } from "@/components/PageShell";

export default async function ClientHome() {
  const user = await requireClient();
  if (!user.companyId) {
    return (
      <PageShell>
        <p className="text-sm text-[var(--text-secondary)]">Your account is not attached to a company yet.</p>
      </PageShell>
    );
  }

  const projects = await db.project.findMany({
    where: { companyId: user.companyId },
    include: { deliverables: { include: { versions: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (projects.length === 1) {
    redirect(`/client/projects/${projects[0].id}`);
  }

  return (
    <PageShell>
      <PageHeader title="Your projects" />
      <div className="wf-list">
        <ListHead left="Name" right="Status" />
        {projects.map((project) => {
          const pendingReview = project.deliverables.filter((d) =>
            d.versions.some((v) => v.decisionState === "PENDING")
          ).length;
          return (
            <Link
              key={project.id}
              href={`/client/projects/${project.id}`}
              className="wf-row flex items-center justify-between py-2.5 hover:bg-[var(--surface-sunken)]"
            >
              <p className="text-sm font-medium">
                {project.name}
                {pendingReview > 0 ? (
                  <span className="ml-2 font-normal text-[var(--text-secondary)]">Waiting on you</span>
                ) : null}
              </p>
              <span className="text-sm text-[var(--text-secondary)]">
                {project.deliverables.length} deliverable{project.deliverables.length === 1 ? "" : "s"}
              </span>
            </Link>
          );
        })}
        {projects.length === 0 ? (
          <p className="py-8 text-sm text-[var(--text-secondary)]">No projects yet.</p>
        ) : null}
      </div>
    </PageShell>
  );
}
