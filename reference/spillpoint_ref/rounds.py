"""Builds cap tables from a company's events: issuances, SAFEs, pool, grants, priced rounds.

This is the reference for M4. It solves each priced round's circularity
exactly: under each combination of branch choices (cap vs. discount for each
SAFE, anti-dilution triggered or not for each series), the share count is an
affine function of the post-money fully diluted shares, so it is solved
directly, and only the consistent branch combination is kept.
"""

import datetime
import itertools
from fractions import Fraction

from .model import CapTable, note_from_json, note_interest, security_from_json, safe_from_json
from .num import parse, floor, exact, decimal, usd


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
    N is all issued stock as converted. Options, warrants (counted like
    options, R29), the pool, and SAFEs are not counted (none existed when
    Millrace used this).
    """
    sid = _ensure_security(ct, ev["security"])
    p = parse(ev["percent"]) / 100
    n = sum(ct.as_converted(s) for s in ct.securities if ct.kind(s) not in ("option", "warrant"))
    x = floor(p * n / (1 - p))
    ct.issue(ev["holder"], sid, x)
    return {"shares_issued": x, "basis_shares": exact(n)}


def ev_safes(ct, ev):
    for f in ev["safes"]:
        ct.safes.append(safe_from_json(f))


def ev_notes(ct, ev):
    """Convertible notes, outstanding until a round converts them (convert_notes) or the company is sold (C9)."""
    for n in ev["notes"]:
        ct.notes.append(note_from_json(n))


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


def warrant_security_id(underlying, strike):
    return f"warrants_{underlying}_{exact(strike)}"


def ev_issue_warrants(ct, ev):
    """Warrants issued (R29): counted like options everywhere.

    NVCA's "Option" includes warrants, and so does the YC SAFE's "Options".
    So every count that includes issued options includes them: a round's
    post-money fully diluted shares and its pool top-up target, a SAFE's
    Company Capitalization, a note's with_pool and without_pool bases, the
    pro-rata base and broad-based A. A warrant for preferred counts as
    converted. They aren't drawn from the option pool. Issuing them never
    triggers anti-dilution: NVCA's Exempted Securities cover warrants issued
    to lenders and equipment lessors.
    """
    for w in ev["warrants"]:
        strike = parse(w["strike"])
        underlying = w["underlying"]
        if underlying != "common" and (underlying not in ct.securities or ct.kind(underlying) != "preferred"):
            raise ValueError(f"warrants for {underlying}: not common or an issued preferred series")
        sid = warrant_security_id(underlying, strike)
        if sid not in ct.securities:
            what = "Common Stock" if underlying == "common" else ct.securities[underlying]["name"]
            ct.add_security(
                {"id": sid, "name": f"Warrants for {what} (${exact(strike)} strike)", "kind": "warrant", "strike": strike, "underlying": underlying}
            )
        ct.issue(w["holder"], sid, int(parse(w["shares"])))


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


def _pay_to_play(ct, ev, invest):
    """Pay-to-play (SPEC): who in the listed series buys their pro-rata, and who converts.

    The round offers one amount to the holders of the listed series. A
    holder's pro-rata (R17, R22) is its share of those series' shares, as
    converted and combined, × that amount: one total requirement per holder.
    The NVCA term sheet makes it a share of the securities the board sets
    aside for existing investors. A holder whose total investment in the
    round is at least its requirement keeps its preferred. A holder that buys
    less (R20) has its preferred of the listed series converted to common:
    all of it by default, or, under the proportional toggle, the fraction it
    didn't buy, the same fraction of each series, keeping floor(shares ×
    fraction bought) as preferred. Conversion is at each series' input ratio
    (R18, R22), common shares per preferred share, rounded down (R3). Returns
    None if the round has no pay-to-play.
    """
    terms = ev.get("pay_to_play")
    if not terms:
        return None
    series = list(terms["series"])
    if not series:
        raise ValueError(f"round {ev['id']}: pay-to-play names no series")
    for sid in series:
        if sid not in ct.securities or ct.kind(sid) != "preferred":
            raise ValueError(f"round {ev['id']}: pay-to-play series {sid} is not an existing preferred series")
    commons = [c for c in ct.securities if ct.kind(c) == "common"]
    if len(commons) != 1:
        raise ValueError(f"round {ev['id']}: pay-to-play needs exactly one common stock class to convert into")
    # One ratio for one series (cases 17a, 17b), or one per series (R22).
    given = terms["conversion_ratio"]
    if isinstance(given, dict):
        if sorted(given) != sorted(series):
            raise ValueError(f"round {ev['id']}: pay-to-play needs a conversion ratio for each listed series, and only those")
        ratios = {sid: parse(given[sid]) for sid in series}
    else:
        if len(series) != 1:
            raise ValueError(f"round {ev['id']}: pay-to-play on several series needs a conversion ratio for each series")
        ratios = {series[0]: parse(given)}
    if any(r <= 0 for r in ratios.values()):
        raise ValueError(f"round {ev['id']}: pay-to-play conversion ratios must be positive")
    partial = terms.get("partial_participation", "convert_all")
    if partial not in ("convert_all", "convert_proportionally"):
        raise ValueError(f"round {ev['id']}: partial_participation must be convert_all or convert_proportionally")
    offered = parse(terms["offered_amount"])
    invested = {}
    for h, a, _ in invest:
        invested[h] = invested.get(h, Fraction(0)) + a

    # Holders in the order they first appear in the listed series.
    holders = []
    for sid in series:
        for h, _ in ct.holders_of(sid):
            if h not in holders:
                holders.append(h)
    held = {h: {sid: ct.positions.get((h, sid), 0) for sid in series} for h in holders}
    as_conv = {h: sum(n * ct.conversion_ratio(sid) for sid, n in held[h].items()) for h in holders}
    total = sum(as_conv.values())
    rows = []
    for h in holders:
        required = offered * as_conv[h] / total
        paid = invested.get(h, Fraction(0))
        bought = min(paid / required, Fraction(1)) if required > 0 else Fraction(1)
        participates = bought == 1
        by_series = []
        for sid in series:
            n = held[h][sid]
            if n == 0:
                continue
            if participates:
                kept = n
            elif partial == "convert_proportionally":
                kept = floor(n * bought)
            else:
                kept = 0
            converted = n - kept
            by_series.append(
                {
                    "series": sid,
                    "shares": n,
                    "kept": kept,
                    "converted": converted,
                    "common_received": floor(converted * ratios[sid]),
                }
            )
        rows.append(
            {
                "holder": h,
                "as_converted_shares": exact(as_conv[h]),
                "share_percent": decimal(as_conv[h] / total * 100, 6),
                "required": exact(required),
                "invested": exact(paid),
                "fraction_bought": exact(bought),
                "participates": participates,
                "series": by_series,
            }
        )
    return {
        "series": series,
        "common": commons[0],
        "offered_amount": exact(offered),
        "conversion_ratios": {sid: exact(r) for sid, r in ratios.items()},
        "partial_participation": partial,
        "priced_after_conversion": bool(terms.get("priced_after_conversion", True)),
        "holders": rows,
    }


def _apply_pay_to_play(ct, p2p):
    """Convert what each holder didn't keep to common. Those shares lose the preference and every other preferred right."""
    for r in p2p["holders"]:
        for b in r["series"]:
            if b["converted"] == 0:
                continue
            key = (r["holder"], b["series"])
            if b["kept"] == 0:
                del ct.positions[key]
            else:
                ct.positions[key] = b["kept"]
            ct.issue(r["holder"], p2p["common"], b["common_received"])


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

    Pay-to-play: holders of the listed series who don't buy their pro-rata
    have their preferred converted to common. By default this happens just
    before the round closes, so the round is priced on the cap table after the
    conversion (R19); the toggle prices it on the count before. Either way the
    conversion comes first for anti-dilution (R21): holders who convert get no
    adjustment, the preferred that remains gets it, and A counts the cap table
    after the conversion.
    """
    series = ev["series"]
    # R30: cumulative dividends on the round's series accrue from the round's date. The series its
    # SAFEs and notes convert into copy the round's series, so they carry the same terms from the same
    # date, each on its own issue price (its conversion price), as their preference already is.
    if series.get("cumulative_dividend"):
        if "accrual_start" in series["cumulative_dividend"]:
            raise ValueError(f"round {ev['id']}: a round's dividends accrue from its date; give no accrual_start")
        if not ev.get("date"):
            raise ValueError(f"round {ev['id']}: its series accrues cumulative dividends from the round's date, so the round needs a date")
        series = {**series, "cumulative_dividend": {**series["cumulative_dividend"], "accrual_start": ev["date"]}}
    pre = parse(ev["pre_money"])
    invest = [(i["holder"], parse(i["amount"]), bool(i.get("pro_rata", False))) for i in ev["investments"]]
    money_in = sum(a for _, a, _ in invest)
    post_val = pre + money_in
    target = parse(ev.get("pool_target_unissued_percent_post", "0")) / 100
    ad_in_post = ev.get("anti_dilution_shares_in_post", True)
    include_pool_in_a = ev.get("anti_dilution_include_unissued_pool_in_a", False)

    p2p = _pay_to_play(ct, ev, invest)
    # The cap table after the pay-to-play conversion: anti-dilution's A and the
    # preferred that gets the adjustment come from it under either R19 setting (R21).
    after = ct.copy()
    if p2p:
        _apply_pay_to_play(after, p2p)
    if p2p and p2p["priced_after_conversion"]:
        _apply_pay_to_play(ct, p2p)

    o = ct.outstanding_as_converted()
    u0 = ct.unissued_pool

    # What converts in this round: SAFEs (convert_safes, by default) and
    # convertible notes (convert_notes). Each converts at the lower of its cap
    # price and its discount price (round price × (1 − discount)).
    safes = list(ct.safes) if ev.get("convert_safes", True) else []
    notes = list(ct.notes) if ev.get("convert_notes", False) else []
    post_safes = [f for f in safes if f["post_money_cap"] is not None]
    pre_instruments = [f for f in safes if f["pre_money_cap"] is not None] + notes
    if post_safes and pre_instruments:
        # A post-money SAFE's Company Capitalization counts every other
        # converting security, which itself depends on the round: owed before
        # release (ASSUMPTIONS.md, "Owed before release").
        raise ValueError(
            f"round {ev['id']}: a post-money SAFE converting alongside notes or pre-money SAFEs is not supported by the reference yet"
        )

    # Post-money SAFE Company Capitalization (R4). Each capped SAFE owns
    # purchase ÷ cap of it, and the SAFEs are counted inside it, so
    # CC = (O + U0) ÷ (1 − Σ purchase/cap).
    own = sum((f["purchase_amount"] / f["post_money_cap"] for f in post_safes), Fraction(0))
    company_cap = (o + u0) / (1 - own) if post_safes else None

    # A note's pre-money cap divides by the share count just before the round,
    # as at exit (X10's conversion_base): the pool as it stood before this
    # round's top-up, and no SAFE or note converting in it.
    def note_base(n):
        if n["conversion_base"] == "with_pool":
            return o + u0
        if n["conversion_base"] == "without_pool":
            return o
        return Fraction(sum(ct.shares_of(sid) for sid in ct.securities if ct.kind(sid) == "common"))

    # Principal plus simple interest, Actual/365, to the round's date (X3, X11).
    round_date = datetime.date.fromisoformat(ev["date"]) if notes else None
    note_amount = {n["id"]: n["principal"] + note_interest(n, round_date) for n in notes}

    # Each converting instrument: (kind, terms, amount converting).
    converting = [("safe", f, f["purchase_amount"]) for f in safes] + [("note", n, note_amount[n["id"]]) for n in notes]

    def pool_at(x, top_up):
        return target * x if top_up else u0

    def cap_price(kind, f, x, top_up):
        """The price at the instrument's cap, or None if it has no cap."""
        if kind == "note":
            return None if f["valuation_cap"] is None else f["valuation_cap"] / note_base(f)
        if f["post_money_cap"] is not None:
            return f["post_money_cap"] / company_cap
        if f["pre_money_cap"] is not None:
            # YC pre-money SAFE: Company Capitalization counts the stock and
            # options outstanding and the pool, including any increase made in
            # this financing, and no SAFE or note.
            return f["pre_money_cap"] / (o + pool_at(x, top_up))
        return None

    def safe_price(f):
        return f["post_money_cap"] / company_cap if f["post_money_cap"] is not None else None

    ad_series = [
        sid for sid in after.preferred_ids() if after.securities[sid]["anti_dilution"] != "none"
    ]

    solutions = []
    for safe_branch in itertools.product(("cap", "discount"), repeat=len(converting)):
        if any(b == "cap" and cap_price(k, f, Fraction(1), True) is None for b, (k, f, _) in zip(safe_branch, converting)):
            continue
        for ad_branch, top_up in itertools.product(itertools.product((False, True), repeat=len(ad_series)), (True, False)):

            def share_count(x):
                """Post-money FD shares implied by a guess x for post-money FD shares."""
                price = post_val / x
                new = money_in / price
                total = o + pool_at(x, top_up) + new
                for b, (k, f, amount) in zip(safe_branch, converting):
                    if b == "cap":
                        total += amount / cap_price(k, f, x, top_up)
                    else:
                        total += amount / (price * (1 - f["discount"]))
                if ad_in_post:
                    for trig, sid in zip(ad_branch, ad_series):
                        if trig:
                            factor = _anti_dilution_factor(
                                after, sid, after.securities[sid]["anti_dilution"], new, money_in, price, include_pool_in_a
                            )
                            total += after.shares_of(sid) * (after.conversion_ratio(sid) * factor - after.conversion_ratio(sid))
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
            for b, (k, f, _) in zip(safe_branch, converting):
                disc_price = price * (1 - f["discount"])
                sp = cap_price(k, f, x, top_up)
                if b == "cap" and not (sp <= disc_price):
                    ok = False
                if b == "discount" and sp is not None and not (disc_price < sp):
                    ok = False
            for trig, sid in zip(ad_branch, ad_series):
                down = price < after.securities[sid]["conversion_price"]
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
    if p2p:
        details["pay_to_play"] = {k: v for k, v in p2p.items() if k != "common"}

    # Pro-rata entitlement (NVCA Investors' Rights Agreement, R6): the
    # investor's pre-round fully diluted percentage × the round size. The
    # fully diluted base counts outstanding stock, outstanding options and
    # outstanding convertible securities, all as converted, and leaves out the
    # unissued pool. A SAFE converting in this round counts at the whole shares
    # it receives here; a SAFE that stays outstanding through a round with
    # pro-rata has no settled count, so that is refused. The entitlement is the
    # most the investor may buy; the amount actually bought is an input. It is
    # filled in once the SAFEs' shares are known, below.
    # A holder's pro-rata lines are added up; the total may not exceed the
    # entitlement (M4d): buying more is common, as an ordinary investment
    # alongside.
    pro_rata_investors = []
    for h, a, pr in invest:
        if pr:
            if h not in [x for x, _ in pro_rata_investors]:
                pro_rata_investors.append((h, Fraction(0)))
            pro_rata_investors = [(x, t + a if x == h else t) for x, t in pro_rata_investors]
    if pro_rata_investors:
        if (ct.safes and not ev.get("convert_safes", True)) or (ct.notes and not ev.get("convert_notes", False)):
            raise ValueError(f"round {ev['id']}: a pro-rata round with a SAFE or note that stays outstanding is refused (R6)")
        details["pro_rata"] = []
        pre_round_held = {h: sum(n * ct.conversion_ratio(s) for (hh, s), n in ct.positions.items() if hh == h) for h, _ in pro_rata_investors}
        # R6's toggle counts the unissued pool, as it stood before the round.
        pre_round_base = ct.outstanding_as_converted() + (u0 if ev.get("pro_rata_base_includes_unissued_pool", False) else 0)

    # Anti-dilution: the charter computes CP2 from the shares actually issued
    # and the consideration actually received for them.
    # One issuance per holder: its lines in the round are added up, then rounded down once (R3).
    invested_by_holder = {}
    for h, a, _ in invest:
        invested_by_holder[h] = invested_by_holder.get(h, Fraction(0)) + a
    new_shares = {h: floor(a / price) for h, a in invested_by_holder.items()}
    c_issued = sum(new_shares.values())
    consideration = c_issued * price
    ad_details = []
    for trig, sid in zip(ad_branch, ad_series):
        if trig:
            sec = ct.securities[sid]
            cp1 = sec["conversion_price"]
            factor = _anti_dilution_factor(after, sid, sec["anti_dilution"], c_issued, consideration, price, include_pool_in_a)
            cp2 = cp1 / factor
            unrounded = {}
            # R9's toggle: the adjusted conversion price to the nearest step, half up.
            # The NVCA model charter computes it to the nearest one-hundredth of a cent.
            rounding = ev.get("anti_dilution_cp2_rounding", "exact")
            if rounding != "exact":
                if rounding not in ("0.0001", "0.01"):
                    raise ValueError(f"round {ev['id']}: anti_dilution_cp2_rounding must be exact, 0.0001 or 0.01")
                step = parse(rounding)
                unrounded = {"cp2_unrounded": exact(cp2)}
                cp2 = floor(cp2 / step + Fraction(1, 2)) * step
            a_val = _anti_dilution_a(after, sid, sec["anti_dilution"], include_pool_in_a)
            ad_details.append(
                {
                    "series": sid,
                    "rule": sec["anti_dilution"],
                    "cp1": exact(cp1),
                    **unrounded,
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
    for b, (k, f, _) in zip(safe_branch[: len(safes)], converting[: len(safes)]):
        cp = cap_price(k, f, x, top_up) if b == "cap" else price * (1 - f["discount"])
        if cp not in shadow_by_price:
            idx = len(shadow_by_price)
            sid = f"{series['id']}_shadow" + ("" if idx == 0 else f"_{idx + 1}")
            name = f"{series['name']} (from SAFEs)" + ("" if idx == 0 else f" {idx + 1}")
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
                **(
                    {"cap_type": "pre_money", "company_capitalization": exact(o + pool_at(x, top_up))}
                    if f["pre_money_cap"] is not None
                    else {}
                ),
                "conversion_price": exact(cp),
                "conversion_price_approx": decimal(cp, 10),
                "shares": n,
                "series": shadow_by_price[cp],
            }
        )

    # Note conversions into a series of their own, "(from notes)", one per
    # distinct conversion price, with the new series' rights, priced at the
    # note's conversion price, so its preference is what converted.
    notes_by_price = {}
    note_conv = []
    for b, (k, f, amount) in zip(safe_branch[len(safes):], converting[len(safes):]):
        cp = cap_price(k, f, x, top_up) if b == "cap" else price * (1 - f["discount"])
        if cp not in notes_by_price:
            idx = len(notes_by_price)
            sid = f"{series['id']}_notes" + ("" if idx == 0 else f"_{idx + 1}")
            name = f"{series['name']} (from notes)" + ("" if idx == 0 else f" {idx + 1}")
            ct.add_security(
                security_from_json({**series, "id": sid, "name": name, "original_issue_price": exact(cp), "conversion_price": exact(cp)})
            )
            notes_by_price[cp] = sid
        n = floor(amount / cp)
        ct.issue(f["holder"], notes_by_price[cp], n)
        note_conv.append(
            {
                "note": f["id"],
                "holder": f["holder"],
                "principal": exact(f["principal"]),
                "interest": exact(amount - f["principal"]),
                "amount_converting": exact(amount),
                "conversion_base": f["conversion_base"],
                "base_shares": exact(note_base(f)),
                "method": b,
                "conversion_price": exact(cp),
                "conversion_price_approx": decimal(cp, 10),
                "shares": n,
                "series": notes_by_price[cp],
            }
        )

    if pro_rata_investors:
        converted_shares = sum(c["shares"] for c in conv) + sum(c["shares"] for c in note_conv)
        base = pre_round_base + converted_shares
        for holder, amount in pro_rata_investors:
            held = pre_round_held[holder] + sum(c["shares"] for c in conv + note_conv if c["holder"] == holder)
            entitlement = held / base * money_in
            if amount > entitlement:
                allowed = Fraction(floor(entitlement * 100), 100)
                raise ValueError(
                    f"round {ev['id']}: {ct.holders[holder]}'s pro-rata investment of {usd(amount)} is more than its pro-rata "
                    f"entitlement of {usd(allowed)} ({decimal(held / base * 100, 6)}% of the {usd(money_in)} round). "
                    f"Mark {usd(allowed)} as pro-rata and enter the other {usd(amount - allowed)} as an ordinary investment in the same round."
                )
            details["pro_rata"].append(
                {
                    "holder": holder,
                    "pre_round_fd_percent": decimal(held / base * 100, 6),
                    "entitlement": decimal(entitlement, 2),
                    "amount_invested": exact(amount),
                }
            )
    if safes:
        if company_cap is not None:
            details["company_capitalization"] = exact(company_cap)
            details["company_capitalization_approx"] = decimal(company_cap, 4)
        details["safe_conversions"] = conv
        ct.safes = [f for f in ct.safes if f not in safes]
    if notes:
        details["note_conversions"] = note_conv
        ct.notes = [n for n in ct.notes if n not in notes]

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

    if p2p and not p2p["priced_after_conversion"]:
        _apply_pay_to_play(ct, p2p)

    ct.seniority = [list(t) for t in ev["seniority"]]
    details["post_money_fully_diluted_actual"] = exact(ct.fully_diluted())
    return details


HANDLERS = {
    "issue": ev_issue,
    "issue_warrants": ev_issue_warrants,
    "issue_percent": ev_issue_percent,
    "safes": ev_safes,
    "notes": ev_notes,
    "create_pool": ev_create_pool,
    "grant_options": ev_grant_options,
    "priced_round": ev_priced_round,
}
