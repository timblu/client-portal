// Shared shapes for the deliverable review surface (staff DeliverableViewer and the
// client ClientDeliverableViewer). Mirrors the payload built by
// `serializeDeliverableView` in src/server/queries.ts.

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string; role: string };
};

export type Thread = {
  id: string;
  xPct: number | null;
  yPct: number | null;
  screen: string | null;
  screenshotId: string | null;
  resolved: boolean;
  pinnedToTop: boolean;
  comments: Comment[];
};

export type Screenshot = {
  id: string;
  sourceUrl: string;
  pageLabel: string | null;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
};

export type VersionSummary = { id: string; versionNumber: number; decisionState: string };

export type ActiveVersion = {
  id: string;
  versionNumber: number;
  kind: "STATIC_IMAGE" | "STATIC_PDF" | "MARKDOWN" | "PROTOTYPE_URL";
  fileUrl: string | null;
  content: string | null;
  prototypeUrl: string | null;
  decisionState: string;
  decisionComment: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  threads: Thread[];
  screenshots: Screenshot[];
};

export type CurrentUser = { id: string; name: string; role: "STAFF" | "CLIENT"; canDecide: boolean };

export type SiblingVersion = { id: string; versionNumber: number; decisionState: string };

export type SiblingDeliverable = {
  id: string;
  title: string;
  type: "DESIGN" | "DOC";
  versions: SiblingVersion[];
};

export type CompanySummary = { name: string; logoUrl: string | null };
