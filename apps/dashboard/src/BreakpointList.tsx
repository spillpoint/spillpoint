// Every breakpoint, numbered as on the chart, with its plain-English reasons.
// Clicking one moves the exit value there. The ones that change your payout
// say so.

import { D } from "spillpoint";

import type { BreakpointView } from "./analysis.ts";
import { dollars, shortDollars } from "./format.ts";

type Decimal = D;

interface Props {
  breakpoints: readonly BreakpointView[];
  /** Which breakpoints change your payout, by index. */
  yours: readonly boolean[];
  yourName: string;
  exitValue: Decimal;
  onExitValue: (value: Decimal) => void;
}

export function BreakpointList({ breakpoints, yours, yourName, exitValue, onExitValue }: Props) {
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
            return (
              <li key={b.exitValue} className={here ? "is-here" : undefined}>
                <button type="button" className="breakpoints__head" onClick={() => onExitValue(x)} aria-current={here ? "true" : undefined}>
                  <span className={`breakpoints__n${yours[i] ? " is-yours" : ""}`} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="breakpoints__value">
                    {dollars(x)} <span className="muted">({shortDollars(x)})</span>
                  </span>
                  {yours[i] && <span className="tag">Changes your payout</span>}
                  {b.jumps && <span className="tag tag--quiet">Payouts jump</span>}
                  {here && <span className="tag tag--quiet">The exit value is here</span>}
                </button>
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
