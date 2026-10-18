"""Turns a fund case's inputs.json into its expected.json (FC2 to FC5, FC9), and a refusal fixture into its refusal (FC7)."""

import copy
import re

from . import breakpoints
from .inputs import Refusal, read
from .lps import each_lp, shares
from .num import exact, money, parse_exact
from .waterfall import Waterfall


def _block(fund, pot, amount):
    """One distribution's amounts, or the fund's to date, by tier (F16). A tier the terms don't have isn't listed (FC4)."""
    lps = {"capital": money(pot.lp_capital)}
    if fund.pref is not None:
        lps["pref"] = money(pot.lp_pref)
    if fund.catch_up is not None:
        lps["catch_up"] = money(pot.lp_catch_up)
    lps["carry_tier"] = money(sum(pot.lp_carry))
    lps["total"] = money(pot.lps)
    gp = {}
    if fund.catch_up is not None:
        gp["catch_up"] = money(pot.gp_catch_up)
    carry = []
    for step, amt in zip(fund.steps, pot.gp_carry):
        entry = {"rate": exact(step.rate)}
        if step.from_lp_multiple is not None:
            entry["from_lp_multiple"] = exact(step.from_lp_multiple)
        entry["amount"] = money(amt)
        carry.append(entry)
    gp["carry"] = carry
    gp["total"] = money(pot.gp)
    out = {"amount": money(amount)}
    if fund.has_gp_commitment:
        out["gp_commitment"] = money(pot.gp_commitment)
    out["lps"] = lps
    out["gp"] = gp
    return out


def _lp_amount(x):
    """FC9: an LP's amount to the cent, half away from zero as every amount in a case is, and exact, as F20 gives it."""
    return {"amount": money(x), "exact": exact(x)}


def _by_lp(fund, out, final):
    """F20: each LP's share of the LPs' total from X and to date, and, when final, of the clawback owed (FC9)."""
    rows = zip(fund.lps, each_lp(fund, out.this.lps), each_lp(fund, out.ledger.to_date.lps))
    entries = [{"name": lp.name, "distribution": _lp_amount(d), "to_date": _lp_amount(t)} for lp, d, t in rows]
    if final:
        for entry, owed in zip(entries, each_lp(fund, out.clawback)):
            entry["clawback"] = _lp_amount(owed)
    return entries


def _point(wf, x, tags):
    fund = wf.fund
    final = fund.final or "nav" in tags  # F14: the NAV point is final by definition
    out = wf.evaluate(x, final=final)
    entry = {
        "x": money(x),
        "exact": exact(x),
        "tags": tags,
        "distribution": _block(fund, out.this, x),
        "to_date": _block(fund, out.ledger.to_date, out.ledger.distributed),
    }
    if final:
        entry["clawback"] = {
            "carry_paid": money(out.carry_paid),
            "entitlement": money(out.entitlement),
            "owed": money(out.clawback),
        }
    if fund.lps:
        entry["by_lp"] = _by_lp(fund, out, final)
    return entry


def run_case(case):
    fund = read(case["fund"])
    wf = Waterfall(fund)
    found = breakpoints.find(wf)
    points = {}
    for v in case["xs"]:
        points.setdefault(parse_exact(v), []).append("listed")
    for x, _ in found:
        points.setdefault(x, []).append("breakpoint")
    if fund.nav is not None:
        points.setdefault(fund.nav, []).append("nav")
    before = wf.before
    out = {
        "case": case["case"],
        "generated_by": "packages/fund/reference/generate.py",
        "distribution_date": fund.distribution_date.isoformat(),
        "final": fund.final,
        "lps_paid_in": money(before.lps_paid_in),
    }
    if fund.has_gp_commitment:
        out["gp_commitment_paid_in"] = money(before.gp_commitment_paid_in)
    if fund.pref is not None:
        out["pref_accrued_to_d"] = money(before.pref_accrued)
        if fund.final or fund.nav is not None:
            out["pref_on_fund_totals"] = money(before.hurdle_pref)
    if fund.lps:
        # FC9: an LP's commitment, share and paid-in don't change with X, so they're given once.
        paid_in = each_lp(fund, before.lps_paid_in)
        out["lps"] = [
            {"name": lp.name, "commitment": exact(lp.commitment), "share": exact(share), "paid_in": _lp_amount(p)}
            for lp, share, p in zip(fund.lps, shares(fund), paid_in)
        ]
    out["breakpoints"] = [{"x": money(x), "exact": exact(x), "reasons": rs} for x, rs in found]
    out["points"] = [_point(wf, x, tags) for x, tags in sorted(points.items())]
    return out


_PATH = re.compile(r"([^.\[\]]+)|\[(\d+)\]")


def _steps(path):
    return [int(i) if i else k for k, i in _PATH.findall(path)]


def _walk(obj, steps):
    for s in steps:
        obj = obj[s]
    return obj


def apply_change(inputs, change):
    """FC7: `set` replaces the value at each path; `del` removes the value at a path."""
    out = copy.deepcopy(inputs)
    for path, value in change.get("set", {}).items():
        *head, last = _steps(path)
        _walk(out, head)[last] = copy.deepcopy(value)
    dels = change.get("del", [])
    for path in [dels] if isinstance(dels, str) else dels:
        *head, last = _steps(path)
        del _walk(out, head)[last]
    return out


def run_fixture(fixture, base_case):
    """The refusal a fixture's change to its base case's inputs gives (FC7)."""
    inputs = apply_change(base_case["fund"], fixture["change"])
    try:
        read(inputs)
    except Refusal as r:
        return {"refused": r.to_json()}
    raise AssertionError(f"fixture {fixture.get('about')!r} is not refused")
