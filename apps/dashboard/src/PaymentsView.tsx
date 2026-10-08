// Paid over time (M5 plan, item 14): for each payment schedule in the Exit
// terms, each payment and each holder's take of it. The slider and the curves
// stay on the price in all. The waterfall runs on cumulative proceeds, so a
// payment goes where it would have gone had it all been paid at closing, and
// a holder's take is its payout after the payment less before it (X8). A
// payment that lowers a holder's running total says so plainly, on that
// payment, not just in the number (X8, Jordan, M3 planning).

import { D, NoAnswerError, paySchedule } from "spillpoint";
import type { PaymentSchedule, PaymentTake, PreparedCapTable } from "spillpoint";

import { outstandingNames } from "./capTable.ts";
import { dollars, dollarsAndCents, withoutCodes } from "./format.ts";

type Decimal = D;

interface Props {
  pc: PreparedCapTable;
  schedules: readonly PaymentSchedule[];
  you: string;
}

/** A take to the cent, each rounded on its own (X8), with a true minus sign where it's negative. */
function take(amount: Decimal): string {
  const shown = dollarsAndCents(amount);
  return shown.startsWith("-") ? `−${shown.slice(1)}` : shown;
}

const list = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

export function PaymentsView({ pc, schedules, you }: Props) {
  if (schedules.length === 0) return null;
  return (
    <section className="card" aria-labelledby="paid-over-time-heading">
      <h2 id="paid-over-time-heading">Paid over time</h2>
      <p className="card__intro">
        Each payment goes where it would have gone had it all been paid at closing: the payouts are worked out on the amount paid so far, and a
        holder's take of a payment is the difference it makes. The slider and the curves above are on the price in all.
      </p>
      {schedules.map((schedule) => (
        <Schedule key={schedule.id} pc={pc} schedule={schedule} you={you} />
      ))}
      <p className="footnote">Each take is rounded to the cent on its own, so a row's takes can add up to a cent more or less than its total.</p>
    </section>
  );
}

function Schedule({ pc, schedule, you }: { pc: PreparedCapTable; schedule: PaymentSchedule; you: string }) {
  const name = schedule.description ?? schedule.id;
  let takes: PaymentTake[];
  try {
    takes = paySchedule(pc, schedule);
  } catch (e) {
    if (!(e instanceof NoAnswerError)) throw e;
    return (
      <div className="payments">
        <h3>{name}</h3>
        <p className="card card--quiet">These takes can't be worked out: {withoutCodes(e.message)}</p>
      </div>
    );
  }
  const holderName = (id: string) => pc.capTable.holders.find((h) => h.id === id)?.name ?? id;
  // Everyone with a take in some payment, in the cap table's order.
  const holders = pc.capTable.holders.filter((h) => takes.some((t) => !t.holderTotals.get(h.id)?.isZero() && t.holderTotals.has(h.id)));
  const total = (id: string) => takes.reduce((sum, t) => sum.plus(t.holderTotals.get(id) ?? 0), new D(0));
  return (
    <div className="payments">
      <h3>{name}</h3>
      {takes.map((t, k) => (t.lowered.length > 0 ? <Lowered key={k} pc={pc} take={t} before={takes[k - 1] ?? null} holderName={holderName} /> : null))}
      <div className="table-scroll">
        <table className="payouts payments__table">
          <thead>
            <tr>
              <th scope="col">Holder</th>
              {takes.map((t, k) => (
                <th key={k} scope="col" className="num">
                  {t.label}
                  <span className="payments__amount">{dollars(t.amount)}</span>
                </th>
              ))}
              <th scope="col" className="num">
                In all
                <span className="payments__amount">{dollars(takes.at(-1)!.cumulative)}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {holders.map((h) => (
              <tr key={h.id} className={h.id === you ? "is-you" : undefined}>
                <th scope="row">
                  {h.name}
                  {h.id === you && <span className="you-tag"> (you)</span>}
                </th>
                {takes.map((t, k) => {
                  const v = t.holderTotals.get(h.id)!;
                  const lowered = t.lowered.includes(h.id);
                  return (
                    <td key={k} className={`num${lowered ? " payments__lowered" : ""}`}>
                      {take(v)}
                      {lowered && <span className="visually-hidden"> (lowers the running total)</span>}
                    </td>
                  );
                })}
                <td className="num">{take(total(h.id))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * X8's warning: this payment lowers some holders' running totals. Says by how
 * much, and why: at the amount paid so far the decisions are made again, as
 * if it had all been paid at closing, and here some change.
 */
function Lowered({ pc, take: t, before, holderName }: { pc: PreparedCapTable; take: PaymentTake; before: PaymentTake | null; holderName: (id: string) => string }) {
  const outstanding = outstandingNames(pc);
  const className = (id: string) => pc.capTable.securities.find((s) => s.id === id)?.name ?? outstanding.get(id) ?? id;
  const was = before?.decisions.converted ?? new Set<string>();
  const now = t.decisions.converted;
  const converting = [...now].filter((id) => !was.has(id)).map(className);
  const reverting = [...was].filter((id) => !now.has(id)).map(className);
  const changed = [
    converting.length > 0 ? `${list(converting)} ${converting.length === 1 ? "converts" : "convert"}` : null,
    reverting.length > 0 ? `${list(reverting)} no longer ${reverting.length === 1 ? "converts" : "convert"}` : null,
  ].filter((x): x is string => x !== null);
  const giving = t.lowered.map((id) => `${holderName(id)} gives back ${dollarsAndCents(t.holderTotals.get(id)!.neg())}`);
  const why = changed.length > 0 && before ? `At ${dollars(t.cumulative)} paid in all, ${list(changed)}, unlike at ${dollars(before.cumulative)}. ` : "";
  return (
    <div className="notice notice--problem payments__warning" role="note">
      <strong>
        The payment “{t.label}” lowers what {list(t.lowered.map(holderName))} {t.lowered.length === 1 ? "has" : "have"} been paid so far.
      </strong>{" "}
      {list(giving)}. {why}Each payment's takes are worked out on everything paid so far, as if it had all been paid at closing, so a later payment
      can take back part of an earlier one.
    </div>
  );
}
