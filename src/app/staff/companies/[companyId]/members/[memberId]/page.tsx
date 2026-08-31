import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/guards";
import { isLastCompanyAdmin } from "@/lib/members";
import { PageShell } from "@/components/PageShell";
import { MemberDetail } from "@/components/members/MemberDetail";
import { toDirectoryMember, toDirectoryProjects } from "@/components/members/serialize";

export default async function StaffMemberDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; memberId: string }>;
}) {
  await requireStaff();
  const { companyId, memberId } = await params;
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: { projects: { orderBy: { createdAt: "asc" } } },
  });
  if (!company) notFound();

  const member = await db.user.findUnique({
    where: { id: memberId },
    include: { projectMemberships: { include: { project: true } } },
  });
  if (
    !member ||
    member.role !== "CLIENT" ||
    member.companyId !== companyId ||
    member.removedAt
  ) {
    notFound();
  }

  return (
    <PageShell>
      <MemberDetail
        companyId={company.id}
        member={toDirectoryMember(member)}
        projects={toDirectoryProjects(company.projects)}
        isLastAdmin={await isLastCompanyAdmin(company.id, member.id)}
        variant="staff"
        backHref={`/staff/companies/${company.id}/members`}
        backLabel="Members"
      />
    </PageShell>
  );
}
