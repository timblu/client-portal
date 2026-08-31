import { requireClient } from "@/lib/guards";
import { isCompanyAdmin } from "@/lib/access";
import { TopNav } from "@/components/TopNav";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <TopNav
        homeHref="/client"
        roleLabel={user.companyRole === "COMPANY_ADMIN" ? "company admin" : "member"}
        userName={user.name}
        currentUserId={user.id}
        navLinks={isCompanyAdmin(user) ? [{ href: "/client/members", label: "Members" }] : []}
      />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
