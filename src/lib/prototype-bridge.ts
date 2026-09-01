// Minimal postMessage protocol between a hosted prototype iframe (e.g. PrototypePage)
// and DeliverableViewer, so comments can be scoped to the prototype's active screen.
//
// - "cp:screen" (iframe -> parent): sent on mount and whenever the prototype's screen changes.
// - "cp:navigate" (parent -> iframe): sent when the viewer wants the prototype to switch screens,
//   e.g. because the user selected a comment thread anchored to a different screen.

export type ScreenMessage = { type: "cp:screen"; screen: string };
export type NavigateMessage = { type: "cp:navigate"; screen: string };

export function postScreenMessage(target: Window, screen: string) {
  target.postMessage({ type: "cp:screen", screen } satisfies ScreenMessage, "*");
}

export function postNavigateMessage(target: Window, screen: string) {
  target.postMessage({ type: "cp:navigate", screen } satisfies NavigateMessage, "*");
}

export function readScreenMessage(data: unknown): string | null {
  if (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "cp:screen" &&
    typeof (data as { screen?: unknown }).screen === "string"
  ) {
    return (data as ScreenMessage).screen;
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
    return (data as NavigateMessage).screen;
  }
  return null;
}
