"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListHead } from "@/components/PageShell";

export function FilterList({
  placeholder,
  rows,
}: {
  placeholder: string;
  rows: { id: string; href: string; name: string; note?: string; updated: string }[];
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
            className="wf-row flex items-center justify-between py-2.5 hover:bg-[var(--surface-sunken)]"
          >
            <p className="text-sm font-medium">
              {row.name}
              {row.note ? <span className="ml-2 font-normal text-[var(--text-secondary)]">{row.note}</span> : null}
            </p>
            <span className="text-sm text-[var(--text-secondary)]">{row.updated}</span>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-sm text-[var(--text-secondary)]">No matches.</p>
        ) : null}
      </div>
    </div>
  );
}
