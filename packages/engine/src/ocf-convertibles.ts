// OCF SAFEs and notes (O8, O9). Each is outstanding by its dollars, from its
// issuance until a conversion, cancellation or transfer closes it. Those still
// outstanding on the package's date become the cap table's SAFEs and notes;
// their terms are read only then, since a converted SAFE's terms no longer
// change who gets what.

import type { Decimal } from "decimal.js";

import { D } from "./decimal.ts";
import { Book } from "./ocf-book.ts";
import type { Notes } from "./ocf-notes.ts";
import { type Json, asWritten, date, isObject, malformed, money, numericText, required, text, unsupported } from "./ocf-read.ts";

interface ConvertibleTerms {
  kind: "SAFE" | "NOTE" | "CONVERTIBLE_SECURITY";
  /** Each conversion trigger's mechanism. */
  mechanisms: Json[];
  seniority: string | null;
}

const MECHANISM = { SAFE: "SAFE_CONVERSION", NOTE: "CONVERTIBLE_NOTE_CONVERSION" } as const;

export class Convertibles {
  readonly book: Book<ConvertibleTerms>;
  private readonly stakeholders: ReadonlySet<string>;
  private readonly notes: Notes;
  /**
   * When each was first issued, for the issue order (O14): one from a transfer, or the balance one leaves, keeps the
   * date of the one it came from. A SAFE sold on to a new holder was still bought in on its first date.
   */
  private readonly since = new Map<string, string>();

  constructor(issuances: readonly Json[], stakeholders: ReadonlySet<string>, notes: Notes) {
    this.stakeholders = stakeholders;
    this.notes = notes;
    const dollars = (n: Decimal) => `$${asWritten(n)}`;
    this.book = new Book<ConvertibleTerms>(issuances, (iss) => amount(iss, "investment_amount"), (s, iss) => iss.convertible_type === s.terms.kind, dollars);
  }

  readonly steps: Record<string, (tx: Json) => void> = {
    TX_CONVERTIBLE_ISSUANCE: (tx) => {
      const id = tx.id as string;
      const holder = text(tx, "stakeholder_id", id);
      if (!this.stakeholders.has(holder)) throw malformed("unknown_stakeholder", id, `${id} issues a convertible to ${holder}, who isn't a stakeholder in the package`);
      const kind = text(tx, "convertible_type", id);
      if (kind !== "SAFE" && kind !== "NOTE" && kind !== "CONVERTIBLE_SECURITY") throw malformed("bad_value", id, `${id}'s convertible_type, ${kind}, isn't one OCF has`);
      const triggers = required(tx, "conversion_triggers", id);
      if (!Array.isArray(triggers) || triggers.length === 0) throw malformed("bad_value", id, `${id} gives no conversion trigger`);
      const mechanisms = triggers.map((t) => (isObject(t) && isObject(t.conversion_right) ? t.conversion_right.conversion_mechanism : null));
      // O8: a SAFE carries a SAFE's mechanism and a note a note's; anything else is files that disagree.
      if (kind !== "CONVERTIBLE_SECURITY" && mechanisms.some((m) => !isObject(m) || m.type !== MECHANISM[kind])) {
        throw malformed("convertible_mechanism_mismatch", id, `${id} is a ${kind === "SAFE" ? "SAFE" : "note"} but doesn't carry a ${kind === "SAFE" ? "SAFE" : "note"}'s conversion mechanism on every trigger`);
      }
      const seniority = tx.seniority == null ? null : numericText(tx.seniority, "seniority", id);
      this.book.issue(tx, holder, { kind, mechanisms: mechanisms as Json[], seniority });
      const sec = tx.security_id as string;
      if (!this.since.has(sec)) this.since.set(sec, date(tx, "date", id));
    },
    // A conversion closes the convertible entirely; its shares are their own issuance.
    TX_CONVERTIBLE_CONVERSION: (tx) => {
      const s = this.book.outstanding(tx, text(tx, "security_id", tx.id as string));
      // Its results are shares; only a balance left as a convertible keeps the date.
      this.carryDate(tx, s.id, false);
      this.book.close(s);
    },
    TX_CONVERTIBLE_CANCELLATION: (tx) => this.taken(tx),
    TX_CONVERTIBLE_TRANSFER: (tx) => this.taken(tx),
    TX_CONVERTIBLE_RETRACTION: (tx) => this.book.void(this.book.outstanding(tx, text(tx, "security_id", tx.id as string))),
  };

  /**
   * On the package's date: the SAFEs and notes still outstanding, in the case-file format (C1) with null for each
   * blank, in date order.
   */
  finish(): { safes: Json[]; notes: Json[] } {
    // O8: convertible seniority ranks convertibles among themselves, the reverse of stock classes. It's ignored, with one
    // line, and refused only when the convertibles still outstanding differ: a converted SAFE's no longer changes anything.
    const ranked = this.book.open().filter((s) => s.terms.seniority != null);
    const first = ranked[0];
    const differs = ranked.find((s) => !new D(s.terms.seniority!).eq(first!.terms.seniority!));
    if (differs) {
      throw unsupported("convertible_seniority", differs.issuance.id as string, `${differs.id} ranks at seniority ${differs.terms.seniority} among the convertibles, where ${first!.id} ranks at ${first!.terms.seniority}; spillpoint ranks outstanding convertibles together`);
    }
    if (this.book.all().length > 0) this.notes.add("convertible_seniority_ignored");

    const safes: Json[] = [];
    const notes: Json[] = [];
    for (const s of this.book.open()) {
      const id = s.issuance.id as string;
      if (s.terms.kind === "CONVERTIBLE_SECURITY") throw unsupported("convertible_security", id, `${s.id} is a convertible of OCF's general kind, whose conversion spillpoint doesn't model`);
      const m = s.terms.mechanisms[0]!;
      if (s.terms.mechanisms.some((x) => JSON.stringify(x) !== JSON.stringify(m))) {
        throw unsupported("convertible_triggers_differ", id, `${s.id} converts on different terms at different triggers; spillpoint reads one set of terms`);
      }
      if (s.terms.kind === "SAFE") safes.push(this.safe(s.id, s.holder, s.quantity, m, id));
      else notes.push(this.note(s.id, s.holder, s.quantity, m, id));
    }
    return { safes, notes };
  }

  private safe(sec: string, holder: string, purchase: Decimal, m: Json, subject: string): Json {
    // O8: a SAFE's Cash-Out Amount is its purchase amount, so an exit multiple other than 1 isn't modeled.
    if (m.exit_multiple == null) this.notes.add("safe_exit_multiple_read_as_1", sec);
    else if (!new D(numericText(m.exit_multiple, "exit_multiple", subject)).eq(1)) {
      throw unsupported("safe_exit_multiple", subject, `${sec} has an exit multiple of ${String(m.exit_multiple)}; spillpoint pays a SAFE its purchase amount at a sale`);
    }
    const cap = m.conversion_valuation_cap == null ? null : asWritten(money(m, "conversion_valuation_cap", subject).amount);
    // The cap's kind comes from the conversion timing, which OCF makes optional; without it, the page asks (case 04).
    const timing = m.conversion_timing ?? null;
    if (timing != null && timing !== "PRE_MONEY" && timing !== "POST_MONEY") throw malformed("bad_value", subject, `${sec}'s conversion_timing, ${String(timing)}, isn't one OCF has`);
    const capFields =
      cap == null ? {} : timing === "POST_MONEY" ? { post_money_cap: cap } : timing === "PRE_MONEY" ? { pre_money_cap: cap } : { valuation_cap: cap, cap_type: null };
    // O8: OCF gives a discount only where it applies, so an absent one is none (case 10).
    return { id: sec, holder, purchase_amount: asWritten(purchase), ...capFields, discount: discountOf(m, subject) };
  }

  private note(sec: string, holder: string, principal: Decimal, m: Json, subject: string): Json {
    // O9: one rate, simple, Actual/365, accruing daily, deferred to conversion. Anything else is refused, on the later list.
    if (m.conversion_mfn === true) throw unsupported("note_mfn", subject, `${sec} is an MFN note, whose terms spillpoint doesn't model`);
    const rates = required(m, "interest_rates", subject);
    if (!Array.isArray(rates) || rates.length !== 1 || !isObject(rates[0]) || rates[0].accrual_end_date != null) {
      throw unsupported("note_rate_periods", subject, `${sec} accrues interest at more than one rate or for a set period; spillpoint reads one rate for the note's life`);
    }
    const terms: [string, string, string][] = [
      ["day_count_convention", "ACTUAL_365", "note_day_count"],
      ["interest_payout", "DEFERRED", "note_cash_interest"],
      ["interest_accrual_period", "DAILY", "note_accrual_period"],
      ["compounding_type", "SIMPLE", "note_compounding"],
    ];
    for (const [field, read, term] of terms) {
      const given = text(m, field, subject);
      if (given !== read) throw unsupported(term, subject, `${sec}'s ${field} is ${given}; spillpoint reads ${read} only`);
    }
    const rate = rates[0];
    const cap = m.conversion_valuation_cap == null ? null : asWritten(money(m, "conversion_valuation_cap", subject).amount);
    // O9: OCF has no field for a note cap's kind; the engine models pre-money caps, so it's read as one, with a report line.
    if (cap != null) this.notes.add("note_cap_read_as_pre_money", sec);
    return {
      id: sec,
      holder,
      principal: asWritten(principal),
      interest_rate: asWritten(new D(numericText(required(rate, "rate", subject), "rate", subject))),
      interest_method: "simple",
      issue_date: date(rate, "accrual_start_date", subject),
      ...(cap == null ? {} : { valuation_cap: cap, cap_type: "pre_money" }),
      conversion_base: conversionBase(m.capitalization_definition_rules),
      discount: discountOf(m, subject),
      // O9: the repayment multiple is the exit multiple; absent, it's left blank rather than read as 1x (answer 8).
      repayment_multiple: m.exit_multiple == null ? null : asWritten(new D(numericText(m.exit_multiple, "exit_multiple", subject))),
    };
  }

  /** The date a SAFE or note still outstanding was first issued on, following transfers and balances back (O14). */
  issuedOn(sec: string): string {
    return this.since.get(sec)!;
  }

  private taken(tx: Json): void {
    const id = tx.id as string;
    const s = this.book.outstanding(tx, text(tx, "security_id", id));
    this.carryDate(tx, s.id);
    this.book.take(tx, s, amount(tx, "amount"));
  }

  /** O14: what a transaction leaves of a SAFE or note, its result or its balance, keeps the date the original was first issued. */
  private carryDate(tx: Json, from: string, withResults = true): void {
    const results: unknown[] = withResults && Array.isArray(tx.resulting_security_ids) ? tx.resulting_security_ids : [];
    for (const r of [...results, tx.balance_security_id]) if (typeof r === "string") this.since.set(r, this.since.get(from)!);
  }
}

function amount(o: Json, field: string): Decimal {
  const id = o.id as string;
  const a = money(o, field, id).amount;
  if (!a.isPositive() || a.isZero()) throw malformed("bad_value", id, `${id}'s ${field} should be more than zero`);
  return a;
}

function discountOf(m: Json, subject: string): string {
  return m.conversion_discount == null ? "0" : asWritten(new D(numericText(m.conversion_discount, "conversion_discount", subject)));
}

/**
 * O9: what a note's cap divides by, from its capitalization rules. Outstanding shares, options and the unissued pool,
 * and nothing else, is "with pool"; shares and options alone, "without pool". Anything else, or no rules, is blank.
 */
function conversionBase(rules: unknown): string | null {
  if (!isObject(rules)) return null;
  const on = (field: string) => rules[field] === true;
  const others = [
    "include_this_security", "include_other_converting_securities", "include_option_pool_topup_for_promised_options",
    "include_additional_option_pool_topup", "include_new_money",
  ];
  if (!on("include_outstanding_shares") || !on("include_outstanding_options") || others.some(on)) return null;
  return on("include_outstanding_unissued_options") ? "with_pool" : "without_pool";
}
