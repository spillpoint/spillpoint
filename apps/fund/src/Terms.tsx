// The Terms tab (plan, "The terms: a form", f01i): carry flat or in steps, the pref, the catch-up with a pref, the
// GP commitment with F3's two flags, from 0.3.0 the two rates classes and later closes need (F22, F25), and from 0.4.0
// the management fee, entered as fee calls or a schedule (F30), from 0.5.0 the carry basis, on the whole fund or deal
// by deal (F34), and from 0.6.0 each fee step on commitments or invested capital (F39). Each change runs the engine
// again; a refusal shows under the field its path names, and at the top of the form with "Show me".

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { marks, ProblemText } from "./CashFlows.tsx";
import { Carry, FieldProblem, Percent } from "./Fields.tsx";
import type { FeeForm, FeeStepText, Problem, TermsForm } from "./terms.ts";
import { needsCommitments, onInvestedCapital, toFlat, toSchedule, toSteps } from "./terms.ts";

interface Props {
  /** The fund's name, as the main page has the cap table's: a saved file is named after it. */
  name: string;
  onName: (name: string) => void;
  form: TermsForm;
  problem: Problem | null;
  onForm: (form: TermsForm) => void;
  onShow: (path: string) => void;
  /** The LPs tab lists LPs: a schedule's fee is on their commitments, so it needs no total of its own (F30). */
  listsLps: boolean;
  /** The earliest call's date on the Cash flows tab, "" if none has one: where a schedule's start starts. */
  firstCall: string;
}

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="terms__group">
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

export function Terms({ name, onName, form, problem, onForm, onShow, listsLps, firstCall }: Props) {
  const { carry, pref, catchUp, gpCommitment: g, managementFee: fee } = form;
  const scheduled = fee.mode === "schedule";
  // F35, F37: no pref deal by deal in 0.5.0, so no catch-up either. What was typed waits for the whole fund.
  const dealByDeal = form.basis === "deal_by_deal";
  const prefOn = pref.on && !dealByDeal;
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

      {/* F34: carry on the whole fund (F1), or deal by deal (F35). */}
      <Fieldset legend="Carry is paid">
        <div className="terms__choice" role="radiogroup" aria-label="Carry is paid">
          <label>
            <input id="terms.carry_basis" type="radio" name="carry-basis" checked={!dealByDeal} onChange={() => onForm({ ...form, basis: "whole_fund" })} /> On the whole fund
          </label>
          <label>
            <input type="radio" name="carry-basis" checked={dealByDeal} onChange={() => onForm({ ...form, basis: "deal_by_deal" })} /> Deal by deal
          </label>
        </div>
        <FieldProblem path="terms.carry_basis" problem={problem} />
        <p className="terms__line">
          Deal by deal: before carry, LPs get back the cost of each investment exited or written off, with its share of fees and expenses. At the end the GP owes
          back any carry the whole fund doesn't earn.
        </p>
      </Fieldset>

      <Fieldset legend="Pref">
        <label className="terms__check">
          <input
            id="terms.pref"
            type="checkbox"
            checked={prefOn}
            disabled={dealByDeal}
            onChange={(e) => (e.target.checked ? turnOn({ ...form, pref: { ...pref, on: true } }, "terms.pref.rate") : onForm({ ...form, pref: { ...pref, on: false } }))}
            aria-describedby={dealByDeal ? "terms-pref-off" : undefined}
          />{" "}
          A preferred return
        </label>
        {dealByDeal && (
          <p id="terms-pref-off" className="terms__line">
            Off deal by deal: this version has no pref deal by deal, so no catch-up either.
          </p>
        )}
        <FieldProblem path="terms.pref" problem={problem} />
        {prefOn && (
          <>
            <Percent id="terms.pref.rate" label="Rate a year, simple" value={pref.rate} problem={problem} onChange={(rate) => onForm({ ...form, pref: { ...pref, rate } })} />
            <FieldProblem path="terms.pref.rate" problem={problem} />
          </>
        )}
      </Fieldset>

      {/* F8: a catch-up catches the GP up to the pref, so it's here only with one. */}
      {prefOn && (
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

      {/* F30: fees entered as calls, or a schedule the engine works the calls out from. */}
      <Fieldset legend="Management fee">
        <div className="terms__choice" role="radiogroup" aria-label="Management fee">
          <label>
            <input type="radio" name="management-fee" checked={!scheduled} onChange={() => onForm({ ...form, managementFee: { ...fee, mode: "entered" } })} /> Entered as fee calls
          </label>
          <label>
            <input
              id="terms.management_fee"
              type="radio"
              name="management-fee"
              checked={scheduled}
              onChange={() => turnOn({ ...form, managementFee: toSchedule(fee, firstCall) }, "terms.management_fee.steps[0].rate")}
              {...marks(problem, "terms.management_fee")}
            />{" "}
            A schedule
          </label>
        </div>
        <FieldProblem path="terms.management_fee" problem={problem} />
        {scheduled ? (
          <FeeSchedule fee={fee} listsLps={listsLps} problem={problem} onFee={(managementFee) => onForm({ ...form, managementFee })} />
        ) : (
          <p className="terms__line">Enter each fee call on the Cash flows tab as a call of kind Fee. Fees are paid-in capital, returned to the LPs first.</p>
        )}
      </Fieldset>

      {/* F22, F25: what the LPs tab's classes and closes need. Blank is none, left out of the input. With a schedule its
          first rate is the fund's (F30), so the fee rate goes. */}
      <Fieldset legend="For LP classes and later closes">
        {!scheduled && (
          <div className="terms__rate">
            <Percent id="terms.fee_rate" label="Management fee rate" value={form.feeRate} problem={problem} onChange={(feeRate) => onForm({ ...form, feeRate })} />
            <span className="flows__hint">Needed only when a class has its own fee rate. It divides the fee calls between the classes and charges nothing itself.</span>
            <FieldProblem path="terms.fee_rate" problem={problem} />
          </div>
        )}
        <div className="terms__rate">
          <Percent
            id="terms.equalization_rate"
            label="Equalization interest rate"
            value={form.equalizationRate}
            problem={problem}
            onChange={(equalizationRate) => onForm({ ...form, equalizationRate })}
          />
          <span className="flows__hint">Needed when an investment or expense call comes before a later close; 0 for none.</span>
          <FieldProblem path="terms.equalization_rate" problem={problem} />
        </div>
      </Fieldset>
    </section>
  );
}

interface FeeScheduleProps {
  fee: FeeForm;
  listsLps: boolean;
  problem: Problem | null;
  onFee: (fee: FeeForm) => void;
}

/**
 * What the schedule's fees are worked out from, at its end: the LPs' commitments, the fund's invested capital, or each
 * as its steps say (F30, F39).
 */
function workedOutFrom(fee: FeeForm): string {
  const invested = onInvestedCapital(fee);
  const committed = fee.steps.some((s) => s.basis === "commitments");
  if (!invested) return "the LPs' commitments";
  return committed ? "the LPs' commitments or the fund's invested capital, as each step says" : "the fund's invested capital";
}

/**
 * The schedule (F30): when fees start, how often they're called, the rates by date, a step at a time as the carry's
 * are, each on commitments or invested capital (F39), and, only when the fund lists no LPs and a step is on
 * commitments, the commitments the fee is on (F40).
 */
function FeeSchedule({ fee, listsLps, problem, onFee }: FeeScheduleProps) {
  const at = "terms.management_fee";
  const stepPath = (i: number) => `${at}.steps[${i}]`;
  const setStep = (i: number, step: FeeStepText) => onFee({ ...fee, steps: fee.steps.map((s, j) => (j === i ? step : s)) });
  // A step added is on the basis of the one above it, as a new cash flow copies the row above.
  const added = (): FeeStepText => ({ rate: "", basis: fee.steps.at(-1)?.basis ?? "commitments", from: "" });
  return (
    <>
      <div className="terms__rate">
        <span className="terms__field">
          <label htmlFor={`${at}.start`}>Fees start on</label>
          <input id={`${at}.start`} type="date" value={fee.start} onChange={(e) => onFee({ ...fee, start: e.target.value })} {...marks(problem, `${at}.start`)} />
        </span>
        <FieldProblem path={`${at}.start`} problem={problem} />
      </div>
      <div className="terms__rate">
        <span className="terms__field">
          <label htmlFor={`${at}.frequency`}>Called</label>
          <select id={`${at}.frequency`} value={fee.frequency} onChange={(e) => onFee({ ...fee, frequency: e.target.value as FeeForm["frequency"] })}>
            <option value="quarterly">Quarterly</option>
            <option value="semiannual">Half-yearly</option>
            <option value="annual">Yearly</option>
          </select>
        </span>
        <FieldProblem path={`${at}.frequency`} problem={problem} />
      </div>
      <ol className="terms__steps" aria-label="The fee rates by date">
        {fee.steps.map((s, i) => (
          <li key={i}>
            <span className="terms__step-name">Step {i + 1}</span>
            <Percent id={`${stepPath(i)}.rate`} label={`Fee rate step ${i + 1}`} hiddenLabel value={s.rate} problem={problem} onChange={(rate) => setStep(i, { ...s, rate })} />
            {/* F39: what the step's rate is charged on. */}
            <span className="terms__field">
              <label htmlFor={`${stepPath(i)}.basis`}>On</label>
              <select
                id={`${stepPath(i)}.basis`}
                value={s.basis}
                onChange={(e) => setStep(i, { ...s, basis: e.target.value as FeeStepText["basis"] })}
                aria-label={`Fee rate step ${i + 1} is on`}
                {...marks(problem, `${stepPath(i)}.basis`)}
              >
                <option value="commitments">Commitments</option>
                <option value="invested_capital">Invested capital</option>
              </select>
            </span>
            {i === 0 ? (
              <span className="muted">from the start</span>
            ) : (
              <span className="terms__field">
                <label htmlFor={`${stepPath(i)}.from`}>from</label>
                <input
                  id={`${stepPath(i)}.from`}
                  type="date"
                  value={s.from}
                  onChange={(e) => setStep(i, { ...s, from: e.target.value })}
                  aria-label={`Fee rate step ${i + 1} is in force from`}
                  {...marks(problem, `${stepPath(i)}.from`)}
                />
              </span>
            )}
            {i > 0 && (
              <button type="button" className="link-button" aria-label={`Remove fee rate step ${i + 1}`} onClick={() => onFee({ ...fee, steps: fee.steps.filter((_, j) => j !== i) })}>
                Remove
              </button>
            )}
            <FieldProblem path={(p) => p === stepPath(i) || (p.startsWith(`${stepPath(i)}.`) && p !== `${stepPath(i)}.basis`)} problem={problem} />
            {/* F40: a step on invested capital without investments, under each such step's On. */}
            <ProblemText problem={problem} path={`${stepPath(i)}.basis`} />
          </li>
        ))}
      </ol>
      {/* The schedule's steps refused as a whole, missing or empty, only a file makes: under them. */}
      <FieldProblem path={`${at}.steps`} problem={problem} />
      <button type="button" className="button" aria-label="Add a fee rate step" onClick={() => onFee({ ...fee, steps: [...fee.steps, added()] })}>
        Add a step
      </button>
      <p className="terms__line">
        Invested capital is the cost of the fund's investments, less the cost of what it has exited or written off. Each day of a period counts at that day's
        invested capital.
      </p>
      {needsCommitments(fee, listsLps) && (
        <div className="terms__rate">
          <span className="terms__field">
            <label htmlFor={`${at}.commitments`}>The LPs' total commitments</label>
            <input
              id={`${at}.commitments`}
              type="text"
              inputMode="decimal"
              value={fee.commitments}
              onChange={(e) => onFee({ ...fee, commitments: e.target.value })}
              {...marks(problem, `${at}.commitments`)}
            />
          </span>
          <span className="flows__hint">In dollars: 40000000 or $40M.</span>
          <FieldProblem path={`${at}.commitments`} problem={problem} />
        </div>
      )}
      <p className="terms__line">Fees are worked out from {workedOutFrom(fee)}, called in advance on calendar periods; the first period runs from the start date.</p>
    </>
  );
}

