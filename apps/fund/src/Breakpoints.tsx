// Every breakpoint, numbered as on the chart, in the engine's words (F15), with what an extra $1M of X gives the GP in
// carry on either side. For a final fund the clawback's reasons are listed too, as in the clawback card (f01h).
// Choosing one moves X there, exactly.

import type { D, Fund } from "spillpoint-fund";
import { toCents } from "spillpoint-fund";

import type { BreakpointView } from "./analysis.ts";
import { cents, short, wholeDollars } from "./format.ts";

type Decimal = D;

/** The engine's words as a sentence: its first letter up, a full stop after. */
function sentence(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

/** What an extra $1M of X gives the GP in carry just below the breakpoint and just above it. */
function gpLine({ below, above }: BreakpointView["gpPerMillion"]): string {
  const [from, to] = [wholeDollars(below), wholeDollars(above)];
  return from === to ? `The GP's carry stays at ${from} per extra $1M.` : `The GP's carry goes from ${from} to ${to} per extra $1M.`;
}

interface Props {
  fund: Fund;
  breakpoints: readonly BreakpointView[];
  x: Decimal;
  onX: (x: Decimal) => void;
}

export function Breakpoints({ fund, breakpoints, x, onX }: Props) {
  return (
    <section className="card" aria-labelledby="breakpoints-heading">
      <h2 id="breakpoints-heading">Breakpoints</h2>
      <p className="card__intro">
        A breakpoint is a distribution X where one of its tiers ends, so the split bends
        {fund.final ? ", or where the clawback owed changes, since this is the fund's last distribution" : ""}. Choose one to move X there.
      </p>
      {breakpoints.length === 0 ? (
        <p>No breakpoints: every amount is a straight line in X.</p>
      ) : (
        <ol className="breakpoints">
          {breakpoints.map((b) => {
            const here = toCents(b.x) === toCents(x);
            return (
              <li key={b.n} className={here ? "is-here" : undefined}>
                <button type="button" className="breakpoints__head" onClick={() => onX(b.x)} aria-current={here ? "true" : undefined}>
                  <span className="breakpoints__n" aria-hidden="true">
                    {b.n}
                  </span>
                  <span className="breakpoints__value">
                    {cents(b.x)} <span className="muted">({short(b.x)})</span>
                  </span>
                  {here && <span className="tag tag--quiet">X is here</span>}
                </button>
                {/* With classes, two accounts' reasons can share a code at one X (F27). */}
                {b.reasons.map((r, i) => (
                  <p key={i} className="breakpoints__reason">
                    {sentence(r.text)}
                  </p>
                ))}
                <p className="breakpoints__gp">{gpLine(b.gpPerMillion)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
