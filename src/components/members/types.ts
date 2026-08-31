import type { CompanyRole, ProjectRole } from "@prisma/client";

export type DirectoryMembership = {
  projectId: string;
  role: ProjectRole;
  projectName: string;
  projectCreatedAt: string;
};

export type DirectoryMember = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  companyRole: CompanyRole;
  projectMemberships: DirectoryMembership[];
};

export type DirectoryProject = {
  id: string;
  name: string;
};
