import type { DirectoryMember } from "@/components/members/types";

export type AccessSummary = {
  kind: "admin" | "none" | "projects";
  lead: string;
  moreCount: number;
  ariaLabel: string;
};

function roleWord(role: DirectoryMember["projectMemberships"][number]["role"]) {
  return role === "APPROVER" ? "Approver" : "Reviewer";
}

export function formatAccessSummary(member: DirectoryMember): AccessSummary {
  if (member.companyRole === "COMPANY_ADMIN") {
    return {
      kind: "admin",
      lead: "Company Admin · all projects",
      moreCount: 0,
      ariaLabel: "Company Admin · all projects",
    };
  }

  const assigned = [...member.projectMemberships].sort(
    (a, b) => new Date(a.projectCreatedAt).getTime() - new Date(b.projectCreatedAt).getTime()
  );
  const phrases = assigned.map((m) => `${roleWord(m.role)} on ${m.projectName}`);

  if (assigned.length === 0) {
    return { kind: "none", lead: "No project access", moreCount: 0, ariaLabel: "No project access" };
  }

  const ariaLabel = `Access to ${assigned.length} project${assigned.length === 1 ? "" : "s"}: ${phrases.join(", ")}`;

  if (assigned.length === 1) {
    return { kind: "projects", lead: phrases[0], moreCount: 0, ariaLabel };
  }
  if (assigned.length === 2) {
    return { kind: "projects", lead: `${phrases[0]} · ${phrases[1]}`, moreCount: 0, ariaLabel };
  }
  return {
    kind: "projects",
    lead: phrases[0],
    moreCount: assigned.length - 1,
    ariaLabel,
  };
}
