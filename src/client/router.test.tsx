// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRouter } from "@/client/router";
import { RouteStateProvider } from "@/client/RouteState";
import type { SessionResponse } from "@/client/api";

const staffSession: SessionResponse = {
  user: {
    id: "staff-1",
    email: "sam@agency.test",
    name: "Sam",
    role: "STAFF",
    companyId: null,
    companyRole: null,
    removedAt: null,
  },
  switchTargets: [],
};

const clientSession: SessionResponse = {
  user: {
    id: "client-1",
    email: "casey@northwind.test",
    name: "Casey",
    role: "CLIENT",
    companyId: "company-1",
    companyRole: "COMPANY_ADMIN",
    removedAt: null,
  },
  switchTargets: [],
};

function mockFetch(handlers: Record<string, () => Response | Promise<Response>>) {
  const patterns = Object.keys(handlers).sort((a, b) => b.length - a.length);
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    const path = url.replace("http://localhost", "");
    for (const pattern of patterns) {
      if (path === pattern || path.startsWith(`${pattern}?`)) {
        return handlers[pattern]();
      }
    }
    return new Response(JSON.stringify({ error: `Unhandled fetch: ${path}` }), { status: 500 });
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteStateProvider>
        <AppRouter />
      </RouteStateProvider>
    </MemoryRouter>
  );
}

describe("app router", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated users from /staff to /login", async () => {
    mockFetch({
      "/api/session": () =>
        new Response(JSON.stringify({ user: null, switchTargets: [] }), { status: 200 }),
    });

    renderAt("/staff");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    });
  });

  it("redirects staff users from / to /staff", async () => {
    mockFetch({
      "/api/session": () => new Response(JSON.stringify(staffSession), { status: 200 }),
      "/api/staff/companies": () =>
        new Response(
          JSON.stringify({
            companies: [
              {
                id: "c1",
                name: "Northwind Retail",
                logoUrl: null,
                createdAt: "2026-01-01T00:00:00.000Z",
                memberCount: 2,
                pendingRevisions: 0,
              },
            ],
          }),
          { status: 200 }
        ),
    });

    renderAt("/");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Companies" })).toBeInTheDocument();
    });
  });

  it("redirects client users from / to /client", async () => {
    mockFetch({
      "/api/session": () => new Response(JSON.stringify(clientSession), { status: 200 }),
      "/api/client/projects": () =>
        new Response(
          JSON.stringify({
            projects: [
              { id: "p1", name: "Website", deliverableCount: 2, pendingReviewCount: 1 },
              { id: "p2", name: "Brand", deliverableCount: 1, pendingReviewCount: 0 },
            ],
            singleProjectRedirect: null,
          }),
          { status: 200 }
        ),
    });

    renderAt("/");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Your projects" })).toBeInTheDocument();
    });
  });

  it("blocks client users from staff routes", async () => {
    mockFetch({
      "/api/session": () => new Response(JSON.stringify(clientSession), { status: 200 }),
      "/api/client/projects": () =>
        new Response(
          JSON.stringify({
            projects: [
              { id: "p1", name: "Website", deliverableCount: 2, pendingReviewCount: 1 },
              { id: "p2", name: "Brand", deliverableCount: 1, pendingReviewCount: 0 },
            ],
            singleProjectRedirect: null,
          }),
          { status: 200 }
        ),
    });

    renderAt("/staff");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Your projects" })).toBeInTheDocument();
    });
  });

  it("renders a not-found page for unknown routes", async () => {
    mockFetch({
      "/api/session": () => new Response(JSON.stringify(staffSession), { status: 200 }),
    });

    renderAt("/does-not-exist");

    await waitFor(() => {
      expect(screen.getByText("Page not found.")).toBeInTheDocument();
    });
  });
});

describe("login and staff pages", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a dev inbox link after magic-link request", async () => {
    mockFetch({
      "/api/session": () =>
        new Response(JSON.stringify({ user: null, switchTargets: [] }), { status: 200 }),
      "/api/auth/magic-link": () =>
        new Response(
          JSON.stringify({ ok: true, email: "sam@agency.test", devLink: "token-123" }),
          { status: 200 }
        ),
    });

    const user = userEvent.setup();
    renderAt("/login");

    await user.type(screen.getByRole("textbox", { name: "Email" }), "sam@agency.test");
    await user.click(screen.getByLabelText("Send sign-in link"));

    await waitFor(() => {
      expect(screen.getByText("Dev inbox")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Open sign-in link" })).toHaveAttribute(
        "href",
        "/auth/verify?token=token-123"
      );
    });
  });

  it("redirects after company creation", async () => {
    const fetchMock = mockFetch({
      "/api/session": () => new Response(JSON.stringify(staffSession), { status: 200 }),
      "/api/staff/companies": () =>
        new Response(JSON.stringify({ companies: [] }), { status: 200 }),
      "/api/actions/create-company": () =>
        new Response(JSON.stringify({ ok: true, redirectTo: "/staff/companies/new-co" }), {
          status: 200,
        }),
      "/api/staff/companies/new-co": () =>
        new Response(
          JSON.stringify({
            company: {
              id: "new-co",
              name: "Acme",
              logoUrl: null,
              projects: [],
              members: [],
            },
          }),
          { status: 200 }
        ),
    });

    const user = userEvent.setup();
    renderAt("/staff");

    await waitFor(() => {
      expect(screen.getByText("New company")).toBeInTheDocument();
    });

    await user.click(screen.getByText("New company"));
    await user.type(screen.getByPlaceholderText("Company name"), "Acme");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/actions/create-company",
        expect.objectContaining({ method: "POST" })
      );
      expect(screen.getByRole("heading", { name: "Acme" })).toBeInTheDocument();
    });
  });

  it("lists project deliverables for staff", async () => {
    mockFetch({
      "/api/session": () => new Response(JSON.stringify(staffSession), { status: 200 }),
      "/api/staff/projects/p1": () =>
        new Response(
          JSON.stringify({
            project: {
              id: "p1",
              name: "Website redesign",
              company: { id: "c1", name: "Northwind Retail" },
              deliverables: [
                {
                  id: "d1",
                  title: "Homepage",
                  type: "DESIGN",
                  latestVersionNumber: 2,
                  decisionState: "PENDING",
                },
              ],
            },
          }),
          { status: 200 }
        ),
    });

    renderAt("/staff/projects/p1");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Website redesign" })).toBeInTheDocument();
      expect(screen.getByText("Homepage")).toBeInTheDocument();
    });
  });
});

describe("deliverable viewer and members", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("hides decision controls for reviewers", async () => {
    mockFetch({
      "/api/session": () =>
        new Response(
          JSON.stringify({
            user: {
              id: "reviewer-1",
              email: "priya@northwind.test",
              name: "Priya",
              role: "CLIENT",
              companyId: "c1",
              companyRole: "MEMBER",
              removedAt: null,
            },
            switchTargets: [],
          }),
          { status: 200 }
        ),
      "/api/client/deliverables/d1": () =>
        new Response(
          JSON.stringify({
            deliverableId: "d1",
            title: "Homepage",
            versions: [{ id: "v1", versionNumber: 1, decisionState: "PENDING" }],
            activeVersion: {
              id: "v1",
              versionNumber: 1,
              kind: "STATIC_IMAGE",
              fileUrl: "/seed/homepage-v1.svg",
              content: null,
              prototypeUrl: null,
              decisionState: "PENDING",
              decisionComment: null,
              decidedAt: null,
              decidedByName: null,
              threads: [],
            },
            currentUser: {
              id: "reviewer-1",
              name: "Priya",
              role: "CLIENT",
              canDecide: false,
            },
            basePath: "/client",
            crumb: { href: "/client/projects/p1", label: "Website" },
            siblings: [],
          }),
          { status: 200 }
        ),
    });

    renderAt("/client/deliverables/d1");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Homepage" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("navigates member directory rows", async () => {
    mockFetch({
      "/api/session": () => new Response(JSON.stringify(staffSession), { status: 200 }),
      "/api/staff/companies/c1/members": () =>
        new Response(
          JSON.stringify({
            companyId: "c1",
            companyName: "Northwind Retail",
            members: [
              {
                id: "m1",
                name: "Casey",
                email: "casey@northwind.test",
                companyRole: "COMPANY_ADMIN",
                createdAt: "2026-01-01T00:00:00.000Z",
                projectMemberships: [],
              },
            ],
            projects: [{ id: "p1", name: "Website" }],
          }),
          { status: 200 }
        ),
      "/api/staff/companies/c1/members/m1": () =>
        new Response(
          JSON.stringify({
            companyId: "c1",
            member: {
              id: "m1",
              name: "Casey",
              email: "casey@northwind.test",
              companyRole: "COMPANY_ADMIN",
              createdAt: "2026-01-01T00:00:00.000Z",
              projectMemberships: [],
            },
            projects: [{ id: "p1", name: "Website" }],
            isLastAdmin: false,
          }),
          { status: 200 }
        ),
    });

    const user = userEvent.setup();
    renderAt("/staff/companies/c1/members");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Members" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("link", { name: /Casey/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Casey" })).toBeInTheDocument();
    });
  });
});
