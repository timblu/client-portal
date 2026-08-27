import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createDeliverable } from "@/lib/actions";
import { DecisionBadge } from "@/components/DecisionBadge";
import { PageShell, ListHead } from "@/components/PageShell";

export default async function StaffProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      company: true,
      deliverables: {
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project) notFound();

  return (
    <PageShell>
      <div className="mb-8">
        <Link
          href={`/staff/companies/${project.company.id}`}
          className="wf-back"
        >
          {project.company.name}
        </Link>
        <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight">{project.name}</h1>
      </div>

      <section>
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          Deliverables
        </h2>
        <div className="wf-list">
          <ListHead left="Name" right="Decision" />
          {project.deliverables.map((d) => (
            <Link
              key={d.id}
              href={`/staff/deliverables/${d.id}`}
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
            <p className="py-8 text-sm text-[var(--text-secondary)]">No deliverables yet.</p>
          ) : null}
        </div>
      </section>

      <details className="mt-10">
        <summary className="cursor-pointer text-sm text-[var(--text-secondary)]">New deliverable</summary>
        <form action={createDeliverable} className="mt-4 grid max-w-xl gap-3">
          <input type="hidden" name="projectId" value={project.id} />
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              Title
            </label>
            <input name="title" required className="wf-input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
                Type
              </label>
              <select name="type" className="wf-input wf-select w-full">
                <option value="DESIGN">Design</option>
                <option value="DOC">Doc</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
                Version kind
              </label>
              <select name="kind" className="wf-input wf-select w-full">
                <option value="STATIC_IMAGE">Static image</option>
                <option value="STATIC_PDF">Static PDF</option>
                <option value="MARKDOWN">Markdown doc</option>
                <option value="PROTOTYPE_URL">Hosted prototype URL</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              File URL
            </label>
            <input name="fileUrl" className="wf-input w-full" placeholder="/seed/homepage-v1.svg" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              Prototype URL
            </label>
            <input name="prototypeUrl" className="wf-input w-full" placeholder="/proto/checkout" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              Markdown
            </label>
            <textarea name="content" rows={4} className="wf-input w-full" />
          </div>
          <button type="submit" className="wf-btn-solid w-fit">
            Create deliverable
          </button>
        </form>
      </details>
    </PageShell>
  );
}
