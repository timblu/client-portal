import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isCompanyAdmin } from "@/lib/access-pure";
import { TopNav } from "@/components/TopNav";
import { LoadingState, useRouteState } from "@/client/RouteState";
import type { SessionUser } from "@/client/api";

function accessUser(user: SessionUser) {
  return {
    id: user.id,
    role: user.role,
    companyId: user.companyId,
    companyRole: user.companyRole,
    removedAt: user.removedAt ? new Date(user.removedAt) : null,
  };
}

export function RouteGuard({
  role,
  children,
}: {
  role?: "STAFF" | "CLIENT";
  children: ReactNode;
}) {
  const { session, sessionLoading } = useRouteState();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (sessionLoading) return;
    if (!session?.user) {
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${redirect}`, { replace: true });
      return;
    }
    if (role && session.user.role !== role) {
      navigate(session.user.role === "STAFF" ? "/staff" : "/client", { replace: true });
    }
  }, [session, sessionLoading, role, navigate, location.pathname, location.search]);

  if (sessionLoading || !session?.user) return <LoadingState />;
  if (role && session.user.role !== role) return <LoadingState />;
  return <>{children}</>;
}

export function StaffShell({ children }: { children: ReactNode }) {
  const { session } = useRouteState();
  const user = session!.user!;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <TopNav
        homeHref="/staff"
        roleLabel="staff"
        userName={user.name}
        currentUserId={user.id}
        switchTargets={session!.switchTargets}
      />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

export function ClientShell({ children }: { children: ReactNode }) {
  const { session } = useRouteState();
  const user = session!.user!;
  const admin = isCompanyAdmin(accessUser(user));

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <TopNav
        homeHref="/client"
        roleLabel={admin ? "company admin" : "member"}
        userName={user.name}
        currentUserId={user.id}
        switchTargets={session!.switchTargets}
        navLinks={admin ? [{ href: "/client/members", label: "Members" }] : []}
      />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
