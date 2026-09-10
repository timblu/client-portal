import type { Screenshot } from "@/components/review/types";

export function ScreenshotSurface({
  screenshot,
  captureStatus,
  captureError,
  onRefreshPreview,
}: {
  screenshot: Screenshot | null;
  captureStatus: "idle" | "capturing" | "error";
  captureError: string | null;
  onRefreshPreview: () => void;
}) {
  if (captureStatus === "capturing" || (!screenshot && captureStatus !== "error")) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center text-sm text-[var(--text-secondary)]">
        Capturing a preview of this page…
      </div>
    );
  }

  if (captureStatus === "error" || !screenshot) {
    return (
      <div className="flex h-[600px] w-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-[var(--text-secondary)]">
        <p>{captureError ?? "Unable to capture that page."}</p>
        <button
          type="button"
          className="wf-btn text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onRefreshPreview();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <img
      src={screenshot.imageUrl}
      alt="Captured prototype preview"
      className="block w-full select-none"
      draggable={false}
    />
  );
}
