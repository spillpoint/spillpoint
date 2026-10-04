"""Builds cap tables from a company's events: issuances, SAFEs, pool, grants, priced rounds.

This is the reference for M4. It solves each priced round's circularity
exactly: under each combination of branch choices (cap vs. discount for each
SAFE, anti-dilution triggered or not for each series), the share count is an
affine function of the post-money fully diluted shares, so it is solved
directly, and only the consistent branch combination is kept.
"""

import itertools
from fractions import Fraction

from .model import CapTable, security_from_json, safe_from_json
from .num import parse, floor, exact, decimal


def build(inputs):
    """Run every event. Returns a list of (event, cap table after it, round details)."""
    ct = CapTable()
    for h in inputs["holders"]:
        ct.add_holder(h["id"], h["name"])
    out = []
    for ev in inputs["events"]:
        handler = HANDLERS[ev["type"]]
        details = handler(ct, ev) or {}
        ct.validate()
        out.append((ev, ct.copy(), details))
    return out


def _ensure_security(ct, sec_json):
    if sec_json["id"] not in ct.securities:
        ct.add_security(security_from_json(sec_json))
    return sec_json["id"]


def ev_issue(ct, ev):
    sid = _ensure_security(ct, ev["security"])
    for i in ev["issues"]:
        ct.issue(i["holder"], sid, parse(i["shares"]))


def ev_issue_percent(ct, ev):
    """Issue enough shares that the holder owns `percent` of issued stock immediately after.

    x / (N + x) = p  =>  x = p·N / (1 − p), rounded down at issuance.
    N is all issued stock as converted. Options, the pool, and SAFEs are not
    counted (none existed when Millrace used this).
    """
    sid = _ensure_security(ct, ev["security"])
    p = parse(ev["percent"]) / 100
    n = sum(ct.as_converted(s) for s in ct.securities if ct.kind(s) != "option")
    x = floor(p * n / (1 - p))
    ct.issue(ev["holder"], sid, x)
    return {"shares_issued": x, "basis_shares": exact(n)}


def ev_safes(ct, ev):
    for f in ev["safes"]:
        ct.safes.append(safe_from_json(f))


def ev_create_pool(ct, ev):
    """Create the option pool equal to `percent` of (issued stock + issued options + pool) after creation.

    P / (N + P) = p  =>  P = p·N / (1 − p), rounded down. SAFEs are excluded,
    as the Millrace case states.
    """
    p = parse(ev["percent"]) / 100
    n = ct.outstanding_as_converted()
    size = floor(p * n / (1 - p))
    ct.unissued_pool += size
    return {"pool_created": size, "basis_shares": exact(n)}


def option_security_id(strike):
    return f"options_{exact(strike)}"


def ev_grant_options(ct, ev):
    for g in ev["grants"]:
        strike = parse(g["strike"])
        sid = option_security_id(strike)
        if sid not in ct.securities:
            ct.add_security({"id": sid, "name": f"Options (${exact(strike)} strike)", "kind": "option", "strike": strike})
        n = int(parse(g["shares"]))
        if n > ct.unissued_pool:
            raise ValueError(f"grant of {n} exceeds unissued pool {ct.unissued_pool}")
        ct.unissued_pool -= n
        ct.issue(g["holder"], sid, n)


def _anti_dilution_a(ct, sid, rule, include_pool_in_a):
    """A in the NVCA weighted-average formula, counted just before the new issue.

    Broad-based (R7): outstanding common, outstanding options as exercised,
    and outstanding preferred as converted; the unissued pool only under the
    toggle. Narrow-based (R15): outstanding preferred only, as converted.
    A series that names its definition (anti_dilution_a) must name the one
    the round uses.
    """
    named = ct.securities[sid].get("anti_dilution_a")
    if rule == "broad_based":
        if named is not None and (named == "outstanding_common_options_preferred_and_unissued_pool") != include_pool_in_a:
            raise ValueError(f"{sid}: anti_dilution_a {named} disagrees with the round's unissued-pool toggle")
        return ct.outstanding_as_converted() + (ct.unissued_pool if include_pool_in_a else 0)
    if rule == "narrow_based":
        return sum(ct.as_converted(s) for s in ct.preferred_ids())
    return None


def _anti_dilution_factor(ct, sid, rule, new_shares, consideration, price, include_pool_in_a):
    """CP1 ÷ CP2 for one series, as a function of the round's terms.

    NVCA weighted average: CP2 = CP1 × (A + B) ÷ (A + C)
      A = common outstanding before the issue, as converted: issued stock and
          outstanding options (as exercised). Excludes the unissued pool
          unless the toggle says otherwise. Narrow-based A counts only the
          outstanding preferred, as converted.
      B = consideration received ÷ CP1
      C = new shares issued
    Full ratchet: CP2 = the new issue price.
    """
    cp1 = ct.securities[sid]["conversion_price"]
    if rule == "full_ratchet":
        return cp1 / price
    if rule not in ("broad_based", "narrow_based"):
        raise ValueError(rule)
    a = _anti_dilution_a(ct, sid, rule, include_pool_in_a)
    b = consideration / cp1
    return (a + new_shares) / (a + b)


def ev_priced_round(ct, ev):
    """Priced equity round.

    Price = post-money valuation ÷ post-money fully diluted shares, where the
    post-money FD shares count existing stock and issued options, the unissued
    pool at its target, converting SAFEs, the new shares, and (by default) the
    anti-dilution adjustment shares the round triggers.

    Pool top-up in the pre-money: the unissued pool is raised to its target
    share of the post-money FD shares. If the pool before the round already
    meets or exceeds that target, there is no top-up and the round is priced
    on the actual pool, so the investors get exactly money ÷ post-money.

    Post-money SAFE (YC): conversion price is the lower of the Safe Price
    (Post-Money Valuation Cap ÷ Company Capitalization) and the Discount Price.
    Company Capitalization counts all stock, issued options, the pre-existing
    unissued pool, and the converting SAFEs themselves; it excludes the pool
    increase made in this financing and the new money.
    """
    series = ev["series"]
    pre = parse(ev["pre_money"])
    invest = [(i["holder"], parse(i["amount"]), bool(i.get("pro_rata", False))) for i in ev["investments"]]
    money_in = sum(a for _, a, _ in invest)
    post_val = pre + money_in
    target = parse(ev.get("pool_target_unissued_percent_post", "0")) / 100
    ad_in_post = ev.get("anti_dilution_shares_in_post", True)
    include_pool_in_a = ev.get("anti_dilution_include_unissued_pool_in_a", False)

    o = ct.outstanding_as_converted()
    u0 = ct.unissued_pool

    # Post-money SAFE Company Capitalization. Each capped SAFE owns
    # purchase ÷ cap of it, and the SAFEs are counted inside it, so
    # CC = (O + U0) ÷ (1 − Σ purchase/cap).
    safes = list(ct.safes) if ev.get("convert_safes", True) else []
    capped = [f for f in safes if f["post_money_cap"] is not None]
    own = sum((f["purchase_amount"] / f["post_money_cap"] for f in capped), Fraction(0))
    company_cap = (o + u0) / (1 - own) if capped else None

    def safe_price(f):
        return f["post_money_cap"] / company_cap if f["post_money_cap"] is not None else None

    ad_series = [
        sid for sid in ct.preferred_ids() if ct.securities[sid]["anti_dilution"] != "none"
    ]

    solutions = []
    for safe_branch in itertools.product(("cap", "discount"), repeat=len(safes)):
        if any(b == "cap" and f["post_money_cap"] is None for b, f in zip(safe_branch, safes)):
            continue
        for ad_branch, top_up in itertools.product(itertools.product((False, True), repeat=len(ad_series)), (True, False)):

            def share_count(x):
                """Post-money FD shares implied by a guess x for post-money FD shares."""
                price = post_val / x
                new = money_in / price
                total = o + (target * x if top_up else u0) + new
                for b, f in zip(safe_branch, safes):
                    if b == "cap":
                        total += f["purchase_amount"] / safe_price(f)
                    else:
                        total += f["purchase_amount"] / (price * (1 - f["discount"]))
                if ad_in_post:
                    for trig, sid in zip(ad_branch, ad_series):
                        if trig:
                            factor = _anti_dilution_factor(
                                ct, sid, ct.securities[sid]["anti_dilution"], new, money_in, price, include_pool_in_a
                            )
                            total += ct.shares_of(sid) * (ct.conversion_ratio(sid) * factor - ct.conversion_ratio(sid))
                return total

            # share_count is affine in x under fixed branches, so solve x = share_count(x) directly.
            h0 = share_count(Fraction(1)) - 1
            h1 = share_count(Fraction(2)) - 2
            slope = h1 - h0
            if slope == 0:
                continue
            x = 1 - h0 / slope
            if x <= 0:
                continue
            assert share_count(x) == x
            price = post_val / x
            ok = True
            for b, f in zip(safe_branch, safes):
                disc_price = price * (1 - f["discount"])
                sp = safe_price(f)
                if b == "cap" and not (sp <= disc_price):
                    ok = False
                if b == "discount" and sp is not None and not (disc_price < sp):
                    ok = False
            for trig, sid in zip(ad_branch, ad_series):
                down = price < ct.securities[sid]["conversion_price"]
                if trig != down:
                    ok = False
            # A top-up happens only if the pool before the round is below
            # the target; if it meets or exceeds it, the pool stays as it is.
            if top_up != (target * x > u0):
                ok = False
            if ok:
                solutions.append((safe_branch, ad_branch, top_up, x, price))

    if len(solutions) != 1:
        raise ValueError(f"round {ev['id']}: expected one consistent solution, found {len(solutions)}")
    safe_branch, ad_branch, top_up, x, price = solutions[0]

    details = {
        "price_per_share": exact(price),
        "price_per_share_approx": decimal(price, 10),
        "post_money_valuation": exact(post_val),
        "post_money_fully_diluted_solved": exact(x),
        "post_money_fully_diluted_solved_approx": decimal(x, 4),
        "pre_round_fully_diluted": exact(ct.fully_diluted()),
    }

    # Pro-rata entitlement (NVCA): pre-round fully diluted percentage × round size.
    pre_fd = ct.fully_diluted()
    for holder, amount, pr in invest:
        if pr:
            held = sum(n * ct.conversion_ratio(s) for (h, s), n in ct.positions.items() if h == holder)
            details.setdefault("pro_rata", []).append(
                {
                    "holder": holder,
                    "pre_round_fd_percent": decimal(held / pre_fd * 100, 6),
                    "entitlement": decimal(held / pre_fd * money_in, 2),
                    "amount_invested": exact(amount),
                }
            )

    # Anti-dilution: the charter computes CP2 from the shares actually issued
    # and the consideration actually received for them.
    new_shares = {h: floor(a / price) for h, a, _ in invest}
    c_issued = sum(new_shares.values())
    consideration = c_issued * price
    ad_details = []
    for trig, sid in zip(ad_branch, ad_series):
        if trig:
            sec = ct.securities[sid]
            cp1 = sec["conversion_price"]
            factor = _anti_dilution_factor(ct, sid, sec["anti_dilution"], c_issued, consideration, price, include_pool_in_a)
            cp2 = cp1 / factor
            a_val = _anti_dilution_a(ct, sid, sec["anti_dilution"], include_pool_in_a)
            ad_details.append(
                {
                    "series": sid,
                    "rule": sec["anti_dilution"],
                    "cp1": exact(cp1),
                    "cp2": exact(cp2),
                    "cp2_approx": decimal(cp2, 10),
                    "A": None if a_val is None else exact(a_val),
                    "B": None if a_val is None else exact(consideration / cp1),
                    "C": c_issued,
                    "new_conversion_ratio": exact(sec["original_issue_price"] / cp2),
                }
            )
            sec["conversion_price"] = cp2
    if ad_details:
        details["anti_dilution"] = ad_details

    # SAFE conversions into shadow series, one per distinct conversion price.
    shadow_by_price = {}
    conv = []
    for b, f in zip(safe_branch, safes):
        cp = safe_price(f) if b == "cap" else price * (1 - f["discount"])
        if cp not in shadow_by_price:
            idx = len(shadow_by_price)
            sid = f"{series['id']}_shadow" + ("" if idx == 0 else f"_{idx + 1}")
            name = f"{series['name']} (SAFE shadow)" + ("" if idx == 0 else f" {idx + 1}")
            shadow = security_from_json(
                {
                    **series,
                    "id": sid,
                    "name": name,
                    "original_issue_price": exact(cp),
                    "conversion_price": exact(cp),
                }
            )
            ct.add_security(shadow)
            shadow_by_price[cp] = sid
        n = floor(f["purchase_amount"] / cp)
        ct.issue(f["holder"], shadow_by_price[cp], n)
        conv.append(
            {
                "safe": f["id"],
                "holder": f["holder"],
                "method": b,
                "conversion_price": exact(cp),
                "conversion_price_approx": decimal(cp, 10),
                "shares": n,
                "series": shadow_by_price[cp],
            }
        )
    if safes:
        details["company_capitalization"] = exact(company_cap) if company_cap is not None else None
        details["company_capitalization_approx"] = decimal(company_cap, 4) if company_cap is not None else None
        details["safe_conversions"] = conv
        ct.safes = [f for f in ct.safes if f not in safes]

    # New series at the round price.
    ct.add_security(
        security_from_json({**series, "original_issue_price": exact(price), "conversion_price": exact(price)})
    )
    for holder, n in new_shares.items():
        ct.issue(holder, series["id"], n)
    details["new_shares"] = [{"holder": h, "shares": n} for h, n in new_shares.items()]

    # Pool top-up to its target share of the post-money FD, in the pre-money,
    # rounded down (R3). No top-up if the pool already meets the target (R16).
    new_pool = floor(target * x) if top_up else u0
    details["pool_top_up"] = new_pool - u0
    ct.unissued_pool = new_pool

    ct.seniority = [list(t) for t in ev["seniority"]]
    details["post_money_fully_diluted_actual"] = exact(ct.fully_diluted())
    return details


HANDLERS = {
    "issue": ev_issue,
    "issue_percent": ev_issue_percent,
    "safes": ev_safes,
    "create_pool": ev_create_pool,
    "grant_options": ev_grant_options,
    "priced_round": ev_priced_round,
}
