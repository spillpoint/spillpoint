// The Terms tab (plan, "The terms: a form", f01i): carry flat or in steps, the pref, the catch-up with a pref, the
// GP commitment with F3's two flags, and from 0.3.0 the two rates classes and later closes need (F22, F25). Each change
// runs the engine again; a refusal shows under the field its path names, and at the top of the form with "Show me".

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Carry, FieldProblem, Percent } from "./Fields.tsx";
import type { Problem, TermsForm } from "./terms.ts";
import { toFlat, toSteps } from "./terms.ts";

interface Props {
  /** The fund's name, as the main page has the cap table's: a saved file is named after it. */
  name: string;
  onName: (name: string) => void;
  form: TermsForm;
  problem: Problem | null;
  onForm: (form: TermsForm) => void;
  onShow: (path: string) => void;
}

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="terms__group">
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

export function Terms({ name, onName, form, problem, onForm, onShow }: Props) {
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
  return (
    <section className="card terms" aria-labelledby="terms-heading">
      <h2 id="terms-heading">Terms</h2>
      <p className="card__intro">Rates are percents, written exactly as typed: 7.25% is 0.0725, with nothing rounded. Each change runs the waterfall again.</p>
      <div className="terms__name">
        <label htmlFor="fund-name">Name of this fund</label>
        <input id="fund-name" type="text" value={name} onChange={(e) => onName(e.target.value)} aria-describedby="fund-name-hint" />
        <span id="fund-name-hint" className="flows__hint">
          A saved file is named after it.
        </span>
      </div>
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
            <input type="radio" name="carry-mode" checked={carry.mode === "flat"} onChange={() => onForm({ ...form, carry: toFlat(carry) })} /> Flat
          </label>
          <label>
            <input type="radio" name="carry-mode" checked={carry.mode === "steps"} onChange={() => onForm({ ...form, carry: toSteps(carry) })} /> In steps
          </label>
        </div>
        <Carry at="terms.carry" owner={null} carry={carry} problem={problem} onCarry={(next) => onForm({ ...form, carry: next })} />
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

      {/* F22, F25: what the LPs tab's classes and closes need. Blank is none, left out of the input. */}
      <Fieldset legend="For LP classes and later closes">
        <div className="terms__rate">
          <Percent id="terms.fee_rate" label="Management fee rate" value={form.feeRate} problem={problem} onChange={(feeRate) => onForm({ ...form, feeRate })} />
          <span className="flows__hint">Needed only when a class has its own fee rate. It divides the fee calls between the classes.</span>
          <FieldProblem path="terms.fee_rate" problem={problem} />
        </div>
        <div className="terms__rate">
          <Percent
            id="terms.equalization_rate"
            label="Equalization interest rate"
            value={form.equalizationRate}
            problem={problem}
            onChange={(equalizationRate) => onForm({ ...form, equalizationRate })}
          />
          <span className="flows__hint">Needed when an LP joins at a later close; 0 for none.</span>
          <FieldProblem path="terms.equalization_rate" problem={problem} />
        </div>
      </Fieldset>
    </section>
  );
}
