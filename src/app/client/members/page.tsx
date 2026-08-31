import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/guards";
import { PageShell } from "@/components/PageShell";
import { MembersWorkspace } from "@/components/members/MembersWorkspace";
import { toDirectoryMember, toDirectoryProjects } from "@/components/members/serialize";

export default async function ClientMembersPage() {
  const user = await requireCompanyAdmin();
  const company = await db.company.findUnique({
    where: { id: user.companyId! },
    include: {
      members: {
        where: { removedAt: null },
        orderBy: { name: "asc" },
        include: {
          projectMemberships: { include: { project: true } },
        },
      },
      projects: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!company) notFound();

  return (
    <PageShell>
      <MembersWorkspace
        companyId={company.id}
        members={company.members.map(toDirectoryMember)}
        projects={toDirectoryProjects(company.projects)}
        rowHref={(memberId) => `/client/members/${memberId}`}
      />
    </PageShell>
  );
}
