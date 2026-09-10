// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientDeliverableViewer } from "@/components/review/ClientDeliverableViewer";
import { RouteStateProvider } from "@/client/RouteState";
import type { SessionResponse } from "@/client/api";

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

function renderViewer(props: Parameters<typeof ClientDeliverableViewer>[0]) {
  return render(
    <MemoryRouter initialEntries={["/client/deliverables/d1"]}>
      <RouteStateProvider>
        <ClientDeliverableViewer {...props} />
      </RouteStateProvider>
    </MemoryRouter>
  );
}

describe("ClientDeliverableViewer", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetch({
      "/api/session": () => new Response(JSON.stringify(clientSession), { status: 200 }),
    });
  });

  it("renders the company header and the projects rail without any decision UI", async () => {
    renderViewer({
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
        screenshots: [],
      },
      basePath: "/client",
      company: { name: "Northwind Retail", logoUrl: null },
      siblings: [
        {
          id: "d1",
          title: "Homepage",
          type: "DESIGN",
          versions: [{ id: "v1", versionNumber: 1, decisionState: "PENDING" }],
        },
        {
          id: "d2",
          title: "Checkout flow",
          type: "DESIGN",
          versions: [{ id: "v2", versionNumber: 1, decisionState: "PENDING" }],
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Northwind Retail" })).toBeInTheDocument();
    });

    expect(screen.getByText("Checkout flow")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "v1" })).toHaveAttribute(
      "href",
      "/client/deliverables/d1?version=v1"
    );
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("captures a screenshot silently for cross-origin prototypes without showing a capture banner", async () => {
    const fetchMock = mockFetch({
      "/api/session": () => new Response(JSON.stringify(clientSession), { status: 200 }),
      "/api/screenshots": () =>
        new Response(
          JSON.stringify({
            ok: true,
            screenshot: {
              id: "shot-1",
              sourceUrl: "https://external-prototype.test/",
              pageLabel: null,
              imageUrl: "/captures/shot-1.png",
              width: 1280,
              height: 2400,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          }),
          { status: 200 }
        ),
    });

    renderViewer({
      deliverableId: "d1",
      title: "Checkout prototype",
      versions: [{ id: "v1", versionNumber: 1, decisionState: "PENDING" }],
      activeVersion: {
        id: "v1",
        versionNumber: 1,
        kind: "PROTOTYPE_URL",
        fileUrl: null,
        content: null,
        prototypeUrl: "https://external-prototype.test/",
        decisionState: "PENDING",
        decisionComment: null,
        decidedAt: null,
        decidedByName: null,
        threads: [],
        screenshots: [],
      },
      basePath: "/client",
      company: { name: "Northwind Retail", logoUrl: null },
      siblings: [],
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/screenshots",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(
      screen.queryByText(/can't share its live URL/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Refresh preview/i)).not.toBeInTheDocument();
  });

  it("toggles true fullscreen from the prototype dock's maximize control", async () => {
    const requestFullscreen = vi.fn().mockImplementation(function mockRequest(this: HTMLElement) {
      Object.defineProperty(document, "fullscreenElement", { value: this, configurable: true });
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    HTMLElement.prototype.requestFullscreen = requestFullscreen;

    renderViewer({
      deliverableId: "d1",
      title: "Checkout prototype",
      versions: [{ id: "v1", versionNumber: 1, decisionState: "PENDING" }],
      activeVersion: {
        id: "v1",
        versionNumber: 1,
        kind: "PROTOTYPE_URL",
        fileUrl: null,
        content: null,
        prototypeUrl: "/proto/checkout",
        decisionState: "PENDING",
        decisionComment: null,
        decidedAt: null,
        decidedByName: null,
        threads: [],
        screenshots: [],
      },
      basePath: "/client",
      company: { name: "Northwind Retail", logoUrl: null },
      siblings: [],
    });

    const user = userEvent.setup();
    const maximizeButton = await screen.findByRole("button", { name: "Enter fullscreen" });
    await user.click(maximizeButton);

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Exit fullscreen" })).toBeInTheDocument();
    });
  });
});
