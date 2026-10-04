"""Cap table model shared by the round builder and the exit waterfall.

The JSON form of a cap table is the input format for exit cases, so the
engine (M2) and the reference read the same file.
"""

import copy
from fractions import Fraction

from .num import parse, exact, decimal

PARTICIPATION = ("non_participating", "participating", "participating_capped")
ANTI_DILUTION = ("none", "broad_based", "narrow_based", "full_ratchet")


class CapTable:
    def __init__(self):
        self.holders = {}  # id -> name, in insertion order
        self.securities = {}  # id -> dict, in insertion order
        self.positions = {}  # (holder, security) -> int shares
        self.unissued_pool = 0
        self.safes = []  # unconverted SAFEs
        self.seniority = []  # list of tiers, most senior first; each a list of preferred ids
        self.conversion_groups = []  # series that must convert together (SPEC toggle)

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
            **({"conversion_groups": [list(g) for g in self.conversion_groups]} if self.conversion_groups else {}),
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
                    "post_money_cap": None if f["post_money_cap"] is None else exact(f["post_money_cap"]),
                    "discount": exact(f["discount"]),
                }
                for f in self.safes
            ],
        }

    @classmethod
    def from_json(cls, data):
        ct = cls()
        for h in data["holders"]:
            ct.add_holder(h["id"], h["name"])
        for s in data["securities"]:
            ct.add_security(security_from_json(s))
        ct.seniority = [list(t) for t in data.get("seniority", [])]
        ct.conversion_groups = [list(g) for g in data.get("conversion_groups", [])]
        for p in data["positions"]:
            ct.issue(p["holder"], p["security"], parse(p["shares"]))
        ct.unissued_pool = int(parse(data.get("unissued_pool", 0)))
        for f in data.get("unconverted_safes", []):
            ct.safes.append(safe_from_json(f))
        ct.validate()
        return ct

    def validate(self):
        tiered = [sid for tier in self.seniority for sid in tier]
        if sorted(tiered) != sorted(self.preferred_ids()):
            raise ValueError(f"seniority tiers {tiered} must list every preferred series exactly once: {self.preferred_ids()}")
        grouped = [sid for g in self.conversion_groups for sid in g]
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
            }
        )
        if out["participation"] not in PARTICIPATION:
            raise ValueError(f"unknown participation {out['participation']}")
        if (out["participation"] == "participating_capped") != (out["cap_multiple"] is not None):
            raise ValueError(f"{s['id']}: cap_multiple goes with participating_capped only")
        if out["anti_dilution"] not in ANTI_DILUTION:
            raise ValueError(f"unknown anti_dilution {out['anti_dilution']}")
    elif kind == "option":
        out["strike"] = parse(s["strike"])
    elif kind == "warrant":
        out["strike"] = parse(s["strike"])
        out["underlying"] = s["underlying"]
    elif kind != "common":
        raise ValueError(f"unknown security kind {kind}")
    return out


def safe_from_json(f):
    return {
        "id": f["id"],
        "holder": f["holder"],
        "purchase_amount": parse(f["purchase_amount"]),
        "post_money_cap": None if f.get("post_money_cap") is None else parse(f["post_money_cap"]),
        "discount": parse(f.get("discount", "0")),
    }
