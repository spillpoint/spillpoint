// Everything about an exit input that takes a moment to work out: the
// breakpoints, and the payouts at each one, which draw the curves. It runs
// off the page's main thread so the page stays responsive (Millrace takes
// about 0.3 seconds). The work runs in a Web Worker; where there is no Worker
// (the tests' simulated browser), it runs in place, asynchronously, through
// the same code.

import { useEffect, useRef, useState } from "react";
import { D, findBreakpoints, prepare, readExit, solve } from "spillpoint";
import type { ReasonCode } from "spillpoint";

/** Payouts by holder and by class, as plain strings. */
export interface Totals {
  holders: Record<string, string>;
  classes: Record<string, string>;
}

/** A breakpoint as it crosses from the worker: plain strings and booleans. */
export interface BreakpointView {
  exitValue: string;
  jumps: boolean;
  /** Payouts curve just below, or just above, this exit value (X17). */
  curveBelow: boolean;
  curveAbove: boolean;
  /**
   * On a curved side, what each extra dollar adds right at the breakpoint
   * (X17): the rate keeps changing there, so it's read at the breakpoint
   * itself rather than across the stretch.
   */
  rates: { below?: Totals; above?: Totals };
  reasons: { code: ReasonCode; subject: string[]; text: string }[];
}

/**
 * The payouts at one exit value. Payouts are straight lines between
 * breakpoints, except where they curve (X17), so the payouts at the range's
 * ends and at every breakpoint draw every straight stretch exactly. At a
 * breakpoint, "at" is the outcome there, which is the outcome from below
 * (E13); where payouts jump, "above" is the outcome just above it. Along a
 * curved stretch, "sample" points let the curve be drawn through them.
 */
export interface CurvePoint extends Totals {
  exitValue: string;
  side: "at" | "above" | "sample";
  /** Whether payouts curve from here to the next point. */
  curvedAfter: boolean;
}

export interface Analysis {
  breakpoints: BreakpointView[];
  curve: CurvePoint[];
}

export type AnalysisState = { status: "computing" } | ({ status: "ready" } & Analysis) | { status: "error"; message: string };

/** How far above a jump the "above" payouts are read: far below a cent. */
const JUST_ABOVE = new D("1e-6");
/** How many points a curved stretch is drawn through, as many as the engine checks it at (X17). */
const CURVE_SAMPLES = 64;
/** The step for reading a rate at a breakpoint on a curved side, as the engine reads its slopes there (X17). */
const SLOPE_STEP = new D("1e-9");

/** The work itself, the same wherever it runs. */
export function computeAnalysis(exit: unknown): Analysis {
  const input = readExit(exit);
  const pc = prepare(input.capTable, input.exitDate);
  const found = findBreakpoints(pc, input.range);
  const payoutAt = (x: D) => solve(pc, x).answers[0]!.payout;
  const strings = (m: Map<string, D>) => Object.fromEntries([...m].map(([k, v]) => [k, v.toString()]));
  const point = (x: D, side: CurvePoint["side"], curvedAfter = false): CurvePoint => {
    const payout = payoutAt(x);
    return { exitValue: x.toString(), side, curvedAfter, holders: strings(payout.holderTotals), classes: strings(payout.classTotals) };
  };
  /** What each extra dollar adds on one side of x, read across a step far below a cent. */
  const rates = (x: D, side: -1 | 1): Totals => {
    const [lo, hi] = side < 0 ? [payoutAt(x.minus(SLOPE_STEP)), payoutAt(x)] : [payoutAt(x), payoutAt(x.plus(SLOPE_STEP))];
    const slope = (a: Map<string, D>, b: Map<string, D>) => Object.fromEntries([...b].map(([k, v]) => [k, v.minus(a.get(k) ?? 0).div(SLOPE_STEP).toString()]));
    return { holders: slope(lo.holderTotals, hi.holderTotals), classes: slope(lo.classTotals, hi.classTotals) };
  };

  // The stops: the range's ends and every breakpoint. Each stretch between two curves or not (X17).
  const [lo, hi] = input.range;
  const stops = [lo, ...found.map((b) => b.exitValue), hi];
  const curvedAfter = (k: number) => (found.length === 0 ? payoutAt(lo.plus(hi).div(2)).curved : k < found.length ? found[k]!.curveBelow : found[k - 1]!.curveAbove);
  const curve: CurvePoint[] = [];
  stops.forEach((x, k) => {
    const b = k > 0 && k <= found.length ? found[k - 1]! : null;
    const last = k === stops.length - 1;
    const curved = !last && curvedAfter(k);
    curve.push(point(x, "at", curved && !b?.jumps));
    if (b?.jumps) curve.push({ ...point(x.plus(JUST_ABOVE), "above", curved), exitValue: x.toString() });
    if (!curved) return;
    const step = stops[k + 1]!.minus(x).div(CURVE_SAMPLES);
    for (let j = 1; j < CURVE_SAMPLES; j++) curve.push(point(x.plus(step.times(j)), "sample", true));
  });
  return {
    breakpoints: found.map((b) => ({
      exitValue: b.exitValue.toString(),
      jumps: b.jumps,
      curveBelow: b.curveBelow,
      curveAbove: b.curveAbove,
      rates: { ...(b.curveBelow ? { below: rates(b.exitValue, -1) } : {}), ...(b.curveAbove ? { above: rates(b.exitValue, 1) } : {}) },
      reasons: b.reasons.map((r) => ({ code: r.code, subject: r.subject, text: r.text })),
    })),
    curve,
  };
}

let worker: Worker | null = null;
let pending: { id: number; reject: (e: Error) => void } | null = null;
let nextId = 0;

class Superseded extends Error {}

function inWorker(exit: unknown): Promise<Analysis> {
  // A newer request makes the one in progress pointless: stop it.
  if (pending && worker) {
    worker.terminate();
    worker = null;
    pending.reject(new Superseded());
  }
  worker ??= new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" });
  const id = ++nextId;
  const w = worker;
  return new Promise((resolve, reject) => {
    pending = { id, reject };
    w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; analysis?: Analysis; message?: string }>) => {
      if (e.data.id !== id) return;
      pending = null;
      if (e.data.ok) resolve(e.data.analysis!);
      else reject(new Error(e.data.message));
    };
    w.postMessage({ id, exit });
  });
}

function compute(exit: unknown): Promise<Analysis> {
  if (typeof Worker === "undefined") return Promise.resolve().then(() => computeAnalysis(exit));
  return inWorker(exit);
}

/** How long typing must pause before an edited cap table is analysed again. */
const SETTLE_MS = 250;

/**
 * The analysis of an exit input, recomputed whenever it changes. The first
 * one starts at once; after an edit it waits until typing pauses, so the
 * background thread isn't restarted on every keystroke. Null, before there's
 * a cap table to pay out (05b3b), waits for one.
 */
export function useAnalysis(exit: unknown): AnalysisState {
  const [state, setState] = useState<AnalysisState>({ status: "computing" });
  const first = useRef(true);
  useEffect(() => {
    let current = true;
    setState({ status: "computing" });
    if (exit === null) return;
    const run = () =>
      compute(exit).then(
        (analysis) => current && setState({ status: "ready", ...analysis }),
        (e: unknown) => {
          if (current && !(e instanceof Superseded)) setState({ status: "error", message: (e as Error).message });
        },
      );
    const timer = first.current ? (run(), null) : setTimeout(run, SETTLE_MS);
    first.current = false;
    return () => {
      current = false;
      if (timer) clearTimeout(timer);
    };
  }, [exit]);
  return state;
}
