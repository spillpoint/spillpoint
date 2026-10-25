// The clawback (F12, plan step 3, f01h): what the GP owes back to the LPs if this distribution is the fund's last. At
// the end of the fund, the carry the GP has been paid to date, X's included, is set against what one run of the
// waterfall on the fund's totals gives it; what it was paid beyond that goes back (one way only).
//
// For a final fund it's there at every X, with a small chart of its own: what's owed against X, on its own scale since
// it's often zero, with the breakpoints where it bends marked, numbered as in the breakpoint list, which gives their
// reasons (f01i). For a fund that isn't final, only the
// NAV point is final (F14, the fund liquidated at NAV on D), so the card shows that point alone. Numbers become floats
// only for drawing.

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { D, toCents } from "spillpoint-fund";
import type { AccountSplit, Clawback as ClawbackAmounts, Fund } from "spillpoint-fund";

import type { BreakpointView, OwedPoint } from "./analysis.ts";
import { ACCENT, BADGE_ROW, Badge, INK_MUTED, LINE_HAIR, MARGIN_SIDE, MarkLabel, X_AXIS_HEIGHT, Y_AXIS_WIDTH, badgeRows, niceScale, useWidth, xAtPixel } from "./Chart.tsx";
import { cents, dateText, short } from "./format.ts";
import { FUND_TERMS } from "./lps.ts";

type Decimal = D;

/** What's owed, apart from the GP's blue and the LPs' grey on the main chart. */
const OWED = "#a3501c";
const HEIGHT = 190;

/** Whether an amount shows as more than $0.00, to the cent as the page writes amounts (FA14). */
export function owesSomething(owed: Decimal): boolean {
  return !new D(toCents(owed)).isZero();
}

/** The card's one sentence (plan, "The clawback, when final or at NAV"). */
export function clawbackSentence(c: ClawbackAmounts): string {
  const back = owesSomething(c.owed) ? `owes ${cents(c.owed)} back to the LPs` : "owes nothing back to the LPs";
  return `If this is the fund's last distribution, the GP has been paid ${cents(c.carryPaid)} of carry, has earned ${cents(c.entitlement)} on the fund's totals, and ${back}.`;
}

interface Props {
  fund: Fund;
  /** The clawback at X: for a final fund at any X, and for a fund that isn't at the NAV point. */
  clawback: ClawbackAmounts;
  /** Each account's own split at the same X, with two or more (F24); empty otherwise. */
  accounts: readonly AccountSplit[];
  /** The small chart's points, for a final fund; null at a NAV point of a fund that isn't final. */
  points: readonly OwedPoint[] | null;
  /** The breakpoints where the clawback bends, numbered as in the list. */
  breakpoints: readonly BreakpointView[];
  x: Decimal;
  top: Decimal;
  onX: (x: Decimal) => void;
}

export function Clawback({ fund, clawback, accounts, points, breakpoints, x, top, onX }: Props) {
  // F24: with classes, each settles its own clawback on its own totals, and the fund's owed is theirs added up.
  const run = accounts.length > 1 ? "one run of the waterfall for each class, on its own totals" : "one run of the waterfall on everything paid in and everything distributed";
  // Each class's owed, when some class is owed something, $0.00 for one owed nothing; with nothing owed to any, the
  // sentence says so and the table is left out, as the classes card leaves out its column (f03d review, answer 1).
  const byClass = accounts.length > 1 && accounts.some((a) => owesSomething(a.clawback!.owed));
  return (
    <section className="card" aria-labelledby="clawback-heading">
      <h2 id="clawback-heading">The clawback</h2>
      <p className="card__intro">
        {fund.final
          ? `This is the fund's last distribution, so the carry the GP has been paid to date is set against what it has earned on the fund's totals: ${run}.`
          : `At NAV, the split is as if the fund were liquidated on ${dateText(fund.distributionDate)}, so this would be its last distribution, and the carry the GP has been paid to date is set against what it has earned on the fund's totals${accounts.length > 1 ? `: ${run}` : ""}.`}
      </p>
      <p className={`clawback__sentence${owesSomething(clawback.owed) ? " clawback__sentence--owed" : ""}`}>{clawbackSentence(clawback)}</p>
      {byClass && (
        <table className="split clawback__accounts">
          <caption>Owed back by class, each on its own totals</caption>
          <tbody>
            {accounts.map((a, i) => (
              <tr key={i}>
                <th scope="row">{a.class ?? FUND_TERMS}</th>
                <td className="num">{cents(a.clawback!.owed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {points === null ? (
        <p className="chart__hint">The fund isn't final, so away from NAV there's no clawback, and no chart of one against X.</p>
      ) : points[0]!.owed.isZero() ? (
        // FA9: what's owed never rises with X, so nothing owed at $0 is nothing owed at any X.
        <p className="clawback__none">Nothing is owed at any X: even at $0, the GP has been paid no more carry than it has earned on the fund's totals, and more X never adds to what's owed.</p>
      ) : (
        <OwedChart points={points} breakpoints={breakpoints} x={x} top={top} owed={clawback.owed} onX={onX} />
      )}
    </section>
  );
}

interface ChartProps {
  points: readonly OwedPoint[];
  breakpoints: readonly BreakpointView[];
  x: Decimal;
  top: Decimal;
  owed: Decimal;
  onX: (x: Decimal) => void;
}

/** What's owed against X, from $0 to the range's top, with the breakpoints where it bends and X marked. */
function OwedChart({ points, breakpoints, x, top, owed, onX }: ChartProps) {
  const [ref, width] = useWidth(960);
  const rows = points.map((p) => ({ x: p.x.toNumber(), owed: p.owed.toNumber() }));
  const to = top.toNumber();
  const scale = niceScale(Math.max(0, ...rows.map((r) => r.owed)));
  const yTicks = Array.from({ length: Math.round(scale.top / scale.step) + 1 }, (_, i) => i * scale.step);
  const xScale = niceScale(to);
  const xTicks: number[] = [];
  for (let t = 0; t <= to + 1e-9; t += xScale.step) xTicks.push(t);
  const inView = breakpoints.filter((b) => b.x.gt(0) && b.x.lt(top));
  const { rowOf, rowsUsed } = badgeRows(inView, top, width);
  const margin = { top: 8 + rowsUsed * BADGE_ROW, right: MARGIN_SIDE, bottom: 4, left: MARGIN_SIDE };
  const beyond = breakpoints.length - inView.length;
  return (
    <>
      <div
        ref={ref}
        className="chart chart--pick"
        // As the main chart: a click or tap sets X there, onto a bend within a few pixels of one.
        onClick={(e) => onX(xAtPixel(e.clientX - e.currentTarget.getBoundingClientRect().left, width, top, breakpoints))}
        role="img"
        aria-label={`The clawback owed against X, from $0 to ${short(top)}, with ${inView.length} breakpoint${inView.length === 1 ? "" : "s"} marked.`}
      >
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
          <Line type="linear" dataKey="owed" name="The clawback" stroke={OWED} strokeWidth={2.5} dot={false} activeDot={false} isAnimationActive={false} />
          {x.lte(top) && <ReferenceLine x={x.toNumber()} stroke={ACCENT} strokeWidth={1.5} label={<MarkLabel text={`X = ${short(x)}`} colour={ACCENT} at="bottom" left={x.gt(top.times("0.85"))} />} />}
        </LineChart>
      </div>
      {beyond > 0 && (
        <p className="chart__hint">
          {beyond === 1 ? "One breakpoint is" : `${beyond} breakpoints are`} past {short(top)}; raise the range's top to see {beyond === 1 ? "it" : "them"}.
        </p>
      )}
      <ul className="legend legend--clawback" aria-label={`Owed at X = ${cents(x)}`}>
        <li>
          <svg width="24" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="24" y2="4" stroke={OWED} strokeWidth={3} />
          </svg>
          <span className="legend__name">The clawback</span>
          <span className="legend__value">{cents(owed)}</span>
        </li>
      </ul>
    </>
  );
}
