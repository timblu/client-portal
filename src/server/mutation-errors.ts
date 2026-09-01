/**
 * M7 – Typed HTTP status codes for mutation errors.
 *
 * Prefer `code` (typed) over English substring matching.
 * Legacy substring matching is kept as a fallback for unmigrated callers.
 */

export type MutationErrorCode = "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST";

export function mutationErrorStatus(error: string, code?: MutationErrorCode): number {
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND") return 404;
  if (code === "BAD_REQUEST") return 400;
  // Legacy substring matching – retained for backward compatibility.
  const lower = error.toLowerCase();
  if (
    lower.includes("only staff") ||
    lower.includes("only an approver") ||
    lower.includes("cannot manage members") ||
    lower.includes("cannot access this project") ||
    lower.includes("forbidden") ||
    lower.includes("only company admin")
  ) {
    return 403;
  }
  return 400;
}
