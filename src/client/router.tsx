import { Navigate, Outlet, useRoutes } from "react-router-dom";
import { ClientShell, RouteGuard, StaffShell } from "@/client/AppShell";
import { LoadingState, useRouteState } from "@/client/RouteState";
import { LoginPage } from "@/client/pages/LoginPage";
import {
  ClientDeliverablePage,
  ClientHomePage,
  ClientMemberDetailPage,
  ClientMembersPage,
  ClientProjectPage,
} from "@/client/pages/ClientPages";
import {
  StaffCompanyPage,
  StaffDeliverablePage,
  StaffHomePage,
  StaffMemberDetailPage,
  StaffMembersPage,
  StaffProjectPage,
} from "@/client/pages/StaffPages";
import { PrototypePage } from "@/client/pages/PrototypePage";

function HomeRedirect() {
  const { session, sessionLoading } = useRouteState();

  if (sessionLoading) return <LoadingState />;
  if (!session?.user) return <Navigate to="/login" replace />;
  return <Navigate to={session.user.role === "STAFF" ? "/staff" : "/client"} replace />;
}

function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--text-secondary)]">
      Page not found.
    </div>
  );
}

export const appRoutes = [
  { path: "/", element: <HomeRedirect /> },
  { path: "/login", element: <LoginPage /> },
  {
    path: "/staff",
    element: (
      <RouteGuard role="STAFF">
        <StaffShell>
          <Outlet />
        </StaffShell>
      </RouteGuard>
    ),
    children: [
      { index: true, element: <StaffHomePage /> },
      { path: "companies/:companyId", element: <StaffCompanyPage /> },
      { path: "companies/:companyId/members", element: <StaffMembersPage /> },
      { path: "companies/:companyId/members/:memberId", element: <StaffMemberDetailPage /> },
      { path: "projects/:projectId", element: <StaffProjectPage /> },
      { path: "deliverables/:deliverableId", element: <StaffDeliverablePage /> },
    ],
  },
  {
    path: "/client",
    element: (
      <RouteGuard role="CLIENT">
        <ClientShell>
          <Outlet />
        </ClientShell>
      </RouteGuard>
    ),
    children: [
      { index: true, element: <ClientHomePage /> },
      { path: "projects/:projectId", element: <ClientProjectPage /> },
      { path: "deliverables/:deliverableId", element: <ClientDeliverablePage /> },
      { path: "members", element: <ClientMembersPage /> },
      { path: "members/:memberId", element: <ClientMemberDetailPage /> },
    ],
  },
  { path: "/proto/checkout", element: <PrototypePage /> },
  { path: "*", element: <NotFoundPage /> },
];

export function AppRouter() {
  return useRoutes(appRoutes);
}
