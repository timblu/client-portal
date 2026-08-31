import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/guards";
import { DeliverableViewer } from "@/components/DeliverableViewer";

export default async function ClientDeliverablePage({
  params,
  searchParams,
}: {
  params: Promise<{ deliverableId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const user = await requireClient();
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
  if (!deliverable || deliverable.project.companyId !== user.companyId) notFound();

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
        currentUser={{ id: user.id, name: user.name, role: "CLIENT", isApprover: user.isApprover }}
        basePath="/client"
        crumb={{ href: `/client/projects/${deliverable.project.id}`, label: deliverable.project.name }}
        siblings={siblingDeliverables.map((d) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          decisionState: d.versions[0]?.decisionState ?? "PENDING",
        }))}
      />
    </div>
  );
}
