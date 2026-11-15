// A made-up table with many post-money SAFEs and option strikes, for timing the breakpoint search (10j; 0.8.0's plan,
// "Measured"): common, two 1x non-participating series, an option class at each strike, and open post-money SAFEs at
// two caps, over $0 to $200M. A real founder's table can have about 26 open SAFEs and a few dozen option grants; the
// sizes here are only the made-up table's. Built in code, not a case: nothing in it is anyone's cap table.

type Json = Record<string, unknown>;

/** The strikes, lowest first: the first `strikes` of these, each its own option class of 100,000 shares. */
const STRIKES = ["0.25", "0.5", "0.75", "1", "1.25", "1.5", "2", "2.5", "3", "4", "5", "6"];

/**
 * The exit input: `safes` post-money SAFEs, alternating between a $20M cap and a $12M cap, each held by a holder of its
 * own, beside `strikes` option classes (1 to 12). With `amounts` "two", the plan's table: $250,000 at the $20M cap and
 * $100,000 at the $12M one. With "each its own", every SAFE has its own purchase amount, as on a real table: SAFE i
 * $150,000 + $10,000 × i at the $20M cap, or $50,000 + $5,000 × i at the $12M one. Equal SAFEs come into the money
 * together; unequal ones each at their own exit value, so the search has more to follow.
 */
export function manySafesAndStrikes(safes: number, strikes: number, amounts: "two" | "each its own" = "two"): Json {
  if (strikes < 1 || strikes > STRIKES.length) throw new Error(`strikes must be 1 to ${STRIKES.length}`);
  const holders: Json[] = [
    { id: "founder_a", name: "Founder A" },
    { id: "founder_b", name: "Founder B" },
    { id: "investor_s", name: "Investor S" },
    { id: "investor_a", name: "Investor A" },
  ];
  const securities: Json[] = [
    { id: "common", name: "Common Stock", kind: "common" },
    { id: "seed", name: "Seed Preferred", kind: "preferred", original_issue_price: "0.5", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none" },
    { id: "series_a", name: "Series A Preferred", kind: "preferred", original_issue_price: "2", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none" },
  ];
  const positions: Json[] = [
    { holder: "founder_a", security: "common", shares: 5000000 },
    { holder: "founder_b", security: "common", shares: 3000000 },
    { holder: "investor_s", security: "seed", shares: 2000000 },
    { holder: "investor_a", security: "series_a", shares: 2500000 },
  ];
  for (const [i, strike] of STRIKES.slice(0, strikes).entries()) {
    holders.push({ id: `employee_${i + 1}`, name: `Employee ${i + 1}` });
    securities.push({ id: `options_${i + 1}`, name: `Options ($${strike} strike)`, kind: "option", strike });
    positions.push({ holder: `employee_${i + 1}`, security: `options_${i + 1}`, shares: 100000 });
  }
  const unconverted: Json[] = [];
  for (let i = 1; i <= safes; i++) {
    holders.push({ id: `safe_investor_${i}`, name: `SAFE Investor ${i}` });
    const odd = i % 2 === 1;
    const amount = amounts === "two" ? (odd ? 250000 : 100000) : odd ? 150000 + 10000 * i : 50000 + 5000 * i;
    const cap = odd ? "20000000" : "12000000";
    unconverted.push({ id: `safe_${i}`, holder: `safe_investor_${i}`, purchase_amount: String(amount), post_money_cap: cap, discount: "0" });
  }
  return {
    cap_table: { holders, securities, seniority: [["series_a"], ["seed"]], positions, unissued_pool: 500000, unconverted_safes: unconverted },
    range: ["0", "200000000"],
    exit_values: [],
  };
}
