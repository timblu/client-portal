"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AccessSummaryTag } from "@/components/members/AccessSummaryTag";
import type { DirectoryMember, DirectoryProject } from "@/components/members/types";

export function MembersDirectory({
  members,
  projects,
  onInvite,
  rowHref,
}: {
  members: DirectoryMember[];
  projects: DirectoryProject[];
  onInvite?: () => void;
  rowHref?: (memberId: string) => string;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "COMPANY_ADMIN" | "MEMBER">("all");
  const [projectFilter, setProjectFilter] = useState<"all" | "none" | string>("all");
  const [sort, setSort] = useState<"name" | "role" | "added">("name");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = members.filter((member) => {
      if (q && !member.name.toLowerCase().includes(q) && !member.email.toLowerCase().includes(q)) {
        return false;
      }
      if (roleFilter !== "all" && member.companyRole !== roleFilter) return false;
      if (projectFilter === "none") {
        if (member.companyRole === "COMPANY_ADMIN") return false;
        return member.projectMemberships.length === 0;
      }
      if (projectFilter !== "all") {
        if (member.companyRole === "COMPANY_ADMIN") return true;
        return member.projectMemberships.some((m) => m.projectId === projectFilter);
      }
      return true;
    });

    rows.sort((a, b) => {
      if (sort === "role") {
        if (a.companyRole !== b.companyRole) {
          return a.companyRole === "COMPANY_ADMIN" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }
      if (sort === "added") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [members, query, roleFilter, projectFilter, sort]);

  const filtersActive = query.trim() !== "" || roleFilter !== "all" || projectFilter !== "all";

  function clearFilters() {
    setQuery("");
    setRoleFilter("all");
    setProjectFilter("all");
    setSort("name");
  }

  function rowInner(member: DirectoryMember) {
    return (
      <>
        <div>
          <p className="text-sm font-medium">{member.name}</p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{member.email}</p>
        </div>
        <AccessSummaryTag member={member} />
      </>
    );
  }

  return (
    <div>
      {projects.length === 0 ? (
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          This company has no projects yet. New members can only be invited as Company Admin until one exists.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email"
          className="wf-input min-w-[12rem] flex-1"
        />
        <select
          className="wf-input wf-select"
          aria-label="Role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
        >
          <option value="all">All roles</option>
          <option value="COMPANY_ADMIN">Company Admin</option>
          <option value="MEMBER">Member</option>
        </select>
        <select
          className="wf-input wf-select"
          aria-label="Project"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
          <option value="none">No project access</option>
        </select>
        <select
          className="wf-input wf-select"
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="name">Name</option>
          <option value="role">Role</option>
          <option value="added">Date added</option>
        </select>
      </div>

      <div className="wf-list">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2">
          <span className="wf-tag">Name</span>
          <span className="wf-tag">Access</span>
        </div>

        {members.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">No members yet</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              You&apos;re the only one here. Invite your team to get them into projects.
            </p>
            {onInvite ? (
              <button type="button" className="wf-btn-solid mt-4" onClick={onInvite}>
                Invite member
              </button>
            ) : null}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No matches</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">No members match your search and filters.</p>
            {filtersActive ? (
              <button type="button" className="wf-btn mt-3" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          filtered.map((member) => {
            const className = "wf-row flex items-center justify-between py-3.5";
            if (rowHref) {
              return (
                <Link key={member.id} to={rowHref(member.id)} className={`${className} hover:bg-[var(--surface-sunken)]`}>
                  {rowInner(member)}
                </Link>
              );
            }
            return (
              <div key={member.id} className={className}>
                {rowInner(member)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
