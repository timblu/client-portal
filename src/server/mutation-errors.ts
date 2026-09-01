export function mutationErrorStatus(error: string): number {
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
