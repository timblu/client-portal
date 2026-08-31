import { requireStaff } from "@/lib/guards";
import { TopNav } from "@/components/TopNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <TopNav
        homeHref="/staff"
        roleLabel="staff"
        userName={user.name}
        currentUserId={user.id}
      />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
