#!/usr/bin/env python3
"""Random cap tables with many SAFEs and option strikes at a sale (10j), for two checks of the breakpoint search.

Each table has two to 26 post-money SAFEs, each with its own purchase amount and
one of a few caps, some with a discount, beside common and up to 12 option
classes at strikes of their own. Some have one or two preferred series,
non-participating, capped or participating, stacked or pari passu; some a
capped note; a few a warrant. The SAFEs' caps and amounts are drawn so that
together they own well under the whole company.

    python3 reference/tools/random_many_safes.py tables [count] [seed] [directory] [--most-safes N] [--most-strikes M] [--groups]
    python3 reference/tools/random_many_safes.py work [directory]
    python3 reference/tools/random_many_safes.py probe [directory]

`tables` writes each table's inputs.json, nothing else: the defaults are 1,000
tables, seed 10 and local/random-many-safes. The engine's compare-engines
script runs main's engine and the branch's on them. `--most-safes` and
`--most-strikes` keep tables small enough for the reference, which tries every
combination of the SAFEs' and the options' decisions at each exit value it
reads: `work` then works each as a case, as random_safes.py does, and the
engine's check-random script compares the engine with it. `probe` is
random_safes.py's, for tables whose breakpoint search the reference couldn't
finish. With `--groups`, half the tables with two series that can convert
make them a conversion group; every other table is the same as without it.

`probe` also works again, at $100,000, each table whose breakpoints disagreed
with the engine's at its own $500,000 grid: check-random asks for it with
retry.json, and the answer goes in the table's fine/ folder, which
check-random's second run compares in full instead (10k). The reference's grid
can miss a stretch narrower than it, with the same answer at the grid points
either side, as it missed many-11-0125's $83,403. Such a stretch shows up as a
disagreement, never as a silent pass, and check-random reports a table that
agrees at the finer grid as agreeing only there.

A fixed seed makes every table reproducible. Nothing here is a real cap table,
but it goes in local/ all the same, which git ignores: these are a check, not
cases.
"""

import json
import random
import sys
from fractions import Fraction as F
from multiprocessing import Pool
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "reference"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from random_safes import outcomes, probe  # noqa: E402
from spillpoint_ref.case import run_case  # noqa: E402
from spillpoint_ref.num import exact, strike_name  # noqa: E402

TOP = 100_000_000
STRIKES = ["0.1", "0.25", "0.5", "0.75", "1", "1.25", "1.5", "2", "2.5", "3", "4", "5", "6", "8"]
CAPS = [8, 10, 12, 15, 20, 25, 30, 40]


def random_inputs(rng, safes, strikes, groups=None):
    holders = [{"id": "founder_a", "name": "Founder A"}, {"id": "founder_b", "name": "Founder B"}]
    securities = [{"id": "common", "name": "Common Stock", "kind": "common"}]
    positions = [
        {"holder": "founder_a", "security": "common", "shares": rng.choice([3, 4, 5, 6]) * 1_000_000},
        {"holder": "founder_b", "security": "common", "shares": rng.choice([1, 2, 3]) * 1_000_000},
    ]
    for i, strike in enumerate(sorted(rng.sample(STRIKES, strikes), key=F)):
        holder = f"employee_{i}"
        holders.append({"id": holder, "name": f"Employee {i}"})
        sid = f"options_{strike}"
        securities.append({"id": sid, "name": f"Options (${strike_name(strike)} strike)", "kind": "option", "strike": strike})
        positions.append({"holder": holder, "security": sid, "shares": rng.choice([50, 100, 150, 200]) * 1_000})
    series = []
    for i in range(rng.choice([0, 0, 1, 1, 2])):
        sid = f"series_{i}"
        holder = f"investor_{i}"
        holders.append({"id": holder, "name": f"Investor {i}"})
        price = rng.choice(["0.5", "1", "2", "3"])
        part = rng.choice(["non_participating", "non_participating", "participating_capped", "participating"])
        securities.append(
            {
                "id": sid, "name": f"Series {i} Preferred", "kind": "preferred", "original_issue_price": price,
                "conversion_price": price, "preference_multiple": "1", "participation": part,
                "cap_multiple": rng.choice(["2", "3"]) if part == "participating_capped" else None, "anti_dilution": "none",
            }
        )
        positions.append({"holder": holder, "security": sid, "shares": int(F(rng.choice([1, 2, 4, 6]) * 1_000_000) / F(price))})
        series.append((sid, F(price)))
    seniority = [[s for s, _ in series]] if len(series) == 2 and rng.random() < 0.5 else [[s] for s, _ in series]
    if rng.random() < 0.15:
        holders.append({"id": "lender_l", "name": "Lender L"})
        if series and rng.random() < 0.7:
            sid, price = rng.choice(series)
            wid = f"warrants_{sid}"
            securities.append({"id": wid, "name": f"Warrants for {sid}", "kind": "warrant", "strike": exact(price * rng.choice([F(1, 2), 1])), "underlying": sid})
        else:
            wid = "warrants_common"
            securities.append({"id": wid, "name": "Warrants for common", "kind": "warrant", "strike": rng.choice(["0.25", "1"]), "underlying": "common"})
        positions.append({"holder": "lender_l", "security": wid, "shares": rng.choice([1, 2, 3]) * 100_000})
    # A few caps for the table, and each SAFE its own amount. Together they own 5% to 45% of the company at their caps,
    # split among them at random: a SAFE's amount is its share of that times its cap, to $5,000, and at least $5,000.
    caps = rng.sample(CAPS, rng.choice([1, 2, 2, 3, 4]))
    owned = F(rng.randint(5, 45), 100)
    weights = [rng.randint(1, 20) for _ in range(safes)]
    unconverted = []
    for j in range(safes):
        cap = rng.choice(caps) * 1_000_000
        amount = max(5_000, int(owned * weights[j] / sum(weights) * cap / 5_000) * 5_000)
        unconverted.append(
            {
                "id": f"safe_{j}", "holder": f"safe_holder_{j}", "purchase_amount": str(amount),
                "post_money_cap": str(cap), "discount": rng.choice(["0", "0", "0", "0.2"]),
            }
        )
    holders.extend({"id": s["holder"], "name": f"SAFE Investor {j}"} for j, s in enumerate(unconverted))
    cap_table = {
        "holders": holders, "securities": securities, "seniority": seniority, "positions": positions,
        "unissued_pool": rng.choice([0, 500_000]), "unconverted_safes": unconverted,
    }
    # With --groups, two series that can convert do it together half the time (E11, E17): not uncapped participating
    # preferred, which never converts. Drawn apart, so every other table is the same.
    convertible = [x for x in securities if x["kind"] == "preferred" and x["participation"] != "participating"]
    if groups is not None and len(series) == 2 and len(convertible) == 2 and groups.random() < 0.5:
        cap_table["conversion_groups"] = [[s for s, _ in series]]
    exit_date = None
    if rng.random() < 0.3:
        holders.append({"id": "note_holder", "name": "Investor N"})
        cap_table["unconverted_notes"] = [
            {
                "id": "note_n", "holder": "note_holder", "principal": str(rng.choice([250_000, 500_000, 1_000_000])), "interest_rate": "0.06",
                "issue_date": "2024-01-01", "valuation_cap": str(rng.choice([8, 12, 20]) * 1_000_000), "conversion_base": "with_pool",
                "discount": rng.choice(["0", "0.2"]), "repayment_multiple": rng.choice(["1", "2"]),
            }
        ]
        exit_date = "2025-12-31"
    values = sorted({str(rng.randrange(1, TOP // 1000) * 1000) for _ in range(6)}, key=int)
    exit_ = {"cap_table": cap_table, "range": ["0", str(TOP)], "exit_values": values, "grid_step": "500000"}
    if exit_date:
        exit_["exit_date"] = exit_date
    return {"case": "random", "description": "A random table with many SAFEs and option strikes at a sale (10j).", "exit": exit_}


def tables(count, seed, directory, most_safes, most_strikes, groups):
    for index in range(count):
        rng = random.Random(f"many:{seed}:{index}")
        inputs = random_inputs(rng, rng.randint(2, most_safes), rng.randint(0, most_strikes), random.Random(f"groups:{seed}:{index}") if groups else None)
        inputs["case"] = f"many-{seed}-{index:04d}"
        folder = Path(directory) / inputs["case"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "inputs.json").write_text(json.dumps(inputs, indent=2) + "\n")
    print(f"{count} tables in {directory}")


def work(folder):
    """The reference's answers for one table, as random_safes.py writes them."""
    folder = Path(folder)
    inputs = json.loads((folder / "inputs.json").read_text())
    try:
        expected = run_case(inputs)
    except Exception as e:  # noqa: BLE001
        # Its breakpoint search couldn't finish, or couldn't word a reason (a group beside SAFEs, for one): the payouts
        # at the listed exit values, and later a cent either side of the engine's breakpoints, are compared instead.
        (folder / "refused.txt").write_text(f"{e if isinstance(e, ValueError) else f'{type(e).__name__}: {e}'}\n")
        try:
            points = outcomes(inputs, inputs["exit"]["exit_values"])
        except Exception as e2:  # noqa: BLE001
            return folder.name, f"refused: {e}; and its payouts: {e2}"
        (folder / "points.json").write_text(json.dumps(points, indent=2) + "\n")
        return folder.name, f"refused: {e}"
    (folder / "expected.json").write_text(json.dumps(expected, indent=2) + "\n")
    return folder.name, f"{len(expected['exit']['breakpoints'])} breakpoints"


def retry(folder):
    """The whole table again at the grid check-random asks for, $100,000, in its fine/ folder (10k)."""
    folder = Path(folder)
    grid = json.loads((folder / "retry.json").read_text())["grid_step"]
    inputs = json.loads((folder / "inputs.json").read_text())
    inputs["exit"]["grid_step"] = grid
    fine = folder / "fine"
    fine.mkdir(exist_ok=True)
    (fine / "inputs.json").write_text(json.dumps(inputs, indent=2) + "\n")
    _, result = work(fine)
    return folder.name, f"at a ${int(grid):,} grid: {result}"


def follow_up(folder):
    """What check-random asked of one table: a cent either side of the engine's breakpoints, or the table again."""
    if (Path(folder) / "probes.json").exists():
        return probe(folder)
    return retry(folder)


def main(argv):
    groups = "--groups" in argv
    argv = [a for a in argv if a != "--groups"]
    flags = {argv[i]: int(argv[i + 1]) for i in range(len(argv) - 1) if argv[i].startswith("--")}
    args = [a for i, a in enumerate(argv) if not a.startswith("--") and not (i > 0 and argv[i - 1].startswith("--"))]
    what = args[0] if args else "tables"
    if what == "tables":
        count = int(args[1]) if len(args) > 1 else 1000
        seed = int(args[2]) if len(args) > 2 else 10
        directory = args[3] if len(args) > 3 else str(ROOT / "local" / "random-many-safes")
        tables(count, seed, directory, flags.get("--most-safes", 26), flags.get("--most-strikes", 12), groups)
        return
    directory = Path(args[1] if len(args) > 1 else ROOT / "local" / "random-many-safes")
    if what == "work":
        folders = [str(f) for f in sorted(directory.iterdir()) if (f / "inputs.json").exists() and not (f / "expected.json").exists() and not (f / "refused.txt").exists()]
        job = work
    else:
        answered = lambda f: (f / "fine" / "expected.json").exists() or (f / "fine" / "refused.txt").exists()  # noqa: E731
        asked = lambda f: (f / "probes.json").exists() or ((f / "retry.json").exists() and not answered(f))  # noqa: E731
        folders = [str(f) for f in sorted(directory.iterdir()) if asked(f)]
        job = follow_up
    with Pool() as pool:
        for name, result in pool.imap_unordered(job, folders):
            print(name, result, flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
