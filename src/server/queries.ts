import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import {
  canAccessProject,
  canApproveProject,
  isCompanyAdmin,
  visibleProjectsWhere,
  type AccessUser,
} from "@/lib/access";
import { attributedName } from "@/lib/format";
import { toDirectoryMember, toDirectoryProjects } from "@/components/members/serialize";
import { isLastCompanyAdmin } from "@/lib/members";
import { listSwitchTargets } from "@/server/dev";
import { serializeUser } from "@/server/serialize";

function asAccessUser(user: User): AccessUser {
  return {
    id: user.id,
    role: user.role,
    companyId: user.companyId,
    companyRole: user.companyRole,
    removedAt: user.removedAt,
  };
}

export async function getBootstrap(user: User) {
  return {
    user: serializeUser(user),
    switchTargets: process.env.NODE_ENV !== "production" ? await listSwitchTargets() : [],
  };
}

export async function getStaffCompanies(user: User) {
  void user;
  const companies = await db.company.findMany({
    include: {
      projects: { include: { deliverables: { include: { versions: true } } } },
      members: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      createdAt: company.createdAt.toISOString(),
      memberCount: company.members.length,
      pendingRevisions: company.projects
        .flatMap((project) => project.deliverables)
        .filter((deliverable) =>
          deliverable.versions.some((version) => version.decisionState === "CHANGES_REQUESTED")
        ).length,
    })),
  };
}

export async function getStaffCompany(_user: User, companyId: string) {
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
      projects: {
        include: { deliverables: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!company) return null;

  return {
    company: {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      projects: company.projects.map((project) => ({
        id: project.id,
        name: project.name,
        deliverableCount: project.deliverables.length,
      })),
      members: company.members.map(toDirectoryMember),
    },
  };
}

export async function getStaffMembers(_user: User, companyId: string) {
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
  if (!company) return null;

  return {
    companyId: company.id,
    companyName: company.name,
    members: company.members.map(toDirectoryMember),
    projects: toDirectoryProjects(company.projects),
  };
}

export async function getStaffMember(_user: User, companyId: string, memberId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: { projects: { orderBy: { createdAt: "asc" } } },
  });
  if (!company) return null;

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
    return null;
  }

  return {
    companyId: company.id,
    member: toDirectoryMember(member),
    projects: toDirectoryProjects(company.projects),
    isLastAdmin: await isLastCompanyAdmin(company.id, member.id),
  };
}

export async function getStaffProject(_user: User, projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      company: true,
      deliverables: {
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project) return null;

  return {
    project: {
      id: project.id,
      name: project.name,
      company: { id: project.company.id, name: project.company.name },
      deliverables: project.deliverables.map((deliverable) => ({
        id: deliverable.id,
        title: deliverable.title,
        type: deliverable.type,
        latestVersionNumber: deliverable.versions[0]?.versionNumber ?? 1,
        decisionState: deliverable.versions[0]?.decisionState ?? "PENDING",
      })),
    },
  };
}

export async function getStaffDeliverable(_user: User, deliverableId: string, versionId?: string) {
  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
    include: {
      project: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          decidedBy: true,
          threads: {
            include: {
              comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
            },
          },
          screenshots: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!deliverable) return null;

  const active =
    deliverable.versions.find((version) => version.id === versionId) ?? deliverable.versions[0];
  if (!active) return null;

  const siblingDeliverables = await db.deliverable.findMany({
    where: { projectId: deliverable.project.id },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  return serializeDeliverableView(deliverable, active, siblingDeliverables, {
    id: _user.id,
    name: _user.name,
    role: "STAFF" as const,
    canDecide: false,
  }, "/staff");
}

export async function getClientProjects(user: User) {
  const actor = asAccessUser(user);
  if (!user.companyId) {
    return { projects: [], singleProjectRedirect: null };
  }

  const projects = await db.project.findMany({
    where: visibleProjectsWhere(actor),
    include: { deliverables: { include: { versions: true } } },
    orderBy: { createdAt: "asc" },
  });

  return {
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      deliverableCount: project.deliverables.length,
      pendingReviewCount: project.deliverables.filter((deliverable) =>
        deliverable.versions.some((version) => version.decisionState === "PENDING")
      ).length,
    })),
    singleProjectRedirect: projects.length === 1 ? `/client/projects/${projects[0].id}` : null,
  };
}

export async function getClientProject(user: User, projectId: string) {
  const actor = asAccessUser(user);
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      deliverables: {
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project || !(await canAccessProject(actor, project))) return null;

  const waitingOnYou = project.deliverables.filter(
    (deliverable) => (deliverable.versions[0]?.decisionState ?? "PENDING") === "PENDING"
  );

  return {
    project: {
      id: project.id,
      name: project.name,
      waitingOnYou: waitingOnYou.map((deliverable) => ({
        id: deliverable.id,
        title: deliverable.title,
        type: deliverable.type,
      })),
      deliverables: project.deliverables.map((deliverable) => ({
        id: deliverable.id,
        title: deliverable.title,
        type: deliverable.type,
        latestVersionNumber: deliverable.versions[0]?.versionNumber ?? 1,
        decisionState: deliverable.versions[0]?.decisionState ?? "PENDING",
      })),
    },
  };
}

export async function getClientDeliverable(user: User, deliverableId: string, versionId?: string) {
  const actor = asAccessUser(user);
  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
    include: {
      project: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          decidedBy: true,
          threads: {
            include: {
              comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
            },
          },
          screenshots: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!deliverable || !(await canAccessProject(actor, deliverable.project))) return null;

  const active =
    deliverable.versions.find((version) => version.id === versionId) ?? deliverable.versions[0];
  if (!active) return null;

  const siblingDeliverables = await db.deliverable.findMany({
    where: { projectId: deliverable.project.id },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  return serializeDeliverableView(deliverable, active, siblingDeliverables, {
    id: user.id,
    name: user.name,
    role: "CLIENT" as const,
    canDecide: await canApproveProject(actor, deliverable.project),
  }, "/client");
}

export async function getClientMembers(user: User) {
  const actor = asAccessUser(user);
  if (!isCompanyAdmin(actor) || !user.companyId) return null;

  const company = await db.company.findUnique({
    where: { id: user.companyId },
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
  if (!company) return null;

  return {
    companyId: company.id,
    members: company.members.map(toDirectoryMember),
    projects: toDirectoryProjects(company.projects),
  };
}

export async function getClientMember(user: User, memberId: string) {
  const actor = asAccessUser(user);
  if (!isCompanyAdmin(actor) || !user.companyId) return null;

  const company = await db.company.findUnique({
    where: { id: user.companyId },
    include: { projects: { orderBy: { createdAt: "asc" } } },
  });
  if (!company) return null;

  const member = await db.user.findUnique({
    where: { id: memberId },
    include: { projectMemberships: { include: { project: true } } },
  });
  if (
    !member ||
    member.role !== "CLIENT" ||
    member.companyId !== user.companyId ||
    member.removedAt
  ) {
    return null;
  }

  return {
    companyId: company.id,
    member: toDirectoryMember(member),
    projects: toDirectoryProjects(company.projects),
    isLastAdmin: await isLastCompanyAdmin(company.id, member.id),
  };
}

function serializeDeliverableView(
  deliverable: {
    id: string;
    title: string;
    project: { id: string; name: string };
    versions: {
      id: string;
      versionNumber: number;
      decisionState: string;
      kind: string;
      fileUrl: string | null;
      content: string | null;
      prototypeUrl: string | null;
      decisionComment: string | null;
      decidedAt: Date | null;
      decidedBy: { name: string; removedAt: Date | null } | null;
      threads: {
        id: string;
        xPct: number | null;
        yPct: number | null;
        screen: string | null;
        screenshotId: string | null;
        resolved: boolean;
        pinnedToTop: boolean;
        comments: {
          id: string;
          body: string;
          createdAt: Date;
          author: { name: string; role: string; removedAt: Date | null };
        }[];
      }[];
      screenshots: {
        id: string;
        sourceUrl: string;
        pageLabel: string | null;
        imageUrl: string;
        width: number;
        height: number;
        createdAt: Date;
      }[];
    }[];
  },
  active: (typeof deliverable.versions)[number],
  siblingDeliverables: {
    id: string;
    title: string;
    type: string;
    versions: { decisionState: string }[];
  }[],
  currentUser: { id: string; name: string; role: "STAFF" | "CLIENT"; canDecide: boolean },
  basePath: "/staff" | "/client"
) {
  return {
    deliverableId: deliverable.id,
    title: deliverable.title,
    versions: deliverable.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      decisionState: version.decisionState,
    })),
    activeVersion: {
      id: active.id,
      versionNumber: active.versionNumber,
      kind: active.kind,
      fileUrl: active.fileUrl,
      content: active.content,
      prototypeUrl: active.prototypeUrl,
      decisionState: active.decisionState,
      decisionComment: active.decisionComment,
      decidedAt: active.decidedAt?.toISOString() ?? null,
      decidedByName: attributedName(active.decidedBy),
      threads: active.threads.map((thread) => ({
        id: thread.id,
        xPct: thread.xPct,
        yPct: thread.yPct,
        screen: thread.screen,
        screenshotId: thread.screenshotId,
        resolved: thread.resolved,
        pinnedToTop: thread.pinnedToTop,
        comments: thread.comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          author: {
            name: attributedName(comment.author) ?? comment.author.name,
            role: comment.author.role,
          },
        })),
      })),
      screenshots: active.screenshots.map((shot) => ({
        id: shot.id,
        sourceUrl: shot.sourceUrl,
        pageLabel: shot.pageLabel,
        imageUrl: shot.imageUrl,
        width: shot.width,
        height: shot.height,
        createdAt: shot.createdAt.toISOString(),
      })),
    },
    currentUser,
    basePath,
    crumb: { href: `${basePath}/projects/${deliverable.project.id}`, label: deliverable.project.name },
    siblings: siblingDeliverables.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      decisionState: item.versions[0]?.decisionState ?? "PENDING",
    })),
  };
}
