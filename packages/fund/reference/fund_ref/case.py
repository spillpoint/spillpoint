"""Turns a fund case's inputs.json into its expected.json (FC2 to FC5, FC9, FC11), and a refusal fixture into its
refusal (FC7, FC12)."""

import copy
import re
from fractions import Fraction

from . import breakpoints
from .accounts import Model
from .closes import equalization
from .inputs import Refusal, read
from .num import exact, money, parse_exact


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


def _fund_block(model, outs, which, amount, gp_commitment):
    """F23, F26: the fund's amounts by tier, the accounts' sums, with the GP commitment's line beside them. The GP's
    carry by step lists each account's steps, fund terms first; with two or more accounts each names its class (FC11).
    With one account this is FC4's block, as 0.1.0 and 0.2.0 wrote it."""
    fund = model.fund
    pots = [o.this if which == "this" else o.ledger.to_date for _, o in outs]
    total = lambda f: sum((f(p) for p in pots), Fraction(0))  # noqa: E731
    lps = {"capital": money(total(lambda p: p.lp_capital))}
    if fund.pref is not None:
        lps["pref"] = money(total(lambda p: p.lp_pref))
    if fund.catch_up is not None:
        lps["catch_up"] = money(total(lambda p: p.lp_catch_up))
    lps["carry_tier"] = money(total(lambda p: sum(p.lp_carry)))
    lps["total"] = money(total(lambda p: p.lps))
    gp = {}
    if fund.catch_up is not None:
        gp["catch_up"] = money(total(lambda p: p.gp_catch_up))
    carry = []
    for (acct, _), pot in zip(outs, pots):
        for step, amt in zip(acct.run.fund.steps, pot.gp_carry):
            entry = {"class": acct.class_name} if model.named else {}
            entry["rate"] = exact(step.rate)
            if step.from_lp_multiple is not None:
                entry["from_lp_multiple"] = exact(step.from_lp_multiple)
            entry["amount"] = money(amt)
            carry.append(entry)
    gp["carry"] = carry
    gp["total"] = money(total(lambda p: p.gp))
    out = {"amount": money(amount)}
    if fund.has_gp_commitment:
        out["gp_commitment"] = money(gp_commitment)
    out["lps"] = lps
    out["gp"] = gp
    return out


def _lp_amount(x):
    """FC9: an LP's amount to the cent, half away from zero as every amount in a case is, and exact, as F20 gives it."""
    return {"amount": money(x), "exact": exact(x)}


def _clawback(carry_paid, entitlement, owed):
    return {"carry_paid": money(carry_paid), "entitlement": money(entitlement), "owed": money(owed)}


def _by_account(outs, final):
    """F26, FC11: each account's own amounts, by tier as FC4 has them, and when final its own clawback (F24)."""
    entries = []
    for acct, o in outs:
        entry = {
            "class": acct.class_name,
            "distribution": _block(acct.run.fund, o.this, o.x),
            "to_date": _block(acct.run.fund, o.ledger.to_date, o.ledger.distributed),
        }
        if final:
            entry["clawback"] = _clawback(o.carry_paid, o.entitlement, o.clawback)
        entries.append(entry)
    return entries


def _by_lp(model, out, final):
    """F20, F23: each LP's share, by commitment within its account, of its account's LPs' total from X and to date,
    and, when final, of its account's clawback (FC9)."""
    entries = []
    for acct, o in out.by_account:
        for lp in acct.lps:
            share = acct.lp_share(lp)
            entry = {"name": lp.name, "distribution": _lp_amount(share * o.this.lps), "to_date": _lp_amount(share * o.ledger.to_date.lps)}
            if final:
                entry["clawback"] = _lp_amount(share * o.clawback)
            entries.append((model.fund.lps.index(lp), entry))
    return [e for _, e in sorted(entries, key=lambda t: t[0])]


def _point(model, x, tags):
    fund = model.fund
    final = fund.final or "nav" in tags  # F14: the NAV point is final by definition
    out = model.evaluate(x, final=final)
    entry = {
        "x": money(x),
        "exact": exact(x),
        "tags": tags,
        "distribution": _fund_block(model, out.by_account, "this", x, out.gp_commitment),
        "to_date": _fund_block(model, out.by_account, "to_date", out.distributed, out.gp_commitment_to_date),
    }
    if final:
        entry["clawback"] = _clawback(out.carry_paid, out.entitlement, out.clawback)
    if model.named:
        entry["by_account"] = _by_account(out.by_account, final)
    if fund.lps:
        entry["by_lp"] = _by_lp(model, out, final)
    return entry


def _lps(model):
    """FC9, FC11: each LP's class (when it has one), its close (when it joins at a later close), commitment, share and
    paid-in. Its share is F19's, its commitment over all the LPs' (Jordan, f03a review); its paid-in is its part of its
    account's, by its commitment over the account's (F23). These don't change with X, as FC3's don't."""
    fund = model.fund
    total = sum((lp.commitment for lp in fund.lps), Fraction(0))
    rows = []
    for acct in model.accounts:
        for lp in acct.lps:
            row = {"name": lp.name}
            if lp.cls is not None:
                row["class"] = lp.cls
            if fund.joins_later(lp):
                row["close"] = lp.close.isoformat()
            paid_in = acct.lp_share(lp) * acct.run.before.lps_paid_in
            row.update({"commitment": exact(lp.commitment), "share": exact(lp.commitment / total), "paid_in": _lp_amount(paid_in)})
            rows.append((fund.lps.index(lp), row))
    return [r for _, r in sorted(rows, key=lambda t: t[0])]


def _accounts(model):
    """FC11: each account's class, commitment, share of the distributions and of the fee calls, paid-in and pref. These
    don't change with X."""
    fund = model.fund
    rows = []
    for acct in model.accounts:
        before = acct.run.before
        row = {
            "class": acct.class_name,
            "commitment": exact(acct.commitment),
            "share": exact(acct.share),
            "fee_share": exact(acct.fee_share),
            "paid_in": money(before.lps_paid_in),
        }
        if fund.pref is not None:
            row["pref_accrued_to_d"] = money(before.pref_accrued)
            if fund.final or fund.nav is not None:
                row["pref_on_fund_totals"] = money(before.hurdle_pref)
        rows.append(row)
    return rows


def _moves(name, m):
    return {
        "name": name,
        "capital_paid": _lp_amount(m.capital_paid),
        "capital_returned": _lp_amount(m.capital_returned),
        "interest_paid": _lp_amount(m.interest_paid),
        "interest_received": _lp_amount(m.interest_received),
    }


def _equalization(fund, eq):
    """F25, F26, FC11: each later close in date order, with what each LP in by then paid in or got back and the interest
    it paid or received; then each LP's equalization over all of them."""
    closes = []
    for close in eq.closes:
        closes.append(
            {
                "date": close.date.isoformat(),
                "joining": [lp.name for lp in close.joining],
                "lps": [_moves(fund.lps[i].name, m) for i, m in sorted(close.moves.items())],
            }
        )
    return {"rate": exact(eq.rate), "closes": closes, "lps": [_moves(lp.name, m) for lp, m in zip(fund.lps, eq.totals)]}


def run_case(case):
    fund = read(case["fund"])
    model = Model(fund)
    found = breakpoints.find(model)
    points = {}
    for v in case["xs"]:
        points.setdefault(parse_exact(v), []).append("listed")
    for x, _ in found:
        points.setdefault(x, []).append("breakpoint")
    if fund.nav is not None:
        points.setdefault(fund.nav, []).append("nav")
    out = {
        "case": case["case"],
        "generated_by": "packages/fund/reference/generate.py",
        "distribution_date": fund.distribution_date.isoformat(),
        "final": fund.final,
        "lps_paid_in": money(model.lps_paid_in()),
    }
    if fund.has_gp_commitment:
        out["gp_commitment_paid_in"] = money(model.gp_commitment_paid_in())
    if fund.pref is not None:
        out["pref_accrued_to_d"] = money(model.pref_accrued())
        if fund.final or fund.nav is not None:
            out["pref_on_fund_totals"] = money(model.hurdle_pref())
    if fund.lps:
        out["lps"] = _lps(model)
    if model.named:
        out["accounts"] = _accounts(model)
    eq = equalization(fund)
    if eq is not None:
        out["equalization"] = _equalization(fund, eq)
    out["breakpoints"] = [{"x": money(x), "exact": exact(x), "reasons": rs} for x, rs in found]
    out["points"] = [_point(model, x, tags) for x, tags in sorted(points.items())]
    return out


_PATH = re.compile(r"([^.\[\]]+)|\[(\d+)\]")


def _steps(path):
    return [int(i) if i else k for k, i in _PATH.findall(path)]


def _walk(obj, steps):
    for s in steps:
        obj = obj[s]
    return obj


def apply_change(inputs, change):
    """FC7: `set` replaces the value at each path, or at a list's end adds it (FC12); `del` removes the value at a
    path."""
    out = copy.deepcopy(inputs)
    for path, value in change.get("set", {}).items():
        *head, last = _steps(path)
        parent = _walk(out, head)
        if isinstance(parent, list) and last == len(parent):
            parent.append(copy.deepcopy(value))
        else:
            parent[last] = copy.deepcopy(value)
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
