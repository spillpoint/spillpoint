"""Breakpoint finder for the reference calculator.

A breakpoint is an exit value where any holder's payoff slope changes. Between
breakpoints every payout is affine in the exit value, because the slope is
fixed by three things: the stable decisions, which preference tiers are fully
paid, and which caps bind. Call that the signature.

Method:
1. Evaluate the signature on a grid.
2. Bisect every grid interval whose ends differ, down to a tiny interval.
3. Fit the affine payout on each side and intersect, which gives the exact
   breakpoint as a fraction.
4. Check that every payout really is affine between consecutive breakpoints,
   so nothing was missed between grid points.
"""

from fractions import Fraction

from .num import usd, usd_price, exact, decimal, count

BISECT_WIDTH = Fraction(1, 1000)  # dollars
FIT_STEP = Fraction(1, 100)  # dollars


class MissedBreakpoint(Exception):
    pass


def _affine_fit(wf, x0, x1):
    f0 = wf.payout_vector(x0)
    f1 = wf.payout_vector(x1)
    if f0 is None or f1 is None:
        raise ValueError(f"multiple equilibria near {decimal(x0, 2)}; the finder needs a unique outcome here")
    slopes = [(b - a) / (x1 - x0) for a, b in zip(f0, f1)]
    intercepts = [a - m * x0 for a, m in zip(f0, slopes)]
    return slopes, intercepts


def _locate(wf, a, sa, b, sb):
    """Exact breakpoint between a (signature sa) and b (signature sb), b − a tiny."""
    step = FIT_STEP
    while wf.signature(a - step) != sa:
        step /= 10
    ml, cl = _affine_fit(wf, a - step, a)
    step = FIT_STEP
    while wf.signature(b + step) != sb:
        step /= 10
    mr, cr = _affine_fit(wf, b, b + step)
    xs = {(cr_k - cl_k) / (ml_k - mr_k) for ml_k, cl_k, mr_k, cr_k in zip(ml, cl, mr, cr) if ml_k != mr_k}
    if not xs:
        return None  # the signature changed but no slope did
    if len(xs) != 1:
        raise ValueError(f"payouts kink at different points near {decimal(a, 2)}: {sorted(xs)}")
    x = xs.pop()
    if not (a - 1 <= x <= b + 1):
        raise ValueError(f"intersection {x} outside bracket [{a}, {b}]")
    left = [m * x + c for m, c in zip(ml, cl)]
    right = [m * x + c for m, c in zip(mr, cr)]
    if left != right:
        raise ValueError(f"payout jumps at {decimal(x, 2)}")
    return x


def find(wf, lo, hi, step, extra=()):
    lo, hi, step = Fraction(lo), Fraction(hi), Fraction(step)
    grid = set()
    k = 0
    while lo + k * step < hi:
        grid.add(lo + k * step)
        k += 1
    grid.add(hi)
    grid.update(Fraction(e) for e in extra if lo <= Fraction(e) <= hi)
    grid = sorted(grid)
    sig ={x: wf.signature(x) for x in grid}
    brackets = []

    def refine(a, sa, b, sb):
        if sa == sb:
            return
        if b - a <= BISECT_WIDTH:
            brackets.append((a, sa, b, sb))
            return
        m = (a + b) / 2
        sm = wf.signature(m)
        refine(a, sa, m, sm)
        refine(m, sm, b, sb)

    for a, b in zip(grid, grid[1:]):
        refine(a, sig[a], b, sig[b])

    found = []
    for a, sa, b, sb in brackets:
        x = _locate(wf, a, sa, b, sb)
        if x is not None:
            found.append((x, sa, sb))
    found.sort(key=lambda t: t[0])
    _check_affine(wf, lo, hi, [x for x, _, _ in found])
    return found


def _check_affine(wf, lo, hi, xs):
    pts = [lo] + [x for x in xs if lo < x < hi] + [hi]
    for p, q in zip(pts, pts[1:]):
        fp, fq = wf.payout_vector(p), wf.payout_vector(q)
        for t in (Fraction(1, 7), Fraction(1, 2), Fraction(5, 6)):
            x = p + (q - p) * t
            fx = wf.payout_vector(x)
            expect = [a + (b - a) * t for a, b in zip(fp, fq)]
            if fx != expect:
                raise MissedBreakpoint(f"payouts are not affine between {decimal(p, 2)} and {decimal(q, 2)}")


# ---------- reasons ----------


def _name(ct, sid):
    return ct.securities[sid]["name"]


def _join(names):
    names = list(names)
    if len(names) <= 1:
        return "".join(names)
    return ", ".join(names[:-1]) + " and " + names[-1]


def reasons(wf, x, sa, sb):
    """Plain-English reasons for one breakpoint, from the signature change."""
    ct = wf.ct
    if len(sa) != 1 or len(sb) != 1:
        return [{"code": "equilibrium_set_changes", "text": "The set of stable conversion and exercise decisions changes here."}]
    (bits_a, (tiers_a, capped_a)), = sa
    (bits_b, (tiers_b, capped_b)), = sb
    out = []
    outcome = wf.evaluate(x)[0]
    price = outcome["common_price"]
    da = dict(zip(wf.players, bits_a))
    db = dict(zip(wf.players, bits_b))

    for sid in wf.options:
        if da[sid] != db[sid]:
            strike = ct.securities[sid]["strike"]
            n = wf.shares[sid]
            if db[sid]:
                text = (
                    f"Common reaches {usd_price(strike, 2)} per share, the strike on the {n:,} options at that price. "
                    f"Above this exit value they are in the money and exercised: their holders pay the strike, "
                    f"which is added to the proceeds, and share in the residual as common."
                )
            else:
                text = f"Common falls to the {usd_price(strike, 2)} strike; the {n:,} options at that price stop being exercised."
            out.append({"code": "option_in_the_money", "security": sid, "strike": exact(strike), "text": text})

    for sid in wf.converters:
        if da[sid] != db[sid]:
            sec = ct.securities[sid]
            n_conv = wf.shares[sid] * wf.ratio[sid]
            as_conv = n_conv * price
            if db[sid]:
                if sec["participation"] == "non_participating":
                    keep = f"its {exact(sec['preference_multiple'])}x preference of {usd(wf.pref[sid])}"
                else:
                    keep = f"its capped payout of {usd(wf.cap_total[sid])} ({exact(sec['cap_multiple'])}x its original issue price)"
                text = (
                    f"{sec['name']} converts to common. At this exit value its as-converted share "
                    f"({count(n_conv)} common shares at {usd_price(price)} each = {usd(as_conv)}) equals {keep}. "
                    f"Below it, staying preferred pays more; above it, converting pays more."
                )
            else:
                text = f"{sec['name']} stops converting: staying preferred pays more above this exit value."
            out.append({"code": "series_converts", "security": sid, "converts": db[sid], "text": text})

    for i, tier in enumerate(ct.seniority):
        if tiers_a[i] is False and tiers_b[i] is True:
            claim = sum(wf.pref[s] for s in tier if not db.get(s, False))
            unpaid_after = [
                t for j, t in enumerate(ct.seniority) if j > i and tiers_b[j] is not None
            ]
            nxt = (
                f"the next tier's preference ({_join(_name(ct, s) for s in unpaid_after[0] if not db.get(s, False))})"
                if unpaid_after
                else "the residual, shared as common"
            )
            names = _join(_name(ct, s) for s in tier if not db.get(s, False))
            text = (
                f"The preference tier {names} is fully paid ({usd(claim)}). "
                f"Above this exit value, the next dollar goes to {nxt}."
            )
            out.append({"code": "tier_fully_paid", "tier": i + 1, "securities": list(tier), "text": text})

    for sid in sorted(set(capped_b) - set(capped_a)):
        sec = ct.securities[sid]
        text = (
            f"{sec['name']} reaches its cap: preference plus participation totals "
            f"{exact(sec['cap_multiple'])}x its original issue price ({usd(wf.cap_total[sid])}). "
            f"Above this exit value its payout stays flat until converting to common pays more."
        )
        out.append({"code": "cap_reached", "security": sid, "text": text})

    if not out:
        out.append({"code": "other", "text": "Payoff slopes change here."})
    return out
