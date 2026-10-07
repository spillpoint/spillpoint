"""Cap table model shared by the round builder and the exit waterfall.

The JSON form of a cap table is the input format for exit cases, so the
engine (M2) and the reference read the same file.
"""

import copy
import datetime
from fractions import Fraction

from .num import parse, exact, decimal

PARTICIPATION = ("non_participating", "participating", "participating_capped")
ANTI_DILUTION = ("none", "broad_based", "narrow_based", "full_ratchet")
# What A counts in the NVCA weighted-average formula, named per method.
# Broad-based: R7, with the toggle that adds the unissued pool. Narrow-based:
# R15. Full ratchet and no anti-dilution have no A.
ANTI_DILUTION_A = {
    "broad_based": ("outstanding_common_options_preferred", "outstanding_common_options_preferred_and_unissued_pool"),
    "narrow_based": ("outstanding_preferred",),
    "full_ratchet": (None,),
    "none": (None,),
}


class CapTable:
    def __init__(self):
        self.holders = {}  # id -> name, in insertion order
        self.securities = {}  # id -> dict, in insertion order
        self.positions = {}  # (holder, security) -> int shares
        self.unissued_pool = 0
        self.safes = []  # unconverted SAFEs
        self.notes = []  # unconverted convertible notes
        self.seniority = []  # list of tiers, most senior first; each a list of preferred ids
        self.conversion_groups = []  # series that must convert together (SPEC toggle)
        self.carve_out = None  # management carve-out plan, if any

    def copy(self):
        return copy.deepcopy(self)

    # ---- building ----

    def add_holder(self, hid, name):
        if hid in self.holders and self.holders[hid] != name:
            raise ValueError(f"holder {hid} already has name {self.holders[hid]}")
        self.holders[hid] = name

    def add_security(self, sec):
        sid = sec["id"]
        if sid in self.securities:
            raise ValueError(f"security {sid} already exists")
        self.securities[sid] = sec

    def issue(self, holder, security, shares):
        if holder not in self.holders:
            raise ValueError(f"unknown holder {holder}")
        if security not in self.securities:
            raise ValueError(f"unknown security {security}")
        if shares < 0 or shares != int(shares):
            raise ValueError("shares must be a whole, non-negative number")
        key = (holder, security)
        self.positions[key] = self.positions.get(key, 0) + int(shares)

    # ---- queries ----

    def kind(self, sid):
        return self.securities[sid]["kind"]

    def shares_of(self, sid):
        return sum(n for (h, s), n in self.positions.items() if s == sid)

    def holders_of(self, sid):
        return [(h, n) for (h, s), n in self.positions.items() if s == sid and n > 0]

    def conversion_ratio(self, sid):
        """Common shares per preferred share: original issue price ÷ conversion price.

        A warrant for preferred converts like the series it is for.
        """
        sec = self.securities[sid]
        if sec["kind"] == "warrant" and sec["underlying"] != "common":
            return self.conversion_ratio(sec["underlying"])
        if sec["kind"] != "preferred":
            return Fraction(1)
        return sec["original_issue_price"] / sec["conversion_price"]

    def as_converted(self, sid):
        """Exact as-converted common shares for a security (options count as exercised)."""
        return self.shares_of(sid) * self.conversion_ratio(sid)

    def outstanding_as_converted(self):
        """All issued stock as converted plus all issued options. Excludes the unissued pool and SAFEs."""
        return sum(self.as_converted(sid) for sid in self.securities)

    def fully_diluted(self):
        """Outstanding as converted, plus issued options, plus the unissued pool."""
        return self.outstanding_as_converted() + self.unissued_pool

    def preferred_ids(self):
        return [sid for sid, s in self.securities.items() if s["kind"] == "preferred"]

    def option_ids(self):
        return [sid for sid, s in self.securities.items() if s["kind"] == "option"]

    def warrant_ids(self):
        return [sid for sid, s in self.securities.items() if s["kind"] == "warrant"]

    # ---- JSON ----

    def to_json(self):
        secs = []
        for sid, s in self.securities.items():
            out = {"id": sid, "name": s["name"], "kind": s["kind"]}
            if s["kind"] == "preferred":
                out.update(
                    {
                        "original_issue_price": exact(s["original_issue_price"]),
                        "conversion_price": exact(s["conversion_price"]),
                        "conversion_ratio": exact(self.conversion_ratio(sid)),
                        "preference_multiple": exact(s["preference_multiple"]),
                        "participation": s["participation"],
                        "cap_multiple": None if s.get("cap_multiple") is None else exact(s["cap_multiple"]),
                        "anti_dilution": s["anti_dilution"],
                        **({"anti_dilution_a": s["anti_dilution_a"]} if s.get("anti_dilution_a") else {}),
                        **(
                            {"cumulative_dividend": dividend_to_json(s["cumulative_dividend"])}
                            if s.get("cumulative_dividend")
                            else {}
                        ),
                        "approx": {
                            "original_issue_price": decimal(s["original_issue_price"], 10),
                            "conversion_price": decimal(s["conversion_price"], 10),
                            "conversion_ratio": decimal(self.conversion_ratio(sid), 10),
                        },
                    }
                )
            elif s["kind"] == "option":
                out["strike"] = exact(s["strike"])
            elif s["kind"] == "warrant":
                out["strike"] = exact(s["strike"])
                out["underlying"] = s["underlying"]
            secs.append(out)
        return {
            "holders": [{"id": h, "name": n} for h, n in self.holders.items()],
            "securities": secs,
            "seniority": [list(t) for t in self.seniority],
            **({"conversion_groups": [group_to_json(g) for g in self.conversion_groups]} if self.conversion_groups else {}),
            "positions": [
                {"holder": h, "security": s, "shares": n}
                for (h, s), n in self.positions.items()
                if n > 0
            ],
            "unissued_pool": self.unissued_pool,
            "unconverted_safes": [
                {
                    "id": f["id"],
                    "holder": f["holder"],
                    "purchase_amount": exact(f["purchase_amount"]),
                    **(
                        {"pre_money_cap": exact(f["pre_money_cap"])}
                        if f["pre_money_cap"] is not None
                        else {"post_money_cap": None if f["post_money_cap"] is None else exact(f["post_money_cap"])}
                    ),
                    "discount": exact(f["discount"]),
                    **({"cash_out_ranks_with": f["cash_out_ranks_with"]} if f.get("cash_out_ranks_with") else {}),
                }
                for f in self.safes
            ],
            **({"unconverted_notes": [note_to_json(n) for n in self.notes]} if self.notes else {}),
            **({"carve_out": carve_out_to_json(self.carve_out)} if self.carve_out else {}),
        }

    @classmethod
    def from_json(cls, data):
        ct = cls()
        for h in data["holders"]:
            ct.add_holder(h["id"], h["name"])
        for s in data["securities"]:
            ct.add_security(security_from_json(s))
        ct.seniority = [list(t) for t in data.get("seniority", [])]
        ct.conversion_groups = [group_from_json(g) for g in data.get("conversion_groups", [])]
        ct.carve_out = carve_out_from_json(data.get("carve_out"))
        for p in data["positions"]:
            ct.issue(p["holder"], p["security"], parse(p["shares"]))
        ct.unissued_pool = int(parse(data.get("unissued_pool", 0)))
        for f in data.get("unconverted_safes", []):
            ct.safes.append(safe_from_json(f))
        for n in data.get("unconverted_notes", []):
            ct.notes.append(note_from_json(n))
        ct.validate()
        return ct

    def validate(self):
        tiered = [sid for tier in self.seniority for sid in tier]
        if sorted(tiered) != sorted(self.preferred_ids()):
            raise ValueError(f"seniority tiers {tiered} must list every preferred series exactly once: {self.preferred_ids()}")
        grouped = [sid for g in self.conversion_groups for sid in g["series"]]
        if len(grouped) != len(set(grouped)):
            raise ValueError("a series can be in at most one conversion group")
        for sid in grouped:
            sec = self.securities.get(sid)
            if sec is None or sec["kind"] != "preferred" or sec["participation"] == "participating":
                raise ValueError(f"conversion group member {sid} must be a convertible preferred series")
        for sid in self.warrant_ids():
            u = self.securities[sid]["underlying"]
            if u != "common" and (u not in self.securities or self.securities[u]["kind"] != "preferred"):
                raise ValueError(f"warrant {sid} is for unknown series {u}")
        if self.carve_out:
            for a in self.carve_out["allocation"]:
                if a["holder"] not in self.holders:
                    raise ValueError(f"carve-out recipient {a['holder']} is not a listed holder")


def security_from_json(s):
    kind = s["kind"]
    out = {"id": s["id"], "name": s["name"], "kind": kind}
    if kind == "preferred":
        oip = parse(s["original_issue_price"])
        out.update(
            {
                "original_issue_price": oip,
                "conversion_price": parse(s.get("conversion_price", s["original_issue_price"])),
                "preference_multiple": parse(s["preference_multiple"]),
                "participation": s["participation"],
                "cap_multiple": None if s.get("cap_multiple") is None else parse(s["cap_multiple"]),
                "anti_dilution": s.get("anti_dilution", "none"),
                "anti_dilution_a": s.get("anti_dilution_a"),
                "cumulative_dividend": dividend_from_json(s.get("cumulative_dividend")),
            }
        )
        if out["participation"] not in PARTICIPATION:
            raise ValueError(f"unknown participation {out['participation']}")
        if (out["participation"] == "participating_capped") != (out["cap_multiple"] is not None):
            raise ValueError(f"{s['id']}: cap_multiple goes with participating_capped only")
        # E7: the cap counts the preference, so a cap below the preference has
        # no meaning. A cap equal to it leaves no room to participate, which
        # behaves like non-participating.
        if out["cap_multiple"] is not None and out["cap_multiple"] < out["preference_multiple"]:
            raise ValueError(
                f"{s['id']}: its cap ({out['cap_multiple']}x) is below its preference ({out['preference_multiple']}x); "
                "a cap counts the preference, so it can't be lower"
            )
        if out["anti_dilution"] not in ANTI_DILUTION:
            raise ValueError(f"unknown anti_dilution {out['anti_dilution']}")
        if "anti_dilution_a" in s and out["anti_dilution_a"] not in ANTI_DILUTION_A[out["anti_dilution"]]:
            raise ValueError(
                f"{s['id']}: anti_dilution_a {out['anti_dilution_a']} doesn't fit {out['anti_dilution']} "
                f"(allowed: {ANTI_DILUTION_A[out['anti_dilution']]})"
            )
    elif kind == "option":
        out["strike"] = parse(s["strike"])
    elif kind == "warrant":
        out["strike"] = parse(s["strike"])
        out["underlying"] = s["underlying"]
    elif kind != "common":
        raise ValueError(f"unknown security kind {kind}")
    return out


def safe_from_json(f):
    """A SAFE: post-money (YC, R4) or pre-money (YC pre-money SAFE), never both."""
    if f.get("post_money_cap") is not None and f.get("pre_money_cap") is not None:
        raise ValueError(f"{f['id']}: a SAFE has a post-money cap or a pre-money cap, not both")
    return {
        "id": f["id"],
        "holder": f["holder"],
        "purchase_amount": parse(f["purchase_amount"]),
        "post_money_cap": None if f.get("post_money_cap") is None else parse(f["post_money_cap"]),
        "pre_money_cap": None if f.get("pre_money_cap") is None else parse(f["pre_money_cap"]),
        "discount": parse(f.get("discount", "0")),
        # At a sale, the series whose tier its Cash-Out Amount ranks with (X9);
        # left out, the most junior tier.
        "cash_out_ranks_with": f.get("cash_out_ranks_with"),
    }


NOTE_CONVERSION_BASES = ("with_pool", "without_pool", "common_only")


def note_from_json(n):
    """Convertible note terms. Only what the cases use is supported; anything else is refused, never skipped."""
    if n.get("interest_method", "simple") != "simple":
        raise ValueError(f"{n['id']}: note interest method {n['interest_method']} is not supported by the reference yet")
    if n.get("cap_type", "pre_money") != "pre_money":
        raise ValueError(f"{n['id']}: note cap type {n['cap_type']} is not supported by the reference yet")
    base = n.get("conversion_base", "with_pool")
    if base not in NOTE_CONVERSION_BASES:
        raise ValueError(f"{n['id']}: unknown note conversion_base {base}")
    return {
        "id": n["id"],
        "holder": n["holder"],
        "principal": parse(n["principal"]),
        "interest_rate": parse(n["interest_rate"]),
        "interest_method": "simple",
        "issue_date": datetime.date.fromisoformat(n["issue_date"]),
        "valuation_cap": None if n.get("valuation_cap") is None else parse(n["valuation_cap"]),
        "cap_type": "pre_money",
        "conversion_base": base,
        "discount": parse(n.get("discount", "0")),
        "repayment_multiple": parse(n["repayment_multiple"]),
    }


def note_to_json(n):
    return {
        "id": n["id"],
        "holder": n["holder"],
        "principal": exact(n["principal"]),
        "interest_rate": exact(n["interest_rate"]),
        "interest_method": n["interest_method"],
        "issue_date": n["issue_date"].isoformat(),
        "valuation_cap": None if n["valuation_cap"] is None else exact(n["valuation_cap"]),
        "cap_type": n["cap_type"],
        "conversion_base": n["conversion_base"],
        "discount": exact(n["discount"]),
        "repayment_multiple": exact(n["repayment_multiple"]),
    }


def note_interest(n, exit_date):
    """Accrued interest on a note at the exit date.

    Simple interest on the principal, Actual/365: the actual number of days
    from the issue date to the exit date (leap days count), divided by 365.
    """
    if exit_date is None:
        raise ValueError(f"{n['id']} accrues interest, so the exit needs an exit_date")
    days = (exit_date - n["issue_date"]).days
    if days < 0:
        raise ValueError(f"exit date is before {n['id']}'s issue date")
    return n["principal"] * n["interest_rate"] * Fraction(days, 365)


VOTE_RULES = ("more_than", "at_least")


def group_from_json(g):
    """A group of series that must convert together, decided by a vote.

    The group converts only if holders of more than (or at least) the
    threshold share of the group's as-converted shares each do strictly better
    converting. A bare list of series means the default: more than 50%.
    """
    if isinstance(g, list):
        g = {"series": g}
    rule = g.get("vote_rule", "more_than")
    if rule not in VOTE_RULES:
        raise ValueError(f"unknown vote_rule {rule}")
    return {
        "series": list(g["series"]),
        "threshold": parse(g.get("vote_threshold_percent", "50")) / 100,
        "rule": rule,
    }


def group_to_json(g):
    return {"series": list(g["series"]), "vote_threshold_percent": exact(g["threshold"] * 100), "vote_rule": g["rule"]}


DIVIDEND_METHODS = ("simple", "compounding")
ON_CONVERSION = ("forfeited", "paid")


def dividend_from_json(d):
    """Cumulative dividend terms: rate, method, accrual start, and what happens on conversion.

    Only what the cases use is supported. Anything else is refused, never skipped.
    """
    if not d:
        return None
    method = d.get("method", "simple")
    on_conv = d.get("on_conversion", "forfeited")
    if method not in DIVIDEND_METHODS:
        raise ValueError(f"dividend method {method} is not supported by the reference yet")
    if on_conv == "added_to_conversion":
        # X5's other reading: (original issue price + accrued) ÷ conversion price converts. Refused.
        raise ValueError("accrued dividends added to what converts (X5's other reading) are not supported")
    if on_conv not in ON_CONVERSION:
        raise ValueError(f"dividends on conversion '{on_conv}' are not supported by the reference yet")
    return {
        "rate": parse(d["rate"]),
        "method": method,
        "accrual_start": datetime.date.fromisoformat(d["accrual_start"]),
        "on_conversion": on_conv,
    }


def dividend_to_json(d):
    return {
        "rate": exact(d["rate"]),
        "method": d["method"],
        "accrual_start": d["accrual_start"].isoformat(),
        "on_conversion": d["on_conversion"],
    }


def anniversary(start, years):
    """The date `years` after start. A 29 February start has its anniversaries on 28 February in other years (X5)."""
    try:
        return start.replace(year=start.year + years)
    except ValueError:
        return start.replace(year=start.year + years, day=28)


def compounding_periods(start, exit_date):
    """Full years from the accrual start to the exit date, on its anniversaries, and the days after the last one."""
    years = 0
    while anniversary(start, years + 1) <= exit_date:
        years += 1
    return years, (exit_date - anniversary(start, years)).days


def accrued_dividend_per_share(sec, exit_date):
    """Cumulative dividend accrued and unpaid per share at the exit date.

    Simple (X2): interest on the original issue price, Actual/365: the actual
    number of days from the accrual start to the exit date (leap days count),
    divided by 365.

    Compounding (X5): annually, on the accrual start's anniversaries. Each full
    year multiplies the original issue price plus what has accrued by
    (1 + rate), whether it has 365 or 366 days; the part-year after the last
    anniversary is simple, Actual/365, on the compounded amount.
    """
    d = sec.get("cumulative_dividend")
    if not d:
        return Fraction(0)
    if exit_date is None:
        raise ValueError(f"{sec['id']} accrues cumulative dividends, so the exit needs an exit_date")
    days = (exit_date - d["accrual_start"]).days
    if days < 0:
        raise ValueError(f"exit date is before {sec['id']}'s dividend accrual start")
    oip = sec["original_issue_price"]
    if d["method"] == "compounding":
        years, stub = compounding_periods(d["accrual_start"], exit_date)
        return oip * (1 + d["rate"]) ** years * (1 + d["rate"] * Fraction(stub, 365)) - oip
    return oip * d["rate"] * Fraction(days, 365)


CARVE_OUT_TIMING = ("before_preferences", "alongside_preferences")


def carve_out_from_json(c):
    """Management carve-out: a percentage of the exit value, paid to listed people.

    Tiers are marginal, like tax brackets: each tier's percentage applies only
    to the slice of exit value inside it. A flat carve-out is one tier from 0
    with no upper end. It is paid before all preferences (SPEC default), or
    alongside them (the SPEC toggle, X7): in the most senior tier, pro rata by
    claim.
    """
    if not c:
        return None
    timing = c.get("timing", "before_preferences")
    if timing not in CARVE_OUT_TIMING:
        raise ValueError(f"carve-out timing '{timing}' is not supported by the reference yet")
    tiers = []
    prev_to = Fraction(0)
    for t in c["tiers"]:
        lo = parse(t["from"])
        hi = None if t.get("to") is None else parse(t["to"])
        if lo != prev_to:
            raise ValueError("carve-out tiers must start at 0 and be contiguous")
        if hi is not None and hi <= lo:
            raise ValueError("each carve-out tier must end above where it starts")
        tiers.append({"from": lo, "to": hi, "rate": parse(t["percent"]) / 100})
        prev_to = hi
        if hi is None:
            break
    allocation = [{"holder": a["holder"], "share": parse(a["percent"]) / 100} for a in c["allocation"]]
    if sum(a["share"] for a in allocation) != 1:
        raise ValueError("carve-out allocation must add up to 100%")
    return {"tiers": tiers, "allocation": allocation, "timing": timing}


def carve_out_to_json(c):
    return {
        "timing": c["timing"],
        "tiers": [
            {"from": exact(t["from"]), "to": None if t["to"] is None else exact(t["to"]), "percent": exact(t["rate"] * 100)}
            for t in c["tiers"]
        ],
        "allocation": [{"holder": a["holder"], "percent": exact(a["share"] * 100)} for a in c["allocation"]],
    }


def carve_out_pool(c, exit_value):
    """Total carve-out at an exit value, and the index of the tier the exit value is in.

    Marginal tiers: each tier contributes its rate × the part of the exit value
    that falls inside it. Past the last tier's upper end the index is
    len(tiers): the carve-out has stopped growing.
    """
    pool = Fraction(0)
    for t in c["tiers"]:
        top = exit_value if t["to"] is None else min(exit_value, t["to"])
        if top > t["from"]:
            pool += (top - t["from"]) * t["rate"]
    band = next(
        (i for i, t in enumerate(c["tiers"]) if t["to"] is None or exit_value < t["to"]),
        len(c["tiers"]),
    )
    return pool, band
