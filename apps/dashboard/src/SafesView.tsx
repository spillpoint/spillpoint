// The SAFEs tab (11c; notes/plan-2.0.md, section 3): what each SAFE and note outstanding would convert into at the next
// priced round, as the founder gives it, by spillpoint's reading of their terms. It works on the cap table the payouts
// use, whichever way the page built it: from rounds, entered directly, or imported. The round is a trial: nothing here
// is saved or added to the rounds. "See the payouts after this round" shows the Payouts tab on the table after it.
//
// The words say what each one's terms give at that price, naming the rule in plain words, as the page names rules
// elsewhere; never whether the round is a good one.

import { useMemo, useState } from "react";
import { D } from "spillpoint";
import type { CapTable, Holder } from "spillpoint";

import { Field, SelectField } from "./fields.tsx";
import type { Draft } from "./draft.ts";
import { dollars, dollarsAndCents, halfUp } from "./format.ts";
import { sharePrice } from "./rounds.ts";
import type { Rounds } from "./rounds.ts";
import type { Origin } from "./roundsDraft.ts";
import { TRIAL_INVESTOR, conversionRows, outstanding, runTrial, trialBase } from "./trial.ts";
import type { ConversionRow, TrialField, TrialTerms } from "./trial.ts";

type Decimal = D;

const count = (n: Decimal) => halfUp(n, 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const shareCount = (n: Decimal) => {
  const [whole, part] = halfUp(n, 2).toFixed(2).split(".") as [string, string];
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${part === "00" ? "" : `.${part}`}`;
};
const percentOf = (fraction: Decimal) => `${halfUp(fraction.times(100), 2).toFixed(2)}%`;
const asPercent = (fraction: Decimal) => `${halfUp(fraction.times(100), 4).toFixed()}%`;
const NUMBERS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const counted = (n: number, one: string, many: string) => `${NUMBERS[n] ?? n} ${n === 1 ? one : many}`;

/** Today in the browser, as a date field writes it: the trial round's date until the founder gives another. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface TrialPayouts {
  draft: Draft;
  /** What the trial round is, for the Payouts tab to say: "Series B Preferred, $8,000,000 at $2.700764 a share". */
  label: string;
}

interface SafesViewProps {
  /** The cap table as the page holds it: entered directly or imported, or the one the rounds last built. */
  draft: Draft;
  origin: Origin | null;
  /** The rounds as last built, for a company built from them; null for a cap table entered directly or imported. */
  rounds: Rounds | null;
  /** Shows the Payouts tab on the table after the trial round, never saved. */
  onSeePayouts: (trial: TrialPayouts) => void;
  /** A change to the trial: the Payouts tab goes back to the cap table's own payouts. */
  onTrialChange: () => void;
}

export function SafesView({ draft, origin, rounds, onSeePayouts, onTrialChange }: SafesViewProps) {
  const [terms, setTerms] = useState<TrialTerms>(() => ({ by: "price", price: "", preMoney: "", amount: "", poolTarget: "", date: today(), rank: "alongside" }));
  const set = (patch: Partial<TrialTerms>) => {
    setTerms((t) => ({ ...t, ...patch }));
    onTrialChange();
  };
  const base = useMemo(() => trialBase(draft, origin, rounds), [draft, origin, rounds]);

  if (!base.ok) {
    return (
      <section className="card safes" aria-labelledby="safes-heading">
        <h2 id="safes-heading">SAFEs and notes at the next round</h2>
        <p className="card--quiet">The cap table has a problem to fix first: {base.message}</p>
      </section>
    );
  }
  const table = base.base.capTable;
  const { safes, notes } = outstanding(table);
  if (safes.length + notes.length === 0) {
    return (
      <section className="card safes" aria-labelledby="safes-heading">
        <h2 id="safes-heading">SAFEs and notes at the next round</h2>
        <p>
          No SAFE or convertible note is outstanding on the cap table the payouts use, so a round would have nothing to convert. SAFEs and notes are added on
          the Cap table tab, or on the Rounds tab for a company built from its rounds.
        </p>
      </section>
    );
  }
  return <Trial table={table} base={base.base} terms={terms} set={set} onSeePayouts={onSeePayouts} />;
}

interface TrialProps {
  table: CapTable;
  base: Extract<ReturnType<typeof trialBase>, { ok: true }>["base"];
  terms: TrialTerms;
  set: (patch: Partial<TrialTerms>) => void;
  onSeePayouts: (trial: TrialPayouts) => void;
}

function Trial({ table, base, terms, set, onSeePayouts }: TrialProps) {
  const { safes, notes } = outstanding(table);
  const blank = (terms.by === "price" ? terms.price : terms.preMoney).trim() === "" || terms.amount.trim() === "";
  const trial = useMemo(() => (blank ? null : runTrial(base, terms)), [base, terms, blank]);
  const fieldError = (f: TrialField) => (trial && !trial.ok && trial.field === f ? trial.message : null);
  const earlier = table.seniority;
  const names = new Map(table.securities.map((s) => [s.id, s.name]));
  // "Two SAFEs and one convertible note": the second count in lower case.
  const what = [safes.length > 0 ? counted(safes.length, "SAFE", "SAFEs") : null, notes.length > 0 ? counted(notes.length, "convertible note", "convertible notes") : null]
    .filter((x): x is string => x !== null)
    .map((x, i) => (i === 0 ? x : x.charAt(0).toLowerCase() + x.slice(1)))
    .join(" and ");

  return (
    <section className="card safes" aria-labelledby="safes-heading">
      <h2 id="safes-heading">SAFEs and notes at the next round</h2>
      <p>
        {what} {safes.length + notes.length === 1 ? "is" : "are"} outstanding on the cap table the payouts use. Give the next priced round, and spillpoint works
        out what each converts into, by its reading of their terms. Nothing here is saved, or added to your rounds.
      </p>

      <fieldset className="safes__round">
        <legend>The next round</legend>
        <div className="safes__by" role="radiogroup" aria-label="The round is given by">
          <label className="import__choice">
            <input type="radio" name="trial-by" value="price" checked={terms.by === "price"} onChange={() => set({ by: "price" })} /> Its price per share
          </label>
          <label className="import__choice">
            <input type="radio" name="trial-by" value="pre_money" checked={terms.by === "pre_money"} onChange={() => set({ by: "pre_money" })} /> Its pre-money valuation
          </label>
        </div>
        <div className="series__grid">
          {terms.by === "price" ? (
            <Field id="trial-price" label="Price per share ($)" value={terms.price} onChange={(price) => set({ price })} error={fieldError("price")} numeric hint="As the term sheet or purchase agreement states it." />
          ) : (
            <Field id="trial-pre-money" label="Pre-money valuation ($)" value={terms.preMoney} onChange={(preMoney) => set({ preMoney })} error={fieldError("preMoney")} numeric />
          )}
          <Field id="trial-amount" label="Amount raised ($)" value={terms.amount} onChange={(amount) => set({ amount })} error={fieldError("amount")} numeric />
          <Field
            id="trial-pool"
            label="Option pool after the round (% of the company)"
            value={terms.poolTarget}
            onChange={(poolTarget) => set({ poolTarget })}
            error={fieldError("poolTarget")}
            numeric
            hint="Leave blank to keep the pool as it is."
          />
          {notes.length > 0 && (
            <Field id="trial-date" label="The round's date" type="date" value={terms.date} onChange={(date) => set({ date })} error={fieldError("date")} hint="The notes accrue interest up to it." />
          )}
          {earlier.length > 0 && (
            <SelectField
              id="trial-rank"
              label="How the new series ranks against the earlier series"
              value={terms.rank}
              options={[
                { value: "alongside", label: `Alongside ${names.get(earlier[0]![0]!) ?? "the earlier series"}${earlier[0]!.length > 1 ? " and the rest of its tier" : ""} (pari passu)` },
                { value: "senior", label: "Senior to every earlier series" },
              ]}
              onChange={(rank) => set({ rank: rank as TrialTerms["rank"] })}
              error={null}
              hint="It matters for the payouts after the round, not for what converts."
              wide
            />
          )}
        </div>
      </fieldset>

      {blank && <p className="card--quiet">Give the round's {terms.by === "price" ? "price per share" : "pre-money valuation"} and the amount it raises.</p>}
      {trial && !trial.ok && trial.field === null && (
        <p className="field-error" role="alert">
          {trial.message}
        </p>
      )}
      {trial?.ok && <Results trial={trial} table={table} terms={terms} onSeePayouts={onSeePayouts} />}
    </section>
  );
}

function Results({ trial, table, terms, onSeePayouts }: { trial: Extract<ReturnType<typeof runTrial>, { ok: true }>; table: CapTable; terms: TrialTerms; onSeePayouts: (t: TrialPayouts) => void }) {
  const after = trial.tables.at(-1)!.capTable;
  const d = trial.round;
  const holderName = (id: string) => after.holders.find((h: Holder) => h.id === id)?.name ?? id;
  const seriesName = (id: string) => after.securities.find((s) => s.id === id)?.name ?? id;
  const series = String((trial.event.series as { id: string }).id);
  const amount = d.postMoneyValuation.minus(d.preMoney);
  const target = trial.event.pool_target_unissued_percent_post == null ? null : String(trial.event.pool_target_unissued_percent_post);
  const rows = conversionRows(table, target ? new D(target).div(100) : new D(0), d, after);
  const newShares = d.newShares.reduce((sum, n) => sum.plus(n.shares), new D(0));
  const label = `${seriesName(series)}, ${dollars(amount)} at ${sharePrice(d.price)} a share`;

  return (
    <div className="safes__results">
      <h3>The round</h3>
      <ul className="rounds__lines">
        <li>
          {terms.by === "price"
            ? `At ${sharePrice(d.price)} a share, the ${dollars(amount)} buys ${count(newShares)} shares of ${seriesName(series)}. The price implies a ${dollars(d.preMoney)} pre-money valuation, ${dollars(d.postMoneyValuation)} post-money, on the fully diluted shares the round is priced on.`
            : `At a ${dollars(d.preMoney)} pre-money valuation, ${dollars(d.postMoneyValuation)} post-money, the round is priced at ${sharePrice(d.price)} a share, and the ${dollars(amount)} buys ${count(newShares)} shares of ${seriesName(series)}.`}
        </li>
        {d.poolTopUp.gt(0) && target && <li>{`The pool is topped up by ${count(d.poolTopUp)} shares, to ${target}% of the company after the round. The top-up comes before the new money, so it dilutes only the holders before the round.`}</li>}
        {d.poolTopUp.isZero() && target && Number(target) > 0 && <li>{`The pool already meets its ${target}% target, so it isn't topped up.`}</li>}
        {d.antiDilution.map((a) => (
          <li key={a.series}>{`It's priced below ${seriesName(a.series)}'s conversion price, so that series' anti-dilution lowers it from ${sharePrice(a.cp1)} to ${sharePrice(a.cp2)}.`}</li>
        ))}
        <li>{`${seriesName(series)} is 1x non-participating, with broad-based anti-dilution, as "Add a round" starts a series. "${TRIAL_INVESTOR}" stands for whoever buys it.`}</li>
      </ul>

      {rows.map((r) => (
        <Conversion key={r.id} row={r} price={d.price} holder={holderName(r.holder)} series={seriesName(r.series)} />
      ))}

      <p className="card--quiet">These are what each one's terms give at this price, by spillpoint's reading of them. The SAFEs and notes themselves govern.</p>
      <button type="button" className="file-button file-button--primary" onClick={() => onSeePayouts({ draft: trial.draft, label })}>
        See the payouts after this round
      </button>
    </div>
  );
}

function Conversion({ row: r, price, holder, series }: { row: ConversionRow; price: Decimal; holder: string; series: string }) {
  const kind = r.kind === "safe" ? "SAFE" : "note";
  const discount = r.discount.isZero() ? null : asPercent(r.discount);
  const capText = r.cap ? `${dollars(r.cap.amount)} ${r.cap.kind === "post_money" ? "post-money" : "pre-money"} valuation cap` : "no cap";
  const terms =
    r.kind === "safe"
      ? `${dollars(r.amount)}, with ${r.cap ? `a ${capText}` : "no cap"} and ${discount ? `a ${discount} discount` : "no discount"}`
      : `${dollarsAndCents(r.principal!)} principal, with ${r.cap ? `a ${capText}` : "no cap"} and ${discount ? `a ${discount} discount` : "no discount"}`;

  const capLine = (() => {
    if (!r.capPrice || !r.capBase || !r.cap) return "It has no cap, so it has no cap price.";
    const price = sharePrice(r.capPrice);
    const shares = shareCount(r.capBase.shares);
    if (r.capBase.rule === "R4") {
      return `Its cap price is ${price}: its ${dollars(r.cap.amount)} cap ÷ the company capitalization just before the round, ${shares} shares. As the YC post-money SAFE counts it, that includes the SAFEs themselves and the pool before this round's increase, and leaves out the new money.`;
    }
    if (r.capBase.rule === "R24") {
      return `Its cap price is ${price}: its ${dollars(r.cap.amount)} cap ÷ the ${shares} shares and options outstanding with the pool after this round's increase. A pre-money SAFE counts them that way, leaving out every SAFE and note.`;
    }
    const base = { with_pool: "counting the unissued pool", without_pool: "not counting the unissued pool", common_only: "common stock only" }[r.capBase.noteBase!];
    return `Its cap price is ${price}: its ${dollars(r.cap.amount)} cap ÷ the ${shares} shares just before the round, ${base}, as the note's terms count them.`;
  })();
  const discountLine = discount
    ? `Its discount price is ${sharePrice(r.discountPrice)}: the round's ${sharePrice(price)} less its ${discount} discount.`
    : `It has no discount, so its discount price is the round's own, ${sharePrice(price)}.`;
  const what = r.kind === "safe" ? `Its ${dollars(r.amount)}` : `Its ${dollarsAndCents(r.amount)}, the principal and ${dollarsAndCents(r.interest!)} of interest to the round's date,`;
  const converts = r.capPrice
    ? `${what} converts at the lower of the two, its ${r.method === "cap" ? "cap" : "discount"} price (the cap on a tie): ${count(r.shares)} shares of ${series}, rounded down to whole shares. That's ${percentOf(r.shareAfter)} of the company after the round, fully diluted.`
    : `${what} converts at its discount price: ${count(r.shares)} shares of ${series}, rounded down to whole shares. That's ${percentOf(r.shareAfter)} of the company after the round, fully diluted.`;
  const preference = `${series} has the round's terms with its own ${sharePrice(r.conversionPrice)} as its issue price, so its preference on these shares is ${dollarsAndCents(r.preference)}, ${halfUp(r.multiple, 4).toFixed()}x what they converted at.`;
  const crossover = (() => {
    if (r.capTakesOver) {
      const below = discount ? "its discount does" : "it converts at the round's own price";
      return `At ${sharePrice(r.capTakesOver)} a share or more, its cap sets its price; below that, ${below}.`;
    }
    if (r.notExact === "no_cap") return discount ? "With no cap, its discount sets its price at any round price." : "With no cap and no discount, it converts at the round's own price, whatever that is.";
    const why =
      r.notExact === "others_beside"
        ? "the company capitalization counts the notes and other SAFEs converting beside it, whose shares can depend on the price"
        : "it counts the pool's increase, which grows with the round";
    return `Its cap price can move with the round's price here: ${why}. So there's no one price where its cap takes over. At ${sharePrice(price)}, its ${r.method} sets its price.`;
  })();

  return (
    <article className="safes__item" aria-labelledby={`safes-${r.id}`}>
      <h3 id={`safes-${r.id}`}>
        {holder}'s {kind}
      </h3>
      <p className="safes__terms">{terms}</p>
      <ul className="rounds__lines">
        <li>{capLine}</li>
        <li>{discountLine}</li>
        <li>{converts}</li>
        <li>{preference}</li>
        <li>{crossover}</li>
      </ul>
    </article>
  );
}
