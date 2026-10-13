// The Terms tab (plan, "The terms: a form", f01i): carry flat or in steps, the pref, the catch-up with a pref, and the
// GP commitment with F3's two flags. Each change runs the engine again; a refusal shows under the field its path names,
// and at the top of the form with "Show me".

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { Problem, StepText, TermsForm } from "./terms.ts";
import { controlFor, toFlat, toSteps } from "./terms.ts";

interface Props {
  form: TermsForm;
  problem: Problem | null;
  onForm: (form: TermsForm) => void;
  onShow: (path: string) => void;
}

/** A refusal's words, under the control it names. */
function FieldProblem({ path, problem }: { path: string | ((p: string) => boolean); problem: Problem | null }) {
  if (!problem || !(typeof path === "string" ? problem.path === path : path(problem.path))) return null;
  return (
    <p id={`${controlFor(problem.path)}-problem`} className="field-error" role="alert">
      {problem.message}
    </p>
  );
}

/** A percent box: the rate typed as a percent, "%" after it. */
function Percent({ id, label, value, problem, onChange, hiddenLabel }: { id: string; label: string; value: string; problem: Problem | null; onChange: (v: string) => void; hiddenLabel?: boolean }) {
  const mine = problem !== null && controlFor(problem.path) === id;
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
          aria-describedby={mine ? `${id}-problem` : undefined}
        />
        <span aria-hidden="true">%</span>
      </span>
    </span>
  );
}

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="terms__group">
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

export function Terms({ form, problem, onForm, onShow }: Props) {
  const { carry, pref, catchUp, gpCommitment: g } = form;
  // A term turned on starts at its usual value, selected in its field, so it's typed straight over (f01i review,
  // answer 3). The field appears with the change, so it's focused once it's there.
  const [selecting, setSelecting] = useState<string | null>(null);
  useEffect(() => {
    if (selecting === null) return;
    const field = document.getElementById(selecting);
    if (!(field instanceof HTMLInputElement)) return;
    field.focus();
    field.select();
    setSelecting(null);
  }, [selecting, form]);
  const turnOn = (next: TermsForm, field: string) => {
    onForm(next);
    setSelecting(field);
  };
  const setStep = (i: number, step: StepText) => onForm({ ...form, carry: { ...carry, steps: carry.steps.map((s, j) => (j === i ? step : s)) } });
  const stepPath = (i: number) => `terms.carry.steps[${i}]`;
  return (
    <section className="card terms" aria-labelledby="terms-heading">
      <h2 id="terms-heading">Terms</h2>
      <p className="card__intro">Rates are percents, written exactly as typed: 7.25% is 0.0725, with nothing rounded. Each change runs the waterfall again.</p>
      {problem && (
        <div className="notice notice--problem" role="status">
          <strong>The fund can't run as it is.</strong> {problem.message}{" "}
          <button type="button" className="link-button" onClick={() => onShow(problem.path)}>
            Show me
          </button>
        </div>
      )}

      <Fieldset legend="Carry">
        <div className="terms__choice" role="radiogroup" aria-label="Carry">
          <label>
            <input type="radio" name="carry-mode" checked={carry.mode === "flat"} onChange={() => onForm(toFlat(form))} /> Flat
          </label>
          <label>
            <input type="radio" name="carry-mode" checked={carry.mode === "steps"} onChange={() => onForm(toSteps(form))} /> In steps
          </label>
        </div>
        {carry.mode === "flat" ? (
          <>
            <Percent id="terms.carry" label="Carry rate" value={carry.flat} problem={problem} onChange={(flat) => onForm({ ...form, carry: { ...carry, flat } })} />
            <FieldProblem path="terms.carry" problem={problem} />
          </>
        ) : (
          <>
            <ol className="terms__steps">
              {carry.steps.map((s, i) => (
                <li key={i}>
                  <span className="terms__step-name">Step {i + 1}</span>
                  <Percent id={`${stepPath(i)}.rate`} label={`Step ${i + 1}'s carry rate`} hiddenLabel value={s.rate} problem={problem} onChange={(rate) => setStep(i, { ...s, rate })} />
                  {i === 0 ? (
                    <span className="muted">from the start</span>
                  ) : (
                    <span className="terms__field">
                      <label htmlFor={`${stepPath(i)}.from_lp_multiple`}>from an LP multiple of</label>
                      <span className="terms__percent">
                        <input
                          id={`${stepPath(i)}.from_lp_multiple`}
                          type="text"
                          inputMode="decimal"
                          value={s.from}
                          onChange={(e) => setStep(i, { ...s, from: e.target.value })}
                          aria-label={`Step ${i + 1} starts from an LP multiple of`}
                          aria-invalid={problem !== null && controlFor(problem.path) === `${stepPath(i)}.from_lp_multiple`}
                          aria-describedby={problem !== null && controlFor(problem.path) === `${stepPath(i)}.from_lp_multiple` ? `${stepPath(i)}.from_lp_multiple-problem` : undefined}
                        />
                        <span aria-hidden="true">x</span>
                      </span>
                    </span>
                  )}
                  {i > 0 && (
                    <button
                      type="button"
                      className="link-button"
                      aria-label={`Remove step ${i + 1}`}
                      onClick={() => onForm({ ...form, carry: { ...carry, steps: carry.steps.filter((_, j) => j !== i) } })}
                    >
                      Remove
                    </button>
                  )}
                  <FieldProblem path={(p) => p === stepPath(i) || p.startsWith(`${stepPath(i)}.`)} problem={problem} />
                </li>
              ))}
            </ol>
            <button type="button" className="button" onClick={() => onForm({ ...form, carry: { ...carry, steps: [...carry.steps, { rate: "", from: "" }] } })}>
              Add a step
            </button>
          </>
        )}
      </Fieldset>

      <Fieldset legend="Pref">
        <label className="terms__check">
          <input
            type="checkbox"
            checked={pref.on}
            onChange={(e) => (e.target.checked ? turnOn({ ...form, pref: { ...pref, on: true } }, "terms.pref.rate") : onForm({ ...form, pref: { ...pref, on: false } }))}
          />{" "}
          A preferred return
        </label>
        {pref.on && (
          <>
            <Percent id="terms.pref.rate" label="Rate a year, simple" value={pref.rate} problem={problem} onChange={(rate) => onForm({ ...form, pref: { ...pref, rate } })} />
            <FieldProblem path="terms.pref.rate" problem={problem} />
          </>
        )}
      </Fieldset>

      {/* F8: a catch-up catches the GP up to the pref, so it's here only with one. */}
      {pref.on && (
        <Fieldset legend="Catch-up">
          <div className="terms__choice" role="radiogroup" aria-label="Catch-up">
            {(
              [
                ["none", "None (a hard hurdle)"],
                ["full", "Full"],
                ["partial", "Partial"],
              ] as const
            ).map(([kind, text]) => (
              <label key={kind}>
                <input
                  type="radio"
                  name="catch-up"
                  checked={catchUp.kind === kind}
                  onChange={() => (kind === "partial" ? turnOn({ ...form, catchUp: { ...catchUp, kind } }, "terms.catch_up.gp_share") : onForm({ ...form, catchUp: { ...catchUp, kind } }))}
                />{" "}
                {text}
              </label>
            ))}
          </div>
          {catchUp.kind === "partial" && (
            <Percent id="terms.catch_up.gp_share" label="The GP's share" value={catchUp.share} problem={problem} onChange={(share) => onForm({ ...form, catchUp: { ...catchUp, share } })} />
          )}
          <FieldProblem path={(p) => p === "terms.catch_up" || p === "terms.catch_up.gp_share"} problem={problem} />
        </Fieldset>
      )}

      <Fieldset legend="GP commitment">
        <label className="terms__check">
          <input
            type="checkbox"
            checked={g.on}
            onChange={(e) => (e.target.checked ? turnOn({ ...form, gpCommitment: { ...g, on: true } }, "terms.gp_commitment.share") : onForm({ ...form, gpCommitment: { ...g, on: false } }))}
          />{" "}
          A GP commitment
        </label>
        {g.on && (
          <>
            <Percent id="terms.gp_commitment.share" label="Its share of the fund" value={g.share} problem={problem} onChange={(share) => onForm({ ...form, gpCommitment: { ...g, share } })} />
            <FieldProblem path="terms.gp_commitment.share" problem={problem} />
            <label className="terms__check">
              <input type="checkbox" checked={g.paysFees} onChange={(e) => onForm({ ...form, gpCommitment: { ...g, paysFees: e.target.checked } })} /> Pays its share of fees
            </label>
            <label className="terms__check">
              <input type="checkbox" checked={g.paysExpenses} onChange={(e) => onForm({ ...form, gpCommitment: { ...g, paysExpenses: e.target.checked } })} /> Pays its share of expenses
            </label>
          </>
        )}
      </Fieldset>
    </section>
  );
}
