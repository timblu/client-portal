/** Returns a same-origin relative path safe for post-auth redirects, or null. */
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  if (path.includes("://")) return null;
  if (path.includes("\\")) return null;
  return path;
}
