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
                    {dollarsAndCents(x)} <span className="muted">({shortDollars(x)})</span>
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

/** Why a curved rate keeps changing (X17): only a carve-out alongside the preferences makes payouts curve. */
const CURVE_WHY = "because the carve-out's claim grows with the exit value";

/**
 * One line on how a breakpoint changes your payout. A bend compares what each
 * extra $1M adds just above the breakpoint with just below it; a jump gives
 * its size, to the cent, as the payouts are. A rate is approximate: whole
 * dollars, unless they would round two different rates to the same figure,
 * then cents. On a curved side the rate is the one right at
 * the breakpoint, so it's "about" that, and the line says why it keeps
 * changing, in the wording approved in the M5d review (X17).
 */
function forYou(change: Change): string {
  if (change.kind === "jump") {
    // The size is the difference of the two amounts as shown, to the cent, so the line adds up as written.
    const shown = (v: D) => v.toDecimalPlaces(2, D.ROUND_HALF_UP);
    const by = shown(change.to).minus(shown(change.from));
    return `For you: your payout ${by.isNegative() ? "drops" : "jumps"} ${dollarsAndCents(by.abs())} here, from ${dollarsAndCents(change.from)} to ${dollarsAndCents(change.to)}.`;
  }
  const money = dollars(change.after) === dollars(change.before) ? dollarsAndCents : dollars;
  const direction = change.after.gt(change.before) ? "up" : "down";
  if (change.curvedBefore && change.curvedAfter) {
    return `For you: just below here each extra $1M adds about ${money(change.before)}; just above, about ${money(change.after)}. The rate keeps changing on both sides, ${CURVE_WHY}.`;
  }
  if (change.curvedBefore) {
    return `For you: each extra $1M now adds ${money(change.after)}, ${direction} from about ${money(change.before)} just below. Below here the rate keeps changing, ${CURVE_WHY}.`;
  }
  if (change.curvedAfter) {
    return `For you: just above here each extra $1M adds about ${money(change.after)}, ${direction} from ${money(change.before)}. Above here the rate keeps changing, ${CURVE_WHY}.`;
  }
  return `For you: each extra $1M now adds ${money(change.after)}, ${direction} from ${money(change.before)}.`;
}
