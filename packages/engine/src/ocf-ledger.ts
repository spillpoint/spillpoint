// The OCF share ledger (O5): every stock security, from its issuance until a
// cancellation, repurchase, transfer, conversion, reissuance or consolidation
// closes it. What's left open on the package's date is the cap table's stock.

import type { Decimal } from "decimal.js";

import { ZERO } from "./decimal.ts";
import { Book, reconciles } from "./ocf-book.ts";
import type { OcfClass } from "./ocf-classes.ts";
import { ratioConversionPrice } from "./ocf-classes.ts";
import type { Notes } from "./ocf-notes.ts";
import { type Json, ids, isObject, malformed, money, numeric, required, shares, shown, text, unsupported } from "./ocf-read.ts";

/** Shares outstanding on the package's date, by holder, then class. */
export type StockPositions = Map<string, Map<string, Decimal>>;

export class ShareLedger {
  readonly book: Book<string>;
  private readonly classes: Map<string, OcfClass>;
  private readonly stakeholders: ReadonlySet<string>;
  private readonly notes: Notes;
  /** What else is outstanding on a class at a split: options, or warrants for it (null if nothing). */
  private readonly derivativesOn: (cls: OcfClass) => string | null;
  /** Stock a plan issues directly draws on that plan's pool (O6). */
  private readonly issuedUnderPlan: (tx: Json, plan: string) => void;

  constructor(
    issuances: readonly Json[],
    classes: Map<string, OcfClass>,
    stakeholders: ReadonlySet<string>,
    notes: Notes,
    derivativesOn: (cls: OcfClass) => string | null,
    issuedUnderPlan: (tx: Json, plan: string) => void,
  ) {
    this.classes = classes;
    this.stakeholders = stakeholders;
    this.notes = notes;
    this.derivativesOn = derivativesOn;
    this.issuedUnderPlan = issuedUnderPlan;
    this.book = new Book<string>(issuances, (iss) => shares(iss, "quantity", iss.id as string), (s, iss) => iss.stock_class_id === s.terms);
  }

  readonly steps: Record<string, (tx: Json) => void> = {
    TX_STOCK_ISSUANCE: (tx) => {
      const id = tx.id as string;
      const holder = text(tx, "stakeholder_id", id);
      if (!this.stakeholders.has(holder)) throw malformed("unknown_stakeholder", id, `${id} issues stock to ${holder}, who isn't a stakeholder in the package`);
      const cls = this.classOf(tx);
      if (tx.stock_plan_id != null) this.issuedUnderPlan(tx, text(tx, "stock_plan_id", id));
      const price = money(tx, "share_price", id);
      // O5: a preferred share issued at another price (a SAFE's conversion shares, say) still carries its class's terms.
      if (!cls.common && cls.issuePrice != null && !price.amount.eq(cls.issuePrice.amount)) this.notes.add("issued_at_other_price", tx.security_id as string);
      this.book.issue(tx, holder, cls.id);
    },
    TX_STOCK_CANCELLATION: (tx) => this.takeFrom(tx, "quantity"),
    TX_STOCK_REPURCHASE: (tx) => this.takeFrom(tx, "quantity"),
    TX_STOCK_TRANSFER: (tx) => this.takeFrom(tx, "quantity"),
    TX_STOCK_CONVERSION: (tx) => this.takeFrom(tx, "quantity_converted"),
    TX_STOCK_RETRACTION: (tx) => this.book.void(this.book.outstanding(tx, text(tx, "security_id", tx.id as string))),
    // A reissuance closes the original, and its resulting issuances must add up to it.
    TX_STOCK_REISSUANCE: (tx) => {
      const id = tx.id as string;
      const s = this.book.outstanding(tx, text(tx, "security_id", id));
      const results = ids(tx, "resulting_security_ids", id).map((r) => this.book.issued(tx, r));
      const total = results.reduce((t, r) => t.plus(shares(r, "quantity", r.id as string)), ZERO);
      reconciles(
        tx, total.eq(s.quantity) && results.every((r) => r.stakeholder_id === s.holder && r.stock_class_id === s.terms),
        `${s.id} held ${shown(s.quantity)}, but its reissued securities hold ${shown(total)} (each with its holder, in its class)`,
      );
      this.book.close(s);
    },
    // A consolidation closes its sources, and its result must equal their sum.
    TX_STOCK_CONSOLIDATION: (tx) => {
      const id = tx.id as string;
      const sources = ids(tx, "security_ids", id).map((sid) => this.book.outstanding(tx, sid));
      const result = this.book.issued(tx, text(tx, "resulting_security_id", id));
      const total = sources.reduce((t, s) => t.plus(s.quantity), ZERO);
      const resulting = shares(result, "quantity", result.id as string);
      reconciles(
        tx, total.eq(resulting) && sources.every((s) => s.holder === result.stakeholder_id && s.terms === result.stock_class_id),
        `its sources hold ${shown(total)} together, but the consolidated security holds ${shown(resulting)} (all with one holder, in one class)`,
      );
      for (const s of sources) this.book.close(s);
    },
    // O5: a split multiplies the class's securities outstanding from earlier dates. It applies before the rest of its
    // date (O2), so one issued on the split's own date (a reissuance for the split, say) is taken as already split.
    TX_STOCK_CLASS_SPLIT: (tx) => {
      const id = tx.id as string;
      const cls = this.classOf(tx);
      if (!cls.common) throw unsupported("split_of_preferred", id, `${id} splits ${cls.name}, a preferred class; OCF doesn't record how its terms adjust`);
      // OCF doesn't record how a split adjusts what converts into the class, or what's exercised for it.
      for (const other of this.classes.values()) {
        if (other.conversion?.into === cls.id && this.book.open().some((s) => s.terms === other.id)) {
          throw unsupported("split_with_derivatives", id, `${id} splits ${cls.name} while ${other.name}, which converts into it, is outstanding; OCF doesn't record how its conversion adjusts`);
        }
      }
      const derivative = this.derivativesOn(cls);
      if (derivative) throw unsupported("split_with_derivatives", id, `${id} splits ${cls.name} while ${derivative} outstanding on it; OCF doesn't record how they adjust`);
      const ratio = required(tx, "split_ratio", id);
      if (!isObject(ratio)) throw malformed("bad_value", id, `${id}'s split_ratio should be a numerator and a denominator`);
      const [n, d] = [numeric(ratio, "numerator", id), numeric(ratio, "denominator", id)];
      if (!n.isPositive() || !d.isPositive()) throw malformed("bad_value", id, `${id}'s split ratio should be more than zero`);
      for (const s of this.book.open()) {
        if (s.terms !== cls.id) continue;
        const after = s.quantity.times(n).div(d);
        if (!after.isInteger()) throw unsupported("fractional_shares", id, `${id} leaves ${s.id} with ${shown(after)} shares; spillpoint holds whole shares only`);
        s.quantity = after;
      }
    },
    // A conversion ratio adjustment replaces the class's conversion price from its date, under O4's check.
    TX_STOCK_CLASS_CONVERSION_RATIO_ADJUSTMENT: (tx) => {
      const id = tx.id as string;
      const cls = this.classOf(tx);
      if (cls.common) throw unsupported("common_conversion_right", id, `${id} adjusts a conversion of ${cls.name}, a common class; spillpoint converts preferred into common only`);
      if (!cls.conversion) throw malformed("bad_value", id, `${id} adjusts ${cls.name}'s conversion, but it has no conversion right`);
      const mechanism = required(tx, "new_ratio_conversion_mechanism", id);
      if (!isObject(mechanism) || mechanism.type !== "RATIO_CONVERSION") {
        throw unsupported("class_conversion_mechanism", id, `${id} gives ${cls.name} a mechanism other than a ratio; spillpoint reads ratio conversions only`);
      }
      cls.conversion = { ...cls.conversion, price: ratioConversionPrice(mechanism, cls, id, this.notes) };
    },
  };

  /** Shares outstanding on the package's date, by holder, then class. */
  positions(): StockPositions {
    const positions: StockPositions = new Map();
    for (const s of this.book.open()) {
      const byClass = positions.get(s.holder) ?? new Map<string, Decimal>();
      byClass.set(s.terms, (byClass.get(s.terms) ?? ZERO).plus(s.quantity));
      positions.set(s.holder, byClass);
    }
    return positions;
  }

  private takeFrom(tx: Json, quantityField: string): void {
    const id = tx.id as string;
    this.book.take(tx, this.book.outstanding(tx, text(tx, "security_id", id)), shares(tx, quantityField, id));
  }

  private classOf(tx: Json): OcfClass {
    const id = tx.id as string;
    const clsId = text(tx, "stock_class_id", id);
    const cls = this.classes.get(clsId);
    if (!cls) throw malformed("unknown_stock_class", id, `${id} names ${clsId}, which isn't a stock class in the package`);
    return cls;
  }
}
