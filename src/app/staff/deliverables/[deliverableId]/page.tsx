import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guards";
import { DeliverableViewer } from "@/components/DeliverableViewer";
import { addVersion } from "@/lib/actions";

export default async function StaffDeliverablePage({
  params,
  searchParams,
}: {
  params: Promise<{ deliverableId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const user = await requireStaff();
  const { deliverableId } = await params;
  const { version: versionParam } = await searchParams;

  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
    include: {
      project: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          decidedBy: true,
          threads: { include: { comments: { include: { author: true }, orderBy: { createdAt: "asc" } } } },
        },
      },
    },
  });
  if (!deliverable) notFound();

  const active =
    deliverable.versions.find((v) => v.id === versionParam) ?? deliverable.versions[0];
  if (!active) notFound();

  const siblingDeliverables = await db.deliverable.findMany({
    where: { projectId: deliverable.project.id },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DeliverableViewer
        deliverableId={deliverable.id}
        title={deliverable.title}
        versions={deliverable.versions.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          decisionState: v.decisionState,
        }))}
        activeVersion={{
          id: active.id,
          versionNumber: active.versionNumber,
          kind: active.kind,
          fileUrl: active.fileUrl,
          content: active.content,
          prototypeUrl: active.prototypeUrl,
          decisionState: active.decisionState,
          decisionComment: active.decisionComment,
          decidedAt: active.decidedAt?.toISOString() ?? null,
          decidedByName: active.decidedBy?.name ?? null,
          threads: active.threads.map((t) => ({
            id: t.id,
            xPct: t.xPct,
            yPct: t.yPct,
            resolved: t.resolved,
            pinnedToTop: t.pinnedToTop,
            comments: t.comments.map((c) => ({
              id: c.id,
              body: c.body,
              createdAt: c.createdAt.toISOString(),
              author: { name: c.author.name, role: c.author.role },
            })),
          })),
        }}
        currentUser={{ id: user.id, name: user.name, role: "STAFF", canDecide: false }}
        basePath="/staff"
        crumb={{ href: `/staff/projects/${deliverable.project.id}`, label: deliverable.project.name }}
        siblings={siblingDeliverables.map((d) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          decisionState: d.versions[0]?.decisionState ?? "PENDING",
        }))}
      />
      <details className="border-t border-[var(--border-subtle)] px-5 py-3">
        <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">
          New version
        </summary>
        <form action={addVersion} className="mt-3 grid max-w-xl gap-3">
          <input type="hidden" name="deliverableId" value={deliverable.id} />
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Kind</label>
            <select name="kind" className="wf-input wf-select w-full" defaultValue={active.kind}>
              <option value="STATIC_IMAGE">Static image</option>
              <option value="STATIC_PDF">Static PDF</option>
              <option value="MARKDOWN">Markdown doc</option>
              <option value="PROTOTYPE_URL">Hosted prototype URL</option>
            </select>
          </div>
          <input name="fileUrl" placeholder="/seed/homepage-v2.svg" className="wf-input w-full" />
          <input name="prototypeUrl" placeholder="/proto/checkout" className="wf-input w-full" />
          <textarea name="content" rows={3} placeholder="Markdown content" className="wf-input w-full" />
          <button type="submit" className="wf-btn-solid w-fit">
            Add version
          </button>
        </form>
      </details>
    </div>
  );
}
