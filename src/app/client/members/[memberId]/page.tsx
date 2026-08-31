import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/guards";
import { isLastCompanyAdmin } from "@/lib/members";
import { PageShell } from "@/components/PageShell";
import { MemberDetail } from "@/components/members/MemberDetail";
import { toDirectoryMember, toDirectoryProjects } from "@/components/members/serialize";

export default async function ClientMemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const user = await requireCompanyAdmin();
  const { memberId } = await params;
  const companyId = user.companyId!;
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
        variant="client"
        backHref="/client/members"
        backLabel="Members"
      />
    </PageShell>
  );
}
