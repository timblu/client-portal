export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[960px] flex-1 overflow-y-auto px-8 py-12">{children}</div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-[1.75rem] font-semibold tracking-tight">{title}</h1>
      {description ? <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{description}</p> : null}
    </div>
  );
}

export function ListHead({ left, right }: { left: string; right?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2">
      <span className="wf-tag">{left}</span>
      {right ? <span className="wf-tag">{right}</span> : null}
    </div>
  );
}
