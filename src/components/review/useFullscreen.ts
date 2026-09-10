import { useCallback, useEffect, useState } from "react";

/**
 * Wraps the browser Fullscreen API for a single element (the prototype canvas
 * well) so the "Maximize" dock control produces true fullscreen rather than an
 * expanded panel.
 */
export function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === ref.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [ref]);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void ref.current?.requestFullscreen();
  }, [ref]);

  return { isFullscreen, toggle };
}
