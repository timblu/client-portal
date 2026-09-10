import type { ActiveVersion } from "@/components/review/types";

export function ArtifactSurface({
  version,
  interactMode,
  iframeRef,
  fill = false,
}: {
  version: ActiveVersion;
  interactMode: boolean;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  /** Fill the parent's height instead of the staff viewer's fixed 1000px well. */
  fill?: boolean;
}) {
  if (version.kind === "STATIC_IMAGE") {
    return (
      <img
        src={version.fileUrl ?? ""}
        alt="Design version"
        className="block w-full select-none"
        draggable={false}
      />
    );
  }

  if (version.kind === "STATIC_PDF") {
    return (
      <object data={version.fileUrl ?? ""} type="application/pdf" className="h-[720px] w-full">
        <p className="p-6 text-sm text-[var(--text-secondary)]">
          PDF preview unavailable — {version.fileUrl}
        </p>
      </object>
    );
  }

  if (version.kind === "MARKDOWN") {
    return (
      <div className="min-h-[500px] whitespace-pre-wrap p-8 font-mono text-sm leading-relaxed">
        {version.content}
      </div>
    );
  }

  return (
    <div className={fill ? "relative h-full w-full" : "relative h-[1000px] w-full"}>
      <iframe
        ref={iframeRef}
        src={version.prototypeUrl ?? ""}
        className="h-full w-full border-0"
        title="Hosted prototype"
      />
      {!interactMode ? <div className="absolute inset-0" aria-hidden /> : null}
    </div>
  );
}
