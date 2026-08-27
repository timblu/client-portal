import Link from "next/link";
import { db } from "@/lib/db";
import { createCompany } from "@/lib/actions";
import { PageHeader, PageShell } from "@/components/PageShell";
import { FilterList } from "@/components/FilterList";
import { formatDate } from "@/lib/format";

export default async function StaffHome() {
  const companies = await db.company.findMany({
    include: {
      projects: { include: { deliverables: { include: { versions: true } } } },
      members: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <PageShell>
      <PageHeader title="Companies" />
      <FilterList
        placeholder="Filter companies..."
        rows={companies.map((company) => {
          const pending = company.projects
            .flatMap((p) => p.deliverables)
            .filter((d) => d.versions.some((v) => v.decisionState === "CHANGES_REQUESTED")).length;
          return {
            id: company.id,
            href: `/staff/companies/${company.id}`,
            name: company.name,
            note: pending > 0 ? "Needs revision" : undefined,
            updated: formatDate(company.createdAt),
          };
        })}
      />

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-[var(--text-secondary)]">New company</summary>
        <form action={createCompany} className="mt-3 flex max-w-sm gap-2">
          <input name="name" placeholder="Company name" required className="wf-input flex-1" />
          <button type="submit" className="wf-btn-solid">
            Create
          </button>
        </form>
      </details>
    </PageShell>
  );
}
