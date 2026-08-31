import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guards";
import { PageShell } from "@/components/PageShell";
import { MembersWorkspace } from "@/components/members/MembersWorkspace";
import { toDirectoryMember, toDirectoryProjects } from "@/components/members/serialize";

export default async function StaffMembersDirectoryPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  await requireStaff();
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
        headingHref={{ href: `/staff/companies/${company.id}`, label: company.name }}
      />
    </PageShell>
  );
}
