import { useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "@/client/api";
import { ErrorState, LoadingState, useRevalidate, useRouteData, useRouteState } from "@/client/RouteState";
import { PageHeader, PageShell, ListHead } from "@/components/PageShell";
import { DecisionBadge } from "@/components/DecisionBadge";
import { MembersWorkspace } from "@/components/members/MembersWorkspace";
import { MemberDetail } from "@/components/members/MemberDetail";
import { DeliverableViewer } from "@/components/DeliverableViewer";

type ClientProjectsData = {
  projects: {
    id: string;
    name: string;
    deliverableCount: number;
    pendingReviewCount: number;
  }[];
  singleProjectRedirect: string | null;
};

type ClientProjectData = {
  project: {
    id: string;
    name: string;
    waitingOnYou: { id: string; title: string; type: "DESIGN" | "DOC" }[];
    deliverables: {
      id: string;
      title: string;
      type: "DESIGN" | "DOC";
      latestVersionNumber: number;
      decisionState: string;
    }[];
  };
};

type ClientMembersData = {
  companyId: string;
  members: import("@/components/members/types").DirectoryMember[];
  projects: import("@/components/members/types").DirectoryProject[];
};

type ClientMemberData = {
  companyId: string;
  member: import("@/components/members/types").DirectoryMember;
  projects: import("@/components/members/types").DirectoryProject[];
  isLastAdmin: boolean;
};

type DeliverableViewData = Parameters<typeof DeliverableViewer>[0];

export function ClientHomePage() {
  const navigate = useNavigate();
  const { session } = useRouteState();
  const { data, error, loading } = useRouteData<ClientProjectsData>("/api/client/projects");

  useEffect(() => {
    if (!loading && data?.singleProjectRedirect) {
      navigate(data.singleProjectRedirect, { replace: true });
    }
  }, [loading, data?.singleProjectRedirect, navigate]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error?.message ?? "Unable to load projects."} />;

  if (data.singleProjectRedirect) {
    return <LoadingState />;
  }

  if (data.projects.length === 0 && !session?.user?.companyId) {
    return (
      <PageShell>
        <p className="text-sm text-[var(--text-secondary)]">
          Your account is not attached to a company yet.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="Your projects" />
      <div className="wf-list">
        <ListHead left="Name" right="Status" />
        {data.projects.map((project) => (
          <Link
            key={project.id}
            to={`/client/projects/${project.id}`}
            className="wf-row flex items-center justify-between py-2.5 hover:bg-[var(--surface-sunken)]"
          >
            <p className="text-sm font-medium">
              {project.name}
              {project.pendingReviewCount > 0 ? (
                <span className="ml-2 font-normal text-[var(--text-secondary)]">Waiting on you</span>
              ) : null}
            </p>
            <span className="text-sm text-[var(--text-secondary)]">
              {project.deliverableCount} deliverable{project.deliverableCount === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
        {data.projects.length === 0 ? (
          <p className="py-8 text-sm text-[var(--text-secondary)]">No projects yet.</p>
        ) : null}
      </div>
    </PageShell>
  );
}

export function ClientProjectPage() {
  const { projectId = "" } = useParams();
  const { data, error, loading } = useRouteData<ClientProjectData>(`/api/client/projects/${projectId}`);

  if (loading) return <LoadingState />;
  if (error instanceof ApiError && error.status === 404) {
    return <ErrorState message="Project not found." />;
  }
  if (error || !data) return <ErrorState message={error?.message ?? "Unable to load project."} />;

  const { project } = data;

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{project.name}</h1>
      </div>

      {project.waitingOnYou.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
            Waiting on you
          </h2>
          <div className="wf-list">
            <ListHead left="Name" />
            {project.waitingOnYou.map((deliverable) => (
              <Link
                key={deliverable.id}
                to={`/client/deliverables/${deliverable.id}`}
                className="wf-row flex items-center justify-between py-2.5 hover:bg-[var(--surface-sunken)]"
              >
                <div>
                  <p className="text-sm font-medium">{deliverable.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {deliverable.type === "DESIGN" ? "Design" : "Doc"}
                  </p>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Review</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          All deliverables
        </h2>
        <div className="wf-list">
          <ListHead left="Name" right="Decision" />
          {project.deliverables.map((deliverable) => (
            <Link
              key={deliverable.id}
              to={`/client/deliverables/${deliverable.id}`}
              className="wf-row flex items-center justify-between py-2.5 hover:bg-[var(--surface-sunken)]"
            >
              <div>
                <p className="text-sm font-medium">{deliverable.title}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {deliverable.type === "DESIGN" ? "Design" : "Doc"} · v{deliverable.latestVersionNumber}
                </p>
              </div>
              <DecisionBadge state={deliverable.decisionState} />
            </Link>
          ))}
          {project.deliverables.length === 0 ? (
            <p className="py-8 text-sm text-[var(--text-secondary)]">Nothing published yet.</p>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}

export function ClientDeliverablePage() {
  const { deliverableId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const version = searchParams.get("version") ?? undefined;
  const revalidate = useRevalidate();
  const deliverablePath = `/api/client/deliverables/${deliverableId}${
    version ? `?version=${encodeURIComponent(version)}` : ""
  }`;
  const { data, error, loading } = useRouteData<DeliverableViewData>(deliverablePath);

  if (loading) return <LoadingState />;
  if (error instanceof ApiError && error.status === 404) {
    return <ErrorState message="Deliverable not found." />;
  }
  if (error || !data) return <ErrorState message={error?.message ?? "Unable to load deliverable."} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DeliverableViewer {...data} onMutate={revalidate} />
    </div>
  );
}

export function ClientMembersPage() {
  const { data, error, loading } = useRouteData<ClientMembersData>("/api/client/members");

  if (loading) return <LoadingState />;
  if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
    return <ErrorState message="Members not found." />;
  }
  if (error || !data) return <ErrorState message={error?.message ?? "Unable to load members."} />;

  return (
    <PageShell>
      <MembersWorkspace
        companyId={data.companyId}
        members={data.members}
        projects={data.projects}
        rowHref={(memberId) => `/client/members/${memberId}`}
      />
    </PageShell>
  );
}

export function ClientMemberDetailPage() {
  const { memberId = "" } = useParams();
  const { data, error, loading } = useRouteData<ClientMemberData>(`/api/client/members/${memberId}`);

  if (loading) return <LoadingState />;
  if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
    return <ErrorState message="Member not found." />;
  }
  if (error || !data) return <ErrorState message={error?.message ?? "Unable to load member."} />;

  return (
    <PageShell>
      <MemberDetail
        companyId={data.companyId}
        member={data.member}
        projects={data.projects}
        isLastAdmin={data.isLastAdmin}
        variant="client"
        backHref="/client/members"
        backLabel="Members"
      />
    </PageShell>
  );
}
