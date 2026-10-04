// Who converts and who exercises at an exit value (SPEC, Conversion decisions;
// Options and warrants). The engine solves for the stable decisions directly
// (E15), not by trying every combination as the reference does:
//
// - Options follow the common price (E16). For any set of conversions, the
//   option classes are exercised lowest strike first, for as long as the next
//   class strictly gains by exercising (E5: a tie means no).
// - A conversion group decides first (E17). For each of its two choices the
//   other series settle; the group then votes (E11) on the two outcomes.
// - The series outside a group are solved from both ends: from "nobody
//   converts" and from "everyone converts", one series at a time makes the
//   switch that gains it the most, until no one wants to switch. If the two
//   ends agree, that is the answer. If not, every combination is checked when
//   there are 12 or fewer of them; above 12 the answers found are reported and
//   flagged as possibly incomplete. Going round in a circle is an error.
// - Where several decision sets pay everyone the same, the reported one has
//   the fewest conversions and exercises (E5).

import type Decimal from "decimal.js";

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

function key(ids: ReadonlySet<string>): string {
  return [...ids].sort().join("\u0000");
}

function toggled(ids: ReadonlySet<string>, id: string): Set<string> {
  const out = new Set(ids);
  if (out.has(id)) out.delete(id);
  else out.add(id);
  return out;
}

function samePayouts(a: Payout, b: Payout): boolean {
  return a.lines.every((line, i) => sameAmount(line.amount, b.lines[i]!.amount));
}

/** E5: fewer conversions and exercises first; then a fixed order, so the result never depends on search order. */
function simpler(a: Answer, b: Answer): number {
  const count = (x: Answer) => x.decisions.converted.size + x.decisions.exercised.size;
  return count(a) - count(b) || key(a.decisions.converted).localeCompare(key(b.decisions.converted));
}

class AtExit {
  private readonly pc: PreparedCapTable;
  private readonly x: Decimal;
  private readonly options: SolveOptions;
  private readonly settled = new Map<string, Answer>();
  /** Option classes in the order they come into the money: lowest strike first. */
  private readonly optionClasses: OptionClass[];
  private readonly group: ConversionGroup | null;
  /** Convertible series outside a group: each decides for itself. */
  private readonly free: string[];

  constructor(pc: PreparedCapTable, x: Decimal, options: SolveOptions) {
    this.pc = pc;
    this.x = x;
    this.options = options;
    this.optionClasses = [...pc.options.values()]
      .filter((o) => pc.shares.get(o.id)!.gt(0))
      .sort((a, b) => a.strike.cmp(b.strike) || a.id.localeCompare(b.id));
    this.group = pc.capTable.conversionGroups[0] ?? null;
    const grouped = new Set(this.group?.series ?? []);
    this.free = [...pc.preferred.values()]
      .filter((s) => s.participation !== "participating" && !grouped.has(s.id) && pc.shares.get(s.id)!.gt(0))
      .map((s) => s.id);
  }

  solve(): Solution {
    if (!this.group) return { exitValue: this.x, ...this.settleFree(new Set()) };

    // E17: the group decides first, on the two outcomes in which everyone else settles.
    const members = new Set(this.group.series);
    const choice = (converts: boolean): Answer => {
      const { answers, complete } = this.settleFree(converts ? members : new Set());
      if (answers.length !== 1 || !complete) {
        throw new NoAnswerError(
          `At $${this.x.toFixed(2)} the other series settle ${answers.length} ways when the group ` +
            `(${this.group!.series.join(", ")}) ${converts ? "converts" : "stays"}, so its vote has no single comparison (E17).`,
        );
      }
      return answers[0]!;
    };
    const converting = choice(true);
    const staying = choice(false);
    return { exitValue: this.x, answers: [this.groupVotes(converting, staying) ? converting : staying], complete: true };
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
    const onGroupShares = (a: Answer, holder: string) =>
      a.payout.lines.filter((l) => l.holder === holder && members.has(l.security)).reduce((sum, l) => sum.plus(l.amount), ZERO);
    let yes = ZERO;
    let all = ZERO;
    for (const [holder, w] of weight) {
      all = all.plus(w);
      if (moreThan(onGroupShares(converting, holder), onGroupShares(staying, holder))) yes = yes.plus(w);
    }
    const share = yes.div(all);
    const atThreshold = share.minus(group.voteThreshold).abs().lt(SHARE_TIE);
    return group.voteRule === "at_least" ? atThreshold || share.gt(group.voteThreshold) : !atThreshold && share.gt(group.voteThreshold);
  }

  /** The series outside the group settle around fixed group conversions (E15). */
  private settleFree(fixed: ReadonlySet<string>): { answers: Answer[]; complete: boolean } {
    if (this.options.checkEveryCombination) return { answers: this.everyCombination(fixed), complete: true };
    const low = this.fromEnd(fixed, false);
    const high = this.fromEnd(fixed, true);
    if (samePayouts(low.payout, high.payout)) return { answers: [this.simplest(low)], complete: true };
    if (this.free.length <= MAX_CHECKED) return { answers: this.everyCombination(fixed), complete: true };
    return { answers: [this.simplest(low), this.simplest(high)].sort(simpler), complete: false };
  }

  /** From one end, the single switch that gains the most, until no series wants to switch. */
  private fromEnd(fixed: ReadonlySet<string>, everyoneConverts: boolean): Answer {
    let converted = new Set([...fixed, ...(everyoneConverts ? this.free : [])]);
    const seen = new Set<string>();
    for (;;) {
      if (seen.has(key(converted))) {
        throw new NoAnswerError(
          `At $${this.x.toFixed(2)} solving from "${everyoneConverts ? "everyone" : "nobody"} converts" went round in a circle (E15).`,
        );
      }
      seen.add(key(converted));
      const current = this.withOptions(converted);
      let best: string | null = null;
      let bestGain = ZERO;
      for (const sid of this.free) {
        const now = current.payout.bySecurity.get(sid)!;
        const after = this.withOptions(toggled(converted, sid)).payout.bySecurity.get(sid)!;
        if (moreThan(after, now) && (best === null || after.minus(now).gt(bestGain))) {
          best = sid;
          bestGain = after.minus(now);
        }
      }
      if (best === null) return current;
      converted = toggled(converted, best);
    }
  }

  /** No series outside the group gains by switching, with the options re-settled under each choice (E16). */
  private isStable(answer: Answer): boolean {
    return this.free.every(
      (sid) =>
        !moreThan(
          this.withOptions(toggled(answer.decisions.converted, sid)).payout.bySecurity.get(sid)!,
          answer.payout.bySecurity.get(sid)!,
        ),
    );
  }

  /** Every combination of the free series' decisions; the distinct stable answers, each in its simplest form (E5, E8). */
  private everyCombination(fixed: ReadonlySet<string>): Answer[] {
    const answers: Answer[] = [];
    for (let mask = 0; mask < 2 ** this.free.length; mask++) {
      const converted = new Set([...fixed, ...this.free.filter((_, i) => mask & (1 << i))]);
      const candidate = this.withOptions(converted);
      if (!this.isStable(candidate)) continue;
      const same = answers.findIndex((a) => samePayouts(a.payout, candidate.payout));
      if (same < 0) answers.push(candidate);
      else if (simpler(candidate, answers[same]!) < 0) answers[same] = candidate;
    }
    if (answers.length === 0) throw new NoAnswerError(`At $${this.x.toFixed(2)} no set of decisions is stable.`);
    return answers.sort(simpler);
  }

  /** E5: drop any conversion that changes no payout and keeps the answer stable. */
  private simplest(answer: Answer): Answer {
    let current = answer;
    for (let changed = true; changed; ) {
      changed = false;
      for (const sid of this.free) {
        if (!current.decisions.converted.has(sid)) continue;
        const candidate = this.withOptions(toggled(current.decisions.converted, sid));
        if (samePayouts(candidate.payout, current.payout) && this.isStable(candidate)) {
          current = candidate;
          changed = true;
        }
      }
    }
    return current;
  }

  /**
   * E16: the options follow the common price. Lowest strike first, a class
   * is exercised while doing so strictly pays it. Exercising adds the strike
   * to the proceeds and the shares to the residual, so the common price falls
   * toward that strike but stays above it; the check at the end confirms no
   * class would gain by switching.
   */
  private withOptions(converted: ReadonlySet<string>): Answer {
    const k = key(converted);
    const cached = this.settled.get(k);
    if (cached) return cached;
    let exercised = new Set<string>();
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
        throw new NoAnswerError(`At $${this.x.toFixed(2)} option exercise doesn't settle: ${o.id} would gain by switching.`);
      }
    }
    const answer = { decisions: { converted: new Set(converted), exercised }, payout: result };
    this.settled.set(k, answer);
    return answer;
  }
}
