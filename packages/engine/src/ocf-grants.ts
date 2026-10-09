// OCF stock plans, options, RSUs and the unissued pool (O6). Each grant joins
// an option class by its exercise price, as a company built from its rounds
// names one; RSUs are options at a $0 strike. Vesting is ignored: every
// outstanding grant counts. The pool is worked out plan by plan from what was
// reserved, granted, delivered and cancelled.

import type { Decimal } from "decimal.js";

import { ZERO } from "./decimal.ts";
import { Book } from "./ocf-book.ts";
import type { OcfClass } from "./ocf-classes.ts";
import type { Notes } from "./ocf-notes.ts";
import { type Json, date, malformed, money, numeric, shares, shown, text, unsupported } from "./ocf-read.ts";

interface GrantTerms {
  plan: string | null;
  /** The exercise price; $0 for an RSU. */
  strike: Decimal;
  rsu: boolean;
  expires: string | null;
}

interface Plan {
  id: string;
  reserved: Decimal;
  /** OCF's default_cancellation_behavior; null when the plan doesn't give one. */
  behavior: string | null;
  /** Shares exercised, released, or issued by the plan directly. */
  delivered: Decimal;
  cancelled: Decimal;
  /** What return-to-pool transactions name, under a plan that decides grant by grant. */
  returned: Decimal;
}

const BEHAVIORS = ["RETURN_TO_POOL", "RETIRE", "HOLD_AS_CAPITAL_STOCK", "DEFINED_PER_PLAN_SECURITY"];
const OPTION_TYPES = ["OPTION", "OPTION_ISO", "OPTION_NSO"];

/** A grant's options class, named as the engine names one built from rounds (04b). */
export interface OptionClass {
  id: string;
  name: string;
  strike: Decimal;
  rsu: boolean;
}

export class Grants {
  readonly book: Book<GrantTerms>;
  private readonly plans = new Map<string, Plan>();
  /** Stock issued as the result of an exercise or a release, already counted as delivered. */
  private readonly delivered = new Set<string>();

  private readonly classes: Map<string, OcfClass>;
  private readonly stakeholders: ReadonlySet<string>;
  private readonly notes: Notes;

  constructor(
    planObjects: readonly Json[],
    issuances: readonly Json[],
    transactions: readonly Json[],
    classes: Map<string, OcfClass>,
    stakeholders: ReadonlySet<string>,
    notes: Notes,
  ) {
    this.classes = classes;
    this.stakeholders = stakeholders;
    this.notes = notes;
    for (const p of planObjects) {
      const id = p.id as string;
      const behavior = p.default_cancellation_behavior == null ? null : text(p, "default_cancellation_behavior", id);
      if (behavior != null && !BEHAVIORS.includes(behavior)) throw malformed("bad_value", id, `${id}'s cancellation behavior, ${behavior}, isn't one OCF has`);
      const classIds = [...(Array.isArray(p.stock_class_ids) ? p.stock_class_ids : []), ...(p.stock_class_id == null ? [] : [p.stock_class_id])];
      for (const c of classIds) this.commonOnly(p, String(c));
      this.plans.set(id, { id, reserved: whole(p, "initial_shares_reserved"), behavior, delivered: ZERO, cancelled: ZERO, returned: ZERO });
    }
    for (const tx of transactions) {
      if (/^TX_(EQUITY_COMPENSATION|PLAN_SECURITY)_(EXERCISE|RELEASE)$/.test(tx.object_type as string) && Array.isArray(tx.resulting_security_ids)) {
        for (const r of tx.resulting_security_ids) this.delivered.add(String(r));
      }
    }
    this.book = new Book<GrantTerms>(issuances, (iss) => shares(iss, "quantity", iss.id as string), (s, iss) => (iss.stock_plan_id ?? null) === s.terms.plan);
  }

  readonly steps: Record<string, (tx: Json) => void> = {
    ...both("ISSUANCE", (tx) => {
      const id = tx.id as string;
      const holder = text(tx, "stakeholder_id", id);
      if (!this.stakeholders.has(holder)) throw malformed("unknown_stakeholder", id, `${id} grants to ${holder}, who isn't a stakeholder in the package`);
      const plan = tx.stock_plan_id == null ? null : this.plan(tx, text(tx, "stock_plan_id", id)).id;
      if (tx.stock_class_id != null) this.commonOnly(tx, text(tx, "stock_class_id", id));
      // OCF 1.0's plan securities name their kind as plan_security_type.
      const kind = (tx.compensation_type ?? tx.plan_security_type) as unknown;
      if (kind === "CSAR" || kind === "SSAR") throw unsupported("stock_appreciation_right", id, `${id} is a stock appreciation right, which spillpoint doesn't model`);
      const rsu = kind === "RSU";
      if (!rsu && !OPTION_TYPES.includes(kind as string)) throw unsupported("compensation_type", id, `${id} is a grant of kind ${String(kind)}; spillpoint reads options and RSUs`);
      // An RSU is read as an option at a $0 strike: it delivers a share for nothing.
      if (rsu) this.notes.add("rsu_as_option", tx.security_id as string);
      const strike = rsu ? ZERO : money(tx, "exercise_price", id).amount;
      const expires = tx.expiration_date == null ? null : date(tx, "expiration_date", id);
      this.book.issue(tx, holder, { plan, strike, rsu, expires });
    }),
    // An exercise or a release delivers shares out of the plan.
    ...both("EXERCISE", (tx) => this.deliver(tx)),
    ...both("RELEASE", (tx) => this.deliver(tx)),
    ...both("CANCELLATION", (tx) => {
      const { s, q } = this.taken(tx);
      if (s.terms.plan) this.plans.get(s.terms.plan)!.cancelled = this.plans.get(s.terms.plan)!.cancelled.plus(q);
    }),
    ...both("TRANSFER", (tx) => this.taken(tx)),
    ...both("RETRACTION", (tx) => this.book.void(this.book.outstanding(tx, text(tx, "security_id", tx.id as string)))),
    // A repricing changes the exercise price from its date.
    TX_EQUITY_COMPENSATION_REPRICING: (tx) => {
      const id = tx.id as string;
      const s = this.book.outstanding(tx, text(tx, "security_id", id));
      s.terms = { ...s.terms, strike: money(tx, "new_exercise_price", id).amount };
    },
    // A pool adjustment gives the plan's new total reserved.
    TX_STOCK_PLAN_POOL_ADJUSTMENT: (tx) => {
      this.plan(tx, text(tx, "stock_plan_id", tx.id as string)).reserved = whole(tx, "shares_reserved");
    },
    // O6: only a plan that decides grant by grant returns what a return-to-pool names.
    TX_STOCK_PLAN_RETURN_TO_POOL: (tx) => {
      const id = tx.id as string;
      const plan = this.plan(tx, text(tx, "stock_plan_id", id));
      if (plan.behavior !== "DEFINED_PER_PLAN_SECURITY") {
        throw unsupported("return_to_pool_conflict", id, `${id} returns shares to ${plan.id}, whose own rule (${plan.behavior ?? "none given"}) already decides what returns; which governs would be a guess`);
      }
      this.book.issued(tx, text(tx, "security_id", id));
      plan.returned = plan.returned.plus(shares(tx, "quantity", id));
    },
  };

  /** Stock a plan issues directly, not as the result of an exercise or release, draws on its pool. */
  stockIssuedUnderPlan(tx: Json, planId: string): void {
    const plan = this.plan(tx, planId);
    if (!this.delivered.has(tx.security_id as string)) plan.delivered = plan.delivered.plus(shares(tx, "quantity", tx.id as string));
  }

  /** Whether any grant is outstanding: options and RSUs are over common, so a split of common would adjust them. */
  anyOutstanding(): boolean {
    return this.book.open().length > 0;
  }

  /**
   * On the package's date: the outstanding grants by holder and option class, and the unissued pool. A grant past its
   * expiration date is left out and listed, and counts as cancelled for its plan's pool.
   */
  finish(asOf: string): { classes: OptionClass[]; positions: Map<string, Map<string, Decimal>>; pool: Decimal } {
    const expired = new Map<string, Decimal>();
    const outstanding = this.book.open().filter((s) => {
      if (s.terms.expires == null || s.terms.expires >= asOf) return true;
      this.notes.add("expired_option_left_out", s.id);
      if (s.terms.plan) expired.set(s.terms.plan, (expired.get(s.terms.plan) ?? ZERO).plus(s.quantity));
      return false;
    });

    let pool = ZERO;
    for (const plan of this.plans.values()) {
      const granted = outstanding.filter((s) => s.terms.plan === plan.id).reduce((t, s) => t.plus(s.quantity), ZERO);
      const gone = plan.cancelled.plus(expired.get(plan.id) ?? ZERO);
      // O6: RETURN_TO_POOL returns cancelled grants; RETIRE and HOLD_AS_CAPITAL_STOCK don't; DEFINED_PER_PLAN_SECURITY returns what's named.
      let kept: Decimal;
      if (plan.behavior === "RETURN_TO_POOL") kept = ZERO;
      else if (plan.behavior === "DEFINED_PER_PLAN_SECURITY") kept = gone.minus(plan.returned);
      else if (plan.behavior != null || gone.isZero()) kept = gone;
      else throw unsupported("cancellation_behavior_missing", plan.id, `${plan.id} gives no cancellation behavior, so whether its ${shown(gone)} cancelled or expired shares return to the pool would be a guess`);
      const left = plan.reserved.minus(granted).minus(plan.delivered).minus(kept);
      if (left.isNegative()) {
        throw malformed(
          "pool_overdrawn", plan.id,
          `${plan.id}'s pool is overdrawn: ${shown(plan.reserved)} reserved − ${shown(granted)} outstanding − ${shown(plan.delivered)} delivered` +
            (kept.isZero() ? "" : ` − ${shown(kept)} cancelled and not returned`) + ` is ${shown(left)}`,
        );
      }
      pool = pool.plus(left);
    }

    const classes = new Map<string, OptionClass>();
    const positions = new Map<string, Map<string, Decimal>>();
    for (const s of outstanding) {
      const c = optionClass(s.terms);
      classes.set(c.id, c);
      const byClass = positions.get(s.holder) ?? new Map<string, Decimal>();
      byClass.set(c.id, (byClass.get(c.id) ?? ZERO).plus(s.quantity));
      positions.set(s.holder, byClass);
    }
    // Option classes by strike, then RSUs.
    const ordered = [...classes.values()].sort((a, b) => Number(a.rsu) - Number(b.rsu) || a.strike.cmp(b.strike));
    return { classes: ordered, positions, pool };
  }

  private deliver(tx: Json): void {
    const { s, q } = this.taken(tx);
    if (s.terms.plan) this.plans.get(s.terms.plan)!.delivered = this.plans.get(s.terms.plan)!.delivered.plus(q);
  }

  private taken(tx: Json) {
    const id = tx.id as string;
    const s = this.book.outstanding(tx, text(tx, "security_id", id));
    const q = shares(tx, "quantity", id);
    this.book.take(tx, s, q);
    return { s, q };
  }

  private plan(tx: Json, planId: string): Plan {
    const plan = this.plans.get(planId);
    if (!plan) throw malformed("unknown_stock_plan", tx.id as string, `${tx.id} names ${planId}, which isn't a stock plan in the package`);
    return plan;
  }

  /** Grants are options over common; one over a preferred class would need terms spillpoint doesn't model. */
  private commonOnly(o: Json, classId: string): void {
    const cls = this.classes.get(classId);
    if (!cls) throw malformed("unknown_stock_class", o.id as string, `${o.id} names ${classId}, which isn't a stock class in the package`);
    if (!cls.common) throw unsupported("grant_of_preferred", o.id as string, `${o.id} grants options over ${cls.name}, a preferred class; spillpoint's options are over common`);
  }
}

/** OCF 1.2's equity compensation transactions, and OCF 1.0's older names for them. */
function both(suffix: string, step: (tx: Json) => void): Record<string, (tx: Json) => void> {
  return { [`TX_EQUITY_COMPENSATION_${suffix}`]: step, [`TX_PLAN_SECURITY_${suffix}`]: step };
}

/** A plan's shares reserved: whole, and possibly none. */
function whole(o: Json, field: string): Decimal {
  const id = o.id as string;
  const n = numeric(o, field, id);
  if (n.isNegative() || !n.isInteger()) throw malformed("bad_value", id, `${id}'s ${field} should be a whole number of shares`);
  return n;
}

function optionClass(t: GrantTerms): OptionClass {
  if (t.rsu) return { id: "rsus", name: "RSUs (no strike)", strike: ZERO, rsu: true };
  const strike = t.strike.toString();
  return { id: `options_${strike}`, name: `Options ($${strike} strike)`, strike: t.strike, rsu: false };
}
