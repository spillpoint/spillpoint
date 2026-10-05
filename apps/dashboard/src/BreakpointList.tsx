// Every breakpoint, numbered as on the chart, with its plain-English reasons.
// Clicking one moves the exit value there. The ones that change your payout
// say so, and say how: what each extra $1M of exit value adds to your payout
// on either side, or how far it jumps.

import { D } from "spillpoint";

import type { BreakpointView } from "./analysis.ts";
import type { Change } from "./curves.ts";
import { dollars, dollarsAndCents, shortDollars } from "./format.ts";

type Decimal = D;

interface Props {
  breakpoints: readonly BreakpointView[];
  /** How each breakpoint changes your payout, by index; null where it doesn't. */
  changes: readonly (Change | null)[];
  yourName: string;
  exitValue: Decimal;
  onExitValue: (value: Decimal) => void;
}

export function BreakpointList({ breakpoints, changes, yourName, exitValue, onExitValue }: Props) {
  return (
    <section className="card" aria-labelledby="breakpoints-heading">
      <h2 id="breakpoints-heading">Breakpoints</h2>
      <p className="card__intro">
        A breakpoint is an exit value where someone's payout bends or jumps. The ones marked "Changes your payout" are where{" "}
        {yourName}'s payout bends or jumps. Choose one to move the exit value there.
      </p>
      {breakpoints.length === 0 ? (
        <p>No breakpoints in this range: every payout is a straight line.</p>
      ) : (
        <ol className="breakpoints">
          {breakpoints.map((b, i) => {
            const x = new D(b.exitValue);
            const here = x.toDecimalPlaces(2).eq(exitValue.toDecimalPlaces(2));
            const change = changes[i] ?? null;
            return (
              <li key={b.exitValue} className={here ? "is-here" : undefined}>
                <button type="button" className="breakpoints__head" onClick={() => onExitValue(x)} aria-current={here ? "true" : undefined}>
                  <span className={`breakpoints__n${change ? " is-yours" : ""}`} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="breakpoints__value">
                    {dollars(x)} <span className="muted">({shortDollars(x)})</span>
                  </span>
                  {change && <span className="tag">Changes your payout</span>}
                  {b.jumps && <span className="tag tag--quiet">Payouts jump</span>}
                  {here && <span className="tag tag--quiet">The exit value is here</span>}
                </button>
                {change && <p className="breakpoints__yours">{forYou(change)}</p>}
                {b.reasons.map((r) => (
                  <p key={r.code + r.subject.join("+")} className="breakpoints__reason">
                    {r.text}
                  </p>
                ))}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/**
 * One line on how a breakpoint changes your payout. A bend compares what each
 * extra $1M adds just above the breakpoint with just below it; a jump gives
 * its size. Whole dollars, unless they would round two different amounts to
 * the same figure, then cents.
 */
function forYou(change: Change): string {
  if (change.kind === "jump") {
    // The size is the difference of the two amounts as shown, so the line adds up as written.
    const cents = dollars(change.from) === dollars(change.to);
    const shown = (v: D) => v.toDecimalPlaces(cents ? 2 : 0, D.ROUND_HALF_UP);
    const money = cents ? dollarsAndCents : dollars;
    const by = shown(change.to).minus(shown(change.from));
    return `For you: your payout ${by.isNegative() ? "drops" : "jumps"} ${money(by.abs())} here, from ${money(change.from)} to ${money(change.to)}.`;
  }
  const money = dollars(change.after) === dollars(change.before) ? dollarsAndCents : dollars;
  return `For you: each extra $1M now adds ${money(change.after)}, ${change.after.gt(change.before) ? "up" : "down"} from ${money(change.before)}.`;
}
