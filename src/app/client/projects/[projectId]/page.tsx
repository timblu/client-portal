import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/guards";
import { db } from "@/lib/db";
import { DecisionBadge } from "@/components/DecisionBadge";
import { PageShell, ListHead } from "@/components/PageShell";

export default async function ClientProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireClient();
  const { projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      deliverables: {
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project || project.companyId !== user.companyId) notFound();

  const waitingOnYou = project.deliverables.filter(
    (d) => (d.versions[0]?.decisionState ?? "PENDING") === "PENDING"
  );

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{project.name}</h1>
      </div>

      {waitingOnYou.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
            Waiting on you
          </h2>
          <div className="wf-list">
            <ListHead left="Name" />
            {waitingOnYou.map((d) => (
              <Link
                key={d.id}
                href={`/client/deliverables/${d.id}`}
                className="wf-row flex items-center justify-between py-2.5 hover:bg-[var(--surface-sunken)]"
              >
                <div>
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {d.type === "DESIGN" ? "Design" : "Doc"}
                  </p>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Review</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          All deliverables
        </h2>
        <div className="wf-list">
          <ListHead left="Name" right="Decision" />
          {project.deliverables.map((d) => (
            <Link
              key={d.id}
              href={`/client/deliverables/${d.id}`}
              className="wf-row flex items-center justify-between py-2.5 hover:bg-[var(--surface-sunken)]"
            >
              <div>
                <p className="text-sm font-medium">{d.title}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {d.type === "DESIGN" ? "Design" : "Doc"} · v{d.versions[0]?.versionNumber ?? 1}
                </p>
              </div>
              <DecisionBadge state={d.versions[0]?.decisionState ?? "PENDING"} />
            </Link>
          ))}
          {project.deliverables.length === 0 ? (
            <p className="py-8 text-sm text-[var(--text-secondary)]">Nothing published yet.</p>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
