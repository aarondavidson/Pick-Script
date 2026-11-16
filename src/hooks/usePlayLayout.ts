import { createContext, useContext, useEffect, useState } from "react";

/**
 * How the play screen is arranged.
 *
 * - `desktop`         — toolbar header, scene, panels below
 * - `phone-portrait`  — slim header, full-width scene, compact action rows
 * - `phone-landscape` — scene fills the screen height, controls in a side rail
 * - `preview`         — Studio live preview frame (never viewport-driven)
 */
export type PlayLayout =
  | "desktop"
  | "phone-portrait"
  | "phone-landscape"
  | "preview";

/** A short, wide viewport: a phone held sideways (any width). */
export const PHONE_LANDSCAPE_QUERY =
  "(orientation: landscape) and (max-height: 540px)";
export const PHONE_PORTRAIT_QUERY = "(max-width: 767px)";

export function resolvePlayLayout(
  landscapePhone: boolean,
  narrow: boolean
): Exclude<PlayLayout, "preview"> {
  if (landscapePhone) return "phone-landscape";
  if (narrow) return "phone-portrait";
  return "desktop";
}

export function isPhoneLayout(layout: PlayLayout): boolean {
  return layout === "phone-portrait" || layout === "phone-landscape";
}

function readLayout(): Exclude<PlayLayout, "preview"> {
  if (typeof window === "undefined" || !window.matchMedia) return "desktop";
  return resolvePlayLayout(
    window.matchMedia(PHONE_LANDSCAPE_QUERY).matches,
    window.matchMedia(PHONE_PORTRAIT_QUERY).matches
  );
}

/** Viewport-driven layout; re-evaluates on rotate / resize. */
export function useViewportPlayLayout(): Exclude<PlayLayout, "preview"> {
  const [layout, setLayout] = useState(readLayout);

  useEffect(() => {
    if (!window.matchMedia) return;
    const queries = [PHONE_LANDSCAPE_QUERY, PHONE_PORTRAIT_QUERY].map((q) =>
      window.matchMedia(q)
    );
    const update = () => setLayout(readLayout());
    for (const q of queries) q.addEventListener("change", update);
    update();
    return () => {
      for (const q of queries) q.removeEventListener("change", update);
    };
  }, []);

  return layout;
}

const PlayLayoutContext = createContext<PlayLayout>("desktop");

export const PlayLayoutProvider = PlayLayoutContext.Provider;

/** Layout chosen by the nearest play surface. */
export function usePlayLayout(): PlayLayout {
  return useContext(PlayLayoutContext);
}
