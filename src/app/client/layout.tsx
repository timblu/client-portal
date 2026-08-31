import { requireClient } from "@/lib/guards";
import { TopNav } from "@/components/TopNav";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <TopNav
        homeHref="/client"
        roleLabel={user.isApprover ? "approver" : "reviewer"}
        userName={user.name}
        currentUserId={user.id}
      />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
