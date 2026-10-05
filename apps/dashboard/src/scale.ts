// The exit-value slider's log scale (M3 plan, answer 3). Most of what
// changes a founder's outcome happens at the low end, so on a linear slider
// it would get a sliver. These are screen positions only: the exit value
// itself is always an exact Decimal, rounded to three significant digits when
// it comes from the slider and taken as typed otherwise.

import { D } from "spillpoint";

/** The engine's 40-digit Decimal. */
type Decimal = D;

/** Slider positions run from 0 to STEPS. */
export const STEPS = 1000;

export interface LogScale {
  min: Decimal;
  max: Decimal;
}

/** The slider's span: the range's top, down to a thousandth of it (a log scale can't reach $0). */
export function logScale(range: readonly [Decimal, Decimal]): LogScale {
  const [lo, hi] = range;
  const floor = hi.div(1000);
  return { min: lo.gt(floor) ? lo : floor, max: hi };
}

/** Where an exit value sits on the slider, 0 to STEPS. Values below the slider's span sit at 0. */
export function positionOf(scale: LogScale, value: Decimal): number {
  if (value.lte(scale.min)) return 0;
  if (value.gte(scale.max)) return STEPS;
  const t = value.ln().minus(scale.min.ln()).div(scale.max.ln().minus(scale.min.ln()));
  return Math.round(t.times(STEPS).toNumber());
}

/** The exit value at a slider position, rounded to three significant digits so it reads cleanly. */
export function valueAt(scale: LogScale, position: number): Decimal {
  if (position <= 0) return scale.min;
  if (position >= STEPS) return scale.max;
  const lnValue = scale.min.ln().plus(scale.max.ln().minus(scale.min.ln()).times(position).div(STEPS));
  return lnValue.exp().toSignificantDigits(3, D.ROUND_HALF_UP);
}
