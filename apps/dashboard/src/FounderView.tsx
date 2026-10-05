// The first screen (M3 plan, answer 1): who you are, what you get at this
// exit value, your share of the proceeds against your share of the company,
// and where your payout starts.

import type { Answer, PreparedCapTable } from "spillpoint";
import { D } from "spillpoint";

import { fullyDiluted, holderShares, payoutStart } from "./capTable.ts";
import type { BreakpointsState } from "./breakpoints.ts";
import { percent, shortDollars } from "./format.ts";

type Decimal = D;

interface Props {
  pc: PreparedCapTable;
  range: readonly [Decimal, Decimal];
  answer: Answer;
  exitValue: Decimal;
  you: string;
  onChooseYou: (holder: string) => void;
  breakpoints: BreakpointsState;
}

export function FounderView({ pc, range, answer, exitValue, you, onChooseYou, breakpoints }: Props) {
  const gets = answer.payout.holderTotals.get(you) ?? new D(0);
  const ofProceeds = exitValue.isZero() ? new D(0) : gets.div(exitValue);
  const ofCompany = holderShares(pc, you).div(fullyDiluted(pc));

  return (
    <section className="founder" aria-labelledby="founder-headline">
      <label className="founder__you">
        You are{" "}
        <select value={you} onChange={(e) => onChooseYou(e.target.value)}>
          {pc.capTable.holders.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <h1 id="founder-headline" className="founder__headline">
        At {shortDollars(exitValue)} you get {shortDollars(gets)}
      </h1>
      <p className="founder__compare">
        That's {percent(ofProceeds)} of the proceeds, for {percent(ofCompany)} of the company (fully diluted
        {pc.capTable.unissuedPool.gt(0) ? ", including the option pool" : ""}).
      </p>
      <p className="founder__start">
        <PayoutStartLine pc={pc} range={range} you={you} breakpoints={breakpoints} />
      </p>
    </section>
  );
}

function PayoutStartLine({ pc, range, you, breakpoints }: Omit<Props, "answer" | "exitValue" | "onChooseYou">) {
  if (breakpoints.status === "computing") return <span className="muted">Working out where your payout starts…</span>;
  if (breakpoints.status === "error") return <span className="muted">Couldn't work out where your payout starts: {breakpoints.message}</span>;
  const start = payoutStart(
    pc,
    you,
    range,
    breakpoints.breakpoints.map((b) => new D(b.exitValue)),
  );
  if (start.kind === "first dollar") return <>You're paid from the first dollar.</>;
  if (start.kind === "from") return <>You get nothing below {shortDollars(start.exitValue)}.</>;
  return <>You get nothing up to {shortDollars(start.upTo)}.</>;
}
