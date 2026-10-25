// The form fields the Terms tab and the LPs tab's classes share: a percent box, a refusal's words under the control it
// names, and a carry, flat or in steps (F9), the fund's on Terms and a class's on LPs (F22). A class's carry reads its
// problems in the Terms tab's words, at its own paths.

import type { Problem, StepText, CarryForm } from "./terms.ts";
import { controlFor } from "./terms.ts";

/** A refusal's words, under the control it names. */
export function FieldProblem({ path, problem }: { path: string | ((p: string) => boolean); problem: Problem | null }) {
  if (!problem || !(typeof path === "string" ? problem.path === path : path(problem.path))) return null;
  return (
    <p id={`${controlFor(problem.path)}-problem`} className="field-error" role="alert">
      {problem.message}
    </p>
  );
}

interface PercentProps {
  id: string;
  label: string;
  value: string;
  problem: Problem | null;
  onChange: (v: string) => void;
  hiddenLabel?: boolean | undefined;
  /** A path whose problem this box also carries: a class's carry in steps, refused as a whole, marks its first rate. */
  carries?: string | undefined;
}

/** A percent box: the rate typed as a percent, "%" after it. */
export function Percent({ id, label, value, problem, onChange, hiddenLabel, carries }: PercentProps) {
  const mine = problem !== null && (controlFor(problem.path) === id || problem.path === carries);
  return (
    <span className="terms__field">
      <label htmlFor={id} className={hiddenLabel ? "visually-hidden" : undefined}>
        {label}
      </label>
      <span className="terms__percent">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={mine}
          aria-describedby={mine ? `${controlFor(problem.path)}-problem` : undefined}
        />
        <span aria-hidden="true">%</span>
      </span>
    </span>
  );
}

interface CarryProps {
  /** The carry's path: "terms.carry", or "terms.lp_classes[0].carry" for a class's. */
  at: string;
  /** Whose carry, for its fields' names: null for the fund's ("Carry rate"), "Class 1" for a class's ("Class 1's carry rate"). */
  owner: string | null;
  carry: CarryForm;
  problem: Problem | null;
  onCarry: (carry: CarryForm) => void;
  /** In a table's cell, the flat rate's label is for screen readers only, as the LPs' cells' are. */
  inTable?: boolean | undefined;
}

/** A carry's fields: its one rate, or its steps, each with its rate and, after the first, the LP multiple it starts from. */
export function Carry({ at, owner, carry, problem, onCarry, inTable }: CarryProps) {
  const setStep = (i: number, step: StepText) => onCarry({ ...carry, steps: carry.steps.map((s, j) => (j === i ? step : s)) });
  const stepPath = (i: number) => `${at}.steps[${i}]`;
  const stepName = (i: number) => (owner ? `${owner}, step ${i + 1}` : `Step ${i + 1}`);
  const multipleId = (i: number) => `${stepPath(i)}.from_lp_multiple`;
  const multipleMine = (i: number) => problem !== null && controlFor(problem.path) === multipleId(i);
  if (carry.mode === "flat") {
    return (
      <>
        <Percent id={at} label={owner ? `${owner}'s carry rate` : "Carry rate"} hiddenLabel={inTable} value={carry.flat} problem={problem} onChange={(flat) => onCarry({ ...carry, flat })} />
        <FieldProblem path={at} problem={problem} />
      </>
    );
  }
  return (
    <>
      <ol className="terms__steps">
        {carry.steps.map((s, i) => (
          <li key={i}>
            <span className="terms__step-name">Step {i + 1}</span>
            <Percent
              id={`${stepPath(i)}.rate`}
              label={`${stepName(i)}'s carry rate`}
              hiddenLabel
              value={s.rate}
              problem={problem}
              onChange={(rate) => setStep(i, { ...s, rate })}
              carries={i === 0 ? at : undefined}
            />
            {i === 0 ? (
              <span className="muted">from the start</span>
            ) : (
              <span className="terms__field">
                <label htmlFor={multipleId(i)}>from an LP multiple of</label>
                <span className="terms__percent">
                  <input
                    id={multipleId(i)}
                    type="text"
                    inputMode="decimal"
                    value={s.from}
                    onChange={(e) => setStep(i, { ...s, from: e.target.value })}
                    aria-label={`${stepName(i)} starts from an LP multiple of`}
                    aria-invalid={multipleMine(i)}
                    aria-describedby={multipleMine(i) ? `${multipleId(i)}-problem` : undefined}
                  />
                  <span aria-hidden="true">x</span>
                </span>
              </span>
            )}
            {i > 0 && (
              <button
                type="button"
                className="link-button"
                aria-label={owner ? `Remove ${owner.toLowerCase()}'s step ${i + 1}` : `Remove step ${i + 1}`}
                onClick={() => onCarry({ ...carry, steps: carry.steps.filter((_, j) => j !== i) })}
              >
                Remove
              </button>
            )}
            <FieldProblem path={(p) => p === stepPath(i) || p.startsWith(`${stepPath(i)}.`)} problem={problem} />
          </li>
        ))}
      </ol>
      {/* A class's carry refused as a whole, its catch-up's share not above it (F8, F22): under its steps. */}
      <FieldProblem path={at} problem={problem} />
      <button
        type="button"
        className="button"
        aria-label={owner ? `Add a step to ${owner.toLowerCase()}'s carry` : undefined}
        onClick={() => onCarry({ ...carry, steps: [...carry.steps, { rate: "", from: "" }] })}
      >
        Add a step
      </button>
    </>
  );
}
