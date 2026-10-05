// The exit value: a log-scale slider with tick marks at the breakpoints, and
// a box to type an exact amount (M3 plan, answer 3).

import { useEffect, useState } from "react";
import { D } from "spillpoint";

import { dollars, parseDollars, shortDollars } from "./format.ts";
import { STEPS, logScale, positionOf, valueAt } from "./scale.ts";

type Decimal = D;

interface Props {
  range: readonly [Decimal, Decimal];
  value: Decimal;
  onChange: (value: Decimal) => void;
  /** Where the payout curves bend or jump; marked under the slider. Empty while they compute. */
  breakpoints: readonly Decimal[];
}

export function ExitSlider({ range, value, onChange, breakpoints }: Props) {
  const scale = logScale(range);
  const [typed, setTyped] = useState(dollars(value));
  const [typedError, setTypedError] = useState<string | null>(null);

  // Keep the box in step when the slider moves it.
  useEffect(() => setTyped(dollars(value)), [value]);

  const commitTyped = () => {
    const parsed = parseDollars(typed);
    if (!parsed) {
      setTypedError("Type an amount like 25000000, $25M or 2.5B.");
      return;
    }
    if (parsed.lt(range[0]) || parsed.gt(range[1])) {
      setTypedError(`Type an amount between ${shortDollars(range[0])} and ${shortDollars(range[1])}.`);
      return;
    }
    setTypedError(null);
    onChange(parsed);
  };

  const ticks = breakpoints.filter((b) => b.gte(scale.min) && b.lte(scale.max));

  return (
    <div className="exit-value">
      <div className="exit-value__typed">
        <label htmlFor="exit-value-box">Exit value</label>
        <input
          id="exit-value-box"
          type="text"
          inputMode="decimal"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onBlur={commitTyped}
          onKeyDown={(e) => e.key === "Enter" && commitTyped()}
          aria-invalid={typedError !== null}
          aria-describedby={typedError ? "exit-value-error" : undefined}
        />
        {typedError && (
          <span id="exit-value-error" className="field-error">
            {typedError}
          </span>
        )}
      </div>
      <div className="exit-value__slider">
        <input
          type="range"
          min={0}
          max={STEPS}
          step={1}
          value={positionOf(scale, value)}
          onChange={(e) => onChange(valueAt(scale, Number(e.target.value)))}
          aria-label="Exit value"
          aria-valuetext={shortDollars(value)}
        />
        <div className="exit-value__ticks" aria-hidden="true">
          {ticks.map((b) => (
            <span
              key={b.toString()}
              className="exit-value__tick"
              style={{ left: `${(positionOf(scale, b) / STEPS) * 100}%` }}
              title={`Breakpoint at ${dollars(b)}`}
            />
          ))}
        </div>
        <div className="exit-value__ends" aria-hidden="true">
          <span>{shortDollars(scale.min)}</span>
          <span>{shortDollars(scale.max)}</span>
        </div>
      </div>
    </div>
  );
}
