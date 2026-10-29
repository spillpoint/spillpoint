"""Breakpoints for the fund reference (F15, F27), found by search, not by formula.

On the x-axis (F14) every amount is piecewise linear in X. Between breakpoints
three things are fixed in each account (F23): the tier its part of X's last
dollar falls in, the tier the run on its totals ends in (when final), and the
sign of its carry paid less entitlement (when final). Call those, over every
account, the signature. Tiers only move forward as X grows, and carry paid less
entitlement is a straight line while both tiers hold, so two points with the
same signature have no breakpoint between them. A fund without classes has one
account, and this is the search 0.1.0 and 0.2.0 ran.

Method (it deliberately doesn't work out where a tier ends from its size):
1. Evaluate the signature on a grid, from just above 0 to a point where both
   runs are in their top carry step, past which nothing bends.
2. Bisect every grid interval whose ends differ, down to a millionth of a dollar.
3. Fit a line to every amount on each side and intersect them: the exact
   breakpoint. Where no amount bends and only the sign changes, it's the root of
   carry paid less entitlement.
4. Check that every amount is a straight line between consecutive breakpoints,
   and that the clawback's sign holds on each, so nothing was missed.

Every sample point is a whole multiple of a power of two plus 1/1000003, a
prime. A breakpoint's denominator comes from the terms (365, 1 − g, rates,
commitments), so no sample point can land exactly on one, and each sample's
signature is the signature of the stretch it sits in.

With two or more accounts, each reason names its account (F27): the fund's
terms first, then the classes in the input's order, each account's own tier
before its clawback's (FC5).
"""

from dataclasses import dataclass
from fractions import Fraction

from .accounts import FUND_TERMS
from .num import exact, multiple, percent, usd
from .waterfall import Waterfall

OFFSET = Fraction(1, 1000003)
GRID = 1024
BISECT_WIDTH = Fraction(1, 10**6)
FIT_STEP = Fraction(1, 1000)


class MissedBreakpoint(Exception):
    pass


class NotSettled(Exception):
    """The clawback rises, or bends where the spec's wording doesn't cover it: stop and ask (F15)."""


def _sign(x):
    return (x > 0) - (x < 0)


@dataclass
class _Account:
    """One account as the search sees it: its own run of the tiers, and its part of each dollar of X (F23)."""

    name: str
    class_name: object
    run: Waterfall
    part: Fraction

    @property
    def size(self):
        """How many amounts its vector has: X's block, to date's, and when final the totals' block and the owed."""
        block = 5 + 2 * len(self.run.fund.steps)
        return 3 * block + 1 if self.run.fund.final else 2 * block

    def evaluate(self, x):
        return self.run.evaluate(self.part * x)


class _View:
    """What the search runs over: a fund as accounts (accounts.Model), or one run of the tiers on its own (a
    Waterfall, the whole fund as one account, its GP commitment inside it)."""

    def __init__(self, model):
        self.fund = model.fund
        if isinstance(model, Waterfall):
            self.accounts = [_Account(FUND_TERMS, None, model, Fraction(1))]
            self.named = False
        else:
            self.accounts = [_Account(a.name, a.class_name, a.run, a.part_of_x(model.fund)) for a in model.accounts]
            self.named = model.named
        self.final = self.fund.final
        self.offsets = []
        at = 0
        for a in self.accounts:
            self.offsets.append(at)
            at += a.size


def _account_signature(acct, x):
    out = acct.evaluate(x)
    if acct.run.fund.final:
        return (out.this_tier, out.totals_tier, _sign(out.owed_before_floor))
    return (out.this_tier, None, None)


def signature(view, x):
    return tuple(_account_signature(a, x) for a in view.accounts)


def _account_vector(acct, x):
    out = acct.evaluate(x)
    v = out.this.vector() + out.ledger.to_date.vector()
    if acct.run.fund.final:
        v += out.totals.vector() + [out.owed_before_floor]
    return v


def vector(view, x):
    """Every amount as a function of X, account by account: X's tiers, the account's to date, the run on its totals
    and its carry paid less entitlement."""
    return [v for a in view.accounts for v in _account_vector(a, x)]


def _top(fund):
    return ("carry", len(fund.steps) - 1)


def upper_end(view):
    """A power of two (plus the offset) past which every account's runs are in their top carry step."""
    hi = 2**20
    while True:
        sig = signature(view, hi + OFFSET)
        if all(s[0] == _top(a.run.fund) and (not view.final or s[1] == _top(a.run.fund)) for a, s in zip(view.accounts, sig)):
            return hi * 2 + OFFSET
        hi *= 2


def _isolate(view, a, b, sa, sb):
    if sa == sb:
        return []
    if b - a <= BISECT_WIDTH:
        return [(a, b, sa, sb)]
    m = (a + b) / 2
    sm = signature(view, m)
    return _isolate(view, a, m, sa, sm) + _isolate(view, m, b, sm, sb)


def _line(view, x0, x1):
    v0, v1 = vector(view, x0), vector(view, x1)
    slopes = [(b - a) / (x1 - x0) for a, b in zip(v0, v1)]
    return slopes, [a - m * x0 for a, m in zip(v0, slopes)]


def _owed_at(view, i):
    """Where account i's carry paid less entitlement sits in the vector: its last amount."""
    return view.offsets[i] + view.accounts[i].size - 1


def _neighbour(view, x, sig, direction):
    """A second point on x's own straight stretch, to its left or right."""
    h = FIT_STEP
    for _ in range(60):
        y = x + direction * h
        if y > 0 and signature(view, y) == sig:
            return y
        h /= 2
    raise MissedBreakpoint(f"no straight stretch beside {exact(x)}")


def _locate(view, a, b, sa, sb):
    left = _line(view, _neighbour(view, a, sa, -1), a)
    right = _line(view, b, _neighbour(view, b, sb, +1))
    found = set()
    for ml, cl, mr, cr in zip(left[0], left[1], right[0], right[1]):
        if ml != mr:
            found.add((cr - cl) / (ml - mr))
    if not found:
        # Nothing bends: only the sign of an account's carry paid less entitlement changes, where its line crosses zero.
        for i, (s1, s2) in enumerate(zip(sa, sb)):
            if s1[2] != s2[2]:
                m, c = left[0][_owed_at(view, i)], left[1][_owed_at(view, i)]
                if not view.final or m == 0:
                    raise MissedBreakpoint(f"signature changes between {exact(a)} and {exact(b)} with nothing bending")
                found.add(-c / m)
        if not found:
            raise MissedBreakpoint(f"signature changes between {exact(a)} and {exact(b)} with nothing bending")
    if len(found) != 1:
        raise MissedBreakpoint(f"amounts bend at different points between {exact(a)} and {exact(b)}: {sorted(found)}")
    x = found.pop()
    if not a < x < b:
        raise MissedBreakpoint(f"breakpoint {exact(x)} outside ({exact(a)}, {exact(b)})")
    return x, left, right


# F15's wording. Amounts and rates come from the fund; the codes are fixed.


def _tier_reason(wf, ended, after):
    """The reason X's own tier `ended` ends, with `after` the tier the next dollar falls in."""
    f = wf.fund
    if ended == "capital" and f.deal_by_deal:
        # F36: deal by deal, tier 1 ends at what's due on X, the amount it names (FA57).
        due = sum(wf.due_on_x(), Fraction(0))
        text = f"LPs have their {usd(due)} back for the investments exited or written off, fees and expenses included"
        return {"code": "capital_returned", "amount": exact(due), "text": text}
    if ended == "capital":
        p = wf.before.lps_paid_in
        return {"code": "capital_returned", "amount": exact(p), "text": f"LPs have their {usd(p)} of paid-in capital back"}
    if ended == "pref":
        a = wf.before.pref_accrued
        return {
            "code": "pref_met",
            "rate": exact(f.pref),
            "amount": exact(a),
            "text": f"LPs have their {percent(f.pref)} pref, {usd(a)}",
        }
    if ended == "catch_up":
        return {"code": "catch_up_done", "carry": exact(f.first_rate), "text": f"the GP has {percent(f.first_rate)} of the profit"}
    step = f.steps[after[1]]
    return {
        "code": "carry_step",
        "lp_multiple": exact(step.from_lp_multiple),
        "rate": exact(step.rate),
        "text": f"LPs reach {multiple(step.from_lp_multiple)}: carry is {percent(step.rate)} from here",
    }


def _totals_wording(wf, ended, after):
    """How a clawback change names a tier of the run on the fund's totals ending (F15)."""
    f = wf.fund
    if ended == "capital":
        return "capital_returned", "LPs have their capital back"
    if ended == "pref":
        return "pref_met", "LPs have their pref"
    if ended == "catch_up":
        return "catch_up_done", f"the GP has {percent(f.first_rate)} of the profit"
    step = f.steps[after[1]]
    return "carry_step", f"LPs reach {multiple(step.from_lp_multiple)}: carry is {percent(step.rate)} from here"


def _change(below, above):
    """How the clawback's slope changes, as F15 words it. Slopes are per dollar of X; falling is negative."""
    if below == 0 and above < 0:
        return "starts_to_fall", "starts to fall"
    if below < 0 and above == 0:
        return "stops_falling", "stops falling"
    if below < 0 and above < below:
        return "falls_faster", "falls faster"
    if below < 0 and below < above < 0:
        return "falls_more_slowly", "falls more slowly"
    raise NotSettled(f"the clawback's slope goes from {exact(below)} to {exact(above)}, which F15 doesn't word")


def _gp_slope(slopes, offset, steps):
    """The GP's carry slope in one block of the vector: its catch-up plus its carry by step."""
    gp_catch_up = slopes[offset + 3]
    gp_carry = slopes[offset + 4 + steps : offset + 4 + 2 * steps]
    return gp_catch_up + sum(gp_carry)


def _account_reasons(acct, at, sa, sb, left, right, named):
    """One account's reasons at a breakpoint: its own tier's, then its clawback's (F15, FC5). `at` is where its
    amounts start in the vector; sa and sb are its signature on either side; `named` when there are two or more
    accounts (F27)."""
    wf = acct.run
    out = []
    if sa[0] != sb[0]:
        out.append(_tier_reason(wf, sa[0], sb[0]))
    if not wf.fund.final:
        return out
    owed = at + acct.size - 1
    owed_left, owed_right = sa[2] > 0, sb[2] > 0
    if owed_left and not owed_right:
        out.append({"code": "clawback_cleared", "text": "from here the GP has earned all the carry it was paid earlier"})
    elif owed_right and not owed_left:
        out.append({"code": "clawback_starts", "text": "from here the GP has been paid more carry than it has earned"})
    elif owed_left and owed_right and left[0][owed] != right[0][owed]:
        code, words = _change(left[0][owed], right[0][owed])
        reason = {"code": "clawback_changes", "change": code}
        n = len(wf.fund.steps)
        totals_at = at + 2 * (5 + 2 * n)
        totals_bends = _gp_slope(left[0], totals_at, n) != _gp_slope(right[0], totals_at, n)
        if totals_bends and sa[1] != sb[1]:
            tier, wording = _totals_wording(wf, sa[1], sb[1])
            reason["fund_totals"] = tier
            # F27, FA29: with two or more accounts the run is on the account's own totals, and the reason says so.
            totals = "its own totals" if named else "the fund's totals"
            reason["text"] = f"the clawback owed {words}: on {totals}, {wording}"
        else:
            reason["text"] = f"the clawback owed {words}"
        out.append(reason)
    return out


def _named(acct, reason):
    """F27: with two or more accounts, a reason's text starts with its account's name, and the case file gives its
    class (FC11)."""
    named = {"code": reason["code"], "class": acct.class_name}
    named.update({k: v for k, v in reason.items() if k != "code"})
    named["text"] = f"{acct.name}: {reason['text']}"
    return named


def reasons(view, x, sa, sb, left, right):
    """Every account's reasons at x: the fund's terms first, then the classes in the input's order (F27)."""
    out = []
    for i, acct in enumerate(view.accounts):
        rs = _account_reasons(acct, view.offsets[i], sa[i], sb[i], left, right, view.named)
        out += [_named(acct, r) for r in rs] if view.named else rs
    return out


def _check_straight(view, xs):
    """Step 4: every amount is a straight line on each stretch, and each account's clawback's sign holds there."""
    for lo, hi in zip(xs, xs[1:]):
        q = (hi - lo) / 4
        p1, p2, p3 = lo + q + OFFSET / 7, lo + 2 * q + OFFSET / 7, lo + 3 * q + OFFSET / 7
        v1, v2, v3 = vector(view, p1), vector(view, p2), vector(view, p3)
        if any(b - a != c - b for a, b, c in zip(v1, v2, v3)):
            raise MissedBreakpoint(f"an amount bends between {exact(lo)} and {exact(hi)}")
        if view.final:
            for i in range(len(view.accounts)):
                k = _owed_at(view, i)
                m = (v3[k] - v1[k]) / (p3 - p1)
                c = v1[k] - m * p1
                if m != 0 and lo < -c / m < hi:
                    raise MissedBreakpoint(f"a clawback changes sign between {exact(lo)} and {exact(hi)}")


def find(model):
    """Every breakpoint above 0: [(x, reasons)], in order (F15, F27). `model` is an accounts.Model, or a Waterfall run
    as the whole fund."""
    view = _View(model)
    hi = upper_end(view)
    step = (hi - OFFSET) / GRID
    grid = [OFFSET + k * step for k in range(GRID + 1)]
    sigs = [signature(view, g) for g in grid]
    changes = []
    for a, b, sa, sb in zip(grid, grid[1:], sigs, sigs[1:]):
        changes += _isolate(view, a, b, sa, sb)
    found = []
    for a, b, sa, sb in changes:
        x, left, right = _locate(view, a, b, sa, sb)
        found.append((x, sa, sb, left, right))
    _check_straight(view, [Fraction(0)] + [x for x, *_ in found] + [hi])
    out = []
    for x, sa, sb, left, right in found:
        rs = reasons(view, x, sa, sb, left, right)
        # A change in the run on the fund's totals alone, with no clawback on either side, bends nothing reported.
        if rs:
            out.append((x, rs))
    return out
