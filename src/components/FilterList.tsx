"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CompanyLogo } from "@/components/CompanyLogo";
import { ListHead } from "@/components/PageShell";

export function FilterList({
  placeholder,
  rows,
}: {
  placeholder: string;
  rows: { id: string; href: string; name: string; note?: string; updated: string; logoUrl?: string | null }[];
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(needle));
  }, [q, rows]);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="wf-input w-56"
          type="search"
        />
      </div>
      <div className="wf-list">
        <ListHead left="Name" right="Updated" />
        {filtered.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className="wf-row flex items-center justify-between gap-4 py-2.5 hover:bg-[var(--surface-sunken)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <CompanyLogo name={row.name} logoUrl={row.logoUrl} size="sm" />
              <p className="text-sm font-medium">
                {row.name}
                {row.note ? <span className="ml-2 font-normal text-[var(--text-secondary)]">{row.note}</span> : null}
              </p>
            </div>
            <span className="shrink-0 text-sm text-[var(--text-secondary)]">{row.updated}</span>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-sm text-[var(--text-secondary)]">No matches.</p>
        ) : null}
      </div>
    </div>
  );
}
