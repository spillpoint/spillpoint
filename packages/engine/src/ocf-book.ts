// What every OCF security shares (O5): it's outstanding from its issuance
// until something closes it. A cancellation, repurchase, transfer, conversion,
// exercise or release that names a balance security closes the original, and
// the balance's own issuance holds what's left, which must reconcile; without
// a balance the original keeps the rest. A retraction voids a security, as if
// never issued. Stock, grants and warrants count shares; SAFEs and notes count
// dollars.

import type { Decimal } from "decimal.js";

import { ZERO } from "./decimal.ts";
import { type Json, malformed, shown, text } from "./ocf-read.ts";

export interface Held<T> {
  id: string;
  holder: string;
  /** Shares, or a SAFE's or note's dollars. */
  quantity: Decimal;
  open: boolean;
  /** What the security is: its class, its grant terms, its warrant terms, its convertible's terms. */
  terms: T;
  /** The issuance that created it. */
  issuance: Json;
}

export class Book<T> {
  private readonly issuances = new Map<string, Json>();
  private readonly live = new Map<string, Held<T>>();

  /** An issuance's quantity: shares, or dollars. */
  private readonly quantityOf: (issuance: Json) => Decimal;
  /** Whether a balance is the same kind of security, so it can hold what's left of another. */
  private readonly sameKind: (original: Held<T>, issuance: Json) => boolean;
  private readonly unit: (n: Decimal) => string;

  /** Takes every issuance first, so a balance or a result named before its own issuance can be checked. */
  constructor(
    issuances: readonly Json[],
    quantityOf: (issuance: Json) => Decimal,
    sameKind: (original: Held<T>, issuance: Json) => boolean,
    unit: (n: Decimal) => string = (n) => shown(n),
  ) {
    this.quantityOf = quantityOf;
    this.sameKind = sameKind;
    this.unit = unit;
    for (const iss of issuances) {
      const sec = text(iss, "security_id", iss.id as string);
      if (this.issuances.has(sec)) throw malformed("duplicate_security", iss.id as string, `${iss.id} issues ${sec}, which another issuance already issued`);
      this.issuances.set(sec, iss);
    }
  }

  issue(issuance: Json, holder: string, terms: T): Held<T> {
    const id = issuance.security_id as string;
    const held = { id, holder, quantity: this.quantityOf(issuance), open: true, terms, issuance };
    this.live.set(id, held);
    return held;
  }

  /** A transaction naming a security not issued, or already closed, is refused. */
  outstanding(tx: Json, secId: string): Held<T> {
    const id = tx.id as string;
    if (!this.issuances.has(secId)) throw malformed("unknown_security", id, `${id} names ${secId}, which no issuance in the package creates`);
    const s = this.live.get(secId);
    if (!s) throw malformed("unknown_security", id, `${id} names ${secId} on ${tx.date as string}, before it's issued`);
    if (!s.open) throw malformed("closed_security", id, `${id} names ${secId} on ${tx.date as string}, after it was closed`);
    return s;
  }

  /** The issuance a transaction names as a balance or a result. */
  issued(tx: Json, secId: string): Json {
    const iss = this.issuances.get(secId);
    if (!iss) throw malformed("unknown_security", tx.id as string, `${tx.id} names ${secId}, which no issuance in the package creates`);
    return iss;
  }

  /** O5: takes part of a security, closing it when a balance security holds the rest. */
  take(tx: Json, s: Held<T>, q: Decimal): void {
    reconciles(tx, q.lte(s.quantity), `it takes ${this.unit(q)} of ${s.id}'s ${this.unit(s.quantity)}`);
    if (tx.balance_security_id != null) {
      const balance = text(tx, "balance_security_id", tx.id as string);
      const b = this.issued(tx, balance);
      const left = s.quantity.minus(q);
      reconciles(tx, this.quantityOf(b).eq(left), `${s.id} held ${this.unit(s.quantity)}, so taking ${this.unit(q)} leaves ${this.unit(left)}, but its balance, ${balance}, holds ${this.unit(this.quantityOf(b))}`);
      reconciles(tx, b.stakeholder_id === s.holder && this.sameKind(s, b), `its balance, ${balance}, should stay with ${s.holder}, on the same terms`);
      s.open = false;
    } else {
      s.quantity = s.quantity.minus(q);
      if (s.quantity.isZero()) s.open = false;
    }
  }

  /** Closes a security entirely: a SAFE's conversion, or a warrant's exercise, which carries no quantity. */
  close(s: Held<T>): void {
    s.open = false;
  }

  /** A retraction voids the security, as if it had never been issued. */
  void(s: Held<T>): void {
    s.open = false;
    s.quantity = ZERO;
  }

  /** Every security still outstanding. */
  open(): Held<T>[] {
    return [...this.live.values()].filter((s) => s.open && !s.quantity.isZero());
  }

  /** Every security issued so far, open or not. */
  all(): Held<T>[] {
    return [...this.live.values()];
  }
}

export function reconciles(tx: Json, ok: boolean, detail: string): void {
  if (!ok) throw malformed("quantities_dont_reconcile", tx.id as string, `${tx.id}: ${detail}`);
}
