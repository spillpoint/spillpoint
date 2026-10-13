// The fund page (notes/plan-fund-page.md): an example fund from the locked cases, an X box with a slider, the split at
// X for X alone and the fund to date (f01f), the chart and the breakpoints (f01g), and the clawback with the NAV button
// (f01h), on the Payouts tab; the fund behind them on the Terms and Cash flows tabs (f01i). The cash-flow form and files
// come in f01j to f01m.

import { useMemo, useState } from "react";
import { D, FundRefusal, readFund, splitAt, splitAtNav } from "spillpoint-fund";
import type { Clawback as ClawbackAmounts, Fund, Split, Tiers } from "spillpoint-fund";
import examples from "virtual:fund-examples";
import build from "virtual:fund-build";

import { bendsClawback, breakpointViews, chartPoints, defaultTop, niceUp, owedPoints } from "./analysis.ts";
import type { BreakpointView } from "./analysis.ts";
import { Breakpoints } from "./Breakpoints.tsx";
import { CashFlows } from "./CashFlows.tsx";
import { Chart } from "./Chart.tsx";
import { Clawback, owesSomething } from "./Clawback.tsx";
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

function opened(id: string): { fund: Fund; opening: D; x: XState; top: TopState } {
  const example = examples.find((e) => e.id === id)!;
  const fund = readFund(example.fund);
  const x = parseDollars(example.defaultX)!;
  return { fund, opening: x, x: { text: xText(x), shown: x, problem: null }, top: { text: null, set: null, problem: null } };
}

type Tab = "payouts" | "terms" | "flows";
const TABS: { id: Tab; label: string }[] = [
  { id: "payouts", label: "Payouts" },
  { id: "terms", label: "Terms" },
  { id: "flows", label: "Cash flows" },
];

/** The slider's positions: X moves in steps of a thousandth of the range. */
const POSITIONS = 1000;
/** Marks under the slider closer than this, in percent of its width, step down a row: about 30 pixels on a phone. */
const CROWDED = 9;

export function App() {
  const [exampleId, setExampleId] = useState(examples[0]!.id);
  const [tab, setTab] = useState<Tab>("payouts");
  const [{ fund, opening, x, top: topState }, setState] = useState(() => opened(examples[0]!.id));
  const split = useMemo(() => splitAt(fund, x.shown), [fund, x.shown]);
  const breakpoints = useMemo(() => breakpointViews(fund), [fund]);
  // The range's top: as typed, or the page's own; an X past it raises it to 1.25 × X, so X's mark is never off the chart
  // (f01g review, answer 1).
  const base = topState.set ?? defaultTop(fund, breakpoints, opening);
  const top = x.shown.gt(base) ? niceUp(x.shown.times("1.25")) : base;
  const points = useMemo(() => chartPoints(fund, breakpoints, top), [fund, breakpoints, top]);
  // The clawback (F12): a final fund's at X; for a fund that isn't final, the NAV point's alone, which F14 takes as final.
  const atNav = fund.nav !== null && x.shown.eq(fund.nav);
  const clawbackAt = fund.final ? split : atNav ? splitAtNav(fund) : null;
  const owed = useMemo(() => (fund.final ? owedPoints(fund, breakpoints, top) : null), [fund, breakpoints, top]);
  const bends = useMemo(() => breakpoints.filter(bendsClawback), [breakpoints]);

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
      <main>
        <p className="example-label">{summaryText(fund)}</p>
        <Tabs tab={tab} onTab={setTab} />
        <div role="tabpanel" id="panel-payouts" aria-labelledby="tab-payouts" hidden={tab !== "payouts"}>
          <Headline fund={fund} split={split} clawback={clawbackAt?.clawback ?? null} />
          <XBox fund={fund} x={x} onType={typeX} top={top} topState={topState} onTop={typeTop} breakpoints={breakpoints} onX={setX} />
          {/* The chart and the split are both about this distribution, so they sit together; the clawback, about the fund's life, after them (f01i). */}
          <Chart
            points={points}
            breakpoints={breakpoints}
            nav={fund.nav}
            x={x.shown}
            top={top}
            at={{ lps: split.distribution.lps.total, gp: split.distribution.gp.total, gpCommitment: split.distribution.gpCommitment }}
            hasCommitment={fund.terms.gpCommitment !== null}
          />
          <SplitTable fund={fund} split={split} />
          {clawbackAt?.clawback && <Clawback fund={fund} clawback={clawbackAt.clawback} points={owed} breakpoints={bends} x={x.shown} top={top} />}
          <Breakpoints fund={fund} breakpoints={breakpoints} x={x.shown} onX={setX} />
        </div>
        <div role="tabpanel" id="panel-terms" aria-labelledby="tab-terms" hidden={tab !== "terms"}>
          <section className="card" aria-labelledby="terms-heading">
            <h2 id="terms-heading">Terms</h2>
            <p>{termsText(fund)}</p>
          </section>
        </div>
        <div role="tabpanel" id="panel-flows" aria-labelledby="tab-flows" hidden={tab !== "flows"}>
          <CashFlows fund={fund} />
        </div>
      </main>
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

/** The tabs, with the keys screen-reader users expect: arrows to move between them, Home and End for the first and last. */
function Tabs({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = TABS.findIndex((t) => t.id === tab);
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = TABS[(to + TABS.length) % TABS.length]!.id;
    onTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label="View">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={tab === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={tab === t.id ? 0 : -1}
          onClick={() => onTab(t.id)}
          onKeyDown={onKeyDown}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The fund behind the answers, in one line under the picker, as the main page's "built from its 10 events" (f01i):
 * what's been paid in, what's been distributed before X, the NAV if there is one, and whether X is the last
 * distribution. The amounts are the cash flows' own, added up as entered.
 */
export function summaryText(fund: Fund): string {
  const calls = fund.cashFlows.filter((f) => f.type === "call");
  const distributions = fund.cashFlows.filter((f) => f.type === "distribution");
  const total = (flows: typeof calls) => flows.reduce((sum, f) => sum.plus(f.amount), new D(0));
  const parts = [
    `${short(total(calls))} paid in over ${calls.length === 1 ? "1 call" : `${calls.length} calls`}`,
    distributions.length === 0 ? "nothing distributed before X" : `${short(total(distributions))} distributed before X`,
    ...(fund.nav ? [`a NAV of ${short(fund.nav)} on ${dateText(fund.distributionDate)}`] : []),
  ];
  return `This fund: ${listed(parts)}. X ${fund.final ? "is" : "isn't"} its last distribution.`;
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

/**
 * The answer first, in neutral words: the same file goes to LPs and co-GPs (plan answer 6), and in one frame (f01i).
 * - A final fund: the GP's carry over the fund's life, if X is its last distribution, with what it gets now and gives
 *   back when it owes a clawback, so the carry is never shown without it (f01h).
 * - A fund that isn't final: this distribution, and at NAV what the GP would owe if the fund were liquidated there.
 */
export function answerText(fund: Fund, split: Split, clawback: ClawbackAmounts | null): string {
  const date = dateText(fund.distributionDate);
  const now = split.distribution.gp.total;
  if (fund.final && clawback) {
    // F12, one way only: the GP ends with what it was paid less what it gives back, which is the less of what it was
    // paid and what it earned on the fund's totals.
    const ends = D.min(clawback.carryPaid, clawback.entitlement);
    const lead = split.x.isZero() ? `If nothing more is distributed after ${date}` : `If ${short(split.x)} on ${date} is the last distribution`;
    const back = !owesSomething(clawback.owed)
      ? ""
      : owesSomething(now)
        ? `: it gets ${short(now)} now and gives back ${short(clawback.owed)}`
        : `: it gives back ${short(clawback.owed)}`;
    return `${lead}, the GP ends with ${short(ends)} of carry${back}.`;
  }
  const lead = split.x.isZero() ? `With nothing distributed on ${date}` : `At a ${short(split.x)} distribution on ${date}`;
  const back = clawback && owesSomething(clawback.owed) ? `, and if the fund were liquidated at NAV it would owe ${short(clawback.owed)} back` : "";
  return `${lead}, the GP's carry is ${short(now)}${back}.`;
}

/** The LPs' side of this distribution. For a final fund it says so, since the line above is about the fund's life. */
export function restText(fund: Fund, split: Split): string | null {
  const d = split.distribution;
  const commitment = fund.terms.gpCommitment ? ` and the GP commitment ${short(d.gpCommitment)}` : "";
  if (!fund.final) return `The LPs get ${short(d.lps.total)}${commitment}.`;
  return split.x.isZero() ? null : `Of the ${short(split.x)}, the LPs get ${short(d.lps.total)}${commitment}.`;
}

function Headline({ fund, split, clawback }: { fund: Fund; split: Split; clawback: ClawbackAmounts | null }) {
  const rest = restText(fund, split);
  return (
    <section className="headline" aria-label="The answer">
      <p className="headline__terms">{termsText(fund)}</p>
      <p className="headline__answer">{answerText(fund, split, clawback)}</p>
      {rest && <p className="headline__rest">{rest}</p>}
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
      {fund.nav && (
        // The NAV point (plan, "The NAV point"): X at NAV is the split as if the fund were liquidated on D (F14).
        <p className="x-box__nav">
          <button type="button" className="button" onClick={() => onX(fund.nav!)}>
            Set X to NAV
          </button>
          <span>
            At NAV, {cents(fund.nav)}, as if the fund were liquidated on {dateText(fund.distributionDate)}
            {fund.final ? "" : "; the clawback card then shows what the GP would owe back"}.
          </span>
          {x.shown.eq(fund.nav) && <span className="tag tag--quiet">X is at NAV</span>}
        </p>
      )}
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
