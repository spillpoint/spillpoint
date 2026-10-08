// The payoff curves, by holder or by class, with every breakpoint marked.
//
// Design (notes/design-m3.md, and the dataviz method): with nine holders the
// honest form is emphasis, not nine colours. Your curve is blue, the rest
// grey; hovering or focusing a row of the legend lifts that series in orange
// (a validated pair). Emphasised lines are labelled directly at the right
// edge, and the legend below lists every series with its value at the current
// exit value, so no one has to match colours. The axes are linear, so the
// straight lines between breakpoints stay straight (M3 plan, answer 3); drag
// across the chart, or type a range, to zoom in.

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { D } from "spillpoint";
import type { PreparedCapTable } from "spillpoint";

import type { CurvePoint } from "./analysis.ts";
import { outstandingNames } from "./capTable.ts";
import { chartRows, niceScale, seriesNodes, valueAt } from "./curves.ts";
import type { Node, SeriesKind } from "./curves.ts";
import { dollars, parseDollars, shortDollars } from "./format.ts";

type Decimal = D;

/** Series colours: a validated pair for emphasis, and a quiet grey for context. Text never wears them. */
const YOU = "#2a78d6";
const LIFTED = "#eb6834";
const CONTEXT = "#b9bec7";
const INK_MUTED = "#5b6370";
const LINE_HAIR = "#e3e6ea";

const HEIGHT = 380;
const MARGIN_RIGHT = 150;
const MARGIN_LEFT = 8;
const MARGIN_BOTTOM = 4;
/** Room above the plot for one row of breakpoint numbers; crowded numbers step up into more rows, up to four. */
const BADGE_ROW = 22;
const MAX_BADGE_ROWS = 4;
/** Below this width the direct labels move inside the plot, so the curves keep the room. */
const NARROW = 600;
const Y_AXIS_WIDTH = 64;
const X_AXIS_HEIGHT = 30;

interface Series {
  /** Recharts reads dataKeys as paths, so ids like "options_0.05" get plain keys. */
  key: string;
  id: string;
  name: string;
  nodes: Node[];
  you: boolean;
}

interface Props {
  pc: PreparedCapTable;
  curve: readonly CurvePoint[];
  breakpoints: readonly Decimal[];
  /** Which breakpoints change your payout, by index. */
  yours: readonly boolean[];
  range: readonly [Decimal, Decimal];
  exitValue: Decimal;
  onExitValue: (value: Decimal) => void;
  you: string;
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

export function PayoffChart({ pc, curve, breakpoints, yours, range, exitValue, onExitValue, you }: Props) {
  const [kind, setKind] = useState<SeriesKind>("holder");
  const [lifted, setLifted] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [domain, setDomain] = useState<[number, number]>([range[0].toNumber(), range[1].toNumber()]);
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);
  // The drag in progress, read by the pointer handlers directly so they never see a stale copy.
  const dragRef = useRef<{ start: number; end: number } | null>(null);
  const [containerRef, width] = useWidth(960);

  const { capTable } = pc;
  const series: Series[] = useMemo(() => {
    const yourClasses = new Set(capTable.positions.filter((p) => p.holder === you).map((p) => p.security));
    // Each SAFE and note still outstanding is a class of its own (C8, C9).
    for (const x of [...(capTable.unconvertedSafes ?? []), ...(capTable.unconvertedNotes ?? [])]) if (x.holder === you) yourClasses.add(x.id);
    const list =
      kind === "holder"
        ? capTable.holders.map((h) => ({ id: h.id, name: h.name, you: h.id === you }))
        : [
            ...capTable.securities.map((s) => ({ id: s.id, name: s.name, you: yourClasses.has(s.id) })),
            ...[...outstandingNames(pc)].map(([id, name]) => ({ id, name, you: yourClasses.has(id) })),
          ];
    return list
      .filter((s) => (kind === "holder" ? curve[0]?.holders[s.id] : curve[0]?.classes[s.id]) !== undefined)
      .map((s, i) => ({ ...s, key: `s${i}`, nodes: seriesNodes(curve, kind, s.id) }));
  }, [kind, curve, capTable, pc, you]);

  const [from, to] = domain;
  const rows = useMemo(() => chartRows(new Map(series.map((s) => [s.key, s.nodes])), from, to), [series, from, to]);
  const maxValue = Math.max(0, ...rows.flatMap((r) => series.map((s) => r[s.key] ?? 0)));
  const scale = niceScale(maxValue);
  const yTicks = Array.from({ length: Math.round(scale.top / scale.step) + 1 }, (_, i) => i * scale.step);
  const xScale = niceScale(to - from);
  const xTicks: number[] = [];
  for (let t = Math.ceil(from / xScale.step) * xScale.step; t <= to + 1e-9; t += xScale.step) xTicks.push(t);

  const isLifted = (s: Series) => s.key === lifted;
  const colour = (s: Series) => (isLifted(s) ? LIFTED : s.you ? YOU : CONTEXT);
  const drawOrder = [...series].sort((a, b) => Number(a.you || isLifted(a)) - Number(b.you || isLifted(b)));

  // Plot geometry, for the direct labels and breakpoint numbers drawn over the chart.
  const narrow = width < NARROW;
  // Room for half the last axis label ("$300M"), which centres on the plot's right edge.
  const marginRight = narrow ? 26 : MARGIN_RIGHT;
  const plotLeft = MARGIN_LEFT + Y_AXIS_WIDTH;
  const plotRight = width - marginRight;
  const xPx = (x: number) => plotLeft + ((x - from) / (to - from)) * (plotRight - plotLeft);
  // Breakpoint numbers closer than one badge apart step up into another row, so none overlap. Past
  // four rows a number is left off (its line stays), and the chart says to zoom in to see it.
  const inView = (b: Decimal) => b.toNumber() > from && b.toNumber() < to;
  const badgeRow: (number | null)[] = [];
  const lastInRow: number[] = [];
  breakpoints.forEach((b, i) => {
    if (!inView(b)) return;
    const px = xPx(b.toNumber());
    let row = 0;
    while (lastInRow[row] !== undefined && px - lastInRow[row]! < BADGE_ROW) row++;
    badgeRow[i] = row < MAX_BADGE_ROWS ? row : null;
    if (row < MAX_BADGE_ROWS) lastInRow[row] = px;
  });
  const hiddenNumbers = breakpoints.filter((b, i) => inView(b) && badgeRow[i] === null).length;
  // badgeRow has gaps for breakpoints out of view: count only those in it (spreading a gap gives undefined, and NaN).
  const rowsUsed = Math.max(1, ...badgeRow.filter((r) => r !== undefined).map((r) => (r === null ? 1 : r + 1)));
  const MARGIN = { top: 8 + rowsUsed * BADGE_ROW, right: marginRight, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT };
  const plotTop = MARGIN.top;
  const plotBottom = HEIGHT - MARGIN.bottom - X_AXIS_HEIGHT;
  const yPx = (v: number) => plotTop + (1 - v / scale.top) * (plotBottom - plotTop);
  // A long name wraps onto a second line rather than running off the card; its height is estimated
  // from its length, so labels can be spaced without measuring text. On a narrow screen the labels
  // sit inside the plot, just above the right end of their curves.
  const labelWidth = narrow ? Math.min(180, plotRight - plotLeft - 40) : width - plotRight - 16;
  const labelLines = (text: string) => Math.max(1, Math.ceil((text.length * 7) / (labelWidth - 22)));
  const endLabels = series
    .filter((s) => s.you || isLifted(s))
    .map((s) => {
      const text = s.name + (kind === "holder" && s.you ? " (you)" : "");
      return { s, text, y: yPx(valueAt(s.nodes, new D(to)).toNumber()), height: labelLines(text) * 16 };
    })
    .sort((a, b) => a.y - b.y);
  // When two end-labels would collide, the second steps down and a leader line ties it to its curve.
  const placed = endLabels.map((l) => ({ ...l, labelY: l.y }));
  for (let i = 1; i < placed.length; i++) {
    const prev = placed[i - 1]!;
    const gap = narrow ? placed[i]!.height + 2 : (prev.height + placed[i]!.height) / 2 + 4;
    placed[i]!.labelY = Math.max(placed[i]!.labelY, prev.labelY + gap);
  }

  const byExitValue = [...series].sort((a, b) => valueAt(b.nodes, exitValue).cmp(valueAt(a.nodes, exitValue)));
  const yourName = capTable.holders.find((h) => h.id === you)?.name ?? "";

  // Drag across the plot to zoom into that stretch; a click sets the exit value there.
  const xAtPointer = (clientX: number): number | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const t = (clientX - rect.left - plotLeft) / (plotRight - plotLeft);
    if (t < 0 || t > 1) return null;
    return from + t * (to - from);
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const x = xAtPointer(e.clientX);
    if (x === null || e.button !== 0) return;
    dragRef.current = { start: x, end: x };
    setDrag(dragRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - rect.left - plotLeft) / (plotRight - plotLeft)));
    dragRef.current = { ...dragRef.current, end: from + t * (to - from) };
    setDrag(dragRef.current);
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d) return;
    const [a, b] = [Math.min(d.start, d.end), Math.max(d.start, d.end)];
    const tidy = (v: number) => new D(v).toSignificantDigits(3, D.ROUND_HALF_UP);
    if (b - a > (to - from) / 100) setDomain([tidy(a).toNumber(), tidy(b).toNumber()]);
    else onExitValue(tidy(d.start));
  };

  const lift = (key: string | null) => {
    if (!pinned) setLifted(key);
  };
  const zoomLabel = from <= range[0].toNumber() && to >= range[1].toNumber() ? "the whole range" : `${shortDollars(new D(from))} to ${shortDollars(new D(to))}`;

  return (
    <section className="card" aria-labelledby="curves-heading">
      <div className="card__header">
        <h2 id="curves-heading">Payoff curves</h2>
        <div className="toggle" role="group" aria-label="Show curves">
          <button type="button" aria-pressed={kind === "holder"} onClick={() => (setKind("holder"), setLifted(null), setPinned(false))}>
            By holder
          </button>
          <button type="button" aria-pressed={kind === "class"} onClick={() => (setKind("class"), setLifted(null), setPinned(false))}>
            By class
          </button>
        </div>
      </div>
      <p className="card__intro">
        What each {kind === "holder" ? "holder" : "class"} gets at every exit value.{" "}
        {kind === "holder" ? `${yourName}'s curve is blue.` : "The classes you hold are blue."} Numbered marks are breakpoints, listed below.
      </p>

      <ZoomControls range={range} domain={domain} onDomain={setDomain} />

      <div
        ref={containerRef}
        className="chart"
        aria-label={`Payoff curves ${kind === "holder" ? "by holder" : "by class"}, showing ${zoomLabel}.`}
        role="img"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => ((dragRef.current = null), setDrag(null))}
      >
        {/* The chart is one image to assistive technology; its values are in the legend below, and the slider moves the
            exit value, so the library's own keyboard layer is off rather than a focus stop inside an image. */}
        <LineChart width={width} height={HEIGHT} data={rows} margin={MARGIN} accessibilityLayer={false}>
          <CartesianGrid stroke={LINE_HAIR} vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[from, to]}
            allowDataOverflow
            ticks={xTicks}
            tickFormatter={(v: number) => shortDollars(new D(v))}
            height={X_AXIS_HEIGHT}
            stroke={INK_MUTED}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
          />
          <YAxis
            type="number"
            domain={[0, scale.top]}
            ticks={yTicks}
            tickFormatter={(v: number) => shortDollars(new D(v))}
            width={Y_AXIS_WIDTH}
            stroke={INK_MUTED}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
          />
          {breakpoints.map((b, i) =>
            inView(b) ? (
              <ReferenceLine
                key={`bp${i}`}
                x={b.toNumber()}
                stroke={LINE_HAIR}
                label={<BreakpointBadge n={i + 1} yours={!!yours[i]} row={badgeRow[i] ?? null} />}
              />
            ) : null,
          )}
          {drawOrder.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stroke={colour(s)}
              strokeWidth={s.you || isLifted(s) ? 2.5 : 1.5}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
          {/* Where a payout jumps, a dashed connector joins the value below to the value above. */}
          {series.flatMap((s) =>
            s.nodes
              .filter((n) => !n.left.eq(n.right) && n.x.toNumber() > from && n.x.toNumber() < to)
              .map((n) => (
                <ReferenceLine
                  key={`${s.key}-jump-${n.x.toString()}`}
                  segment={[
                    { x: n.x.toNumber(), y: n.left.toNumber() },
                    { x: n.x.toNumber(), y: n.right.toNumber() },
                  ]}
                  stroke={colour(s)}
                  strokeDasharray="4 3"
                  strokeWidth={s.you || isLifted(s) ? 2 : 1.25}
                />
              )),
          )}
          {exitValue.toNumber() >= from && exitValue.toNumber() <= to && (
            <ReferenceLine x={exitValue.toNumber()} stroke="#1d3557" strokeWidth={1.5} label={<ExitValueLabel text={shortDollars(exitValue)} />} />
          )}
          {drag && Math.abs(drag.end - drag.start) > 0 && <ReferenceArea x1={drag.start} x2={drag.end} fill="#1d3557" fillOpacity={0.08} />}
          <Tooltip content={<Readout series={series} you={you} kind={kind} colour={colour} />} isAnimationActive={false} cursor={{ stroke: INK_MUTED, strokeWidth: 1 }} />
        </LineChart>
        <svg className="chart__leaders" width={width} height={HEIGHT} aria-hidden="true">
          {placed.map((l) =>
            !narrow && Math.abs(l.labelY - l.y) > 1 ? (
              <line key={l.s.key} x1={plotRight} y1={l.y} x2={plotRight + 10} y2={l.labelY} stroke={INK_MUTED} strokeWidth={1} />
            ) : null,
          )}
        </svg>
        {placed.map((l) => (
          <span
            key={l.s.key}
            className={`chart__end-label${narrow ? " chart__end-label--inside" : ""}`}
            style={narrow ? { right: width - plotRight + 2, top: l.labelY - 4, maxWidth: labelWidth } : { left: plotRight + 12, top: l.labelY, maxWidth: labelWidth }}
          >
            <svg width="16" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="16" y2="4" stroke={colour(l.s)} strokeWidth="2.5" />
            </svg>
            <span>{l.text}</span>
          </span>
        ))}
      </div>
      <p className="chart__hint">
        Drag across the chart to zoom in. Click it to set the exit value there.
        {hiddenNumbers > 0 && ` Where marks crowd together, ${hiddenNumbers === 1 ? "one number is" : `${hiddenNumbers} numbers are`} left off; zoom in to see them.`}
      </p>

      <ul className="legend" aria-label={`Values at ${shortDollars(exitValue)}`}>
        {byExitValue.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              aria-pressed={pinned && lifted === s.key}
              onMouseEnter={() => lift(s.key)}
              onMouseLeave={() => lift(null)}
              onFocus={() => lift(s.key)}
              onBlur={() => lift(null)}
              onClick={() => {
                const pin = !(pinned && lifted === s.key);
                setPinned(pin);
                setLifted(pin ? s.key : null);
              }}
            >
              <svg width="20" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="20" y2="4" stroke={colour(s)} strokeWidth={s.you || isLifted(s) ? 2.5 : 2} />
              </svg>
              <span className="legend__name">
                {s.name}
                {kind === "holder" && s.you ? " (you)" : ""}
              </span>
              <span className="legend__value">{dollars(valueAt(s.nodes, exitValue))}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="chart__hint">Values at {shortDollars(exitValue)}. Hover or focus a name to lift its curve; click to keep it lifted.</p>
    </section>
  );
}

/** A breakpoint's number at the top of its line: filled when it changes your payout. No row: left off. */
function BreakpointBadge({ n, yours, row, viewBox }: { n: number; yours: boolean; row: number | null; viewBox?: { x: number; y: number } }) {
  if (!viewBox || row === null) return null;
  return (
    <g transform={`translate(${viewBox.x}, ${viewBox.y - 14 - row * BADGE_ROW})`}>
      <circle r="9" fill={yours ? "#1d3557" : "#ffffff"} stroke={yours ? "#1d3557" : INK_MUTED} strokeWidth="1" />
      <text textAnchor="middle" dy="4" fontSize="11" fontWeight="600" fill={yours ? "#ffffff" : INK_MUTED}>
        {n}
      </text>
    </g>
  );
}

function ExitValueLabel({ text, viewBox }: { text: string; viewBox?: { x: number; y: number; height: number } }) {
  if (!viewBox) return null;
  return (
    <text x={viewBox.x + 4} y={viewBox.y + viewBox.height - 6} fontSize="12" fontWeight="600" fill="#1d3557">
      {text}
    </text>
  );
}

/** The hover readout: every series at that exit value, values first, largest first. */
function Readout({
  series,
  you,
  kind,
  colour,
  active,
  label,
}: {
  series: Series[];
  you: string;
  kind: SeriesKind;
  colour: (s: Series) => string;
  active?: boolean;
  label?: number | string;
}) {
  if (!active || label === undefined) return null;
  const x = new D(label);
  const rows = series.map((s) => ({ s, v: valueAt(s.nodes, x) })).sort((a, b) => b.v.cmp(a.v));
  return (
    <div className="readout">
      <div className="readout__title">At {dollars(x)}</div>
      {rows.map(({ s, v }) => (
        <div key={s.key} className="readout__row">
          <svg width="14" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="14" y2="4" stroke={colour(s)} strokeWidth="2.5" />
          </svg>
          <strong>{dollars(v)}</strong>
          <span>
            {s.name}
            {kind === "holder" && s.id === you ? " (you)" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Zoom by typing, for the keyboard: show from one exit value to another, or the whole range. */
function ZoomControls({ range, domain, onDomain }: { range: readonly [Decimal, Decimal]; domain: [number, number]; onDomain: (d: [number, number]) => void }) {
  const [fromText, setFromText] = useState(dollars(new D(domain[0])));
  const [toText, setToText] = useState(dollars(new D(domain[1])));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setFromText(dollars(new D(domain[0])));
    setToText(dollars(new D(domain[1])));
  }, [domain]);
  const apply = () => {
    const a = parseDollars(fromText);
    const b = parseDollars(toText);
    if (!a || !b || !a.lt(b) || a.lt(range[0]) || b.gt(range[1])) {
      setError(`Type two amounts between ${shortDollars(range[0])} and ${shortDollars(range[1])}, the first below the second.`);
      return;
    }
    setError(null);
    onDomain([a.toNumber(), b.toNumber()]);
  };
  const whole = domain[0] <= range[0].toNumber() && domain[1] >= range[1].toNumber();
  return (
    <div className="zoom">
      <label>
        Show from <input type="text" value={fromText} onChange={(e) => setFromText(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === "Enter" && apply()} />
      </label>
      <label>
        to <input type="text" value={toText} onChange={(e) => setToText(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === "Enter" && apply()} />
      </label>
      <button type="button" disabled={whole} onClick={() => (setError(null), onDomain([range[0].toNumber(), range[1].toNumber()]))}>
        Show the whole range
      </button>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
