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

/**
 * Whether a form's table must be cards, one a row (f03d): wherever the table, laid out as one, would be wider than its
 * card, measured on the card's own width as the split is. What the LPs tab's tables need changes with what's in them (the
 * Class column comes with the first class, a class's carry in steps is wider than the fund's, a long class name widens
 * the picker), so no one width would do. To measure, the table is laid out as one for a moment, without `cards`, and set
 * back before anything is drawn. Where nothing is laid out (a hidden tab, or the tests), it keeps what it has.
 */
export function useCards(box: RefObject<HTMLDivElement | null>, table: RefObject<HTMLTableElement | null>, cards: string, content: unknown): boolean {
  const [asCards, setAsCards] = useState(false);
  useLayoutEffect(() => {
    const check = () => {
      const room = box.current?.clientWidth ?? 0;
      const t = table.current;
      if (!room || !t) return;
      const was = t.classList.contains(cards);
      t.classList.remove(cards);
      // The table is 100% wide, so it's wider than its card only when its content can't fit in it.
      const needs = t.offsetWidth;
      if (was) t.classList.add(cards);
      setAsCards(needs > room);
    };
    check();
    if (!box.current || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(check);
    watch.observe(box.current);
    return () => watch.disconnect();
  }, [box, table, cards, content]);
  return asCards;
}
