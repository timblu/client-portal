// Prototype page identity for comment anchoring.
//
// Primary: the iframe's current URL (pathname + search + hash). Same-origin prototypes
// (including multi-page sites we host, or any same-origin URL) are observed directly —
// no custom bridge required.
//
// Optional fallback: cooperating cross-origin prototypes may postMessage
//   { type: "cp:screen", screen: "<pathname+search+hash or absolute URL>" }
// and accept
//   { type: "cp:navigate", screen: "<same>" }
// because the parent cannot read a cross-origin iframe location.

export type ScreenMessage = { type: "cp:screen"; screen: string };
export type NavigateMessage = { type: "cp:navigate"; screen: string };

const MAX_SCREEN_LEN = 500;

export function normalizeScreenKey(value: string): string {
  return value.trim().slice(0, MAX_SCREEN_LEN);
}

/** Stable page key from a URL string (absolute or path-relative).
 * Same-origin → pathname+search+hash. Cross-origin → origin+pathname+search+hash. */
export function locationKeyFromHref(
  href: string,
  base = typeof window !== "undefined" ? window.location.href : "http://localhost"
): string {
  try {
    const url = new URL(href, base);
    const baseUrl = new URL(base);
    if (url.origin === baseUrl.origin) {
      return normalizeScreenKey(`${url.pathname}${url.search}${url.hash}`);
    }
    return normalizeScreenKey(`${url.origin}${url.pathname}${url.search}${url.hash}`);
  } catch {
    return normalizeScreenKey(href);
  }
}

/** Short label for sidebar tags — last path segment, host for site root, else raw key. */
export function screenLabel(screen: string): string {
  try {
    const url = new URL(screen, "http://local.invalid");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
    if (url.host && url.host !== "local.invalid") return url.host;
  } catch {
    /* fall through */
  }
  return screen;
}

/** True when the prototype URL is an absolute http(s) URL on another origin. */
export function isCrossOriginPrototypeUrl(
  prototypeUrl: string | null | undefined,
  pageOrigin = typeof window !== "undefined" ? window.location.origin : ""
): boolean {
  if (!prototypeUrl) return false;
  try {
    const url = new URL(prototypeUrl, pageOrigin || "http://localhost");
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (!pageOrigin) return url.protocol === "http:" || url.protocol === "https:";
    return url.origin !== pageOrigin;
  } catch {
    return false;
  }
}

/** Read the iframe's current page key when same-origin; null if cross-origin / inaccessible. */
export function readIframeLocationKey(iframe: HTMLIFrameElement): string | null {
  try {
    const loc = iframe.contentWindow?.location;
    if (!loc?.href) return null;
    return locationKeyFromHref(loc.href);
  } catch {
    return null;
  }
}

/**
 * Navigate the iframe to a stored screen key.
 * - Absolute paths (`/…`) and http(s) URLs: assign location / src directly.
 * - Always also postMessage navigate for cooperating cross-origin prototypes.
 */
export function navigateIframeToScreen(
  iframe: HTMLIFrameElement,
  screen: string,
  prototypeUrl: string | null
) {
  const target = normalizeScreenKey(screen);
  if (!target) return;

  const win = iframe.contentWindow;
  if (win) {
    postNavigateMessage(win, target);
  }

  try {
    if (win) {
      // Same-origin path navigation without full reload when possible.
      if (target.startsWith("http://") || target.startsWith("https://")) {
        win.location.href = target;
        return;
      }
      if (target.startsWith("/")) {
        win.location.href = target;
        return;
      }
      // Relative / legacy short id — resolve against the prototype entry URL.
      const base = prototypeUrl || iframe.src || window.location.href;
      const resolved = new URL(target, new URL(base, window.location.href));
      win.location.href = `${resolved.pathname}${resolved.search}${resolved.hash}`;
      return;
    }
  } catch {
    // Cross-origin: postMessage already sent; try setting src as last resort.
  }

  try {
    if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("/")) {
      iframe.src = target;
    } else if (prototypeUrl) {
      iframe.src = new URL(target, new URL(prototypeUrl, window.location.href)).href;
    }
  } catch {
    /* ignore */
  }
}

export function postScreenMessage(target: Window, screen: string) {
  target.postMessage({ type: "cp:screen", screen: normalizeScreenKey(screen) } satisfies ScreenMessage, "*");
}

export function postNavigateMessage(target: Window, screen: string) {
  target.postMessage({ type: "cp:navigate", screen: normalizeScreenKey(screen) } satisfies NavigateMessage, "*");
}

export function readScreenMessage(data: unknown): string | null {
  if (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "cp:screen" &&
    typeof (data as { screen?: unknown }).screen === "string"
  ) {
    return normalizeScreenKey((data as ScreenMessage).screen);
  }
  return null;
}

export function readNavigateMessage(data: unknown): string | null {
  if (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "cp:navigate" &&
    typeof (data as { screen?: unknown }).screen === "string"
  ) {
    return normalizeScreenKey((data as NavigateMessage).screen);
  }
  return null;
}
