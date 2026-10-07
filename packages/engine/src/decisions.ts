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
//   So does each SAFE still outstanding: "switching" means taking its
//   Conversion Amount or its Cash-Out Amount; and each note that can convert:
//   converting or being repaid. Either converts only when that strictly pays
//   more (X16), so where it is indifferent but its choice changes what others
//   get, the outcome from below holds (E13).
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

import type { Decimal } from "decimal.js";

import { D, ZERO, moreThan, sameAmount } from "./decimal.ts";
import { NoAnswerError } from "./errors.ts";
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

function samePayouts(a: Payout, b: Payout): boolean {
  return a.lines.every((line, i) => sameAmount(line.amount, b.lines[i]!.amount));
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
  private readonly settled = new Map<string, Answer>();
  /** Option classes in the order they come into the money: lowest strike first. */
  private readonly optionClasses: OptionClass[];
  private readonly group: ConversionGroup | null;
  /** Convertible series outside a group, warrants and SAFEs: each decides for itself (E4, E15). */
  private readonly free: string[];
  private readonly warrants: Set<string>;

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
      .concat([...this.warrants], [...pc.safes.keys()], [...pc.notes.values()].filter((t) => t.canConvert).map((t) => t.note.id));
  }

  private get where(): string {
    return `At $${this.x.toFixed(2)}`;
  }

  solve(): Solution {
    if (!this.group) return { exitValue: this.x, ...this.settleFree(new Set()) };
    const { converting, staying } = this.groupChoices();
    return { exitValue: this.x, answers: [this.groupVotes(converting, staying) ? converting : staying], complete: true };
  }

  /** E17: for each of the group's two choices, everyone else settles. Each must settle one way. */
  private groupChoices(): { converting: Answer; staying: Answer } {
    const choice = (converts: boolean): Answer => {
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

  /** The free decision-makers' choices in an answer: the series converted and the warrants exercised. */
  private chosen(a: Answer): Set<string> {
    return new Set([...a.decisions.converted, ...[...a.decisions.exercised].filter((id) => this.warrants.has(id))]);
  }

  /** The series outside the group and the warrants, settling around fixed group conversions (E15). */
  private settleFree(fixed: ReadonlySet<string>): { answers: Answer[]; complete: boolean } {
    const all = (set: ReadonlySet<string>) => this.withOptions(new Set([...fixed, ...set]));
    const { sets, complete } = settleChoice(
      {
        players: this.free,
        value: (set, p) => all(set).payout.bySecurity.get(p)!,
        samePayouts: (a, b) => samePayouts(all(a).payout, all(b).payout),
        size: (set) => all(set).decisions.converted.size + all(set).decisions.exercised.size,
        strict: (p) => this.pc.safes.has(p) || this.pc.notes.has(p),
        where: this.where,
      },
      this.options.checkEveryCombination,
    );
    return { answers: sets.map(all), complete };
  }

  /**
   * E16: the options follow the common price. Lowest strike first, a class
   * is exercised while doing so strictly pays it. Exercising adds the strike
   * to the proceeds and the shares to the residual, so the common price falls
   * toward that strike but stays above it; the check at the end confirms no
   * class would gain by switching. `choices` holds the series converted and
   * the warrants exercised.
   */
  private withOptions(choices: ReadonlySet<string>): Answer {
    const k = key(choices);
    const cached = this.settled.get(k);
    if (cached) return cached;
    const converted = new Set([...choices].filter((id) => !this.warrants.has(id)));
    let exercised = new Set([...choices].filter((id) => this.warrants.has(id)));
    let result = payout(this.pc, this.x, { converted, exercised });
    for (const o of this.optionClasses) {
      const trial = new Set([...exercised, o.id]);
      const r = payout(this.pc, this.x, { converted, exercised: trial });
      if (!moreThan(r.bySecurity.get(o.id)!, ZERO)) break;
      exercised = trial;
      result = r;
    }
    for (const o of this.optionClasses) {
      const switched = payout(this.pc, this.x, { converted, exercised: toggled(exercised, o.id) });
      if (moreThan(switched.bySecurity.get(o.id)!, result.bySecurity.get(o.id)!)) {
        throw new NoAnswerError(`${this.where} option exercise doesn't settle: ${o.id} would gain by switching.`);
      }
    }
    const answer = { decisions: { converted, exercised }, payout: result };
    this.settled.set(k, answer);
    return answer;
  }

  // ---------- margins, for the breakpoint finder ----------

  snapshot(): Snapshot {
    const margins = new Map<string, Decimal>();
    if (!this.group) {
      const { answers, complete } = this.settleFree(new Set());
      const answer = this.single(answers, complete);
      this.addSettled(margins, "answer", answer, new Set());
      return { answer, margins };
    }
    const { converting, staying } = this.groupChoices();
    this.addSettled(margins, "converts", converting, new Set(this.group.series));
    this.addSettled(margins, "stays", staying, new Set());
    for (const [holder, m] of this.voterMargins(converting, staying)) margins.set(`vote:${holder}`, m);
    return { answer: this.groupVotes(converting, staying) ? converting : staying, margins };
  }

  private single(answers: Answer[], complete: boolean): Answer {
    if (answers.length !== 1 || !complete) {
      throw new NoAnswerError(
        `${this.where} there ${answers.length === 1 ? "may be more than one stable answer" : `are ${answers.length} stable answers`}; ` +
          "the breakpoint finder needs exactly one (E8).",
      );
    }
    return answers[0]!;
  }

  /** A settled answer's own margins, and those of each single switch a free series weighs against it. */
  private addSettled(margins: Map<string, Decimal>, label: string, answer: Answer, fixed: ReadonlySet<string>): void {
    const tag = (a: Answer) => `${label}{${key(a.decisions.converted)}/${key(a.decisions.exercised)}}`;
    this.addStructure(margins, tag(answer), answer);
    for (const sid of this.free) {
      const alternative = this.withOptions(toggled(new Set([...fixed, ...this.chosen(answer)]), sid));
      this.addStructure(margins, `${tag(answer)}>${tag(alternative)}`, alternative);
      margins.set(`${tag(answer)}|gain:${sid}`, alternative.payout.bySecurity.get(sid)!.minus(answer.payout.bySecurity.get(sid)!));
    }
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
      const trial = payout(this.pc, this.x, { converted: a.decisions.converted, exercised: new Set([...a.decisions.exercised, next.id]) });
      margins.set(`${tag}|option:${next.id}`, trial.bySecurity.get(next.id)!);
      structural(`${tag}|with:${next.id}`, trial);
    }
  }
}
