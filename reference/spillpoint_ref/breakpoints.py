"""Breakpoint finder for the reference calculator.

A breakpoint is an exit value where any holder's payoff slope changes, or
where a payoff jumps. Between breakpoints every payout is affine in the exit
value, because the slope is fixed by three things: the stable decisions, which
preference tiers are fully paid, and which caps bind. Call that the signature.

Method:
1. Evaluate the signature on a grid.
2. Bisect every grid interval whose ends differ, down to a tiny interval.
3. Fit the affine payout on each side and intersect, which gives the exact
   breakpoint as a fraction. If the two sides don't meet there, the payouts
   jump: the exact point is then where the decision-maker whose choice changed
   (for a conversion group, the pivotal voting holder) is indifferent.
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


def _side(wf, x, direction):
    """Two points just to one side of x with the same, single-outcome signature."""
    step = FIT_STEP
    for _ in range(12):
        p1, p2 = x + direction * step, x + direction * 2 * step
        s1 = wf.signature(p1)
        if s1 == wf.signature(p2) and len(s1) == 1:
            return s1, (min(p1, p2), max(p1, p2))
        step /= 10
    raise ValueError(f"no clean region next to {decimal(x, 2)}")


def _line(f0, f1, x0, x1):
    m = (f1 - f0) / (x1 - x0)
    return m, f0 - m * x0


def _indifference(wf, sides, pts, bracket):
    """Where the choice that changes flips (used for jumps).

    For a single decision-maker, that is where its two choices pay the same.
    For a conversion group, it is where some voting holder's two outcomes pay
    the same; the one inside the bracket is the pivotal holder.
    """
    (bits_l, _), = sides[0]
    (bits_r, _), = sides[1]
    lo, hi = bracket
    x0, x1 = pts
    xs = set()
    for i, (u, v) in enumerate(zip(bits_l, bits_r)):
        if u == v:
            continue
        player = wf.players[i]
        flipped = bits_l[:i] + (not u,) + bits_l[i + 1 :]
        if player in wf.vote:
            values = [
                (lambda bits, e, h=h: wf.holder_group_payout(wf.run(e, bits)[0], player, h))
                for h in wf.voters[player]
            ]
        else:
            values = [lambda bits, e: wf.player_value(wf.run(e, bits)[0], player)]
        for value in values:
            m_keep, c_keep = _line(value(bits_l, x0), value(bits_l, x1), x0, x1)
            m_flip, c_flip = _line(value(flipped, x0), value(flipped, x1), x0, x1)
            if m_keep != m_flip:
                x = (c_flip - c_keep) / (m_keep - m_flip)
                if lo - 1 <= x <= hi + 1:
                    xs.add(x)
    if len(xs) != 1:
        raise ValueError(f"cannot place the jump near {decimal(lo, 2)}: {sorted(xs)}")
    return xs.pop()


def _locate(wf, a, b):
    """Exact breakpoint between a and b, b − a tiny. Returns (x, left signature, right signature, jumps)."""
    sl, (l0, l1) = _side(wf, a, -1)
    sr, (r0, r1) = _side(wf, b, +1)
    if sl == sr:
        return None
    ml, cl = _affine_fit(wf, l0, l1)
    mr, cr = _affine_fit(wf, r0, r1)
    if ml == mr and cl == cr:
        return None  # the signature changed but no payout did
    xs = {(cr_k - cl_k) / (ml_k - mr_k) for ml_k, cl_k, mr_k, cr_k in zip(ml, cl, mr, cr) if ml_k != mr_k}
    x = next(iter(xs)) if len(xs) == 1 else None
    bends = (
        x is not None
        and a - 1 <= x <= b + 1
        and [m * x + c for m, c in zip(ml, cl)] == [m * x + c for m, c in zip(mr, cr)]
    )
    if bends:
        return x, sl, sr, False
    return _indifference(wf, (sl, sr), (l0, l1), (a, b)), sl, sr, True


def find(wf, lo, hi, step, extra=()):
    """All breakpoints in (lo, hi): a list of (x, left signature, right signature, jumps)."""
    lo, hi, step = Fraction(lo), Fraction(hi), Fraction(step)
    grid = set()
    k = 0
    while lo + k * step < hi:
        grid.add(lo + k * step)
        k += 1
    grid.add(hi)
    grid.update(Fraction(e) for e in extra if lo <= Fraction(e) <= hi)
    grid = sorted(grid)
    sig = {x: wf.signature(x) for x in grid}
    brackets = []

    def refine(a, sa, b, sb):
        if sa == sb:
            return
        if b - a <= BISECT_WIDTH:
            brackets.append((a, b))
            return
        m = (a + b) / 2
        sm = wf.signature(m)
        refine(a, sa, m, sm)
        refine(m, sm, b, sb)

    for a, b in zip(grid, grid[1:]):
        refine(a, sig[a], b, sig[b])

    found = {}
    for a, b in brackets:
        hit = _locate(wf, a, b)
        if hit is not None and hit[0] not in found:
            found[hit[0]] = hit
    out = sorted(found.values(), key=lambda t: t[0])
    _check_affine(wf, lo, hi, [t[0] for t in out])
    return out


def _check_affine(wf, lo, hi, xs):
    """Between consecutive breakpoints, interior points must lie on one line."""
    pts = [lo] + [x for x in xs if lo < x < hi] + [hi]
    for p, q in zip(pts, pts[1:]):
        ts = (Fraction(1, 7), Fraction(1, 3), Fraction(1, 2), Fraction(2, 3), Fraction(5, 6))
        vals = [(p + (q - p) * t, wf.payout_vector(p + (q - p) * t)) for t in ts]
        (x0, f0), (x1, f1) = vals[0], vals[1]
        for x, fx in vals[2:]:
            expect = [a + (b - a) * (x - x0) / (x1 - x0) for a, b in zip(f0, f1)]
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


def reasons(wf, x, sa, sb, jumps=False):
    """Plain-English reasons for one breakpoint, from the signature change."""
    ct = wf.ct
    if len(sa) != 1 or len(sb) != 1:
        return [{"code": "equilibrium_set_changes", "text": "The set of stable conversion and exercise decisions changes here."}]
    (bits_a, (tiers_a, capped_a, band_a, safe_paid_a)), = sa
    (bits_b, (tiers_b, capped_b, band_b, safe_paid_b)), = sb
    out = []
    outcome = wf.evaluate(x)[0]
    price = outcome["common_price"]
    da = dict(zip(wf.players, bits_a))
    db = dict(zip(wf.players, bits_b))
    converted_b = {s: db[p] for p in wf.converters for s in wf.members[p]}
    # Series sizes and claims after the change, counting exercised warrants.
    units_b = wf.unit_shares(bits_b)

    def pref_b(sid):
        return wf.pref_amount(sid, units_b)

    def cap_b(sid):
        sec = ct.securities[sid]
        return units_b[sid] * sec["original_issue_price"] * sec["cap_multiple"]

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

    for wid in wf.warrants:
        if da[wid] != db[wid]:
            sec = ct.securities[wid]
            strike, n, u = sec["strike"], wf.shares[wid], sec["underlying"]
            if u == "common":
                what, joins = "common", "share in the residual as common"
            else:
                what = _name(ct, u)
                joins = f"the new shares join {what}, with its preference and conversion rights"
            if db[wid]:
                text = (
                    f"Each {what} share is now worth {usd_price(strike, 2)}, the strike on the warrant for {n:,} {what} shares. "
                    f"Above this exit value the warrant is in the money and exercised: its holder pays the strike, "
                    f"which is added to the proceeds, and {joins}."
                )
            else:
                text = f"{what} falls to the {usd_price(strike, 2)} strike; the warrant for {n:,} {what} shares stops being exercised."
            out.append({"code": "warrant_in_the_money", "security": wid, "strike": exact(strike), "text": text})

    for pid in wf.converters:
        if da[pid] != db[pid]:
            members = wf.members[pid]
            n_conv = sum(units_b[s] * wf.ratio[s] for s in members)
            as_conv = n_conv * price
            if len(members) == 1:
                sec = ct.securities[pid]
                if db[pid]:
                    if sec["participation"] == "non_participating":
                        keep = f"its {exact(sec['preference_multiple'])}x preference of {usd(pref_b(pid))}"
                        if wf.dividend[pid]:
                            keep = (
                                f"its {exact(sec['preference_multiple'])}x preference plus accrued dividends, "
                                f"{usd(pref_b(pid))} (dividends are forfeited on conversion)"
                            )
                    else:
                        keep = f"its capped payout of {usd(cap_b(pid))} ({exact(sec['cap_multiple'])}x its original issue price)"
                    text = (
                        f"{sec['name']} converts to common. At this exit value its as-converted share "
                        f"({count(n_conv)} common shares at {usd_price(price)} each = {usd(as_conv)}) equals {keep}. "
                        f"Below it, staying preferred pays more; above it, converting pays more."
                    )
                else:
                    text = f"{sec['name']} stops converting: staying preferred pays more above this exit value."
            else:
                names = _join(_name(ct, s) for s in members)
                g = wf.vote[pid]
                rule = "more than" if g["rule"] == "more_than" else "at least"
                weights = wf.voters[pid]
                total_w = sum(weights.values(), Fraction(0))
                stay_bits = bits_a if db[pid] else bits_b
                conv_bits = bits_b if db[pid] else bits_a
                e = x + FIT_STEP if db[pid] else x - FIT_STEP
                t_conv, t_stay = wf.run(e, conv_bits)[0], wf.run(e, stay_bits)[0]
                yes = [
                    h for h in weights
                    if wf.holder_group_payout(t_conv, pid, h) > wf.holder_group_payout(t_stay, pid, h)
                ]
                yes_share = sum((weights[h] for h in yes), Fraction(0)) / total_w
                voters = _join(ct.holders[h] for h in yes) if yes else "no holder"
                vote = (
                    f"{names} must convert together, by a vote of {rule} {decimal(g['threshold'] * 100, 0)}% "
                    f"of their as-converted shares; each holder votes for conversion only if it does strictly better converting."
                )
                if db[pid]:
                    text = (
                        f"{vote} Above this exit value, {voters} (holding {decimal(yes_share * 100, 2)}% of the group's shares) "
                        f"{'does' if len(yes) == 1 else 'do'} better converting, which carries the vote, so the group converts."
                    )
                else:
                    text = f"{vote} Above this exit value the vote no longer carries, so the group stops converting."
            out.append({"code": "series_converts", "security": pid, "converts": db[pid], "text": text})

    for f in wf.safes:
        fid = f["id"]
        holder = ct.holders[f["holder"]]
        if safe_paid_a is False and safe_paid_b is True:
            text = (
                f"{holder}'s SAFE has received its full Cash-Out Amount, its {usd(f['purchase_amount'])} purchase amount, "
                f"which is paid ahead of common. Above this exit value, the next dollar goes to common."
            )
            out.append({"code": "safe_cash_out_paid", "security": fid, "text": text})
        if da[fid] != db[fid]:
            lp = wf.liquidity_price(f)
            n = wf.safe_conversion_shares(f)
            if db[fid]:
                text = (
                    f"{holder}'s SAFE switches from its Cash-Out Amount to its Conversion Amount. Its "
                    f"{count(n)} conversion shares ({usd(f['purchase_amount'])} ÷ the Liquidity Price of "
                    f"{usd_price(lp, 6)}) are worth {usd_price(price, 6)} each here, {usd(n * price)} in all, "
                    f"which equals its purchase amount. Below this exit value the Cash-Out Amount pays more; "
                    f"above it, the Conversion Amount does."
                )
            else:
                text = f"{holder}'s SAFE switches back to its Cash-Out Amount: above this exit value it pays more."
            out.append({"code": "safe_switches", "security": fid, "conversion_amount": db[fid], "text": text})

    for i, tier in enumerate(ct.seniority):
        if tiers_a[i] is False and tiers_b[i] is True:
            claim = sum(pref_b(s) for s in tier if not converted_b.get(s, False))
            unpaid_after = [
                t for j, t in enumerate(ct.seniority) if j > i and tiers_b[j] is not None
            ]
            nxt = (
                f"the next tier's preference ({_join(_name(ct, s) for s in unpaid_after[0] if not converted_b.get(s, False))})"
                if unpaid_after
                else "the residual, shared as common"
            )
            names = _join(_name(ct, s) for s in tier if not converted_b.get(s, False))
            text = (
                f"The preference tier {names} is fully paid ({usd(claim)}). "
                f"Above this exit value, the next dollar goes to {nxt}."
            )
            out.append({"code": "tier_fully_paid", "tier": i + 1, "securities": list(tier), "text": text})

    if band_a != band_b and ct.carve_out:
        tiers = ct.carve_out["tiers"]
        pool = wf.run(x, bits_b)[0]["carve_out"]
        ended = tiers[band_a]
        span = f"{usd(ended['from'])} to {usd(ended['to'])}" if ended["to"] is not None else f"above {usd(ended['from'])}"
        if band_b < len(tiers):
            nxt = tiers[band_b]
            more = (
                f"From here it takes {decimal(nxt['rate'] * 100, 0)}% of each further dollar"
                + (f", up to {usd(nxt['to'])}." if nxt["to"] is not None else ".")
            )
        else:
            more = f"That was its last tier: the carve-out stays at {usd(pool)} and takes nothing from further dollars."
        text = (
            f"The management carve-out's {decimal(ended['rate'] * 100, 0)}% tier (on exit value from {span}) ends here, "
            f"with the carve-out at {usd(pool)}. {more}"
        )
        out.append({"code": "carve_out_tier", "text": text})

    for sid in sorted(set(capped_b) - set(capped_a)):
        sec = ct.securities[sid]
        text = (
            f"{sec['name']} reaches its cap: preference plus participation totals "
            f"{exact(sec['cap_multiple'])}x its original issue price ({usd(cap_b(sid))}). "
            f"Above this exit value its payout stays flat until converting to common pays more."
        )
        out.append({"code": "cap_reached", "security": sid, "text": text})

    if jumps:
        outs = wf.evaluate(x)
        if len(outs) > 1:
            where = "Exactly here both the old and the new outcome are stable, so both are reported."
        elif outs[0]["decisions"] == bits_a:
            where = "At exactly this exit value the outcome from below still applies; the jump happens just above it."
        else:
            where = "At exactly this exit value the new outcome already applies."
        out.append(
            {
                "code": "payouts_jump",
                "text": (
                    "Some payouts jump at this exit value instead of bending, because the decision changes all at once. "
                    + where
                ),
            }
        )
    if not out:
        out.append({"code": "other", "text": "Payoff slopes change here."})
    return out
