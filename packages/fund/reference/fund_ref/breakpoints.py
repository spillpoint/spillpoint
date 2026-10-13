"""Breakpoints for the fund reference (F15), found by search, not by formula.

On the x-axis (F14) every amount is piecewise linear in X. Between breakpoints
three things are fixed: the tier X's last dollar falls in, the tier the run on
the fund's totals ends in (when final), and the sign of carry paid less
entitlement (when final). Call that the signature. Tiers only move forward as X
grows, and carry paid less entitlement is a straight line while both tiers
hold, so two points with the same signature have no breakpoint between them.

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
prime. A breakpoint's denominator comes from the terms (365, 1 − g, rates), so
no sample point can land exactly on one, and each sample's signature is the
signature of the stretch it sits in.
"""

from fractions import Fraction

from .num import exact, multiple, percent, usd

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


def signature(wf, x):
    out = wf.evaluate(x)
    if wf.fund.final:
        return (out.this_tier, out.totals_tier, _sign(out.owed_before_floor))
    return (out.this_tier, None, None)


def vector(wf, x):
    """Every amount as a function of X: X's tiers, the fund's to date, the run on the fund's totals and carry paid less
    entitlement."""
    out = wf.evaluate(x)
    v = out.this.vector() + out.ledger.to_date.vector()
    if wf.fund.final:
        v += out.totals.vector() + [out.owed_before_floor]
    return v


def _top(fund):
    return ("carry", len(fund.steps) - 1)


def upper_end(wf):
    """A power of two (plus the offset) past which both runs are in their top carry step."""
    hi = 2**20
    top = _top(wf.fund)
    while True:
        s = signature(wf, hi + OFFSET)
        if s[0] == top and (not wf.fund.final or s[1] == top):
            return hi * 2 + OFFSET
        hi *= 2


def _isolate(wf, a, b, sa, sb):
    if sa == sb:
        return []
    if b - a <= BISECT_WIDTH:
        return [(a, b, sa, sb)]
    m = (a + b) / 2
    sm = signature(wf, m)
    return _isolate(wf, a, m, sa, sm) + _isolate(wf, m, b, sm, sb)


def _line(wf, x0, x1):
    v0, v1 = vector(wf, x0), vector(wf, x1)
    slopes = [(b - a) / (x1 - x0) for a, b in zip(v0, v1)]
    return slopes, [a - m * x0 for a, m in zip(v0, slopes)]


def _neighbour(wf, x, sig, direction):
    """A second point on x's own straight stretch, to its left or right."""
    h = FIT_STEP
    for _ in range(60):
        y = x + direction * h
        if y > 0 and signature(wf, y) == sig:
            return y
        h /= 2
    raise MissedBreakpoint(f"no straight stretch beside {exact(x)}")


def _locate(wf, a, b, sa, sb):
    left = _line(wf, _neighbour(wf, a, sa, -1), a)
    right = _line(wf, b, _neighbour(wf, b, sb, +1))
    found = set()
    for ml, cl, mr, cr in zip(left[0], left[1], right[0], right[1]):
        if ml != mr:
            found.add((cr - cl) / (ml - mr))
    if not found:
        # Nothing bends: only the sign of carry paid less entitlement changes, where its line crosses zero.
        m, c = left[0][-1], left[1][-1]
        if not wf.fund.final or m == 0:
            raise MissedBreakpoint(f"signature changes between {exact(a)} and {exact(b)} with nothing bending")
        found.add(-c / m)
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


def reasons(wf, x, sa, sb, left, right):
    out = []
    if sa[0] != sb[0]:
        out.append(_tier_reason(wf, sa[0], sb[0]))
    if not wf.fund.final:
        return out
    owed_left, owed_right = sa[2] > 0, sb[2] > 0
    if owed_left and not owed_right:
        out.append({"code": "clawback_cleared", "text": "from here the GP has earned all the carry it was paid earlier"})
    elif owed_right and not owed_left:
        out.append({"code": "clawback_starts", "text": "from here the GP has been paid more carry than it has earned"})
    elif owed_left and owed_right and left[0][-1] != right[0][-1]:
        code, words = _change(left[0][-1], right[0][-1])
        reason = {"code": "clawback_changes", "change": code}
        n = len(wf.fund.steps)
        block = len(wf.evaluate(x).this.vector())
        totals_at = 2 * block
        totals_bends = _gp_slope(left[0], totals_at, n) != _gp_slope(right[0], totals_at, n)
        if totals_bends and sa[1] != sb[1]:
            tier, wording = _totals_wording(wf, sa[1], sb[1])
            reason["fund_totals"] = tier
            reason["text"] = f"the clawback owed {words}: on the fund's totals, {wording}"
        else:
            reason["text"] = f"the clawback owed {words}"
        out.append(reason)
    return out


def _check_straight(wf, xs):
    """Step 4: every amount is a straight line on each stretch, and the clawback's sign holds there."""
    for lo, hi in zip(xs, xs[1:]):
        q = (hi - lo) / 4
        p1, p2, p3 = lo + q + OFFSET / 7, lo + 2 * q + OFFSET / 7, lo + 3 * q + OFFSET / 7
        v1, v2, v3 = vector(wf, p1), vector(wf, p2), vector(wf, p3)
        if any(b - a != c - b for a, b, c in zip(v1, v2, v3)):
            raise MissedBreakpoint(f"an amount bends between {exact(lo)} and {exact(hi)}")
        if wf.fund.final:
            m = (v3[-1] - v1[-1]) / (p3 - p1)
            c = v1[-1] - m * p1
            if m != 0 and lo < -c / m < hi:
                raise MissedBreakpoint(f"the clawback changes sign between {exact(lo)} and {exact(hi)}")


def find(wf):
    """Every breakpoint above 0: [(x, reasons)], in order (F15)."""
    hi = upper_end(wf)
    step = (hi - OFFSET) / GRID
    grid = [OFFSET + k * step for k in range(GRID + 1)]
    sigs = [signature(wf, g) for g in grid]
    changes = []
    for a, b, sa, sb in zip(grid, grid[1:], sigs, sigs[1:]):
        changes += _isolate(wf, a, b, sa, sb)
    found = []
    for a, b, sa, sb in changes:
        x, left, right = _locate(wf, a, b, sa, sb)
        found.append((x, sa, sb, left, right))
    _check_straight(wf, [Fraction(0)] + [x for x, *_ in found] + [hi])
    out = []
    for x, sa, sb, left, right in found:
        rs = reasons(wf, x, sa, sb, left, right)
        # A change in the run on the fund's totals alone, with no clawback on either side, bends nothing reported.
        if rs:
            out.append((x, rs))
    return out
