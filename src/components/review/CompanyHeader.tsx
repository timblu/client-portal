import { CompanyLogo } from "@/components/CompanyLogo";

export function CompanyHeader({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <CompanyLogo name={name} logoUrl={logoUrl} size="sm" />
      <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">{name}</h1>
    </div>
  );
}
