// The Investments tab (plan, "0.5.0: investments and carry deal by deal", f05c): each investment with its name and its
// checks, a follow-on another check (F33); add and remove an investment; under them the investments' table, the
// engine's `portfolio(fund)` (F36). Each change runs the engine again; a refusal shows under the field its path names,
// and at the top of the tab with "Show me". Also X's source, beside X on Payouts deal by deal.

import { useEffect, useState } from "react";
import type { PortfolioRow } from "spillpoint-fund";

import { CardTable } from "./CardTable.tsx";
import { InvestmentPicker, marks, ProblemText } from "./CashFlows.tsx";
import { Percent } from "./Fields.tsx";
import type { FlowsForm, SourceForm } from "./flows.ts";
import { withoutInvestment } from "./flows.ts";
import { cents, dateText, lpMultipleText } from "./format.ts";
import type { CheckRow, InvestmentRow } from "./investments.ts";
import { newCheck, newInvestment } from "./investments.ts";
import type { Problem } from "./terms.ts";

const NONE = "—";

interface SourceProps {
  form: FlowsForm;
  problem: Problem | null;
  onSource: (source: SourceForm) => void;
}

/**
 * X's source (F33, F14), deal by deal: the investment X comes from, and the percent of what's left of it X sells, 100
 * by default. Deal by deal every distribution comes from one, so "—" isn't offered, but shows while nothing is chosen.
 */
export function XSource({ form, problem, onSource }: SourceProps) {
  const { source } = form;
  return (
    <div className="x-box__source">
      <span className="terms__field">
        <label htmlFor="distribution_from.investment">From</label>
        <InvestmentPicker
          id="distribution_from.investment"
          value={source.investment}
          rows={form.investments}
          offerNone={false}
          problem={problem}
          onChange={(investment) => onSource({ ...source, investment })}
        />
      </span>
      <Percent id="distribution_from.share" label="Share sold" value={source.share} problem={problem} onChange={(share) => onSource({ ...source, share })} />
      <ProblemText problem={problem} path="distribution_from" />
      <ProblemText problem={problem} path="distribution_from.investment" />
      <ProblemText problem={problem} path="distribution_from.share" />
    </div>
  );
}

interface Props {
  form: FlowsForm;
  problem: Problem | null;
  onForm: (form: FlowsForm) => void;
  onShow: (path: string) => void;
  /** The engine's table, once the fund runs; null while it can't. */
  holdings: readonly PortfolioRow[] | null;
  /** D, which the table is at. */
  date: string;
}

export function Investments({ form, problem, onForm, onShow, holdings, date }: Props) {
  const rows = form.investments;
  const at = (i: number) => `investments[${i}]`;
  const setRow = (i: number, row: InvestmentRow) => onForm({ ...form, investments: rows.map((r, j) => (j === i ? row : r)) });
  const setCheck = (i: number, j: number, check: CheckRow) => setRow(i, { ...rows[i]!, checks: rows[i]!.checks.map((c, k) => (k === j ? check : c)) });
  // An investment or a check added is one to fill in: its first field takes the focus once it's there.
  const [focusing, setFocusing] = useState<string | null>(null);
  useEffect(() => {
    if (focusing === null) return;
    document.getElementById(focusing)?.focus();
    setFocusing(null);
  }, [focusing, form]);
  return (
    <section className="card" aria-labelledby="investments-heading">
      <h2 id="investments-heading">Investments</h2>
      <p className="card__intro">Each investment the fund has made, with its checks: a follow-on is another check. Amounts in dollars: 3000000, $3,000,000 or $3M.</p>
      {problem && (
        <div className="notice notice--problem" role="status">
          <strong>The fund can't run as it is.</strong> {problem.message}{" "}
          <button type="button" className="link-button" onClick={() => onShow(problem.path)}>
            Show me
          </button>
        </div>
      )}
      {rows.length === 0 && <p className="classes__line">No investments yet. Add them to tag distributions and write-offs, and to pay carry deal by deal.</p>}
      {rows.map((r, i) => (
        <fieldset key={r.id} className="terms__group investments__one">
          <legend>Investment {i + 1}</legend>
          <div className="terms__rate">
            <span className="terms__field">
              <label htmlFor={`${at(i)}.name`}>Name</label>
              <input
                id={`${at(i)}.name`}
                className="investments__name"
                type="text"
                value={r.name}
                onChange={(e) => setRow(i, { ...r, name: e.target.value })}
                aria-label={`Investment ${i + 1}'s name`}
                {...marks(problem, `${at(i)}.name`)}
              />
            </span>
            <ProblemText problem={problem} path={`${at(i)}.name`} />
            <ProblemText problem={problem} path={at(i)} />
          </div>
          <ol className="terms__steps" aria-label={`Investment ${i + 1}'s checks`}>
            {r.checks.map((c, j) => {
              const check = `${at(i)}.checks[${j}]`;
              const whose = `Investment ${i + 1}, check ${j + 1}`;
              return (
                <li key={c.id}>
                  <span className="terms__step-name">Check {j + 1}</span>
                  <input
                    id={`${check}.date`}
                    type="date"
                    value={c.date}
                    onChange={(e) => setCheck(i, j, { ...c, date: e.target.value })}
                    aria-label={`${whose}'s date`}
                    {...marks(problem, `${check}.date`)}
                  />
                  <input
                    id={`${check}.amount`}
                    className="flows__amount investments__amount"
                    type="text"
                    inputMode="decimal"
                    value={c.amount}
                    onChange={(e) => setCheck(i, j, { ...c, amount: e.target.value })}
                    aria-label={`${whose}'s amount`}
                    {...marks(problem, `${check}.amount`)}
                  />
                  {/* The first check goes with its investment. */}
                  {j > 0 && (
                    <button type="button" className="link-button" aria-label={`Remove ${whose.toLowerCase()}`} onClick={() => setRow(i, { ...r, checks: r.checks.filter((_, k) => k !== j) })}>
                      Remove
                    </button>
                  )}
                  <ProblemText problem={problem} path={check} />
                  <ProblemText problem={problem} path={`${check}.date`} />
                  <ProblemText problem={problem} path={`${check}.amount`} />
                </li>
              );
            })}
          </ol>
          {/* The checks refused as a whole, not a list or empty, only a file makes: under them. */}
          <ProblemText problem={problem} path={`${at(i)}.checks`} />
          <div className="flows__actions">
            <button
              id={`${at(i)}.checks`}
              type="button"
              className="button"
              aria-label={`Add a follow-on to investment ${i + 1}`}
              onClick={() => {
                setRow(i, { ...r, checks: [...r.checks, newCheck()] });
                setFocusing(`${at(i)}.checks[${r.checks.length}].date`);
              }}
            >
              Add a follow-on
            </button>
            <button type="button" className="link-button" aria-label={`Remove investment ${i + 1}`} onClick={() => onForm(withoutInvestment(form, r.id))}>
              Remove this investment
            </button>
          </div>
        </fieldset>
      ))}
      <ProblemText problem={problem} path="investments" />
      <div className="flows__actions">
        <button
          id="investments"
          type="button"
          className="button"
          {...marks(problem, "investments")}
          onClick={() => {
            onForm({ ...form, investments: [...rows, newInvestment()] });
            setFocusing(`${at(rows.length)}.name`);
          }}
        >
          Add an investment
        </button>
      </div>
      {rows.length > 0 && <Holdings holdings={holdings} date={date} />}
    </section>
  );
}

/** F36's table as the page shows it: one row an investment, its cells written as the split's amounts are. */
export function holdingsTable(holdings: readonly PortfolioRow[]): { headings: string[]; rows: { name: string; cells: string[] }[] } {
  return {
    headings: ["Investment", "Cost", "Exited or written off", "Written off", "Proceeds", "Realized multiple"],
    rows: holdings.map((h) => ({
      name: h.name,
      // FA59: proceeds over the cost realized, none while nothing of it is realized; to two places, rounded down, as the
      // LPs' net multiple is.
      cells: [cents(h.costMade), cents(h.costRealized), cents(h.costWrittenOff), cents(h.proceeds), h.realizedMultiple ? lpMultipleText(h.realizedMultiple) : NONE],
    })),
  };
}

/**
 * The investments' table (F36, FA59), read-only, at D before X, on either basis: each investment's cost, what of it has
 * been exited or written off, what was written off, its proceeds and its realized multiple. One table where it fits,
 * and on a phone each investment a card, as Payouts' cards are.
 */
function Holdings({ holdings, date }: { holdings: readonly PortfolioRow[] | null; date: string }) {
  const table = holdings ? holdingsTable(holdings) : null;
  return (
    <section className="flows__schedule" aria-labelledby="holdings-heading">
      <h3 id="holdings-heading">{table && date ? `The investments at ${dateText(date)}, before X` : "The investments, before X"}</h3>
      {table ? (
        <>
          <CardTable headings={table.headings} rows={table.rows.map((r) => ({ ...r, kind: "row" as const }))} />
          <p className="classes__line">Cost is each investment's checks to D. The realized multiple is its proceeds over the cost exited or written off.</p>
        </>
      ) : (
        <p className="classes__line">The table shows here once the fund can run.</p>
      )}
    </section>
  );
}
