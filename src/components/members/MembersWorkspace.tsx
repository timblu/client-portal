import { useState } from "react";
import { Link } from "react-router-dom";
import { InviteMemberPanel } from "@/components/members/InviteMemberPanel";
import { MembersDirectory } from "@/components/members/MembersDirectory";
import type { DirectoryMember, DirectoryProject } from "@/components/members/types";

export function MembersWorkspace({
  companyId,
  members,
  projects,
  headingHref,
  rowHref,
}: {
  companyId: string;
  members: DirectoryMember[];
  projects: DirectoryProject[];
  headingHref?: { href: string; label: string };
  rowHref?: (memberId: string) => string;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <div className="mb-8">
        {headingHref ? (
          <Link to={headingHref.href} className="wf-back">
            {headingHref.label}
          </Link>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[1.75rem] font-semibold tracking-tight">Members</h1>
          <button type="button" className="wf-btn-solid" onClick={() => setInviteOpen(true)}>
            Invite member
          </button>
        </div>
      </div>

      {inviteOpen ? (
        <InviteMemberPanel companyId={companyId} projects={projects} onClose={() => setInviteOpen(false)} />
      ) : null}

      <MembersDirectory
        members={members}
        projects={projects}
        onInvite={() => setInviteOpen(true)}
        rowHref={rowHref}
      />
    </>
  );
}
