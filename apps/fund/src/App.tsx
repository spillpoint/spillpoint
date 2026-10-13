// The fund page (notes/plan-fund-page.md): an example fund from the locked cases, an X box with a slider, the split at
// X for X alone and the fund to date (f01f), and the chart and the breakpoints (f01g). The clawback, the form, the
// cash-flow table and files come in f01h to f01m.

import { useMemo, useState } from "react";
import { D, FundRefusal, readFund, splitAt } from "spillpoint-fund";
import type { Fund, Split, Tiers } from "spillpoint-fund";
import examples from "virtual:fund-examples";
import build from "virtual:fund-build";

import { breakpointViews, chartPoints, defaultTop, niceUp } from "./analysis.ts";
import type { BreakpointView } from "./analysis.ts";
import { Breakpoints } from "./Breakpoints.tsx";
import { Chart } from "./Chart.tsx";
import { cents, dateText, lpMultipleText, parseDollars, percentText, short, stepMultiple, xText } from "./format.ts";

/** What the X box holds: the text typed, and the last amount that split, which the page shows while the text doesn't. */
interface XState {
  text: string;
  shown: D;
  problem: string | null;
}

const NOT_AN_AMOUNT = "Write an amount in dollars, 0 or more: 40000000, 40,000,000 or $40M.";

/** The range's top as typed: its text, the amount it set (null: the page's own choice), and why the text doesn't read. */
interface TopState {
  text: string | null;
  set: D | null;
  problem: string | null;
}

function opened(id: string): { fund: Fund; x: XState; top: TopState } {
  const example = examples.find((e) => e.id === id)!;
  const fund = readFund(example.fund);
  const x = parseDollars(example.defaultX)!;
  return { fund, x: { text: xText(x), shown: x, problem: null }, top: { text: null, set: null, problem: null } };
}

/** The slider's positions: X moves in steps of a thousandth of the range. */
const POSITIONS = 1000;
/** Marks under the slider closer than this, in percent of its width, step down a row: about 30 pixels on a phone. */
const CROWDED = 9;

export function App() {
  const [exampleId, setExampleId] = useState(examples[0]!.id);
  const [{ fund, x, top: topState }, setState] = useState(() => opened(examples[0]!.id));
  const split = useMemo(() => splitAt(fund, x.shown), [fund, x.shown]);
  const breakpoints = useMemo(() => breakpointViews(fund), [fund]);
  // The range's top: as typed, or the page's own; raised to take in an X typed past it.
  const base = topState.set ?? defaultTop(fund, breakpoints);
  const top = x.shown.gt(base) ? niceUp(x.shown.times("1.25")) : base;
  const points = useMemo(() => chartPoints(fund, breakpoints, top), [fund, breakpoints, top]);

  const choose = (id: string) => {
    setExampleId(id);
    setState(opened(id));
  };

  /** X set exactly, by the slider, a mark or a breakpoint: the box shows it. */
  const setX = (v: D) => setState((s) => ({ ...s, x: { text: xText(v), shown: v, problem: null } }));

  const typeTop = (text: string) => {
    const amount = parseDollars(text);
    setState((s) =>
      amount && amount.gt(0)
        ? { ...s, top: { text, set: amount, problem: null } }
        : { ...s, top: { ...s.top, text, problem: "Write an amount above $0: 100000000, 100,000,000 or $100M." } },
    );
  };

  const typeX = (text: string) => {
    const amount = parseDollars(text);
    if (amount === null) {
      setState((s) => ({ ...s, x: { ...s.x, text, problem: NOT_AN_AMOUNT } }));
      return;
    }
    try {
      splitAt(fund, amount);
      setState((s) => ({ ...s, x: { text, shown: amount, problem: null } }));
    } catch (e) {
      // FA13: the engine refuses an X it can't split, at the path "x"; the page says so beside the box.
      if (!(e instanceof FundRefusal)) throw e;
      setState((s) => ({ ...s, x: { ...s.x, text, problem: NOT_AN_AMOUNT } }));
    }
  };

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__title">
          <span className="wordmark">spillpoint</span>
          <span className="masthead__tagline">How a fund's distribution splits between LPs and GP</span>
        </div>
        <div className="masthead__controls">
          <label className="masthead__example">
            Start from{" "}
            <select value={exampleId} onChange={(e) => choose(e.target.value)}>
              {examples.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                  {e.fictional ? " (fictional)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <GovernanceNote />
      <Headline fund={fund} split={split} />
      <XBox fund={fund} x={x} onType={typeX} top={top} topState={topState} onTop={typeTop} breakpoints={breakpoints} onX={setX} />
      <SplitTable fund={fund} split={split} />
      <Chart
        points={points}
        breakpoints={breakpoints}
        nav={fund.nav}
        x={x.shown}
        top={top}
        at={{ lps: split.distribution.lps.total, gp: split.distribution.gp.total, gpCommitment: split.distribution.gpCommitment }}
        hasCommitment={fund.terms.gpCommitment !== null}
      />
      <Breakpoints fund={fund} breakpoints={breakpoints} x={x.shown} onX={setX} />
      {/* Which engine made these numbers: the page runs spillpoint-fund's sources as of this commit. */}
      <footer className="page-footer">
        spillpoint-fund {build.fundVersion} ({build.commit})
      </footer>
    </div>
  );
}

function GovernanceNote() {
  return (
    <aside className="notice" aria-label="Before you rely on this">
      <strong>The fund's documents govern, not this tool.</strong> spillpoint models common fund terms with documented
      defaults; where your LPA differs, it wins. Everything runs on this computer: nothing you enter is sent anywhere.
    </aside>
  );
}

/** "a, b and c". */
function listed(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** The fund's terms in one line: "Carry 20%, 25% from 3.0x and 30% from 5.0x; no pref; GP commitment 1%, fee-free." */
function termsText(fund: Fund): string {
  const t = fund.terms;
  const carry = `Carry ${listed(t.carry.map((s) => (s.fromLpMultiple ? `${percentText(s.rate)} from ${stepMultiple(s.fromLpMultiple)}` : percentText(s.rate))))}`;
  const pref = !t.pref
    ? "no pref"
    : `pref ${percentText(t.pref.rate)}, ${!t.catchUp ? "no catch-up" : t.catchUp.gpShare.eq(1) ? "full catch-up" : `${percentText(t.catchUp.gpShare)} catch-up`}`;
  const g = t.gpCommitment;
  const gp = !g
    ? "no GP commitment"
    : `GP commitment ${percentText(g.share)}, ${g.paysFees ? "paying its share of fees" : "fee-free"}${g.paysExpenses ? "" : ", not paying its share of expenses"}`;
  return `${carry}; ${pref}; ${gp}.`;
}

/** The answer first, in neutral words: the same file goes to LPs and co-GPs (plan answer 6). */
function Headline({ fund, split }: { fund: Fund; split: Split }) {
  const d = split.distribution;
  const commitment = fund.terms.gpCommitment ? ` and the GP commitment ${short(d.gpCommitment)}` : "";
  return (
    <section className="headline" aria-label="The answer">
      <p className="headline__terms">{termsText(fund)}</p>
      <p className="headline__answer">
        At a {short(split.x)} distribution on {dateText(fund.distributionDate)}, the GP's carry is {short(d.gp.total)}.
      </p>
      <p className="headline__rest">
        The LPs get {short(d.lps.total)}
        {commitment}.
      </p>
    </section>
  );
}

interface XBoxProps {
  fund: Fund;
  x: XState;
  onType: (text: string) => void;
  top: D;
  topState: TopState;
  onTop: (text: string) => void;
  breakpoints: readonly BreakpointView[];
  onX: (x: D) => void;
}

/**
 * X: typed exactly, or set by the slider beside the box, from $0 to the range's top. Under the slider, each breakpoint
 * is a numbered mark and NAV a mark of its own; choosing one moves X there exactly.
 */
function XBox({ fund, x, onType, top, topState, onTop, breakpoints, onX }: XBoxProps) {
  const position = D.min(POSITIONS, x.shown.div(top).times(POSITIONS).round()).toNumber();
  const percent = (v: D) => v.div(top).times(100).toNumber();
  const marks = breakpoints.filter((b) => b.x.lte(top));
  // Each mark under the slider, breakpoints and NAV in order of X. A mark closer to the one before than CROWDED percent
  // of the slider steps down a row, so none overlap on a phone; the chart's numbers step up the same way.
  const placed: { key: string; at: number; label: string; text: string; nav: boolean; onClick: () => void }[] = [
    ...marks.map((b) => ({ key: `b${b.n}`, at: percent(b.x), label: `Breakpoint ${b.n}, at ${cents(b.x)}`, text: String(b.n), nav: false, onClick: () => onX(b.x) })),
    ...(fund.nav && fund.nav.lte(top) ? [{ key: "nav", at: percent(fund.nav), label: `NAV, at ${cents(fund.nav)}`, text: "NAV", nav: true, onClick: () => onX(fund.nav!) }] : []),
  ].sort((m, n) => m.at - n.at);
  const lastInRow: number[] = [];
  const rows = placed.map((m) => {
    let row = 0;
    while (lastInRow[row] !== undefined && m.at - lastInRow[row]! < CROWDED) row++;
    lastInRow[row] = m.at;
    return row;
  });
  return (
    <section className="card x-box" aria-label="The distribution">
      <div className="x-box__typed">
        <label htmlFor="x">Distribution on {dateText(fund.distributionDate)} (X)</label>
        <input id="x" type="text" inputMode="decimal" value={x.text} onChange={(e) => onType(e.target.value)} aria-describedby="x-problem" aria-invalid={x.problem !== null} />
      </div>
      {x.problem && (
        <p id="x-problem" className="field-error" role="alert">
          {x.problem} Showing {xText(x.shown)}, the last amount that worked.
        </p>
      )}
      <div className="x-box__slider">
        <input
          type="range"
          min={0}
          max={POSITIONS}
          step={1}
          value={position}
          onChange={(e) => onX(top.times(Number(e.target.value)).div(POSITIONS))}
          aria-label={`X, from $0 to ${short(top)}`}
          aria-valuetext={xText(x.shown)}
        />
        <div className="x-box__marks" style={{ height: `${22 * Math.max(1, ...rows.map((r) => r + 1))}px` }}>
          {placed.map((m, i) => (
            <button
              key={m.key}
              type="button"
              className={`x-box__mark${m.nav ? " x-box__mark--nav" : ""}`}
              style={{ left: `${m.at}%`, top: `${rows[i]! * 22}px` }}
              aria-label={m.label}
              onClick={m.onClick}
            >
              {m.text}
            </button>
          ))}
        </div>
        <div className="x-box__ends" aria-hidden="true">
          <span>$0</span>
          <span>{short(top)}</span>
        </div>
      </div>
      <div className="x-box__top">
        <label htmlFor="top">The slider and the chart run up to</label>
        <input
          id="top"
          type="text"
          inputMode="decimal"
          value={topState.text ?? xText(top)}
          onChange={(e) => onTop(e.target.value)}
          aria-invalid={topState.problem !== null}
          aria-describedby="top-problem"
        />
        {topState.problem && (
          <p id="top-problem" className="field-error" role="alert">
            {topState.problem}
          </p>
        )}
      </div>
      {marks.length > 0 && <p className="x-box__caption">Each numbered mark is a breakpoint, listed below; choose one to move X there.</p>}
    </section>
  );
}

const NONE = "—";

/** One row of the split: X's amount and the fund to date's, for the LPs and the GP. */
function Row({ label, lps, gp }: { label: string; lps: [D, D] | null; gp: [D, D] | null }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="num">{lps ? cents(lps[0]) : NONE}</td>
      <td className="num">{gp ? cents(gp[0]) : NONE}</td>
      <td className="num split__group">{lps ? cents(lps[1]) : NONE}</td>
      <td className="num">{gp ? cents(gp[1]) : NONE}</td>
    </tr>
  );
}

/** The split by tier (F16): a tier the terms don't have isn't shown, though the engine gives it as zero. */
function SplitTable({ fund, split }: { fund: Fund; split: Split }) {
  const now = split.distribution;
  const all = split.toDate;
  const pair = (f: (t: Tiers) => D): [D, D] => [f(now), f(all)];
  const steps = fund.terms.carry;
  // Each step is a band of the LPs' net multiple, one carry, not carry on top of carry (f01g, from Jordan's look at the
  // page): "Carry at 20% (up to 3.0x)", "Carry at 25% (3.0x to 5.0x)", "Carry at 30% (above 5.0x)". Flat: "Carry at 20%".
  const stepLabel = (i: number) => {
    const from = steps[i]!.fromLpMultiple;
    const to = steps[i + 1]?.fromLpMultiple;
    const band = from && to ? `${stepMultiple(from)} to ${stepMultiple(to)}` : to ? `up to ${stepMultiple(to)}` : from ? `above ${stepMultiple(from)}` : null;
    return `at ${percentText(steps[i]!.rate)}${band ? ` (${band})` : ""}`;
  };
  return (
    <section className="card" aria-labelledby="split-heading">
      <h2 id="split-heading">The split at {xText(split.x)}</h2>
      <div className="table-scroll">
        <table className="split">
          <thead>
            <tr>
              <td />
              <th scope="colgroup" colSpan={2}>
                This distribution
              </th>
              <th scope="colgroup" colSpan={2} className="split__group">
                The fund to date
              </th>
            </tr>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col" className="num">
                LPs
              </th>
              <th scope="col" className="num">
                GP
              </th>
              <th scope="col" className="num split__group">
                LPs
              </th>
              <th scope="col" className="num">
                GP
              </th>
            </tr>
          </thead>
          <tbody>
            <Row label="Capital" lps={pair((t) => t.lps.capital)} gp={null} />
            {fund.terms.pref && <Row label="Pref" lps={pair((t) => t.lps.pref)} gp={null} />}
            {fund.terms.catchUp && <Row label="Catch-up" lps={pair((t) => t.lps.catchUp)} gp={pair((t) => t.gp.catchUp)} />}
            {/* One row a carry step, each side's share of it (f01f review, answer 2). */}
            {steps.map((_, i) => (
              <Row key={i} label={`Carry ${stepLabel(i)}`} lps={pair((t) => t.gp.carry[i]!.lps)} gp={pair((t) => t.gp.carry[i]!.amount)} />
            ))}
          </tbody>
          <tfoot>
            <Row label="Total" lps={pair((t) => t.lps.total)} gp={pair((t) => t.gp.total)} />
          </tfoot>
        </table>
      </div>
      {fund.terms.gpCommitment && (
        <p className="split__commitment">
          The GP commitment's line, outside the tiers: {cents(now.gpCommitment)} of this distribution, {cents(all.gpCommitment)} to date.
        </p>
      )}
      <dl className="facts">
        <div>
          <dt>Distributed</dt>
          <dd>
            {cents(now.amount)} now, {cents(all.amount)} to date
          </dd>
        </div>
        <div>
          <dt>The LPs' paid-in</dt>
          <dd>{cents(split.lpsPaidIn)}</dd>
        </div>
        {fund.terms.gpCommitment && (
          <div>
            <dt>The GP commitment's paid-in</dt>
            <dd>{cents(split.gpCommitmentPaidIn)}</dd>
          </div>
        )}
        {split.prefAccrued && (
          <div>
            <dt>The pref accrued to {dateText(fund.distributionDate)}</dt>
            <dd>{cents(split.prefAccrued)}</dd>
          </div>
        )}
        <div>
          <dt>The LPs' net multiple to date</dt>
          <dd>{lpMultipleText(split.lpMultiple)}</dd>
        </div>
      </dl>
      <p className="footnote">
        Amounts are to the cent. "The LPs" is every LP together, not one payment, so nothing here is rounded down as it would
        be paid; each row is rounded on its own and can differ from its total by a cent.
      </p>
    </section>
  );
}
