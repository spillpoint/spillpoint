// Random fund inputs, seeded so a failure can be run again: one to four carry steps, a pref or not, a catch-up or not,
// a GP commitment with either toggle or none, and up to nine calls and distributions, X final or not, with a NAV
// sometimes. For tests that hold the engine to a rule on many funds, not just the cases.

/** A small seeded generator (mulberry32): the same seed gives the same funds. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function randomFund(rand: () => number): Record<string, unknown> {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

  const first = pick([10, 15, 20, 25]);
  const steps: Record<string, string>[] = [{ rate: String(first / 100) }];
  let rate = first;
  let multiple = 2;
  for (let i = int(0, 3); i > 0; i--) {
    rate += pick([5, 10]);
    steps.push({ rate: String(rate / 100), from_lp_multiple: String(multiple) });
    multiple += pick([0.5, 1, 1.5]);
  }
  const terms: Record<string, unknown> = { carry: steps.length > 1 ? { steps } : String(first / 100) };
  if (rand() < 0.65) {
    terms.pref = { rate: pick(["0.06", "0.08", "0.1"]) };
    if (rand() < 0.6) terms.catch_up = { gp_share: pick(["1", "0.5", "0.8"]) };
  }
  if (rand() < 0.4) terms.gp_commitment = { share: pick(["0.01", "0.02", "0.05"]), pays_fees: rand() < 0.4, pays_expenses: rand() < 0.7 };

  let day = Date.UTC(2012, 0, 1) + int(0, 2000) * 86_400_000;
  const iso = () => new Date(day).toISOString().slice(0, 10);
  const flows: Record<string, string>[] = [{ date: iso(), type: "call", kind: "investment", amount: String(int(2, 30) * 250_000) }];
  for (let i = int(1, 8); i > 0; i--) {
    day += int(0, 600) * 86_400_000;
    flows.push(
      rand() < 0.5
        ? { date: iso(), type: "call", kind: pick(["investment", "investment", "fee", "expense"]), amount: String(int(1, 40) * 50_000) }
        : { date: iso(), type: "distribution", amount: String(int(1, 80) * 125_000) },
    );
  }
  day += int(0, 900) * 86_400_000;
  const input: Record<string, unknown> = { as_of: iso(), terms, cash_flows: flows, final: rand() < 0.6 };
  if (rand() < 0.25) input.nav = String(int(0, 100) * 400_000);
  return input;
}
