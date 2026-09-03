import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "@/client/api";
import { ErrorState, LoadingState, useApiAction, useRevalidate, useRouteData } from "@/client/RouteState";
import { FilterList } from "@/components/FilterList";
import { PageHeader, PageShell, ListHead } from "@/components/PageShell";
import { CompanyLogo } from "@/components/CompanyLogo";
import { AccessSummaryTag } from "@/components/members/AccessSummaryTag";
import { MembersWorkspace } from "@/components/members/MembersWorkspace";
import { MemberDetail } from "@/components/members/MemberDetail";
import { DecisionBadge } from "@/components/DecisionBadge";
import { DeliverableViewer } from "@/components/DeliverableViewer";
import { formatDate } from "@/lib/format";

const PREVIEW_LIMIT = 6;

type StaffCompaniesData = {
  companies: {
    id: string;
    name: string;
    logoUrl: string | null;
    createdAt: string;
    memberCount: number;
    pendingRevisions: number;
  }[];
};

type StaffCompanyData = {
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
    projects: { id: string; name: string; deliverableCount: number }[];
    members: import("@/components/members/types").DirectoryMember[];
  };
};

type StaffMembersData = {
  companyId: string;
  companyName: string;
  members: import("@/components/members/types").DirectoryMember[];
  projects: import("@/components/members/types").DirectoryProject[];
};

type StaffMemberData = {
  companyId: string;
  member: import("@/components/members/types").DirectoryMember;
  projects: import("@/components/members/types").DirectoryProject[];
  isLastAdmin: boolean;
};

type StaffProjectData = {
  project: {
    id: string;
    name: string;
    company: { id: string; name: string };
    deliverables: {
      id: string;
      title: string;
      type: "DESIGN" | "DOC";
      latestVersionNumber: number;
      decisionState: string;
    }[];
  };
};

type DeliverableViewData = Parameters<typeof DeliverableViewer>[0];

export function StaffHomePage() {
  const navigate = useNavigate();
  const revalidate = useRevalidate();
  const runAction = useApiAction(); // I6
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { data, error, loading } = useRouteData<StaffCompaniesData>("/api/staff/companies");

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    const result = await runAction("create-company", { name });
    if (!result.ok) {
      setMutationError(result.error);
      return;
    }
    setMutationError(null);
    if (result.redirectTo) {
      navigate(result.redirectTo);
      return;
    }
    revalidate();
  }

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error?.message ?? "Unable to load companies."} />;

  return (
    <PageShell>
      <PageHeader title="Companies" />
      <FilterList
        placeholder="Filter companies..."
        rows={data.companies.map((company) => ({
          id: company.id,
          href: `/staff/companies/${company.id}`,
          name: company.name,
          logoUrl: company.logoUrl,
          note: company.pendingRevisions > 0 ? "Needs revision" : undefined,
          updated: formatDate(company.createdAt),
        }))}
      />

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-[var(--text-secondary)]">New company</summary>
        {mutationError ? <p className="mt-3 text-sm text-[var(--text-secondary)]">{mutationError}</p> : null}
        <form onSubmit={handleCreateCompany} className="mt-3 flex max-w-sm gap-2">
          <input name="name" placeholder="Company name" required className="wf-input flex-1" />
          <button type="submit" className="wf-btn-solid">
            Create
          </button>
        </form>
      </details>
    </PageShell>
  );
}

export function StaffCompanyPage() {
  const { companyId = "" } = useParams();
  const { data, error, loading } = useRouteData<StaffCompanyData>(`/api/staff/companies/${companyId}`);

  if (loading) return <LoadingState />;
  if (error instanceof ApiError && error.status === 404) {
    return <ErrorState message="Company not found." />;
  }
  if (error || !data) return <ErrorState message={error?.message ?? "Unable to load company."} />;

  const { company } = data;
  const preview = company.members.slice(0, PREVIEW_LIMIT);

  return (
    <PageShell>
      <div className="mb-8">
        <Link to="/staff" className="wf-back">
          Companies
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-3">
            <CompanyLogo name={company.name} logoUrl={company.logoUrl} />
            <h1 className="text-[1.75rem] font-semibold tracking-tight">{company.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="wf-btn">
              New project
            </button>
            <Link to={`/staff/companies/${company.id}/members`} className="wf-btn-solid">
              Invite member
            </Link>
          </div>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          Projects
        </h2>
        <div className="wf-list">
          <ListHead left="Name" />
          {company.projects.map((project) => (
            <Link
              key={project.id}
              to={`/staff/projects/${project.id}`}
              className="wf-row flex items-center justify-between py-2.5 hover:bg-[var(--surface-sunken)]"
            >
              <div>
                <p className="text-sm font-medium">{project.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {project.deliverableCount} deliverable{project.deliverableCount === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
          {company.projects.length === 0 ? (
            <p className="py-8 text-sm text-[var(--text-secondary)]">No projects yet.</p>
          ) : null}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
            Members
          </h2>
          <Link to={`/staff/companies/${company.id}/members`} className="wf-link-muted">
            Open directory
            {company.members.length > 0 ? ` · ${company.members.length}` : ""}
          </Link>
        </div>
        <div className="wf-list">
          <ListHead left="Name" right="Access" />
          {preview.map((member) => (
            <Link
              key={member.id}
              to={`/staff/companies/${company.id}/members/${member.id}`}
              className="wf-row flex items-center justify-between py-3.5 hover:bg-[var(--surface-sunken)]"
            >
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{member.email}</p>
              </div>
              <AccessSummaryTag member={member} />
            </Link>
          ))}
          {company.members.length === 0 ? (
            <p className="py-8 text-sm text-[var(--text-secondary)]">No members invited yet.</p>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}

export function StaffMembersPage() {
  const { companyId = "" } = useParams();
  const { data, error, loading } = useRouteData<StaffMembersData>(
    `/api/staff/companies/${companyId}/members`
  );

  if (loading) return <LoadingState />;
  if (error instanceof ApiError && error.status === 404) {
    return <ErrorState message="Company not found." />;
  }
  if (error || !data) return <ErrorState message={error?.message ?? "Unable to load members."} />;

  return (
    <PageShell>
      <MembersWorkspace
        companyId={data.companyId}
        members={data.members}
        projects={data.projects}
        headingHref={{ href: `/staff/companies/${data.companyId}`, label: data.companyName }}
        rowHref={(memberId) => `/staff/companies/${data.companyId}/members/${memberId}`}
      />
    </PageShell>
  );
}

export function StaffMemberDetailPage() {
  const { companyId = "", memberId = "" } = useParams();
  const { data, error, loading } = useRouteData<StaffMemberData>(
    `/api/staff/companies/${companyId}/members/${memberId}`
  );

  if (loading) return <LoadingState />;
  if (error instanceof ApiError && error.status === 404) {
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
        variant="staff"
        backHref={`/staff/companies/${data.companyId}/members`}
        backLabel="Members"
      />
    </PageShell>
  );
}

export function StaffProjectPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const revalidate = useRevalidate();
  const runAction = useApiAction(); // I6
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { data, error, loading } = useRouteData<StaffProjectData>(`/api/staff/projects/${projectId}`);

  async function handleCreateDeliverable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await runAction("create-deliverable", {
      projectId: String(formData.get("projectId") ?? ""),
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") ?? "DESIGN"),
      kind: String(formData.get("kind") ?? "STATIC_IMAGE"),
      fileUrl: String(formData.get("fileUrl") ?? ""),
      prototypeUrl: String(formData.get("prototypeUrl") ?? ""),
      content: String(formData.get("content") ?? ""),
    });
    if (!result.ok) {
      setMutationError(result.error);
      return;
    }
    setMutationError(null);
    if (result.redirectTo) {
      navigate(result.redirectTo);
      return;
    }
    revalidate();
  }

  if (loading) return <LoadingState />;
  if (error instanceof ApiError && error.status === 404) {
    return <ErrorState message="Project not found." />;
  }
  if (error || !data) return <ErrorState message={error?.message ?? "Unable to load project."} />;

  const { project } = data;

  return (
    <PageShell>
      <div className="mb-8">
        <Link to={`/staff/companies/${project.company.id}`} className="wf-back">
          {project.company.name}
        </Link>
        <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight">{project.name}</h1>
      </div>

      <section>
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--text-secondary)]">
          Deliverables
        </h2>
        <div className="wf-list">
          <ListHead left="Name" right="Decision" />
          {project.deliverables.map((deliverable) => (
            <Link
              key={deliverable.id}
              to={`/staff/deliverables/${deliverable.id}`}
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
            <p className="py-8 text-sm text-[var(--text-secondary)]">No deliverables yet.</p>
          ) : null}
        </div>
      </section>

      <details className="mt-10">
        <summary className="cursor-pointer text-sm text-[var(--text-secondary)]">New deliverable</summary>
        {mutationError ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{mutationError}</p> : null}
        <form onSubmit={handleCreateDeliverable} className="mt-4 grid max-w-xl gap-3">
          <input type="hidden" name="projectId" value={project.id} />
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              Title
            </label>
            <input name="title" required className="wf-input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
                Type
              </label>
              <select name="type" className="wf-input wf-select w-full">
                <option value="DESIGN">Design</option>
                <option value="DOC">Doc</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
                Version kind
              </label>
              <select name="kind" className="wf-input wf-select w-full">
                <option value="STATIC_IMAGE">Static image</option>
                <option value="STATIC_PDF">Static PDF</option>
                <option value="MARKDOWN">Markdown doc</option>
                <option value="PROTOTYPE_URL">Hosted prototype URL</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              File URL
            </label>
            <input name="fileUrl" className="wf-input w-full" placeholder="/seed/homepage-v1.svg" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              Prototype URL
            </label>
            <input name="prototypeUrl" className="wf-input w-full" placeholder="/proto/checkout/cart" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.04em] text-[var(--text-secondary)]">
              Markdown
            </label>
            <textarea name="content" rows={4} className="wf-input w-full" />
          </div>
          <button type="submit" className="wf-btn-solid w-fit">
            Create deliverable
          </button>
        </form>
      </details>
    </PageShell>
  );
}

export function StaffDeliverablePage() {
  const { deliverableId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const version = searchParams.get("version") ?? undefined;
  const revalidate = useRevalidate();
  const runAction = useApiAction(); // I6
  const [mutationError, setMutationError] = useState<string | null>(null);
  const deliverablePath = `/api/staff/deliverables/${deliverableId}${
    version ? `?version=${encodeURIComponent(version)}` : ""
  }`;
  const { data, error, loading } = useRouteData<DeliverableViewData>(deliverablePath);

  async function handleAddVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await runAction("add-version", {
      deliverableId: String(formData.get("deliverableId") ?? ""),
      kind: String(formData.get("kind") ?? ""),
      fileUrl: String(formData.get("fileUrl") ?? ""),
      prototypeUrl: String(formData.get("prototypeUrl") ?? ""),
      content: String(formData.get("content") ?? ""),
    });
    if (!result.ok) {
      setMutationError(result.error);
      return;
    }
    setMutationError(null);
    revalidate();
  }

  if (loading) return <LoadingState />;
  if (error instanceof ApiError && error.status === 404) {
    return <ErrorState message="Deliverable not found." />;
  }
  if (error || !data) return <ErrorState message={error?.message ?? "Unable to load deliverable."} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DeliverableViewer {...data} onMutate={revalidate} />
      <details className="border-t border-[var(--border-subtle)] px-5 py-3">
        <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">New version</summary>
        {mutationError ? <p className="mt-3 text-xs text-[var(--text-secondary)]">{mutationError}</p> : null}
        <form onSubmit={handleAddVersion} className="mt-3 grid max-w-xl gap-3">
          <input type="hidden" name="deliverableId" value={data.deliverableId} />
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Kind</label>
            <select
              name="kind"
              className="wf-input wf-select w-full"
              defaultValue={data.activeVersion.kind}
            >
              <option value="STATIC_IMAGE">Static image</option>
              <option value="STATIC_PDF">Static PDF</option>
              <option value="MARKDOWN">Markdown doc</option>
              <option value="PROTOTYPE_URL">Hosted prototype URL</option>
            </select>
          </div>
          <input name="fileUrl" placeholder="/seed/homepage-v2.svg" className="wf-input w-full" />
          <input name="prototypeUrl" placeholder="/proto/checkout/cart" className="wf-input w-full" />
          <textarea name="content" rows={3} placeholder="Markdown content" className="wf-input w-full" />
          <button type="submit" className="wf-btn-solid w-fit">
            Add version
          </button>
        </form>
      </details>
    </div>
  );
}
