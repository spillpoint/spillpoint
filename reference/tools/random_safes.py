#!/usr/bin/env python3
"""Random cap tables with several SAFEs at a sale, worked by the reference (05c4; Jordan, after #72).

Each table has two to four post-money SAFEs of different amounts and caps, some
with a discount, beside a mix of: common and options; no, one or two preferred
series, non-participating, capped or participating, stacked or pari passu; a
warrant for a series, at or below its preference per share, or for common; and
a capped note. The reference works each one as it works a case: every
breakpoint with its reasons, and the payouts at each and at a few exit values
picked at random. The engine's check, packages/engine/scripts/check-random.ts,
then compares its own answers with these.

A fixed seed makes every table reproducible. Nothing here is a real cap table,
but it goes in local/ all the same, which git ignores: these are a check, not
cases.

    python3 reference/tools/random_safes.py [count] [seed] [directory]
    python3 reference/tools/random_safes.py probe [directory]

The defaults are 40 tables, seed 1 and local/random-safes. Each table takes
from seconds to a few minutes: the reference tries every combination of
decisions.

Where the reference's own breakpoint search can't finish a table, as where
several decisions change at one jump, it still writes the payouts at the
listed exit values (points.json). The engine's check then writes the exit
values a cent either side of each breakpoint it finds (probes.json), and
`probe` works out the reference's payouts there (probed.json), for the check
to compare on its next run.
"""

import json
import random
import sys
from fractions import Fraction as F
from multiprocessing import Pool
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "reference"))

import datetime  # noqa: E402

from spillpoint_ref.case import _outcome_json, run_case  # noqa: E402
from spillpoint_ref.model import CapTable  # noqa: E402
from spillpoint_ref.num import exact, money  # noqa: E402
from spillpoint_ref.waterfall import Waterfall  # noqa: E402

TOP = 40_000_000


def random_inputs(rng, n):
    holders = [{"id": "founder_a", "name": "Founder A"}, {"id": "founder_b", "name": "Founder B"}]
    securities = [{"id": "common", "name": "Common Stock", "kind": "common"}]
    positions = [
        {"holder": "founder_a", "security": "common", "shares": rng.choice([3, 4, 5, 6]) * 1_000_000},
        {"holder": "founder_b", "security": "common", "shares": rng.choice([1, 2, 3]) * 1_000_000},
    ]
    if rng.random() < 0.6:
        holders.append({"id": "employee_c", "name": "Employee C"})
        strike = rng.choice(["0", "0.1", "0.25", "0.5"])
        sid = f"options_{strike}"
        securities.append({"id": sid, "name": f"Options (${strike} strike)", "kind": "option", "strike": strike})
        positions.append({"holder": "employee_c", "security": sid, "shares": rng.choice([2, 5, 10]) * 100_000})
    series = []
    for i in range(rng.choice([0, 1, 1, 2, 2])):
        sid = f"series_{i}"
        holder = f"investor_{i}"
        holders.append({"id": holder, "name": f"Investor {i}"})
        price = rng.choice(["0.5", "1", "2"])
        part = rng.choice(["non_participating", "non_participating", "participating_capped", "participating"])
        securities.append(
            {
                "id": sid, "name": f"Series {i} Preferred", "kind": "preferred", "original_issue_price": price,
                "conversion_price": price, "preference_multiple": "1", "participation": part,
                "cap_multiple": rng.choice(["2", "3"]) if part == "participating_capped" else None, "anti_dilution": "none",
            }
        )
        positions.append({"holder": holder, "security": sid, "shares": int(F(rng.choice([1, 2, 4]) * 1_000_000) / F(price))})
        series.append((sid, F(price)))
    seniority = [[s for s, _ in series]] if len(series) == 2 and rng.random() < 0.5 else [[s] for s, _ in series]
    if rng.random() < 0.5:
        holders.append({"id": "lender_l", "name": "Lender L"})
        if series and rng.random() < 0.8:
            sid, price = rng.choice(series)
            strike = price * rng.choice([F(1, 2), F(1, 2), 1])
            wid = f"warrants_{sid}"
            securities.append({"id": wid, "name": f"Warrants for {sid}", "kind": "warrant", "strike": exact(strike), "underlying": sid})
        else:
            wid = "warrants_common"
            securities.append({"id": wid, "name": "Warrants for common", "kind": "warrant", "strike": rng.choice(["0.25", "1"]), "underlying": "common"})
        positions.append({"holder": "lender_l", "security": wid, "shares": rng.choice([1, 2, 3]) * 100_000})
    safes = []
    for j in range(n):
        holder = f"safe_holder_{j}"
        holders.append({"id": holder, "name": f"SAFE Investor {j}"})
        safes.append(
            {
                "id": f"safe_{j}", "holder": holder, "purchase_amount": str(rng.choice([100_000, 250_000, 500_000, 1_000_000])),
                "post_money_cap": str(rng.choice([4, 6, 8, 10, 15, 20]) * 1_000_000), "discount": rng.choice(["0", "0", "0.2"]),
            }
        )
    cap_table = {
        "holders": holders, "securities": securities, "seniority": seniority, "positions": positions,
        "unissued_pool": rng.choice([0, 500_000]), "unconverted_safes": safes,
    }
    exit_date = None
    if rng.random() < 0.35:
        holders.append({"id": "note_holder", "name": "Investor N"})
        cap_table["unconverted_notes"] = [
            {
                "id": "note_n", "holder": "note_holder", "principal": str(rng.choice([250_000, 500_000])), "interest_rate": "0.06",
                "issue_date": "2024-01-01", "valuation_cap": str(rng.choice([5, 8, 12]) * 1_000_000), "conversion_base": "with_pool",
                "discount": rng.choice(["0", "0.2"]), "repayment_multiple": rng.choice(["1", "2"]),
            }
        ]
        exit_date = "2025-12-31"
    values = sorted({str(rng.randrange(1, TOP // 1000) * 1000) for _ in range(6)}, key=int)
    exit_ = {"cap_table": cap_table, "range": ["0", str(TOP)], "exit_values": values, "grid_step": "200000"}
    if exit_date:
        exit_["exit_date"] = exit_date
    return {"case": "random", "description": "A random table with several SAFEs at a sale (05c4).", "exit": exit_}


def work(job):
    seed, index, directory = job
    rng = random.Random(f"{seed}:{index}")
    inputs = random_inputs(rng, rng.choice([2, 3, 3, 4]))
    inputs["case"] = f"random-{seed}-{index:03d}"
    folder = Path(directory) / inputs["case"]
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "inputs.json").write_text(json.dumps(inputs, indent=2) + "\n")
    try:
        expected = run_case(inputs)
    except ValueError as e:
        # Its breakpoint search couldn't finish: the payouts at the listed exit values still can be worked out.
        (folder / "refused.txt").write_text(f"{e}\n")
        try:
            points = outcomes(inputs, inputs["exit"]["exit_values"])
        except ValueError as e2:
            return inputs["case"], f"refused: {e}; and its payouts: {e2}"
        (folder / "points.json").write_text(json.dumps(points, indent=2) + "\n")
        return inputs["case"], f"refused: {e}"
    (folder / "expected.json").write_text(json.dumps(expected, indent=2) + "\n")
    return inputs["case"], f"{len(expected['exit']['breakpoints'])} breakpoints"


def waterfall(inputs):
    spec = inputs["exit"]
    exit_date = datetime.date.fromisoformat(spec["exit_date"]) if spec.get("exit_date") else None
    return Waterfall(CapTable.from_json(spec["cap_table"]), exit_date)


def outcomes(inputs, values):
    """The reference's payouts at each exit value, as a case gives them."""
    wf = waterfall(inputs)
    return [{"exit_value": v, "display": money(F(v)), "equilibria": [_outcome_json(wf, o) for o in wf.evaluate(F(v))]} for v in values]


def probe(folder):
    folder = Path(folder)
    inputs = json.loads((folder / "inputs.json").read_text())
    values = json.loads((folder / "probes.json").read_text())
    (folder / "probed.json").write_text(json.dumps(outcomes(inputs, values), indent=2) + "\n")
    return folder.name, f"{len(values)} exit values"


def main(argv):
    if argv and argv[0] == "probe":
        directory = Path(argv[1] if len(argv) > 1 else ROOT / "local" / "random-safes")
        folders = [str(f) for f in sorted(directory.iterdir()) if (f / "probes.json").exists()]
        with Pool() as pool:
            for name, what in pool.imap_unordered(probe, folders):
                print(name, what, flush=True)
        return
    count = int(argv[0]) if len(argv) > 0 else 40
    seed = int(argv[1]) if len(argv) > 1 else 1
    directory = argv[2] if len(argv) > 2 else str(ROOT / "local" / "random-safes")
    with Pool() as pool:
        for name, what in pool.imap_unordered(work, [(seed, i, directory) for i in range(count)]):
            print(name, what, flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
