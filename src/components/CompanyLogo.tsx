function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

const sizes = {
  sm: { box: "size-8 rounded-md", text: "text-xs" },
  lg: { box: "size-[50px] rounded-lg", text: "text-sm" },
};

export function CompanyLogo({
  name,
  logoUrl,
  size = "lg",
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof sizes;
}) {
  const { box, text } = sizes[size];

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-sunken)] ${box}`}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className={`font-medium text-[var(--text-secondary)] ${text}`}>{getInitials(name)}</span>
      )}
    </div>
  );
}
