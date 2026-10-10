// Who converts and who exercises at an exit value (SPEC, Conversion decisions;
// Options and warrants). The engine solves for the stable decisions directly
// (E15), not by trying every combination as the reference does:
//
// - Options follow the common price (E16). For any set of conversions and
//   warrant exercises, the option classes are exercised lowest strike first,
//   for as long as the next class strictly gains by exercising (E5: a tie
//   means no).
// - Each warrant decides for itself (E4), alongside the series: it is one of
//   the free decision-makers below, and "switching" means exercising or not.
//   So does each note that can convert: converting or being repaid.
// - The SAFEs' greater-of comes last (E20). Under each set of the series',
//   warrants' and notes' decisions, each SAFE still outstanding takes the
//   greater of its Cash-Out and Conversion Amounts, as its text pays it given
//   those decisions, with the options settled under each choice. So a series
//   or note weighing a switch weighs it with the SAFEs re-settled after it.
//   Where several SAFEs could settle more than one way, each converting only
//   because the others do, they take the most conversions (Jordan, after
//   #71). The SAFEs' answer is found from "every SAFE converts", dropping
//   those that would rather take cash, not by weighing every combination.
// - A SAFE, a note or a series converts, and a warrant is exercised, only
//   when that strictly pays more (X16, E20), so where it is indifferent but
//   its choice changes what others get, the outcome from below holds (E13).
// - A conversion group decides first (E17). For each of its two choices the
//   other series settle; the group then votes (E11) on the two outcomes.
// - The series outside a group, and the warrants, are solved from both ends:
//   from "nobody converts" and from "everyone converts", one at a time makes
//   the switch that gains it the most, until no one wants to switch. If the two
//   ends agree, that is the answer. If not, every combination is checked when
//   there are 12 or fewer of them; above 12 the answers found are reported and
//   flagged as possibly incomplete. Going round in a circle is an error.
// - Where several decision sets pay everyone the same, the reported one has
//   the fewest conversions and exercises (E5).
// - Work is reused from one exit value to the next (05c4). With the decisions
//   fixed, every amount paid is a straight line until the waterfall's formula
//   changes (lines.ts). Option exercise and the SAFEs' answer for each set of
//   decisions are kept with the comparisons they turned on, each with the
//   interval where it comes out the same way. Elsewhere only the comparisons
//   whose interval has run out are made again, and if each comes out as
//   before, so does the result. The answers reported are run exactly.

import type { Decimal } from "decimal.js";

import { D, TIE, ZERO, moreThan, sameAmount } from "./decimal.ts";
import { NoAnswerError } from "./errors.ts";
import { EVERYWHERE, inside, meet, payoutWithLines, signHolds } from "./lines.ts";
import type { Interval, Line, PayoutLines } from "./lines.ts";
import type { ConversionGroup, OptionClass } from "./model.ts";
import { payout } from "./waterfall.ts";
import type { Decisions, Payout, PreparedCapTable } from "./waterfall.ts";

/** One stable answer: the decisions and what they pay. */
export interface Answer {
  decisions: Decisions;
  payout: Payout;
}

export interface Solution {
  exitValue: Decimal;
  /** Every distinct stable answer (E8). Almost always exactly one. */
  answers: Answer[];
  /** False only when the list may be incomplete: more than 12 series to check and the two ends disagreed (E15). */
  complete: boolean;
}

export interface SolveOptions {
  /** Check every combination even when the two ends agree. Tests use it to confirm both routes give the same answers. */
  checkEveryCombination?: boolean;
}

/** E15: the most series whose every combination the engine will check. */
export const MAX_CHECKED = 12;

/** Group vote shares that differ by less than this are equal; 40-digit division can leave a trace. */
const SHARE_TIE = new D("1e-30");

export function solve(pc: PreparedCapTable, exitValue: Decimal, options: SolveOptions = {}): Solution {
  return new AtExit(pc, exitValue, options).solve();
}

// ---------- the choice among series that decide for themselves (E15) ----------

/**
 * Series that each decide for themselves whether to convert, and what each
 * set of conversions pays them. The engine builds this from the waterfall;
 * tests build artificial ones to reach E15's rarer paths. Internal: not part
 * of the package's public API.
 */
export interface Choice {
  players: readonly string[];
  /** What a player gets when exactly this set of players converts. */
  value(converted: ReadonlySet<string>, player: string): Decimal;
  /** Whether two sets pay every holder the same. */
  samePayouts(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean;
  /** Conversions plus exercises, for the tie-break (E5). */
  size(converted: ReadonlySet<string>): number;
  /** Players that switch on only when that strictly pays more, even when switching would change what others get (X16). */
  strict?(player: string): boolean;
  /** Where the choice is made, for messages: "At $1,000,000.00". */
  where: string;
}

export interface Settled {
  /** One set of conversions per distinct stable answer, simplest first (E5). */
  sets: Set<string>[];
  /** False when there were more than MAX_CHECKED players and the two ends disagreed (E15). */
  complete: boolean;
}

function key(ids: ReadonlySet<string>): string {
  return [...ids].sort().join("\u0000");
}

function toggled(ids: ReadonlySet<string>, id: string): Set<string> {
  const out = new Set(ids);
  if (out.has(id)) out.delete(id);
  else out.add(id);
  return out;
}

/** E15: solve from both ends; check every combination if they disagree and there are few enough players. Internal. */
export function settleChoice(choice: Choice, checkEveryCombination = false): Settled {
  // X16: a strict player that is switched on must do strictly better than switching off.
  const wantsOff = (set: ReadonlySet<string>, p: string) =>
    choice.strict?.(p) === true && set.has(p) && !moreThan(choice.value(set, p), choice.value(toggled(set, p), p));
  const isStable = (set: ReadonlySet<string>) =>
    choice.players.every((p) => !moreThan(choice.value(toggled(set, p), p), choice.value(set, p)) && !wantsOff(set, p));
  const simpler = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
    choice.size(a) - choice.size(b) || key(a).localeCompare(key(b));

  const fromEnd = (everyoneConverts: boolean): Set<string> => {
    let set = new Set(everyoneConverts ? choice.players : []);
    const seen = new Set<string>();
    for (;;) {
      if (seen.has(key(set))) {
        throw new NoAnswerError(`${choice.where} solving from "${everyoneConverts ? "everyone" : "nobody"} converts" went round in a circle (E15).`);
      }
      seen.add(key(set));
      let best: string | null = null;
      let bestGain = ZERO;
      for (const p of choice.players) {
        const now = choice.value(set, p);
        const after = choice.value(toggled(set, p), p);
        // A strict player switches off on a tie too (X16); a real gain still goes first.
        if ((moreThan(after, now) || wantsOff(set, p)) && (best === null || after.minus(now).gt(bestGain))) {
          best = p;
          bestGain = after.minus(now);
        }
      }
      if (best === null) return set;
      set = toggled(set, best);
    }
  };

  // E5: drop any conversion that changes no payout and keeps the answer stable.
  const simplest = (set: Set<string>): Set<string> => {
    let current = set;
    for (let changed = true; changed; ) {
      changed = false;
      for (const p of choice.players) {
        if (!current.has(p)) continue;
        const candidate = toggled(current, p);
        if (choice.samePayouts(candidate, current) && isStable(candidate)) {
          current = candidate;
          changed = true;
        }
      }
    }
    return current;
  };

  const everyCombination = (): Set<string>[] => {
    const found: Set<string>[] = [];
    for (let mask = 0; mask < 2 ** choice.players.length; mask++) {
      const set = new Set(choice.players.filter((_, i) => mask & (1 << i)));
      if (!isStable(set)) continue;
      const same = found.findIndex((f) => choice.samePayouts(f, set));
      if (same < 0) found.push(set);
      else if (simpler(set, found[same]!) < 0) found[same] = set;
    }
    if (found.length === 0) throw new NoAnswerError(`${choice.where} no set of decisions is stable.`);
    return found.sort(simpler);
  };

  if (checkEveryCombination) return { sets: everyCombination(), complete: true };
  const low = fromEnd(false);
  const high = fromEnd(true);
  if (choice.samePayouts(low, high)) return { sets: [simplest(low)], complete: true };
  if (choice.players.length <= MAX_CHECKED) return { sets: everyCombination(), complete: true };
  return { sets: [simplest(low), simplest(high)].sort(simpler), complete: false };
}

// ---------- one exit value ----------

/** Whether two payouts pay every security the same, and so every holder (E9). */
function samePayouts(a: Payout, b: Payout): boolean {
  return [...a.bySecurity].every(([id, v]) => sameAmount(v, b.bySecurity.get(id)!));
}

// ---------- results that hold over an interval of exit values (05c4) ----------

/**
 * Where a result worked out at one exit value still holds: an open interval,
 * or null for that exit value alone. Every comparison it made comes out the
 * same way there, at least a billionth of a dollar from turning, and every
 * payout it read stays on its lines (lines.ts).
 */
type Holds = Interval | null;

function narrow(h: Holds, i: Holds): Holds {
  return h === null || i === null ? null : meet(h, i);
}

/** An answer as the solver weighs it: with its payout's lines, if known, and where it holds. */
interface Weighed extends Answer {
  lines: PayoutLines | null;
  holds: Holds;
}

/** One amount a comparison reads, with its line, if known, and where that line holds. */
interface Side {
  value: Decimal;
  line: Line | null;
  holds: Holds;
}

/** What an option class not exercised gets: nothing, at every exit value. */
const NOTHING: Side = { value: ZERO, line: { a: ZERO, b: ZERO }, holds: EVERYWHERE };

function side(w: Weighed, id: string): Side {
  return { value: w.payout.bySecurity.get(id)!, line: w.lines?.security(id) ?? null, holds: w.holds };
}

/** Whether a is more than b by at least the tie threshold (E14), and where that answer holds. */
function exceeds(x: Decimal, a: Side, b: Side): { yes: boolean; holds: Holds } {
  const yes = moreThan(a.value, b.value);
  if (!a.line || !b.line) return { yes, holds: null };
  const sign = signHolds({ a: a.line.a.minus(b.line.a).minus(TIE), b: a.line.b.minus(b.line.b) }, x);
  return { yes, holds: narrow(narrow(sign, a.holds), b.holds) };
}

/** A comparison a kept result turned on: what it compared, how it came out, and where that holds. */
interface Check<T> {
  what: T;
  yes: boolean;
  holds: Holds;
}

/**
 * Whether every comparison a kept result turned on comes out the same way at
 * x, comparing again only those whose interval has run out; if so, where they
 * all hold. A result whose comparisons all come out the same is the same
 * result: the steps that reached it are taken the same way.
 */
function recheck<T>(x: Decimal, checks: Check<T>[], compare: (what: T) => { yes: boolean; holds: Holds }): Holds | false {
  let holds: Holds = EVERYWHERE;
  for (const c of checks) {
    if (!c.holds || !inside(c.holds, x)) {
      const now = compare(c.what);
      if (now.yes !== c.yes) return false;
      c.holds = now.holds;
    }
    holds = narrow(holds, c.holds);
  }
  return holds;
}

/** The option exercise a set of decisions settles to (E16): each comparison of one class's payout in two exercise sets, or against nothing. */
interface OptionCompare {
  a: Set<string> | null;
  b: Set<string> | null;
  id: string;
}

/** The SAFEs' answer under a set of decisions (E20): each comparison of one SAFE's payout converting and taking cash. */
interface SafeCompare {
  on: Set<string>;
  off: Set<string>;
  fid: string;
}

/** What each set of decisions settled to, kept across exit values for each prepared cap table, with the comparisons it turned on. */
const OPTIONS_SETTLED = new WeakMap<PreparedCapTable, Map<string, { exercised: Set<string>; checks: Check<OptionCompare>[] }>>();
const SAFES_SETTLED = new WeakMap<PreparedCapTable, Map<string, { path: Set<string>[]; checks: Check<SafeCompare>[] }>>();

function kept<T>(store: WeakMap<PreparedCapTable, Map<string, T>>, pc: PreparedCapTable): Map<string, T> {
  let byKey = store.get(pc);
  if (!byKey) store.set(pc, (byKey = new Map()));
  return byKey;
}

/** What decides the answer at one exit value: the answer, and how far each deciding quantity is from changing it. */
export interface Snapshot {
  answer: Answer;
  /**
   * Each quantity whose sign decides something: a tier not yet paid in full,
   * a cap not yet reached, the next option class's net if exercised, a
   * series' gain from switching, a group voter's preference. The key names
   * the quantity and the decisions it belongs to, so a change of decisions
   * changes the keys. Between changes, every one moves in a straight line.
   */
  margins: Map<string, Decimal>;
}

/** The answer at one exit value with its margins, for the breakpoint finder. Internal. */
export function snapshotAt(pc: PreparedCapTable, exitValue: Decimal): Snapshot {
  return new AtExit(pc, exitValue, {}).snapshot();
}

class AtExit {
  private readonly pc: PreparedCapTable;
  private readonly x: Decimal;
  private readonly options: SolveOptions;
  private readonly settled = new Map<string, Weighed>();
  /** Option classes in the order they come into the money: lowest strike first. */
  private readonly optionClasses: OptionClass[];
  private readonly group: ConversionGroup | null;
  /** Convertible series outside a group, warrants and notes that can convert: each decides for itself (E4, E15). */
  private readonly free: string[];
  private readonly warrants: Set<string>;
  /** SAFEs still outstanding: they follow everyone else's decisions (E20). */
  private readonly safes: string[];
  private readonly followedCache = new Map<string, Weighed>();
  /** How many option classes the last settling exercised: where the next one starts looking (E16). */
  private lastExercised: number | null = null;
  /** For each set of the others' choices, the sets of SAFEs converting that settling them went through, the answer's last (E20). */
  private readonly followedPaths = new Map<string, Set<string>[]>();

  constructor(pc: PreparedCapTable, x: Decimal, options: SolveOptions) {
    this.pc = pc;
    this.x = x;
    this.options = options;
    this.optionClasses = [...pc.options.values()]
      .filter((o) => pc.shares.get(o.id)!.gt(0))
      .sort((a, b) => a.strike.cmp(b.strike) || a.id.localeCompare(b.id));
    this.group = pc.capTable.conversionGroups[0] ?? null;
    const grouped = new Set(this.group?.series ?? []);
    this.warrants = new Set([...pc.warrants.keys()].filter((id) => pc.shares.get(id)!.gt(0)));
    this.free = [...pc.preferred.values()]
      .filter((s) => s.participation !== "participating" && !grouped.has(s.id) && pc.shares.get(s.id)!.gt(0))
      .map((s) => s.id)
      .concat([...this.warrants], [...pc.notes.values()].filter((t) => t.canConvert).map((t) => t.note.id));
    this.safes = [...pc.safes.keys()];
  }

  private get where(): string {
    return `At $${this.x.toFixed(2)}`;
  }

  solve(): Solution {
    if (!this.group) {
      const { answers, complete } = this.settleFree(new Set());
      return { exitValue: this.x, answers: answers.map((a) => this.exact(a)), complete };
    }
    const { converting, staying } = this.groupChoices();
    return { exitValue: this.x, answers: [this.exact(this.groupVotes(converting, staying) ? converting : staying)], complete: true };
  }

  /** An answer with its payout run exactly: what the solver reports, whatever lines it weighed it on. */
  private exact(a: Answer): Answer {
    return { decisions: a.decisions, payout: payout(this.pc, this.x, a.decisions) };
  }

  /** E17: for each of the group's two choices, everyone else settles. Each must settle one way. */
  private groupChoices(): { converting: Weighed; staying: Weighed } {
    const choice = (converts: boolean): Weighed => {
      const { answers, complete } = this.settleFree(converts ? new Set(this.group!.series) : new Set());
      if (answers.length !== 1 || !complete) {
        throw new NoAnswerError(
          `${this.where} the other series settle ${answers.length} ways when the group ` +
            `(${this.group!.series.join(", ")}) ${converts ? "converts" : "stays"}, so its vote has no single comparison (E17).`,
        );
      }
      return answers[0]!;
    };
    return { converting: choice(true), staying: choice(false) };
  }

  /** Each voter's preference for converting: its group payout converting minus staying (E11). */
  private voterMargins(converting: Answer, staying: Answer): Map<string, Decimal> {
    const members = new Set(this.group!.series);
    const onGroup = (a: Answer, holder: string) =>
      a.payout.lines.filter((l) => l.holder === holder && members.has(l.security)).reduce((sum, l) => sum.plus(l.amount), ZERO);
    const out = new Map<string, Decimal>();
    for (const p of this.pc.capTable.positions) {
      if (members.has(p.security) && !p.shares.isZero() && !out.has(p.holder)) {
        out.set(p.holder, onGroup(converting, p.holder).minus(onGroup(staying, p.holder)));
      }
    }
    return out;
  }

  /**
   * E11: each holder votes for conversion only if it does strictly better on
   * its group shares converting than staying; an indifferent holder votes to
   * stay. Votes are weighted by as-converted shares of the group's series.
   */
  private groupVotes(converting: Answer, staying: Answer): boolean {
    const group = this.group!;
    const members = new Set(group.series);
    const weight = new Map<string, Decimal>();
    for (const p of this.pc.capTable.positions) {
      if (!members.has(p.security) || p.shares.isZero()) continue;
      const asConverted = p.shares.times(this.pc.preferred.get(p.security)!.conversionRatio);
      weight.set(p.holder, (weight.get(p.holder) ?? ZERO).plus(asConverted));
    }
    const prefers = this.voterMargins(converting, staying);
    let yes = ZERO;
    let all = ZERO;
    for (const [holder, w] of weight) {
      all = all.plus(w);
      if (moreThan(prefers.get(holder)!, ZERO)) yes = yes.plus(w);
    }
    const share = yes.div(all);
    const atThreshold = share.minus(group.voteThreshold).abs().lt(SHARE_TIE);
    return group.voteRule === "at_least" ? atThreshold || share.gt(group.voteThreshold) : !atThreshold && share.gt(group.voteThreshold);
  }

  /** The choices in an answer that lead (E20): the series and notes converted and the warrants exercised. */
  private chosen(a: Answer): Set<string> {
    return new Set([...[...a.decisions.converted].filter((id) => !this.pc.safes.has(id)), ...[...a.decisions.exercised].filter((id) => this.warrants.has(id))]);
  }

  /**
   * The series outside the group, the warrants and the notes, settling around
   * fixed group conversions (E15), each weighing its choices with the SAFEs
   * following (E20). A series or note converts, and a warrant is exercised,
   * only when that strictly pays more: where it is indifferent but its choice
   * moves the SAFEs, as when its conversion joins their Liquidity
   * Capitalization (X1, X18), it keeps its preference, is repaid or isn't
   * exercised, so the outcome from below holds, as for X16 and E13. A warrant
   * at its series' preference per share is indifferent, but exercised into a
   * series keeping its preference it leaves the SAFEs' count (X1; 05c4, New,
   * Jordan to confirm).
   */
  private settleFree(fixed: ReadonlySet<string>): { answers: Weighed[]; complete: boolean } {
    const all = (set: ReadonlySet<string>) => this.followed(new Set([...fixed, ...set]));
    const { sets, complete } = settleChoice(
      {
        players: this.free,
        value: (set, p) => all(set).payout.bySecurity.get(p)!,
        samePayouts: (a, b) => samePayouts(all(a).payout, all(b).payout),
        size: (set) => all(set).decisions.converted.size + all(set).decisions.exercised.size,
        strict: (p) => this.pc.notes.has(p) || this.pc.preferred.has(p) || this.warrants.has(p),
        where: this.where,
      },
      this.options.checkEveryCombination,
    );
    return { answers: sets.map(all), complete };
  }

  /**
   * E20: the SAFEs' greater-of, last. Given every other decision, each SAFE
   * takes the greater of its Cash-Out and Conversion Amounts as its text pays
   * it, with the options settled under each choice (E16); with several, none
   * gains by switching (X13). One that is indifferent takes its Cash-Out Amount
   * (X16). Several that could settle more than one way, each converting only
   * because the others do, take the most conversions (Jordan, after #71): a
   * post-money SAFE promises its holder a fixed share once all the SAFEs
   * convert, and each SAFE's greater-of points to the outcome where it gets
   * more.
   *
   * Found from "every SAFE converts": every SAFE for which converting doesn't
   * strictly pay more switches to cash, all at once, until none does. Where
   * one SAFE converting makes the others' conversion worth more, as one more
   * converting enlarges the count each converting SAFE holds a fixed share of
   * and frees its cash for the rest, a SAFE that wants cash would want it with
   * fewer converting too, so the first set where none wants cash has the most
   * conversions. That isn't certain beside a series at its cap or options not
   * exercised, which the count includes but which don't share what's left, so
   * the result is checked: if a SAFE taking cash would gain by converting,
   * every combination is weighed instead.
   */
  private followed(choices: ReadonlySet<string>): Weighed {
    if (this.safes.length === 0) return this.withOptions(choices);
    const k = key(choices);
    const cached = this.followedCache.get(k);
    if (cached) return cached;
    const all = (set: ReadonlySet<string>) => this.withOptions(new Set([...choices, ...set]));
    const compare = (c: SafeCompare) => exceeds(this.x, side(all(c.on), c.fid), side(all(c.off), c.fid));
    const finish = (path: Set<string>[], holds: Holds) => {
      const answer = all(path[path.length - 1]!);
      const weighed = { ...answer, holds: narrow(holds, answer.holds) };
      this.followedCache.set(k, weighed);
      this.followedPaths.set(k, path);
      return weighed;
    };
    const known = kept(SAFES_SETTLED, this.pc).get(k);
    if (known) {
      const holds = recheck(this.x, known.checks, compare);
      if (holds !== false) return finish(known.path, holds);
    }
    const checks: Check<SafeCompare>[] = [];
    // Whether a SAFE does strictly better converting than taking cash, the others as in `set` (X16).
    const converts = (set: ReadonlySet<string>, fid: string) => {
      const what = { on: set.has(fid) ? new Set(set) : toggled(set, fid), off: set.has(fid) ? toggled(set, fid) : new Set(set), fid };
      const c = compare(what);
      checks.push({ what, ...c });
      return c.yes;
    };
    const path: Set<string>[] = [];
    let set = new Set(this.safes);
    for (;;) {
      path.push(set);
      const leaving = new Set([...set].filter((fid) => !converts(set, fid)));
      if (leaving.size === 0) break;
      set = new Set([...set].filter((fid) => !leaving.has(fid)));
    }
    if (this.safes.some((fid) => !set.has(fid) && converts(set, fid))) {
      set = this.mostConversions(all, converts);
      path.push(set);
    }
    kept(SAFES_SETTLED, this.pc).set(k, { path, checks });
    return finish(path, checks.reduce<Holds>((h, c) => narrow(h, c.holds), EVERYWHERE));
  }

  /** The SAFEs' answer by weighing every combination, where dropping from "every SAFE converts" didn't settle (E20, E15). */
  private mostConversions(all: (set: ReadonlySet<string>) => Weighed, converts: (set: ReadonlySet<string>, fid: string) => boolean): Set<string> {
    if (this.safes.length > MAX_CHECKED) {
      throw new NoAnswerError(`${this.where} the ${this.safes.length} SAFEs don't settle from all converting, and there are too many to weigh every combination (E20, E15).`);
    }
    let best: Set<string> | null = null;
    const size = (set: ReadonlySet<string>) => all(set).decisions.converted.size + all(set).decisions.exercised.size;
    for (let mask = 0; mask < 2 ** this.safes.length; mask++) {
      const set = new Set(this.safes.filter((_, i) => mask & (1 << i)));
      if (!this.safes.every((fid) => converts(set, fid) === set.has(fid))) continue;
      if (best === null || set.size > best.size || (set.size === best.size && (size(set) - size(best) || key(set).localeCompare(key(best))) < 0)) best = set;
    }
    if (best === null) throw new NoAnswerError(`${this.where} the SAFEs' greater-of doesn't settle (E20).`);
    return best;
  }

  /**
   * E16: the options follow the common price. Lowest strike first, a class
   * is exercised while doing so strictly pays it. Exercising adds the strike
   * to the proceeds and the shares to the residual, so the common price falls
   * toward that strike but stays above it; the check at the end confirms no
   * class would gain by switching. `choices` holds the series converted and
   * the warrants exercised.
   *
   * Since the price only falls as classes are exercised, the first k classes
   * are where that sequence stops when, with all k exercised, each of them
   * nets more than nothing and the next class wouldn't: each was paid at least
   * as much when it was added. So that's what is kept and checked again at
   * other exit values, and a new set of decisions tries the k the last one
   * settled on first, running the sequence only if that fails (05c4). Where
   * the sequence settles but that doesn't hold, as in a near tie, the
   * sequence's own comparisons are kept. Checking every combination runs the
   * sequence every time.
   */
  private withOptions(choices: ReadonlySet<string>): Weighed {
    const k = key(choices);
    const cached = this.settled.get(k);
    if (cached) return cached;
    const converted = new Set([...choices].filter((id) => !this.warrants.has(id)));
    // Each exercise set is paid out once: the check below reuses the trials made on the way up.
    const runs = new Map<string, Weighed>();
    const run = (exercised: ReadonlySet<string>): Weighed => {
      const k2 = key(exercised);
      let r = runs.get(k2);
      if (!r) {
        const { payout: p, lines } = payoutWithLines(this.pc, this.x, { converted, exercised });
        runs.set(k2, (r = { decisions: { converted, exercised }, payout: p, lines, holds: lines ? lines.interval : null }));
      }
      return r;
    };
    const sideOf = (exercised: Set<string> | null, id: string) => (exercised ? side(run(exercised), id) : NOTHING);
    const compare = (c: OptionCompare) => exceeds(this.x, sideOf(c.a, c.id), sideOf(c.b, c.id));
    const finish = (exercised: Set<string>, holds: Holds) => {
      const result = run(exercised);
      const weighed = { ...result, holds: narrow(holds, result.holds) };
      this.settled.set(k, weighed);
      return weighed;
    };
    const known = kept(OPTIONS_SETTLED, this.pc).get(k);
    if (known) {
      const holds = recheck(this.x, known.checks, compare);
      if (holds !== false) return finish(known.exercised, holds);
    }
    const checks: Check<OptionCompare>[] = [];
    const more = (what: OptionCompare) => {
      const c = compare(what);
      checks.push({ what, ...c });
      return c.yes;
    };
    const warrants = [...choices].filter((id) => this.warrants.has(id));
    const firstK = (n: number) => new Set([...warrants, ...this.optionClasses.slice(0, n).map((o) => o.id)]);
    // The first n classes, all exercised, each netting more than nothing, and the next one not.
    const settlesAt = (n: number) => {
      const all = firstK(n);
      const next = this.optionClasses[n];
      return this.optionClasses.slice(0, n).every((o) => more({ a: all, b: null, id: o.id })) && !(next && more({ a: new Set([...all, next.id]), b: null, id: next.id }));
    };
    const guess = this.options.checkEveryCombination ? null : this.lastExercised;
    let n = -1;
    if (guess !== null && settlesAt(guess)) n = guess;
    if (n < 0) {
      // The sequence: lowest strike first, while exercising strictly pays (E16).
      checks.length = 0;
      n = 0;
      for (const o of this.optionClasses) {
        if (!more({ a: new Set([...firstK(n), o.id]), b: null, id: o.id })) break;
        n++;
      }
      // Its exercised classes mustn't gain by not exercising, which would pay them nothing.
      for (const o of this.optionClasses.slice(0, n)) {
        if (more({ a: null, b: firstK(n), id: o.id })) throw new NoAnswerError(`${this.where} option exercise doesn't settle: ${o.id} would gain by switching.`);
      }
      const sequence = checks.splice(0);
      if (this.options.checkEveryCombination || !settlesAt(n)) {
        checks.length = 0;
        checks.push(...sequence);
      }
    }
    this.lastExercised = n;
    const exercised = firstK(n);
    // A class beyond the next isn't exercised, so it mustn't gain by exercising.
    for (const o of this.optionClasses.slice(n + 1)) {
      if (more({ a: toggled(exercised, o.id), b: exercised, id: o.id })) throw new NoAnswerError(`${this.where} option exercise doesn't settle: ${o.id} would gain by switching.`);
    }
    kept(OPTIONS_SETTLED, this.pc).set(k, { exercised, checks });
    return finish(exercised, checks.reduce<Holds>((h, c) => narrow(h, c.holds), EVERYWHERE));
  }

  // ---------- margins, for the breakpoint finder ----------

  snapshot(): Snapshot {
    const margins = new Map<string, Decimal>();
    if (!this.group) {
      const { answers, complete } = this.settleFree(new Set());
      const answer = this.single(answers, complete);
      this.addSettled(margins, "answer", answer, new Set());
      return { answer: this.exact(answer), margins };
    }
    const { converting, staying } = this.groupChoices();
    this.addSettled(margins, "converts", converting, new Set(this.group.series));
    this.addSettled(margins, "stays", staying, new Set());
    for (const [holder, m] of this.voterMargins(converting, staying)) margins.set(`vote:${holder}`, m);
    return { answer: this.exact(this.groupVotes(converting, staying) ? converting : staying), margins };
  }

  private single<T extends Answer>(answers: T[], complete: boolean): T {
    if (answers.length !== 1 || !complete) {
      throw new NoAnswerError(
        `${this.where} there ${answers.length === 1 ? "may be more than one stable answer" : `are ${answers.length} stable answers`}; ` +
          "the breakpoint finder needs exactly one (E8).",
      );
    }
    return answers[0]!;
  }

  /**
   * A settled answer's own margins, and those of each single switch a free
   * series, warrant or note weighs against it, with the SAFEs re-settled after
   * it (E20). Each SAFE's gain from switching is a margin in both, since where
   * it reaches zero the SAFEs settle differently.
   */
  private addSettled(margins: Map<string, Decimal>, label: string, answer: Answer, fixed: ReadonlySet<string>): void {
    const tag = (a: Answer) => `${label}{${key(a.decisions.converted)}/${key(a.decisions.exercised)}}`;
    this.addFollowed(margins, tag, tag(answer), answer);
    for (const sid of this.free) {
      const alternative = this.followed(toggled(new Set([...fixed, ...this.chosen(answer)]), sid));
      this.addFollowed(margins, tag, `${tag(answer)}>${tag(alternative)}`, alternative);
      margins.set(`${tag(answer)}|gain:${sid}`, alternative.payout.bySecurity.get(sid)!.minus(answer.payout.bySecurity.get(sid)!));
    }
  }

  /**
   * An answer's structure, and each SAFE's gain from switching there, with the
   * structure of that switch (X13, E20). Settling the SAFEs went from "every
   * SAFE converts" through fewer: at each set on the way, each converting
   * SAFE's gain from staying decides whether it drops, so those are margins too.
   */
  private addFollowed(margins: Map<string, Decimal>, tag: (a: Answer) => string, prefix: string, a: Answer): void {
    this.addStructure(margins, prefix, a);
    if (this.safes.length === 0) return;
    const leaders = this.chosen(a);
    const path = this.followedPaths.get(key(leaders)) ?? [new Set([...a.decisions.converted].filter((id) => this.pc.safes.has(id)))];
    path.forEach((visited, i) => {
      const last = i === path.length - 1;
      const choices = new Set([...leaders, ...visited]);
      const here = this.withOptions(choices);
      const at = last ? prefix : `${prefix}>from{${key(visited)}}`;
      if (!last) this.addStructure(margins, at, here);
      for (const fid of this.safes) {
        if (!last && !visited.has(fid)) continue;
        const switched = this.withOptions(toggled(choices, fid));
        this.addStructure(margins, `${at}>${tag(switched)}`, switched);
        margins.set(`${at}|gain:${fid}`, switched.payout.bySecurity.get(fid)!.minus(here.payout.bySecurity.get(fid)!));
      }
    });
  }

  /**
   * Tiers not yet paid in full, caps not yet reached, the carve-out's next tier
   * edge, and the next option class's net if it were exercised. A tier's margin
   * and the carve-out's edge are straight lines even where payouts curve (X17).
   */
  private addStructure(margins: Map<string, Decimal>, tag: string, a: Answer): void {
    const edges = this.pc.capTable.carveOut?.tiers;
    const structural = (prefix: string, p: Payout) => {
      for (const t of p.tiers) if (!t.full) margins.set(`${prefix}|tier:${t.index}`, t.paid.minus(t.claim));
      for (const [sid, room] of p.capRoom) margins.set(`${prefix}|cap:${sid}`, room);
      const edge = p.carveOut && edges ? edges[p.carveOut.band]?.to : null;
      if (edge) margins.set(`${prefix}|carve:${p.carveOut!.band}`, p.exitValue.minus(edge));
      // SAFEs: the shared Cash-Out claim not yet paid in full (X13), and a SAFE with no cap's room to convert (X9).
      if (p.safeCash && !p.safeCash.full) margins.set(`${prefix}|safecash`, p.safeCash.paid.minus(p.safeCash.claim));
      for (const [id, f] of p.safes) if (f.room) margins.set(`${prefix}|room:${id}`, f.room);
      // Notes: the debt not yet repaid in full (X15), and a note with no cap's room to convert (X12).
      if (p.noteDebt && !p.noteDebt.full) margins.set(`${prefix}|notedebt`, p.noteDebt.paid.minus(p.noteDebt.claim));
      for (const [id, n] of p.notes) if (n.room) margins.set(`${prefix}|room:${id}`, n.room);
    };
    structural(tag, a.payout);
    const next = this.optionClasses.find((o) => !a.decisions.exercised.has(o.id));
    if (next) {
      const trial = payoutWithLines(this.pc, this.x, { converted: a.decisions.converted, exercised: new Set([...a.decisions.exercised, next.id]) }).payout;
      margins.set(`${tag}|option:${next.id}`, trial.bySecurity.get(next.id)!);
      structural(`${tag}|with:${next.id}`, trial);
    }
  }
}
