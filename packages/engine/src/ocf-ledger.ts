// The OCF share ledger (O5): every stock security, from its issuance until a
// cancellation, repurchase, transfer, conversion, reissuance or consolidation
// closes it, applied in date order. What's left open on the package's date is
// the cap table's stock.

import type { Decimal } from "decimal.js";

import { ZERO } from "./decimal.ts";
import type { OcfClass } from "./ocf-classes.ts";
import { ratioConversionPrice } from "./ocf-classes.ts";
import type { Notes } from "./ocf-notes.ts";
import { type Json, ids, isObject, malformed, money, numeric, required, shares, shown, text, unsupported } from "./ocf-read.ts";

interface StockSecurity {
  id: string;
  holder: string;
  cls: string;
  quantity: Decimal;
  open: boolean;
}

export interface LedgerEntry {
  tx: Json;
  /** Its place in the package, files in the order given and items in file order. */
  order: number;
}

/** Shares outstanding on the package's date, by holder, then class. */
export type StockPositions = Map<string, Map<string, Decimal>>;

export function runShareLedger(
  entries: readonly LedgerEntry[],
  classes: Map<string, OcfClass>,
  stakeholders: ReadonlySet<string>,
  notes: Notes,
  readLater: (what: string) => void,
): StockPositions {
  // A balance or a reissuance names issuances that may come later in the file, so every issuance is indexed first.
  const issuances = new Map<string, Json>();
  for (const { tx } of entries) {
    if (tx.object_type !== "TX_STOCK_ISSUANCE") continue;
    const sec = text(tx, "security_id", tx.id as string);
    if (issuances.has(sec)) throw malformed("duplicate_security", tx.id as string, `${tx.id} issues ${sec}, which another issuance already issued`);
    issuances.set(sec, tx);
  }
  const live = new Map<string, StockSecurity>();

  /** O5: a transaction naming a security not issued, or already closed, is refused. */
  const outstanding = (tx: Json, secId: string): StockSecurity => {
    const id = tx.id as string;
    if (!issuances.has(secId)) throw malformed("unknown_security", id, `${id} names ${secId}, which no issuance in the package creates`);
    const s = live.get(secId);
    if (!s) throw malformed("unknown_security", id, `${id} names ${secId} on ${tx.date as string}, before it's issued`);
    if (!s.open) throw malformed("closed_security", id, `${id} names ${secId} on ${tx.date as string}, after it was closed`);
    return s;
  };
  const issued = (tx: Json, secId: string): { holder: string; cls: string; quantity: Decimal } => {
    const id = tx.id as string;
    const iss = issuances.get(secId);
    if (!iss) throw malformed("unknown_security", id, `${id} names ${secId}, which no issuance in the package creates`);
    return { holder: iss.stakeholder_id as string, cls: iss.stock_class_id as string, quantity: shares(iss, "quantity", iss.id as string) };
  };
  const reconciles = (tx: Json, ok: boolean, detail: string): void => {
    if (!ok) throw malformed("quantities_dont_reconcile", tx.id as string, `${tx.id}: ${detail}`);
  };

  /** O5: with a balance security the original closes and the balance holds what's left; without one, the original keeps it. */
  const takeFrom = (tx: Json, quantityField: string): void => {
    const id = tx.id as string;
    const s = outstanding(tx, text(tx, "security_id", id));
    const q = shares(tx, quantityField, id);
    reconciles(tx, q.lte(s.quantity), `it takes ${shown(q)} of ${s.id}'s ${shown(s.quantity)} shares`);
    if (tx.balance_security_id != null) {
      const balance = text(tx, "balance_security_id", id);
      const b = issued(tx, balance);
      const left = s.quantity.minus(q);
      reconciles(tx, b.quantity.eq(left), `${s.id} held ${shown(s.quantity)}, so taking ${shown(q)} leaves ${shown(left)}, but its balance, ${balance}, holds ${shown(b.quantity)}`);
      reconciles(tx, b.holder === s.holder && b.cls === s.cls, `its balance, ${balance}, should stay with ${s.holder} in ${s.cls}`);
      s.open = false;
    } else {
      s.quantity = s.quantity.minus(q);
      if (s.quantity.isZero()) s.open = false;
    }
  };

  const steps: Record<string, (tx: Json) => void> = {
    TX_STOCK_ISSUANCE: (tx) => {
      const id = tx.id as string;
      const holder = text(tx, "stakeholder_id", id);
      if (!stakeholders.has(holder)) throw malformed("unknown_stakeholder", id, `${id} issues stock to ${holder}, who isn't a stakeholder in the package`);
      const clsId = text(tx, "stock_class_id", id);
      const cls = classes.get(clsId);
      if (!cls) throw malformed("unknown_stock_class", id, `${id} issues stock in ${clsId}, which isn't a stock class in the package`);
      // Stock a plan issues directly draws on its pool (O6).
      if (tx.stock_plan_id != null) readLater("stock issued under a stock plan");
      const quantity = shares(tx, "quantity", id);
      const price = money(tx, "share_price", id);
      // O5: a preferred share issued at another price (a SAFE's conversion shares, say) still carries its class's terms.
      if (!cls.common && cls.issuePrice != null && !price.amount.eq(cls.issuePrice.amount)) notes.add("issued_at_other_price", tx.security_id as string);
      const sec = tx.security_id as string;
      live.set(sec, { id: sec, holder, cls: clsId, quantity, open: true });
    },
    TX_STOCK_CANCELLATION: (tx) => takeFrom(tx, "quantity"),
    TX_STOCK_REPURCHASE: (tx) => takeFrom(tx, "quantity"),
    TX_STOCK_TRANSFER: (tx) => takeFrom(tx, "quantity"),
    TX_STOCK_CONVERSION: (tx) => takeFrom(tx, "quantity_converted"),
    // A retraction voids the security, as if it had never been issued.
    TX_STOCK_RETRACTION: (tx) => {
      const s = outstanding(tx, text(tx, "security_id", tx.id as string));
      s.open = false;
      s.quantity = ZERO;
    },
    // A reissuance closes the original, and its resulting issuances must add up to it.
    TX_STOCK_REISSUANCE: (tx) => {
      const id = tx.id as string;
      const s = outstanding(tx, text(tx, "security_id", id));
      const results = ids(tx, "resulting_security_ids", id).map((r) => issued(tx, r));
      const total = results.reduce((t, r) => t.plus(r.quantity), ZERO);
      reconciles(
        tx, total.eq(s.quantity) && results.every((r) => r.holder === s.holder && r.cls === s.cls),
        `${s.id} held ${shown(s.quantity)}, but its reissued securities hold ${shown(total)} (each with its holder, in its class)`,
      );
      s.open = false;
    },
    // A consolidation closes its sources, and its result must equal their sum.
    TX_STOCK_CONSOLIDATION: (tx) => {
      const id = tx.id as string;
      const sources = ids(tx, "security_ids", id).map((sid) => outstanding(tx, sid));
      const result = issued(tx, text(tx, "resulting_security_id", id));
      const total = sources.reduce((t, s) => t.plus(s.quantity), ZERO);
      reconciles(
        tx, total.eq(result.quantity) && sources.every((s) => s.holder === result.holder && s.cls === result.cls),
        `its sources hold ${shown(total)} together, but the consolidated security holds ${shown(result.quantity)} (all with one holder, in one class)`,
      );
      for (const s of sources) s.open = false;
    },
    // O5: a split multiplies the class's securities outstanding from earlier dates. It applies before the rest of its
    // date (O2), so one issued on the split's own date (a reissuance for the split, say) is taken as already split.
    TX_STOCK_CLASS_SPLIT: (tx) => {
      const id = tx.id as string;
      const cls = classOf(tx);
      if (!cls.common) throw unsupported("split_of_preferred", id, `${id} splits ${cls.name}, a preferred class; OCF doesn't record how its terms adjust`);
      // OCF doesn't record how a split adjusts what converts into the class.
      for (const other of classes.values()) {
        if (other.conversion?.into !== cls.id) continue;
        if ([...live.values()].some((s) => s.open && s.cls === other.id)) {
          throw unsupported("split_with_derivatives", id, `${id} splits ${cls.name} while ${other.name}, which converts into it, is outstanding; OCF doesn't record how its conversion adjusts`);
        }
      }
      const ratio = required(tx, "split_ratio", id);
      if (!isObject(ratio)) throw malformed("bad_value", id, `${id}'s split_ratio should be a numerator and a denominator`);
      const [n, d] = [numeric(ratio, "numerator", id), numeric(ratio, "denominator", id)];
      if (!n.isPositive() || !d.isPositive()) throw malformed("bad_value", id, `${id}'s split ratio should be more than zero`);
      for (const s of live.values()) {
        if (!s.open || s.cls !== cls.id) continue;
        const after = s.quantity.times(n).div(d);
        if (!after.isInteger()) throw unsupported("fractional_shares", id, `${id} leaves ${s.id} with ${shown(after)} shares; spillpoint holds whole shares only`);
        s.quantity = after;
      }
    },
    // A conversion ratio adjustment replaces the class's conversion price from its date, under O4's check.
    TX_STOCK_CLASS_CONVERSION_RATIO_ADJUSTMENT: (tx) => {
      const id = tx.id as string;
      const cls = classOf(tx);
      if (cls.common) throw unsupported("common_conversion_right", id, `${id} adjusts a conversion of ${cls.name}, a common class; spillpoint converts preferred into common only`);
      if (!cls.conversion) throw malformed("bad_value", id, `${id} adjusts ${cls.name}'s conversion, but it has no conversion right`);
      const mechanism = required(tx, "new_ratio_conversion_mechanism", id);
      if (!isObject(mechanism) || mechanism.type !== "RATIO_CONVERSION") {
        throw unsupported("class_conversion_mechanism", id, `${id} gives ${cls.name} a mechanism other than a ratio; spillpoint reads ratio conversions only`);
      }
      cls.conversion = { ...cls.conversion, price: ratioConversionPrice(mechanism, cls, id, notes) };
    },
  };
  const classOf = (tx: Json): OcfClass => {
    const id = tx.id as string;
    const clsId = text(tx, "stock_class_id", id);
    const cls = classes.get(clsId);
    if (!cls) throw malformed("unknown_stock_class", id, `${id} names ${clsId}, which isn't a stock class in the package`);
    return cls;
  };

  // O2: in date order; on one date, its splits first, then the rest in file order.
  const isSplit = (e: LedgerEntry) => (e.tx.object_type === "TX_STOCK_CLASS_SPLIT" ? 0 : 1);
  const sorted = [...entries].sort(
    (a, b) => (a.tx.date as string).localeCompare(b.tx.date as string) || isSplit(a) - isSplit(b) || a.order - b.order,
  );
  for (const e of sorted) steps[e.tx.object_type as string]!(e.tx);

  const positions: StockPositions = new Map();
  for (const s of live.values()) {
    if (!s.open || s.quantity.isZero()) continue;
    const byClass = positions.get(s.holder) ?? new Map<string, Decimal>();
    byClass.set(s.cls, (byClass.get(s.cls) ?? ZERO).plus(s.quantity));
    positions.set(s.holder, byClass);
  }
  return positions;
}

/** The transactions the share ledger applies. */
export const LEDGER_TYPES: readonly string[] = [
  "TX_STOCK_ISSUANCE", "TX_STOCK_CANCELLATION", "TX_STOCK_REPURCHASE", "TX_STOCK_TRANSFER", "TX_STOCK_CONVERSION",
  "TX_STOCK_RETRACTION", "TX_STOCK_REISSUANCE", "TX_STOCK_CONSOLIDATION", "TX_STOCK_CLASS_SPLIT", "TX_STOCK_CLASS_CONVERSION_RATIO_ADJUSTMENT",
];
