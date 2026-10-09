// The exit value: a log-scale slider with tick marks at the breakpoints, and
// a box to type an exact amount (M3 plan, answer 3). Each mark is a button:
// hovering or focusing it shows its exit value and reasons (M3a review), and
// choosing it moves the exit value there.

import { useEffect, useState } from "react";
import type React from "react";
import { D } from "spillpoint";

import type { BreakpointView } from "./analysis.ts";
import { dollarsAndCents, exitValueText, parseDollars, shortDollars } from "./format.ts";
import { STEPS, logScale, positionOf, valueAt } from "./scale.ts";

type Decimal = D;

interface Props {
  range: readonly [Decimal, Decimal];
  value: Decimal;
  onChange: (value: Decimal) => void;
  /** Where the payout curves bend or jump; marked under the slider. Empty while they compute. */
  breakpoints: readonly BreakpointView[];
}

export function ExitSlider({ range, value, onChange, breakpoints }: Props) {
  const scale = logScale(range);
  const [typed, setTyped] = useState(exitValueText(value));
  const [typedError, setTypedError] = useState<string | null>(null);

  // Keep the box in step when the slider moves it.
  useEffect(() => setTyped(exitValueText(value)), [value]);

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

  const [shown, setShown] = useState<number | null>(null);
  // Escape closes a mark's box, however it opened, without moving the pointer or focus (WCAG 1.4.13).
  useEffect(() => {
    if (shown === null) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setShown(null);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [shown]);
  // Numbered as on the chart and in the list, so a mark's number means the same everywhere.
  const ticks = breakpoints
    .map((b, i) => ({ b, n: i + 1, x: new D(b.exitValue) }))
    .filter(({ x }) => x.gte(scale.min) && x.lte(scale.max));

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
        <div className="exit-value__ticks">
          {ticks.map(({ b, n, x }) => (
            <button
              key={b.exitValue}
              type="button"
              className="exit-value__tick"
              style={{ left: `${(positionOf(scale, x) / STEPS) * 100}%` }}
              aria-label={`Breakpoint ${n}, at ${dollarsAndCents(x)}`}
              aria-describedby={shown === n ? "tick-tip" : undefined}
              onMouseEnter={() => setShown(n)}
              onMouseLeave={() => setShown(null)}
              onFocus={() => setShown(n)}
              onBlur={() => setShown(null)}
              onClick={() => onChange(x)}
            />
          ))}
          {ticks
            .filter(({ n }) => n === shown)
            .map(({ b, n, x }) => (
              <div key="tip" id="tick-tip" role="tooltip" className="tick-tip" style={tipPlace((positionOf(scale, x) / STEPS) * 100)}>
                <strong>
                  Breakpoint {n}: {dollarsAndCents(x)}
                </strong>
                {b.reasons.map((r) => (
                  <span key={r.code + r.subject.join("+")}>{r.text}</span>
                ))}
              </div>
            ))}
        </div>
        <div className="exit-value__ends" aria-hidden="true">
          <span>{shortDollars(scale.min)}</span>
          <span>{shortDollars(scale.max)}</span>
        </div>
        {ticks.length > 0 && (
          <p className="exit-value__caption">
            Each mark is a breakpoint: an exit value where someone's payout bends or jumps. Hover over or tab to a mark to see why; choose it to move
            the exit value there.
          </p>
        )}
      </div>
    </div>
  );
}

/** Where a mark's box goes: centred on its mark, or held to one side near an end so it stays on a narrow screen. */
function tipPlace(percent: number): React.CSSProperties {
  if (percent < 30) return { left: `${percent}%`, transform: "translateX(-12px)" };
  if (percent > 70) return { right: `${100 - percent}%`, transform: "translateX(12px)" };
  return { left: `${percent}%` };
}
