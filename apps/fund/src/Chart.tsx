// The three lines against X: the LPs, the GP's carry and the GP commitment's line, each straight between breakpoints and
// drawn exactly from the engine's split at them (analysis.ts). Every breakpoint is a numbered mark, numbered as in the
// list below; the NAV point and the chosen X are marked too.
//
// The main page's look (notes/design-m3.md): the GP's carry, the line the page is about, in blue and thicker; the LPs
// in grey ink; the GP commitment's line dashed. Never colour alone: the legend names each line beside a swatch of its
// stroke and gives its value at X, so no one matches colours. Numbers become floats only here, for drawing.

import { useEffect, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { D } from "spillpoint-fund";

import type { BreakpointView, ChartPoint } from "./analysis.ts";
import { cents, short } from "./format.ts";

type Decimal = D;

const GP = "#2a78d6";
const LPS = "#5b6370";
const COMMITMENT = "#8a919c";
const INK_MUTED = "#5b6370";
const LINE_HAIR = "#e3e6ea";
const ACCENT = "#1d3557";

const HEIGHT = 340;
const Y_AXIS_WIDTH = 64;
const X_AXIS_HEIGHT = 30;
const MARGIN_SIDE = 16;
/** Room above the plot for a row of breakpoint numbers; numbers closer than this step up a row, up to four. */
const BADGE_ROW = 22;
const MAX_BADGE_ROWS = 4;

interface Series {
  key: "lps" | "gp" | "gpCommitment";
  name: string;
  colour: string;
  width: number;
  dash?: string;
}

function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // Never wider than its card, down to the narrowest phones.
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry!.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** A tidy axis: a top at or above max, and a step that divides it into about five. */
function niceScale(max: number): { top: number; step: number } {
  if (!(max > 0)) return { top: 1, step: 0.25 };
  const rough = max / 5;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough)!;
  return { top: Math.ceil(max / step) * step, step };
}

interface Props {
  points: readonly ChartPoint[];
  breakpoints: readonly BreakpointView[];
  nav: Decimal | null;
  x: Decimal;
  top: Decimal;
  /** X's split at the chosen X, for the legend's values. */
  at: { lps: Decimal; gp: Decimal; gpCommitment: Decimal };
  hasCommitment: boolean;
}

export function Chart({ points, breakpoints, nav, x, top, at, hasCommitment }: Props) {
  const [ref, width] = useWidth(960);
  const series: Series[] = [
    { key: "gp", name: "The GP's carry", colour: GP, width: 2.5 },
    { key: "lps", name: "The LPs", colour: LPS, width: 1.75 },
    ...(hasCommitment ? [{ key: "gpCommitment" as const, name: "The GP commitment", colour: COMMITMENT, width: 1.5, dash: "5 4" }] : []),
  ];
  const rows = points.map((p) => ({ x: p.x.toNumber(), lps: p.lps.toNumber(), gp: p.gp.toNumber(), gpCommitment: p.gpCommitment.toNumber() }));
  const to = top.toNumber();
  const scale = niceScale(Math.max(0, ...rows.map((r) => Math.max(r.lps, r.gp, r.gpCommitment))));
  const yTicks = Array.from({ length: Math.round(scale.top / scale.step) + 1 }, (_, i) => i * scale.step);
  const xScale = niceScale(to);
  const xTicks: number[] = [];
  for (let t = 0; t <= to + 1e-9; t += xScale.step) xTicks.push(t);

  // Breakpoint numbers closer than one badge apart step up a row, so none overlap; past four rows a number is left off.
  const plotLeft = MARGIN_SIDE + Y_AXIS_WIDTH;
  const plotRight = width - MARGIN_SIDE;
  const xPx = (v: number) => plotLeft + (v / to) * (plotRight - plotLeft);
  const inView = breakpoints.filter((b) => b.x.gt(0) && b.x.lt(top));
  const rowOf = new Map<number, number | null>();
  const lastInRow: number[] = [];
  for (const b of inView) {
    const px = xPx(b.x.toNumber());
    let row = 0;
    while (lastInRow[row] !== undefined && px - lastInRow[row]! < BADGE_ROW) row++;
    rowOf.set(b.n, row < MAX_BADGE_ROWS ? row : null);
    if (row < MAX_BADGE_ROWS) lastInRow[row] = px;
  }
  const rowsUsed = Math.max(1, ...[...rowOf.values()].map((r) => (r === null ? 1 : r + 1)));
  const hidden = [...rowOf.values()].filter((r) => r === null).length;
  const margin = { top: 8 + rowsUsed * BADGE_ROW, right: MARGIN_SIDE, bottom: 4, left: MARGIN_SIDE };

  const beyond = breakpoints.length - inView.length;
  return (
    <section className="card" aria-labelledby="chart-heading">
      <h2 id="chart-heading">Who gets what as X grows</h2>
      <p className="card__intro">
        Each line is what one side gets from this distribution at every X, from $0 to {short(top)}. Numbered marks are breakpoints, listed below
        {nav && nav.lte(top) ? "; NAV marks the fund's net asset value on D" : ""}.
      </p>
      <div
        ref={ref}
        className="chart"
        role="img"
        aria-label={`The LPs', the GP's carry${hasCommitment ? " and the GP commitment's" : ""} lines against X, from $0 to ${short(top)}, with ${inView.length} breakpoint${inView.length === 1 ? "" : "s"} marked.`}
      >
        {/* One image to assistive technology: its values are in the legend below, and the slider moves X. */}
        <LineChart width={width} height={HEIGHT} data={rows} margin={margin} accessibilityLayer={false}>
          <CartesianGrid stroke={LINE_HAIR} vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, to]}
            allowDataOverflow
            ticks={xTicks}
            tickFormatter={(v: number) => short(new D(v))}
            height={X_AXIS_HEIGHT}
            stroke={INK_MUTED}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
          />
          <YAxis
            type="number"
            domain={[0, scale.top]}
            ticks={yTicks}
            tickFormatter={(v: number) => short(new D(v))}
            width={Y_AXIS_WIDTH}
            stroke={INK_MUTED}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
          />
          {inView.map((b) => (
            <ReferenceLine key={`bp${b.n}`} x={b.x.toNumber()} stroke={LINE_HAIR} label={<Badge n={b.n} row={rowOf.get(b.n) ?? null} />} />
          ))}
          {nav && nav.lte(top) && <ReferenceLine x={nav.toNumber()} stroke={INK_MUTED} strokeDasharray="2 3" label={<MarkLabel text="NAV" colour={INK_MUTED} at="top" left={nav.gt(top.times("0.85"))} />} />}
          {series.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stroke={s.colour}
              strokeWidth={s.width}
              {...(s.dash ? { strokeDasharray: s.dash } : {})}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          ))}
          {x.lte(top) && <ReferenceLine x={x.toNumber()} stroke={ACCENT} strokeWidth={1.5} label={<MarkLabel text={`X = ${short(x)}`} colour={ACCENT} at="bottom" left={x.gt(top.times("0.85"))} />} />}
        </LineChart>
      </div>
      {(hidden > 0 || beyond > 0) && (
        <p className="chart__hint">
          {hidden > 0 && `Where marks crowd together, ${hidden === 1 ? "one number is" : `${hidden} numbers are`} left off. `}
          {beyond > 0 && `${beyond === 1 ? "One breakpoint is" : `${beyond} breakpoints are`} past ${short(top)}; raise the range's top to see ${beyond === 1 ? "it" : "them"}.`}
        </p>
      )}
      <ul className="legend" aria-label={`Values at X = ${cents(x)}`}>
        {series.map((s) => (
          <li key={s.key}>
            <svg width="24" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="24" y2="4" stroke={s.colour} strokeWidth={s.width + 0.5} strokeDasharray={s.dash} />
            </svg>
            <span className="legend__name">{s.name}</span>
            <span className="legend__value">{cents(at[s.key])}</span>
          </li>
        ))}
      </ul>
      <p className="chart__hint">Values at X = {cents(x)}, from this distribution.</p>
    </section>
  );
}

/** A breakpoint's number at the top of its line. No row: left off, its line stays. */
function Badge({ n, row, viewBox }: { n: number; row: number | null; viewBox?: { x: number; y: number } }) {
  if (!viewBox || row === null) return null;
  return (
    <g transform={`translate(${viewBox.x}, ${viewBox.y - 14 - row * BADGE_ROW})`}>
      <circle r="9" fill="#ffffff" stroke={INK_MUTED} strokeWidth="1" />
      <text textAnchor="middle" dy="4" fontSize="11" fontWeight="600" fill={INK_MUTED}>
        {n}
      </text>
    </g>
  );
}

/**
 * A mark's name beside its line: NAV at the top of the plot, X at the bottom, so the two never sit on each other. Near
 * the right edge it goes on the left of its line, so it isn't cut off.
 */
function MarkLabel({ text, colour, at, left, viewBox }: { text: string; colour: string; at: "top" | "bottom"; left: boolean; viewBox?: { x: number; y: number; height: number } }) {
  if (!viewBox) return null;
  return (
    <text
      x={left ? viewBox.x - 4 : viewBox.x + 4}
      textAnchor={left ? "end" : "start"}
      y={at === "top" ? viewBox.y + 14 : viewBox.y + viewBox.height - 6}
      fontSize="12"
      fontWeight="600"
      fill={colour}
    >
      {text}
    </text>
  );
}
