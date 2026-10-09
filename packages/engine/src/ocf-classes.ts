// OCF stock classes (O4): each becomes common, or a preferred series with its
// price, preference, participation, conversion price and seniority. OCF has
// no field for participation itself, anti-dilution or dividends, so those are
// read as far as OCF allows and the rest is left blank or noted.

import type { Decimal } from "decimal.js";

import { D, ZERO } from "./decimal.ts";
import type { Notes } from "./ocf-notes.ts";
import { type Json, isObject, malformed, money, numeric, numericText, decimalPlaces, optionalNumeric, required, text, unsupported } from "./ocf-read.ts";

export type OcfParticipation = "non_participating" | "participating_capped";

export interface OcfClass {
  id: string;
  name: string;
  common: boolean;
  /** Preferred only. Blank (null) where OCF doesn't say (answer 4). */
  issuePrice: { amount: Decimal; written: string } | null;
  preferenceMultiple: Decimal | null;
  participation: OcfParticipation | null;
  /** The participation cap as written, kept for a capped series (and for one whose preference is blank). */
  capMultiple: Decimal | null;
  seniority: Decimal;
  /** The class it converts into, and at what price; null with no conversion right (O4). */
  conversion: { into: string; price: Decimal } | null;
}

/** Reads every stock class. Their conversion rights name other classes, so all are read before any right is checked. */
export function readStockClasses(objects: readonly Json[], notes: Notes): Map<string, OcfClass> {
  const kinds = new Map<string, boolean>();
  for (const o of objects) {
    const id = o.id as string;
    const type = text(o, "class_type", id);
    if (type !== "COMMON" && type !== "PREFERRED") throw malformed("bad_value", id, `${id}'s class_type is ${type}; OCF has COMMON and PREFERRED`);
    kinds.set(id, type === "COMMON");
  }
  const classes = new Map<string, OcfClass>();
  for (const o of objects) {
    const id = o.id as string;
    const name = text(o, "name", id);
    const rights = o.conversion_rights == null ? [] : (o.conversion_rights as unknown);
    if (!Array.isArray(rights)) throw malformed("bad_value", id, `${id}'s conversion_rights should be a list`);
    const seniority = numeric(o, "seniority", id);

    if (kinds.get(id)) {
      // O4: a preference on common changes nothing at a sale; it's ignored, with a report line.
      if (o.liquidation_preference_multiple != null || o.participation_cap_multiple != null) notes.add("common_preference_ignored", id);
      if (rights.length > 0) throw unsupported("common_conversion_right", id, `${name} is common with a conversion right; spillpoint converts preferred into common only`);
      classes.set(id, { id, name, common: true, issuePrice: null, preferenceMultiple: null, participation: null, capMultiple: null, seniority, conversion: null });
      continue;
    }

    const issuePrice = o.price_per_share == null ? null : money(o, "price_per_share", id);
    const preferenceMultiple = optionalNumeric(o, "liquidation_preference_multiple", id);
    const cap = optionalNumeric(o, "participation_cap_multiple", id);
    let participation: OcfParticipation | null = null;
    let capMultiple: Decimal | null = cap;
    if (cap != null) {
      // OCF doesn't say what a participation cap includes; spillpoint reads it as including the preference, as E7 does.
      notes.add("participation_cap_includes_preference", id);
      if (preferenceMultiple != null) {
        if (cap.lt(preferenceMultiple)) {
          throw unsupported(
            "cap_below_preference", id,
            `${name}'s participation cap (${cap.toString()}x) is below its preference (${preferenceMultiple.toString()}x). OCF doesn't say whether a cap includes the preference. ` +
              "This class only makes sense if it excludes it, and spillpoint reads caps as including it, so it can't be read without a guess",
          );
        }
        // A cap equal to the preference leaves nothing to participate: non-participating (E7).
        participation = cap.gt(preferenceMultiple) ? "participating_capped" : "non_participating";
        if (participation === "non_participating") capMultiple = null;
      }
    }
    // No cap is ambiguous: non-participating and participating without a cap look the same, so participation stays blank (answer 3).

    let conversion: OcfClass["conversion"] = null;
    if (rights.length > 1) throw unsupported("several_conversion_rights", id, `${name} has ${rights.length} conversion rights; spillpoint reads one`);
    if (rights.length === 1) {
      const right = rights[0];
      if (!isObject(right)) throw malformed("bad_value", id, `${id}'s conversion right should be an object`);
      const into = text(right, "converts_to_stock_class_id", id);
      if (!kinds.has(into)) throw malformed("unknown_stock_class", id, `${name} converts into ${into}, which isn't a stock class in the package`);
      if (!kinds.get(into)) throw unsupported("conversion_into_preferred", id, `${name} converts into another preferred class, ${into}; spillpoint converts preferred into common only`);
      const mechanism = required(right, "conversion_mechanism", id);
      // A right that doesn't give its type is read as a stock class's, since it sits on one (OCF's own samples leave it out).
      if ((right.type != null && right.type !== "STOCK_CLASS_CONVERSION_RIGHT") || !isObject(mechanism) || mechanism.type !== "RATIO_CONVERSION") {
        throw unsupported("class_conversion_mechanism", id, `${name} converts by a mechanism other than a ratio; spillpoint reads ratio conversions only`);
      }
      conversion = { into, price: ratioConversionPrice(mechanism, { id, name, issuePrice }, id, notes) };
    }

    notes.add("no_anti_dilution_field", id);
    classes.set(id, { id, name, common: false, issuePrice, preferenceMultiple, participation, capMultiple, seniority, conversion });
  }
  return classes;
}

const half = (places: number): Decimal => new D(5).times(new D(10).pow(-places - 1));

/**
 * O4: a ratio conversion's conversion price governs, as the charter's defined term, and its ratio should be the
 * issue price ÷ the conversion price. OCF writes numbers to at most 10 places, so the check allows for an export's
 * rounding, and only where there can be some (Jordan, 04b2 review):
 * - a price is exact as written, unless written to all 10 places, where it may be off by half a unit in the tenth
 * - the ratio's numerator and denominator may each be off by half a unit in their own last place; a whole number is exact
 * Outside those allowances the class is refused; within them but not exact, it's read with a report line.
 */
export function ratioConversionPrice(
  mechanism: Json, cls: Pick<OcfClass, "id" | "name" | "issuePrice">, subject: string, notes: Notes,
): Decimal {
  const price = money(mechanism, "conversion_price", subject);
  if (!price.amount.isPositive() || price.amount.isZero()) throw malformed("bad_value", subject, `${subject}'s conversion price should be more than zero`);
  const ratio = required(mechanism, "ratio", subject);
  if (!isObject(ratio)) throw malformed("bad_value", subject, `${subject}'s ratio should be a numerator and a denominator`);
  const numerator = numericText(required(ratio, "numerator", subject), "ratio.numerator", subject);
  const denominator = numericText(required(ratio, "denominator", subject), "ratio.denominator", subject);
  // The right's rounding of converted shares (OCF's rounding_type): the engine converts without rounding.
  if (mechanism.rounding_type != null) notes.add("conversion_rounding_not_modeled", cls.id);

  if (cls.issuePrice != null) {
    const priceAllowance = (written: string) => (decimalPlaces(written) === 10 ? half(10) : ZERO);
    const ratioAllowance = (written: string) => (decimalPlaces(written) === 0 ? ZERO : half(decimalPlaces(written)));
    const [p, pa] = [cls.issuePrice.amount, priceAllowance(cls.issuePrice.written)];
    const [c, ca] = [price.amount, priceAllowance(price.written)];
    const [n, na] = [new D(numerator), ratioAllowance(numerator)];
    const [d, da] = [new D(denominator), ratioAllowance(denominator)];
    if (!d.minus(da).isPositive() || !n.isPositive()) throw malformed("bad_value", subject, `${subject}'s ratio should be more than zero`);
    // The lowest and highest each quotient can be within its numbers' allowances.
    const quotient = { lo: p.minus(pa).div(c.plus(ca)), hi: p.plus(pa).div(c.minus(ca)) };
    const stated = { lo: n.minus(na).div(d.plus(da)), hi: n.plus(na).div(d.minus(da)) };
    if (quotient.hi.lt(stated.lo) || stated.hi.lt(quotient.lo)) {
      throw malformed(
        "conversion_ratio_mismatch", subject,
        `${cls.name}'s conversion ratio (${numerator} for ${denominator}) doesn't agree with its issue price ÷ conversion price ` +
          `($${cls.issuePrice.written} ÷ $${price.written}), even allowing for how the numbers are written`,
      );
    }
    if (!p.times(d).eq(c.times(n))) notes.add("conversion_ratio_rounded", cls.id);
  }
  return price.amount;
}
