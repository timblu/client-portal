import { requireClient } from "@/lib/guards";
import { TopNavGate } from "@/components/TopNavGate";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <TopNavGate
        homeHref="/client"
        roleLabel={user.isApprover ? "approver" : "reviewer"}
        userName={user.name}
      />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
