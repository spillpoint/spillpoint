// Breakpoints, computed off the page's main thread so it stays responsive
// (Millrace takes about 0.3 seconds). The work runs in a Web Worker; where
// there is no Worker (the tests' simulated browser), it runs in place,
// asynchronously, through the same code.

import { useEffect, useState } from "react";
import { findBreakpoints, prepare, readExit } from "spillpoint";
import type { ReasonCode } from "spillpoint";

/** A breakpoint as it crosses from the worker: plain strings and booleans. */
export interface BreakpointView {
  exitValue: string;
  jumps: boolean;
  reasons: { code: ReasonCode; subject: string[]; text: string }[];
}

export type BreakpointsState =
  | { status: "computing" }
  | { status: "ready"; breakpoints: BreakpointView[] }
  | { status: "error"; message: string };

/** The work itself, the same wherever it runs. */
export function computeBreakpoints(exit: unknown): BreakpointView[] {
  const input = readExit(exit);
  return findBreakpoints(prepare(input.capTable), input.range).map((b) => ({
    exitValue: b.exitValue.toString(),
    jumps: b.jumps,
    reasons: b.reasons.map((r) => ({ code: r.code, subject: r.subject, text: r.text })),
  }));
}

let worker: Worker | null = null;
let pending: { id: number; reject: (e: Error) => void } | null = null;
let nextId = 0;

class Superseded extends Error {}

function inWorker(exit: unknown): Promise<BreakpointView[]> {
  // A newer request makes the one in progress pointless: stop it.
  if (pending && worker) {
    worker.terminate();
    worker = null;
    pending.reject(new Superseded());
  }
  worker ??= new Worker(new URL("./breakpoints.worker.ts", import.meta.url), { type: "module" });
  const id = ++nextId;
  const w = worker;
  return new Promise((resolve, reject) => {
    pending = { id, reject };
    w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; breakpoints?: BreakpointView[]; message?: string }>) => {
      if (e.data.id !== id) return;
      pending = null;
      if (e.data.ok) resolve(e.data.breakpoints!);
      else reject(new Error(e.data.message));
    };
    w.postMessage({ id, exit });
  });
}

function compute(exit: unknown): Promise<BreakpointView[]> {
  if (typeof Worker === "undefined") return Promise.resolve().then(() => computeBreakpoints(exit));
  return inWorker(exit);
}

/** The breakpoints for an exit input, recomputed whenever it changes. */
export function useBreakpoints(exit: unknown): BreakpointsState {
  const [state, setState] = useState<BreakpointsState>({ status: "computing" });
  useEffect(() => {
    let current = true;
    setState({ status: "computing" });
    compute(exit).then(
      (breakpoints) => current && setState({ status: "ready", breakpoints }),
      (e: unknown) => {
        if (current && !(e instanceof Superseded)) setState({ status: "error", message: (e as Error).message });
      },
    );
    return () => {
      current = false;
    };
  }, [exit]);
  return state;
}
