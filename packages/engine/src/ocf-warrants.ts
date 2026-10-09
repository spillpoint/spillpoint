// OCF warrants (O7): a warrant with one exercise trigger, a fixed number of
// shares of a stock class at its exercise price, becomes a warrant for that
// class. Warrants share a class by underlying and strike, named as the engine
// names one built from rounds (04b).

import type { Decimal } from "decimal.js";

import { D, ZERO } from "./decimal.ts";
import { Book } from "./ocf-book.ts";
import type { OcfClass } from "./ocf-classes.ts";
import type { Notes } from "./ocf-notes.ts";
import { type Json, date, isObject, malformed, money, numeric, shares, text, unsupported } from "./ocf-read.ts";

interface WarrantTerms {
  /** The stock class it's exercised for: null when its mechanism names none. */
  cls: string | null;
  strike: Decimal | null;
  expires: string | null;
  /** Why spillpoint can't read it, refused only if it's still outstanding on the package's date (O7). */
  unreadable: string | null;
  /** False when an unreadable warrant gives no quantity, so a part of it can't be followed. */
  quantityKnown: boolean;
}

export interface WarrantClass {
  id: string;
  name: string;
  strike: Decimal;
  /** "common", or the preferred series' id, as the engine's warrants name it (E12). */
  underlying: string;
  /** The stock class, for ordering. */
  cls: string;
}

export class Warrants {
  readonly book: Book<WarrantTerms>;
  private readonly classes: Map<string, OcfClass>;
  private readonly stakeholders: ReadonlySet<string>;
  private readonly notes: Notes;

  constructor(issuances: readonly Json[], classes: Map<string, OcfClass>, stakeholders: ReadonlySet<string>, notes: Notes) {
    this.classes = classes;
    this.stakeholders = stakeholders;
    this.notes = notes;
    this.book = new Book<WarrantTerms>(issuances, (iss) => quantityOf(iss) ?? new D(1), (s, iss) => {
      const t = mechanismOf(iss);
      return (t.cls ?? null) === s.terms.cls && JSON.stringify(iss.exercise_price ?? null) === JSON.stringify(s.issuance.exercise_price ?? null);
    });
  }

  readonly steps: Record<string, (tx: Json) => void> = {
    TX_WARRANT_ISSUANCE: (tx) => {
      const id = tx.id as string;
      const holder = text(tx, "stakeholder_id", id);
      if (!this.stakeholders.has(holder)) throw malformed("unknown_stakeholder", id, `${id} issues a warrant to ${holder}, who isn't a stakeholder in the package`);
      const { cls, unreadable } = mechanismOf(tx);
      if (cls != null && !this.classes.has(cls)) throw malformed("unknown_stock_class", id, `${id} is a warrant for ${cls}, which isn't a stock class in the package`);
      // A warrant spillpoint reads needs its exercise price; one it can't read is checked only if it's still outstanding.
      const strike = unreadable == null || tx.exercise_price != null ? money(tx, "exercise_price", id).amount : null;
      const expires = tx.warrant_expiration_date == null ? null : date(tx, "warrant_expiration_date", id);
      this.book.issue(tx, holder, { cls, strike, expires, unreadable, quantityKnown: quantityOf(tx) != null });
    },
    // OCF's warrant exercise carries no quantity, so it closes the warrant entirely; a balance holds any rest.
    TX_WARRANT_EXERCISE: (tx) => this.book.close(this.book.outstanding(tx, text(tx, "security_id", tx.id as string))),
    TX_WARRANT_CANCELLATION: (tx) => this.taken(tx),
    TX_WARRANT_TRANSFER: (tx) => this.taken(tx),
    TX_WARRANT_RETRACTION: (tx) => this.book.void(this.book.outstanding(tx, text(tx, "security_id", tx.id as string))),
  };

  /** Whether a warrant for the class is outstanding: a split of it would adjust the warrant. */
  outstandingFor(cls: string): boolean {
    return this.book.open().some((s) => s.terms.cls === cls);
  }

  /** On the package's date: the outstanding warrants by holder and warrant class. One past its expiration date is left out and listed. */
  finish(asOf: string): { classes: WarrantClass[]; positions: Map<string, Map<string, Decimal>>; underlying: Set<string> } {
    const classes = new Map<string, WarrantClass>();
    const positions = new Map<string, Map<string, Decimal>>();
    const underlying = new Set<string>();
    for (const s of this.book.open()) {
      if (s.terms.expires != null && s.terms.expires < asOf) {
        this.notes.add("expired_warrant_left_out", s.id);
        continue;
      }
      // O7: a warrant spillpoint can't read is refused only if it's still outstanding; an exercised one's shares are their own issuance.
      if (s.terms.unreadable != null) throw unsupported("warrant_mechanism", s.issuance.id as string, s.terms.unreadable);
      const cls = this.classes.get(s.terms.cls!)!;
      const strike = s.terms.strike!.toString();
      const on = cls.common ? "common" : cls.id;
      const c = { id: `warrants_${on}_${strike}`, name: `Warrants for ${cls.name} ($${strike} strike)`, strike: s.terms.strike!, underlying: on, cls: cls.id };
      classes.set(c.id, c);
      underlying.add(cls.id);
      const byClass = positions.get(s.holder) ?? new Map<string, Decimal>();
      byClass.set(c.id, (byClass.get(c.id) ?? ZERO).plus(s.quantity));
      positions.set(s.holder, byClass);
    }
    const order = [...this.classes.keys()];
    const ordered = [...classes.values()].sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls) || a.strike.cmp(b.strike));
    return { classes: ordered, positions, underlying };
  }

  private taken(tx: Json): void {
    const id = tx.id as string;
    const s = this.book.outstanding(tx, text(tx, "security_id", id));
    if (!s.terms.quantityKnown) {
      // With no quantity, only a balance security shows what's left; without one, the warrant can't be followed.
      if (tx.balance_security_id != null) return this.book.close(s);
      throw unsupported("warrant_mechanism", s.issuance.id as string, s.terms.unreadable!);
    }
    this.book.take(tx, s, shares(tx, "quantity", id));
  }
}

/**
 * O7: one exercise trigger, converting into a fixed number of shares of a stock class. Anything else is unreadable, with
 * the class it names, if any.
 */
function mechanismOf(iss: Json): { cls: string | null; converts: Decimal | null; unreadable: string | null } {
  const id = iss.id as string;
  const triggers = iss.exercise_triggers;
  const right = Array.isArray(triggers) && triggers.length === 1 && isObject(triggers[0]) ? triggers[0].conversion_right : null;
  const mechanism = isObject(right) ? right.conversion_mechanism : null;
  const cls = isObject(right) && typeof right.converts_to_stock_class_id === "string" ? right.converts_to_stock_class_id : null;
  if (!isObject(right) || right.type !== "WARRANT_CONVERSION_RIGHT" || cls == null || !isObject(mechanism) || mechanism.type !== "FIXED_AMOUNT_CONVERSION") {
    return { cls, converts: null, unreadable: `${id} isn't a warrant for a fixed number of shares of a stock class, with one exercise trigger; spillpoint reads only those` };
  }
  return { cls, converts: mechanism.converts_to_quantity == null ? null : numeric(mechanism, "converts_to_quantity", id), unreadable: null };
}

/** The warrant's quantity, which must equal its conversion's when both are given; null if an unreadable warrant gives none. */
function quantityOf(iss: Json): Decimal | null {
  const id = iss.id as string;
  const { converts, unreadable } = mechanismOf(iss);
  const quantity = iss.quantity == null ? null : shares(iss, "quantity", id);
  if (quantity != null && converts != null && !quantity.eq(converts)) {
    throw malformed("warrant_quantity", id, `${id} is a warrant for ${quantity.toString()} shares, but its conversion gives ${converts.toString()}`);
  }
  const n = quantity ?? converts;
  if (n == null && unreadable == null) throw malformed("missing_field", id, `${id} gives no quantity, in the warrant or its conversion`);
  return n == null ? null : shares({ quantity: n.toString() }, "quantity", id);
}
