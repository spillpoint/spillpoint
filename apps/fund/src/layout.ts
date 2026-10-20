// How wide the page and a card are, for the tables that change shape on a narrow screen: the split (f01m2, f01n) and the
// LPs' card (f02c).

import { useEffect, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

/** Under 480 pixels the split is always two tables, one above the other (f01m review, answer 2); above, where it must. */
const NARROW = "(max-width: 479px)";

/** Whether the window is a phone's width, following it as it changes. False where there's no window to ask. */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(NARROW).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(NARROW);
    const follow = () => setNarrow(query.matches);
    follow();
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, []);
  return narrow;
}

/**
 * Whether the one table would scroll sideways in its card (f01n): measured on the card's own width, as the cash flows'
 * cards are, so it's two tables wherever one wouldn't fit, at any window width, and one wherever it does. Where
 * nothing is laid out (a hidden tab, or the tests), it keeps what it has.
 */
export function useTooWide(box: RefObject<HTMLDivElement | null>, table: RefObject<HTMLTableElement | null>, content: unknown): boolean {
  const [tooWide, setTooWide] = useState(false);
  useLayoutEffect(() => {
    const check = () => {
      const room = box.current?.clientWidth ?? 0;
      if (!room || !table.current) return;
      // The table is 100% wide, so it's wider than its card only when its content can't fit in it.
      setTooWide(table.current.offsetWidth > room);
    };
    check();
    if (!box.current || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(check);
    watch.observe(box.current);
    return () => watch.disconnect();
  }, [box, table, content]);
  return tooWide;
}
