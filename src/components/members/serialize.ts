import type { CompanyRole, ProjectRole } from "@prisma/client";
import type { DirectoryMember, DirectoryProject } from "@/components/members/types";

export function toDirectoryMember(member: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  companyRole: CompanyRole | null;
  projectMemberships: {
    projectId: string;
    role: ProjectRole;
    project: { name: string; createdAt: Date };
  }[];
}): DirectoryMember {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    createdAt: member.createdAt.toISOString(),
    companyRole: member.companyRole ?? "MEMBER",
    projectMemberships: member.projectMemberships.map((m) => ({
      projectId: m.projectId,
      role: m.role,
      projectName: m.project.name,
      projectCreatedAt: m.project.createdAt.toISOString(),
    })),
  };
}

export function toDirectoryProjects(projects: { id: string; name: string }[]): DirectoryProject[] {
  return projects.map((p) => ({ id: p.id, name: p.name }));
}
