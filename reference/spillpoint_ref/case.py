"""Turns a case's inputs.json into its expected.json."""

from fractions import Fraction

from . import breakpoints
from .model import CapTable
from .num import parse, exact, money, decimal
from .rounds import build
from .waterfall import Waterfall

GRID_STEP = Fraction(250_000)


def _cap_table_summary(ct):
    data = ct.to_json()
    by_class = {sid: ct.shares_of(sid) for sid in ct.securities}
    by_holder = {}
    for (h, s), n in ct.positions.items():
        by_holder.setdefault(h, {})[s] = n
    fd = ct.fully_diluted()
    data["totals"] = {
        "shares_by_security": by_class,
        "as_converted_by_security": {sid: exact(ct.as_converted(sid)) for sid in ct.securities},
        "fully_diluted": exact(fd),
        "fully_diluted_percent_by_holder": {
            h: decimal(sum(n * ct.conversion_ratio(s) for s, n in secs.items()) / fd * 100, 4)
            for h, secs in by_holder.items()
        },
        "unissued_pool_percent": decimal(Fraction(ct.unissued_pool) / fd * 100, 4) if fd else "0.0000",
    }
    return data


def _outcome_json(wf, outcome):
    ct = wf.ct
    lines = outcome["lines"]
    holder_totals, class_totals = {}, {}
    out_lines = []
    for h, s, _ in wf.lines:
        amt = lines[(h, s)]
        out_lines.append({"holder": h, "security": s, "amount": money(amt)})
        holder_totals[h] = holder_totals.get(h, 0) + amt
        class_totals[s] = class_totals.get(s, 0) + amt
    decisions = {
        p: (("converts" if b else "keeps_preference") if p in wf.converters else ("exercised" if b else "not_exercised"))
        for p, b in zip(wf.players, outcome["decisions"])
    }
    return {
        "decisions": decisions,
        "common_price_per_share": decimal(outcome["common_price"], 6),
        "lines": out_lines,
        "holder_totals": {h: money(v) for h, v in holder_totals.items()},
        "class_totals": {s: money(v) for s, v in class_totals.items()},
    }


def _payout_entry(wf, x, tags):
    outcomes = wf.evaluate(x)
    return {
        "exit_value": money(x),
        "tags": tags,
        "multiple_equilibria": len(outcomes) > 1,
        "equilibria": [_outcome_json(wf, o) for o in outcomes],
    }


def run_exit(ct, spec):
    wf = Waterfall(ct)
    lo, hi = parse(spec["range"][0]), parse(spec["range"][1])
    listed = [parse(v) for v in spec["exit_values"]]
    found = breakpoints.find(wf, lo, hi, parse(spec.get("grid_step", exact(GRID_STEP))), extra=listed)
    bps = []
    for x, sa, sb in found:
        bps.append(
            {
                "exit_value": money(x),
                "exact": exact(x),
                "reasons": breakpoints.reasons(wf, x, sa, sb),
            }
        )
    points = {}
    for v in listed:
        points.setdefault(v, []).append("listed")
    for x, _, _ in found:
        points.setdefault(x, []).append("breakpoint")
    payouts = [_payout_entry(wf, x, tags) for x, tags in sorted(points.items())]
    return {"breakpoints": bps, "payouts": payouts}


def run_case(inputs):
    out = {"case": inputs["case"], "generated_by": "reference/generate.py"}
    tables = {}
    if "events" in inputs:
        out["cap_tables"] = []
        for ev, ct, details in build(inputs):
            tables[ev["id"]] = ct
            out["cap_tables"].append(
                {"after_event": ev["id"], "date": ev.get("date"), "details": details, "cap_table": _cap_table_summary(ct)}
            )
    if "exit" in inputs:
        spec = inputs["exit"]
        if "cap_table_after_event" in spec:
            ct = tables[spec["cap_table_after_event"]]
        else:
            ct = CapTable.from_json(spec["cap_table"])
        out["exit"] = run_exit(ct, spec)
    return out
