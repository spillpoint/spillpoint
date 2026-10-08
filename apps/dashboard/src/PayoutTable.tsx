// Who gets what at the current exit value, by holder or by class. Each row
// shows the payout, its share of the proceeds, and the share of the company
// it comes from (fully diluted, including the pool), so the two can be
// compared. On a phone the two shares move under the name as one line, so
// the table fits without scrolling sideways (M3a review); the stylesheet
// shows one form or the other, never both.

import { useState } from "react";
import { D } from "spillpoint";
import type { Answer, PreparedCapTable } from "spillpoint";

import { classShares, fractionOf, fullyDiluted, holderShares, outstandingNames } from "./capTable.ts";
import { dollars, dollarsAndCents, percent, shortDollars } from "./format.ts";
import { dateText } from "./rounds.ts";

type Decimal = D;

interface Props {
  pc: PreparedCapTable;
  answer: Answer;
  exitValue: Decimal;
  you: string;
}

interface Row {
  key: string;
  name: string;
  amount: Decimal;
  /** Null for a SAFE or note still outstanding: it holds no shares until it converts. */
  shares: Decimal | null;
  you: boolean;
}

export function PayoutTable({ pc, answer, exitValue, you }: Props) {
  const [view, setView] = useState<"holder" | "class">("holder");
  const { capTable } = pc;
  const fd = fullyDiluted(pc);
  const zero = new D(0);
  const outstanding = outstandingNames(pc);

  const rows: Row[] =
    view === "holder"
      ? capTable.holders
          .filter((h) => answer.payout.holderTotals.has(h.id))
          .map((h) => ({
            key: h.id,
            name: h.name,
            amount: answer.payout.holderTotals.get(h.id)!,
            shares: holderShares(pc, h.id),
            you: h.id === you,
          }))
      : [
          ...classOrder(pc)
            .filter((s) => answer.payout.classTotals.has(s.id))
            .map((s) => ({ key: s.id, name: s.name, amount: answer.payout.classTotals.get(s.id)!, shares: classShares(pc, s.id), you: false })),
          // Each SAFE and note is its own class (C8, C9), after the stock.
          ...[...outstanding]
            .filter(([id]) => answer.payout.classTotals.has(id))
            .map(([id, name]) => ({ key: id, name, amount: answer.payout.classTotals.get(id)!, shares: null, you: false })),
        ];
  if (capTable.unissuedPool.gt(0)) {
    rows.push({ key: "pool", name: "Unissued option pool", amount: zero, shares: capTable.unissuedPool, you: false });
  }
  const proceeds = (amount: Decimal) => fractionOf(amount, exitValue);
  const company = (shares: Decimal | null) => (shares === null ? "no shares until it converts" : `${percent(fractionOf(shares, fd))} of the company`);

  return (
    <section className="card" aria-labelledby="who-gets-what">
      <div className="card__header">
        <h2 id="who-gets-what">Who gets what at {shortDollars(exitValue)}</h2>
        <div className="toggle" role="group" aria-label="Show payouts">
          <button type="button" aria-pressed={view === "holder"} onClick={() => setView("holder")}>
            By holder
          </button>
          <button type="button" aria-pressed={view === "class"} onClick={() => setView("class")}>
            By class
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="payouts">
          <thead>
            <tr>
              <th scope="col">{view === "holder" ? "Holder" : "Class"}</th>
              <th scope="col" className="num">
                Gets
              </th>
              <th scope="col" className="num share">
                Share of the proceeds
              </th>
              <th scope="col" className="num share">
                Share of the company
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.you ? "is-you" : undefined}>
                <th scope="row">
                  {r.name}
                  {r.you && <span className="you-tag"> (you)</span>}
                  <span className="payouts__shares">
                    <span>{percent(proceeds(r.amount))} of the proceeds,</span> <span>{company(r.shares)}</span>
                  </span>
                </th>
                <td className="num">{dollars(r.amount)}</td>
                <td className="num share">{percent(proceeds(r.amount))}</td>
                <td className="num share">{r.shares === null ? <span aria-label="No shares until it converts">—</span> : percent(fractionOf(r.shares, fd))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num">{dollars(exitValue)}</td>
              <td className="num share">{percent(new D(1))}</td>
              <td className="num share">{percent(new D(1))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="footnote">
        Share of the company is fully diluted: every share, option{pc.warrants.size > 0 ? ", warrant" : ""} and preferred share as converted
        {capTable.unissuedPool.gt(0) ? ", and the unissued option pool" : ""}.
        {outstanding.size > 0 && ` ${outstandingFootnote(pc)}`}
      </p>
      <Dividends pc={pc} />
      <Decisions pc={pc} answer={answer} />
    </section>
  );
}

/** SAFEs and notes hold no shares until they convert, so the share of the company leaves them out. */
function outstandingFootnote(pc: PreparedCapTable): string {
  const safes = (pc.capTable.unconvertedSafes ?? []).length > 0;
  const notes = (pc.capTable.unconvertedNotes ?? []).length > 0;
  const what = safes && notes ? "SAFEs and convertible notes" : safes ? "SAFEs" : "Convertible notes";
  return `${what} still outstanding hold no shares until they convert, so it leaves them out.`;
}

/**
 * What each series' cumulative dividends come to by the sale's date (X2, X5),
 * whatever the exit value: they add to its preference at 1x (X4), and a
 * series that converts gives them up or is still paid them (X5).
 */
function Dividends({ pc }: { pc: PreparedCapTable }) {
  const accruing = [...pc.preferred.values()].filter((s) => s.cumulativeDividend);
  if (accruing.length === 0) return null;
  return (
    <p className="footnote">
      {accruing
        .map((s) => {
          const conversion = s.cumulativeDividend!.onConversion === "paid" ? "if it converts, they're still paid, in its own place in the order" : "if it converts, it gives them up";
          return `${s.name} has accrued ${dollarsAndCents(pc.dividends.get(s.id)!)} of cumulative dividends by ${dateText(pc.exitDate)}, the date of the sale. They add to its preference; ${conversion}.`;
        })
        .join(" ")}
    </p>
  );
}

/**
 * Which series convert, what each SAFE and note does (X1, X3: a SAFE takes
 * its Cash-Out Amount or converts; a note is repaid or converts), and which
 * options are exercised at this exit value.
 */
function Decisions({ pc, answer }: { pc: PreparedCapTable; answer: Answer }) {
  const name = (id: string) => pc.capTable.securities.find((s) => s.id === id)?.name ?? id;
  const { converted: chosen } = answer.decisions;
  const converted = [...chosen].filter((id) => pc.preferred.has(id)).map(name);
  const exercised = [...answer.decisions.exercised].filter((id) => !pc.warrants.has(id)).map(name);
  const options = pc.capTable.securities.filter((s) => s.kind === "option");
  // R29: warrants are exercised like options, once what they buy is worth more than the strike.
  const warrants = [...pc.warrants.keys()];
  const warrantsExercised = warrants.filter((id) => answer.decisions.exercised.has(id)).map(name);
  const outstanding = outstandingNames(pc);
  const safes = (pc.capTable.unconvertedSafes ?? []).map((f) => `${outstanding.get(f.id)} ${chosen.has(f.id) ? "converts to common" : "takes its Cash-Out Amount"} here.`);
  const notes = (pc.capTable.unconvertedNotes ?? []).map((n) => `${outstanding.get(n.id)} ${chosen.has(n.id) ? "converts to common" : "is repaid"} here.`);
  const sentences = [
    converted.length > 0 ? `Converting to common here: ${converted.join(", ")}.` : "No preferred series converts here.",
    ...safes,
    ...notes,
    options.length === 0
      ? null
      : exercised.length === options.length
        ? "All options are exercised."
        : exercised.length > 0
          ? `Options exercised: ${exercised.join(", ")}.`
          : "No options are worth exercising here.",
    warrants.length === 0
      ? null
      : warrantsExercised.length === warrants.length
        ? `${warrants.length === 1 ? "The warrant is" : "All warrants are"} exercised.`
        : warrantsExercised.length > 0
          ? `Warrants exercised: ${warrantsExercised.join(", ")}.`
          : `No ${warrants.length === 1 ? "warrant is" : "warrants are"} worth exercising here.`,
  ];
  return <p className="decisions">{sentences.filter(Boolean).join(" ")}</p>;
}

/**
 * Classes in the order cap tables are usually read: common, then options by
 * strike, then warrants by strike, then preferred from the most junior to
 * the most senior.
 */
function classOrder(pc: PreparedCapTable) {
  const { securities, seniority } = pc.capTable;
  const rank = new Map(seniority.flat().map((sid, i) => [sid, i]));
  const byStrike = (kind: "option" | "warrant") =>
    securities.filter((s) => s.kind === kind).sort((a, b) => ("strike" in a && "strike" in b ? a.strike.cmp(b.strike) : 0));
  const common = securities.filter((s) => s.kind === "common");
  const preferred = securities.filter((s) => s.kind === "preferred").sort((a, b) => rank.get(b.id)! - rank.get(a.id)!);
  return [...common, ...byStrike("option"), ...byStrike("warrant"), ...preferred];
}
