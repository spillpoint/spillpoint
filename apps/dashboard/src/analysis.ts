// Everything about an exit input that takes a moment to work out: the
// breakpoints, and the payouts at each one, which draw the curves. It runs
// off the page's main thread so the page stays responsive (Millrace takes
// about 0.3 seconds). The work runs in a Web Worker; where there is no Worker
// (the tests' simulated browser), it runs in place, asynchronously, through
// the same code.

import { useEffect, useRef, useState } from "react";
import { D, findBreakpoints, prepare, readExit, solve } from "spillpoint";
import type { ReasonCode } from "spillpoint";

/** A breakpoint as it crosses from the worker: plain strings and booleans. */
export interface BreakpointView {
  exitValue: string;
  jumps: boolean;
  reasons: { code: ReasonCode; subject: string[]; text: string }[];
}

/**
 * The payouts at one exit value. Payouts are straight lines between
 * breakpoints, so the payouts at the range's ends and at every breakpoint draw
 * every curve exactly. At a breakpoint, "at" is the outcome there, which is
 * the outcome from below (E13); where payouts jump, "above" is the outcome
 * just above it.
 */
export interface CurvePoint {
  exitValue: string;
  side: "at" | "above";
  holders: Record<string, string>;
  classes: Record<string, string>;
}

export interface Analysis {
  breakpoints: BreakpointView[];
  curve: CurvePoint[];
}

export type AnalysisState = { status: "computing" } | ({ status: "ready" } & Analysis) | { status: "error"; message: string };

/** How far above a jump the "above" payouts are read: far below a cent. */
const JUST_ABOVE = new D("1e-6");

/** The work itself, the same wherever it runs. */
export function computeAnalysis(exit: unknown): Analysis {
  const input = readExit(exit);
  const pc = prepare(input.capTable, input.exitDate);
  const found = findBreakpoints(pc, input.range);
  const point = (x: D, side: CurvePoint["side"]): CurvePoint => {
    const payout = solve(pc, x).answers[0]!.payout;
    const strings = (m: Map<string, D>) => Object.fromEntries([...m].map(([k, v]) => [k, v.toString()]));
    return { exitValue: x.toString(), side, holders: strings(payout.holderTotals), classes: strings(payout.classTotals) };
  };
  const curve: CurvePoint[] = [point(input.range[0], "at")];
  for (const b of found) {
    curve.push(point(b.exitValue, "at"));
    if (b.jumps) curve.push({ ...point(b.exitValue.plus(JUST_ABOVE), "above"), exitValue: b.exitValue.toString() });
  }
  curve.push(point(input.range[1], "at"));
  return {
    breakpoints: found.map((b) => ({
      exitValue: b.exitValue.toString(),
      jumps: b.jumps,
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
 * background thread isn't restarted on every keystroke.
 */
export function useAnalysis(exit: unknown): AnalysisState {
  const [state, setState] = useState<AnalysisState>({ status: "computing" });
  const first = useRef(true);
  useEffect(() => {
    let current = true;
    setState({ status: "computing" });
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
