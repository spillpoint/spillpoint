// The fund page (notes/plan-fund-page.md), its first step, f01f: an example fund from the locked cases, an X box, and
// the split at X, for X alone and the fund to date. The chart, the clawback, the form, the cash-flow table and files
// come in f01g to f01m.

import { useMemo, useState } from "react";
import { FundRefusal, readFund, splitAt } from "spillpoint-fund";
import type { D, Fund, Split, Tiers } from "spillpoint-fund";
import examples from "virtual:fund-examples";
import build from "virtual:fund-build";

import { cents, dateText, lpMultipleText, parseDollars, percentText, short, stepMultiple, xText } from "./format.ts";

/** What the X box holds: the text typed, and the last amount that split, which the page shows while the text doesn't. */
interface XState {
  text: string;
  shown: D;
  problem: string | null;
}

const NOT_AN_AMOUNT = "Write an amount in dollars, 0 or more: 40000000, 40,000,000 or $40M.";

function opened(id: string): { fund: Fund; x: XState } {
  const example = examples.find((e) => e.id === id)!;
  const fund = readFund(example.fund);
  const x = parseDollars(example.defaultX)!;
  return { fund, x: { text: xText(x), shown: x, problem: null } };
}

export function App() {
  const [exampleId, setExampleId] = useState(examples[0]!.id);
  const [{ fund, x }, setState] = useState(() => opened(examples[0]!.id));
  const split = useMemo(() => splitAt(fund, x.shown), [fund, x.shown]);

  const choose = (id: string) => {
    setExampleId(id);
    setState(opened(id));
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
      <XBox fund={fund} x={x} onType={typeX} />
      <SplitTable fund={fund} split={split} />
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

function XBox({ fund, x, onType }: { fund: Fund; x: XState; onType: (text: string) => void }) {
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
