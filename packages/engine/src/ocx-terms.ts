// What both OCX layouts read the same way: the summary tab's classes and convertibles table (OX7, OX11), Financing
// History's terms for a preferred class (OX14, under O4's ratio check at Excel's 15 digits), notes and SAFEs made from
// a convertibles row, and the line for a header the reader doesn't know (OX12).

import type { Decimal } from "decimal.js";

import { D } from "./decimal.ts";
import {
  type Book, type Header, type Tab, type Table, UNKNOWN, dateAt, isBlank, isNA, label, malformed, normal, numberAt, unsupported, written,
} from "./ocx-cells.ts";
import { type Draft, type ShareClass, type Terms, madeHolderName } from "./ocx-import.ts";

/** OX7: the summary tab's classes, by the section each row sits in, to the `Total` row. */
export function summaryClasses(tab: Tab, header: Header, draft: Draft): ShareClass[] {
  const column = header.at("Share Class")!;
  let section: "common" | "preferred" | "done" | undefined;
  const seen = new Set<string>();
  for (const row of tab.rowNumbers().filter((r) => r > header.row)) {
    const text = tab.text(row, column);
    if (!text) continue;
    const l = label(text);
    if (l === "total") break;
    // A section's label is the first row of that name, so a class itself named "Common Stock" is the second.
    if ((l === "common stock" || l === "preferred stock") && !seen.has(l)) {
      seen.add(l);
      section = l === "common stock" ? "common" : "preferred";
      continue;
    }
    if (l === "warrants & non-plan awards" || l === "stock plans") {
      section = "done";
      continue;
    }
    if (section !== "common" && section !== "preferred") continue;
    const c = draft.addClass(text, section, row);
    if (section === "common" && /\bpreferred\b/i.test(text)) draft.notes.add("common_named_preferred", c.id);
  }
  draft.count("share_classes", draft.classes.length);
  return draft.classes;
}

/** A total the import checks but never needs (OX5): skipped when it's a formula with no value, or blank. */
export function totalAt(tab: Tab, row: number, column: number | undefined, subject: string, what: string): Decimal | undefined {
  if (column === undefined) return undefined;
  const c = tab.cell(row, column);
  if (isBlank(c) || isNA(c) || (c!.formula && c!.text === "")) return undefined;
  return numberAt(c, subject, what);
}

const TYPES = ["Pre-$ SAFEs", "Post-$ SAFEs", "Convertible Notes", "Warrants for future series of Preferred Stock"];

export interface ConvertibleRow {
  type: string;
  count: Decimal;
  amount: Decimal;
  discount: Decimal | undefined;
  cap: Decimal | undefined;
}

/** A discount (OX11): blank or "N/A" is none; else a number cell holding a fraction below 1, and anything else `bad_number`. */
export function discountAt(tab: Tab, row: number, column: number | undefined, subject: string): Decimal | undefined {
  const c = column === undefined ? undefined : tab.cell(row, column);
  if (isBlank(c) || isNA(c)) return undefined;
  const x = numberAt(c, subject, "its discount")!;
  if (x.isNegative() || x.gte(1)) malformed("bad_number", subject, `its discount, ${written(x)}, isn't a fraction below 1 (0.2 for 20%)`);
  return x;
}

/** OX11, OX13 step 7: the summary tab's convertibles rows, each its type, count, amount, discount and cap, to `Total`. */
export function convertibleRows(tab: Tab, header: Header, draft: Draft): ConvertibleRow[] {
  const at = (h: string) => header.at(h);
  const rows: ConvertibleRow[] = [];
  for (const row of tab.rowNumbers().filter((r) => r > header.row)) {
    const type = tab.text(row, at("Security Type")!);
    if (!type) continue;
    if (label(type) === "total") break;
    if (!TYPES.includes(type)) unsupported("unknown_security_type", type, "a convertibles row of a type OCX doesn't list");
    draft.count("convertible_rows");
    // OX13 step 7: a value the import needs, left blank, is bad_number; a 0 that's written is read.
    const count = numberAt(tab.cell(row, at("# of Securities")!), type, "its number of securities", true);
    if (count === undefined) malformed("bad_number", type, "its number of securities is blank");
    const amount = numberAt(tab.cell(row, at("Outstanding Amount")!), type, "its outstanding amount");
    if (amount === undefined) malformed("bad_number", type, "its outstanding amount is blank");
    const discount = discountAt(tab, row, at("Discount"), type);
    const capCell = tab.cell(row, at("Valuation Cap")!);
    const cap = isNA(capCell) ? undefined : numberAt(capCell, type, "its valuation cap");
    if (type === "Warrants for future series of Preferred Stock" && count!.gt(0)) {
      unsupported("warrant_for_future_series", type, "warrants for a series not yet issued have no series to model them on");
    }
    if (type === "Convertible Notes" && count!.gt(1)) unsupported("several_notes_in_row", type, "a row of several notes can't be combined exactly");
    rows.push({ type, count: count!, amount: amount!, discount, cap });
  }
  return rows;
}

/** OX11: a `Convertible Notes` row of one note, with no notes ledger: a note with its terms blank, held by a holder made for it. */
export function noteFromRow(r: ConvertibleRow, draft: Draft): void {
  const holder = draft.makeHolder(madeHolderName("Convertible notes", r.cap, r.discount, r.count));
  const id = draft.safeId(holder.id, "note");
  draft.convertibleNotes.push({
    id, holder: holder.id, principal: written(r.amount), interest_rate: null, interest_method: "simple", issue_date: null,
    // O9: a note with no cap has no cap fields.
    ...(r.cap ? { valuation_cap: written(r.cap), cap_type: "pre_money" } : {}), conversion_base: null, discount: written(r.discount ?? new D(0)),
    repayment_multiple: null,
  });
  draft.notes.add("note_from_convertibles_row", id);
  if (r.cap) draft.notes.add("note_cap_read_as_pre_money", id);
  draft.issued.push({ id, series: false });
}

/** OX11, 0.4/0.5: a `Post-$ SAFEs` or `Pre-$ SAFEs` row is one SAFE for its total, held by a holder made for it. */
export function safeFromRow(r: ConvertibleRow, draft: Draft): void {
  const post = r.type === "Post-$ SAFEs";
  const holder = draft.makeHolder(madeHolderName(post ? "Post-money SAFEs" : "Pre-money SAFEs", r.cap, r.discount, r.count));
  const id = draft.safeId(holder.id, "safe");
  draft.safes.push({
    id, holder: holder.id, purchase_amount: written(r.amount), ...(r.cap ? { [post ? "post_money_cap" : "pre_money_cap"]: written(r.cap) } : {}),
    discount: written(r.discount ?? new D(0)),
  });
  draft.notes.add("safes_combined", id);
  draft.issued.push({ id, series: false });
}

/** A preferred class's round: the class's name less a trailing "Preferred Stock" or "Preferred" (0.6.0 plan, answer 5). */
const roundKey = (name: string): string => name.replace(/\s+Preferred(?:\s+Stock)?$/i, "").trim();

export interface Round {
  row: number;
  name: string;
  cls: ShareClass;
}

/** OX14, OX13 step 6: each round's class (`round_without_class`), then each preferred class's round (`class_without_round`). */
export function matchRounds(ctx: Tab, table: Table, classes: ShareClass[], draft: Draft): Round[] {
  const column = table.header!.at("Round")!;
  const preferred = classes.filter((c) => c.kind === "preferred");
  const rounds: Round[] = [];
  for (const row of table.rows) {
    const name = ctx.text(row, column);
    if (!name) continue;
    const cls = preferred.find((c) => roundKey(c.name) === name || c.name === name);
    if (!cls) malformed("round_without_class", name, "a round with no preferred class of its name");
    rounds.push({ row, name, cls: cls! });
  }
  draft.count("financing_rounds", rounds.length);
  for (const c of preferred) if (!rounds.some((r) => r.cls === c)) malformed("class_without_round", c.name, "a preferred class with no round in Financing History");
  return rounds;
}

/** Half a unit in a number's last written place, or zero for a whole number (O4's allowance for a derived ratio). */
const lastPlace = (x: Decimal): Decimal => (x.isInteger() ? new D(0) : new D(10).pow(-x.decimalPlaces()).div(2));
/** Half a unit in the 15th significant digit, when all 15 are written; else the price is exact as read. */
const fifteenth = (x: Decimal): Decimal => (x.precision(true) >= 15 ? new D(10).pow(x.e - 14).div(2) : new D(0));

/**
 * OX14: a preferred class's terms from its round, read left to right. The conversion price is checked against the
 * ratio as O4 checks OCF's, at 15 significant digits: the class passes if issue price ÷ conversion price can equal the
 * ratio within each's allowance (`conversion_ratio_mismatch` otherwise), with a `conversion_ratio_rounded` line where
 * it isn't exact. Participation by `Participating (Y/N)` and `Participation Cap`, a cap read as including the
 * preference (E7), as O4 reads OCF's; where the workbook lacks either column, it isn't read and is left to fill (10f).
 */
export function readRound(ctx: Tab, header: Header, round: Round, book: Book, draft: Draft, participationRead = true): string | undefined {
  const cls = round.cls;
  const at = (h: string) => (header.at(h) === undefined ? undefined : ctx.cell(round.row, header.at(h)!));
  const date = dateAt(at("Initial Closing Date"), book.dateSystem, cls.name, "its initial closing date");
  const oip = numberAt(at("Original Issue Price"), cls.name, "its original issue price");
  const cp = numberAt(at("Adjusted Conversion Price"), cls.name, "its adjusted conversion price");
  if (cp?.isZero()) malformed("bad_number", cls.name, "its adjusted conversion price is 0; a conversion price must be more than zero");
  const ratio = numberAt(at("Conversion Ratio"), cls.name, "its conversion ratio");
  const multiple = numberAt(at("Liquidation Multiple"), cls.name, "its liquidation multiple");
  // Without both participation columns, neither is read: as if each were blank (OX14; 10f).
  const yn = participationRead ? at("Participating (Y/N)") : undefined;
  const capCell = participationRead ? at("Participation Cap") : undefined;
  const cap = isNA(capCell) ? undefined : numberAt(capCell, cls.name, "its participation cap");

  if (oip && cp && ratio && !cp.isZero()) {
    const lo = oip.minus(fifteenth(oip)).div(cp.plus(fifteenth(cp)));
    const hi = oip.plus(fifteenth(oip)).div(cp.minus(fifteenth(cp)));
    const rLo = ratio.minus(lastPlace(ratio));
    const rHi = ratio.plus(lastPlace(ratio));
    if (hi.lt(rLo) || lo.gt(rHi)) {
      malformed("conversion_ratio_mismatch", cls.name, `its prices, ${written(oip)} and ${written(cp)}, don't give its conversion ratio, ${written(ratio)}`);
    }
    if (!oip.div(cp).eq(ratio)) draft.notes.add("conversion_ratio_rounded", cls.id);
  }

  const terms: Terms = {
    original_issue_price: oip ? written(oip) : null,
    conversion_price: cp ? written(cp) : null,
    preference_multiple: multiple ? written(multiple) : null,
    participation: null,
    cap_multiple: null,
  };
  const word = isBlank(yn) ? "" : label(yn!.kind === "text" ? yn!.text : "");
  if (isBlank(yn)) {
    // Left blank: participation is a term to fill.
  } else if (word === "n") {
    terms.participation = "non_participating";
  } else if (word === "y") {
    if (cap === undefined) terms.participation = "participating";
    else {
      draft.notes.add("participation_cap_includes_preference", cls.id);
      if (multiple === undefined) {
        // O4: a cap with no preference multiple leaves participation blank, for when the multiple is filled in.
      } else if (cap.lt(multiple)) {
        unsupported("cap_below_preference", cls.name, `its participation cap, ${written(cap)}x, is below its ${written(multiple)}x preference; read as including the preference, as spillpoint reads caps, it makes sense only if OCX meant one that excludes it`);
      } else if (cap.eq(multiple)) terms.participation = "non_participating";
      else {
        terms.participation = "participating_capped";
        terms.cap_multiple = written(cap);
      }
    }
  } else {
    unsupported("unknown_status", cls.name, `its "Participating (Y/N)", "${normal(yn!.text)}", is neither Y nor N`);
  }
  cls.terms = terms;
  return date === UNKNOWN ? undefined : date;
}

/** OX12: a header the reader doesn't know, outside the holdings, gets a line naming its tab and header. */
export function unrecognized(tab: Tab, cells: readonly { text: string }[] | undefined, known: (h: string) => boolean, draft: Draft): void {
  for (const { text } of cells ?? []) if (!known(text)) draft.notes.add("unrecognized_field", tab.name, text);
}
