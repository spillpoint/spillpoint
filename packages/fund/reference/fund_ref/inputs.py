"""Reads a fund's inputs, or refuses them (F18).

A refusal names a kind ("unsupported" or "input"), a term and the field, as a
path into the inputs: "terms.carry.steps[1]", "cash_flows[0].amount".

The order of checks (FA2) decides which refusal comes first when an input has
more than one problem:
1. Unsupported terms: the keys under `terms` in the file's order, each term's
   own keys in the file's order, and a compounding that isn't "simple".
2. The input's own fields: unknown and missing top-level fields; `as_of`;
   `terms` (carry, pref, catch-up, GP commitment, then the terms against each
   other); each cash flow in the list's order; `distribution_date`; `final`;
   `nav`.
3. The cash flows against each other and against D.

null is the same as leaving an optional field out (FA3), except `carry`: a null
carry could mean "none" or "the default 20%", so it's refused.
"""

from dataclasses import dataclass, field
from fractions import Fraction

from .num import parse_exact, parse_date

TERM_KEYS = {
    "carry": None,  # a rate, or {"steps": [...]}
    "pref": ("rate", "compounding"),
    "catch_up": ("gp_share",),
    "gp_commitment": ("share", "pays_fees", "pays_expenses"),
}
STEP_KEYS = ("rate", "from_lp_multiple")
TOP_KEYS = ("as_of", "terms", "cash_flows", "distribution_date", "final", "nav")
REQUIRED_TOP = ("as_of", "terms", "cash_flows")
FLOW_KEYS = ("date", "type", "kind", "amount")
CALL_KINDS = ("investment", "fee", "expense")
DEFAULT_CARRY = Fraction(1, 5)  # F9


class Refusal(Exception):
    def __init__(self, kind, term, path):
        super().__init__(f"{kind}: {term} at {path}")
        self.kind, self.term, self.path = kind, term, path

    def to_json(self):
        return {"kind": self.kind, "term": self.term, "field": self.path}


def _input(term, path):
    return Refusal("input", term, path)


@dataclass
class Step:
    rate: Fraction
    from_lp_multiple: Fraction | None  # None on the first step (F9)


@dataclass
class Flow:
    index: int  # its place in the input's list
    date: object
    type: str  # "call" or "distribution"
    kind: str | None  # a call's kind (F3)
    amount: Fraction


@dataclass
class Fund:
    as_of: object
    distribution_date: object  # D (F14)
    final: bool
    nav: Fraction | None
    steps: list
    pref: Fraction | None
    catch_up: Fraction | None
    has_gp_commitment: bool
    gp_share: Fraction
    pays_fees: bool
    pays_expenses: bool
    flows: list = field(default_factory=list)

    @property
    def first_rate(self):
        """c in F8: the catch-up runs until the GP has the first carry rate of all profit."""
        return self.steps[0].rate


def _unsupported(terms):
    """Step 1 (F18, unsupported): a term v1 doesn't model, named by its own key."""
    if not isinstance(terms, dict):
        return
    for key, value in terms.items():
        path = f"terms.{key}"
        if key not in TERM_KEYS:
            raise Refusal("unsupported", key, path)
        if not isinstance(value, dict):
            continue
        if key == "carry":
            for k2, steps in value.items():
                if k2 != "steps":
                    raise Refusal("unsupported", k2, f"{path}.{k2}")
                if isinstance(steps, list):
                    for i, step in enumerate(steps):
                        if isinstance(step, dict):
                            for k3 in step:
                                if k3 not in STEP_KEYS:
                                    raise Refusal("unsupported", k3, f"{path}.steps[{i}].{k3}")
            continue
        for k2, v2 in value.items():
            if k2 not in TERM_KEYS[key]:
                raise Refusal("unsupported", k2, f"{path}.{k2}")
            # F7: simple pref only in v1.
            if key == "pref" and k2 == "compounding" and v2 is not None and v2 != "simple":
                raise Refusal("unsupported", "compounded_pref", f"{path}.compounding")


def _number(value, path):
    x = parse_exact(value)
    if x is None:
        raise _input("bad_number", path)
    return x


def _date(value, path):
    d = parse_date(value)
    if d is None:
        raise _input("bad_date", path)
    return d


def _flag(obj, key, path, default):
    value = obj.get(key)
    if value is None:
        return default
    if not isinstance(value, bool):
        raise _input("bad_field", path)
    return value


def _rate(value, path):
    """A carry rate (F9): from 0 up to, not including, 1."""
    r = _number(value, path)
    if r < 0:
        raise _input("bad_number", path)
    if r >= 1:
        raise _input("carry_rate_not_below_one", path)
    return r


def _carry(terms):
    if "carry" not in terms:
        return [Step(DEFAULT_CARRY, None)]
    carry = terms["carry"]
    if not isinstance(carry, dict):
        return [Step(_rate(carry, "terms.carry"), None)]
    if carry.get("steps") is None:
        raise _input("missing_field", "terms.carry.steps")
    raw = carry["steps"]
    if not isinstance(raw, list) or not raw:
        raise _input("bad_field", "terms.carry.steps")
    steps = []
    for i, s in enumerate(raw):
        path = f"terms.carry.steps[{i}]"
        if not isinstance(s, dict):
            raise _input("bad_field", path)
        if s.get("rate") is None:
            raise _input("missing_field", f"{path}.rate")
        rate = _rate(s["rate"], f"{path}.rate")
        multiple = None
        if i == 0:
            # F18: the first step is given a multiple.
            if s.get("from_lp_multiple") is not None:
                raise _input("steps_out_of_order", path)
        else:
            if s.get("from_lp_multiple") is None:
                raise _input("missing_field", f"{path}.from_lp_multiple")
            multiple = _number(s["from_lp_multiple"], f"{path}.from_lp_multiple")
            prev = steps[-1]
            # F9: rates rising, each from a higher LP multiple above 1.
            floor = prev.from_lp_multiple if prev.from_lp_multiple is not None else Fraction(1)
            if rate <= prev.rate or multiple <= floor:
                raise _input("steps_out_of_order", path)
        steps.append(Step(rate, multiple))
    return steps


def _term_object(terms, key):
    value = terms.get(key)
    if value is None:
        return None
    if not isinstance(value, dict):
        raise _input("bad_field", f"terms.{key}")
    return value


def _terms(terms):
    if not isinstance(terms, dict):
        raise _input("bad_field", "terms")
    steps = _carry(terms)

    pref = None
    p = _term_object(terms, "pref")
    if p is not None:
        if p.get("rate") is None:
            raise _input("missing_field", "terms.pref.rate")
        pref = _number(p["rate"], "terms.pref.rate")
        if pref <= 0:
            raise _input("bad_number", "terms.pref.rate")

    catch_up = None
    cu = _term_object(terms, "catch_up")
    if cu is not None:
        if cu.get("gp_share") is None:
            raise _input("missing_field", "terms.catch_up.gp_share")
        catch_up = _number(cu["gp_share"], "terms.catch_up.gp_share")
        if catch_up < 0 or catch_up > 1:
            raise _input("bad_number", "terms.catch_up.gp_share")

    share, pays_fees, pays_expenses = Fraction(0), False, True
    g = _term_object(terms, "gp_commitment")
    if g is not None:
        if g.get("share") is None:
            raise _input("missing_field", "terms.gp_commitment.share")
        share = _number(g["share"], "terms.gp_commitment.share")
        if share < 0:
            raise _input("bad_number", "terms.gp_commitment.share")
        if share >= 1:
            raise _input("gp_commitment_not_below_one", "terms.gp_commitment.share")
        # F3: fee-free by default, paying its share of expenses by default.
        pays_fees = _flag(g, "pays_fees", "terms.gp_commitment.pays_fees", False)
        pays_expenses = _flag(g, "pays_expenses", "terms.gp_commitment.pays_expenses", True)

    # F8: a catch-up needs a pref, and a partial one must be above the carry rate.
    if catch_up is not None:
        if pref is None:
            raise _input("catch_up_without_pref", "terms.catch_up")
        if catch_up <= steps[0].rate:
            raise _input("catch_up_share_not_above_carry", "terms.catch_up.gp_share")

    return {
        "steps": steps,
        "pref": pref,
        "catch_up": catch_up,
        "has_gp_commitment": g is not None,
        "gp_share": share,
        "pays_fees": pays_fees,
        "pays_expenses": pays_expenses,
    }


def _flows(raw):
    if not isinstance(raw, list):
        raise _input("bad_field", "cash_flows")
    flows = []
    for i, f in enumerate(raw):
        path = f"cash_flows[{i}]"
        if not isinstance(f, dict):
            raise _input("bad_field", path)
        for key in f:
            if key not in FLOW_KEYS:
                raise _input("unknown_field", f"{path}.{key}")
        for key in ("date", "type", "amount"):
            if f.get(key) is None:
                raise _input("missing_field", f"{path}.{key}")
        date = _date(f["date"], f"{path}.date")
        if f["type"] not in ("call", "distribution"):
            raise _input("bad_field", f"{path}.type")
        kind = None
        if f["type"] == "call":
            if f.get("kind") is None:
                raise _input("missing_field", f"{path}.kind")
            if f["kind"] not in CALL_KINDS:
                raise _input("bad_field", f"{path}.kind")
            kind = f["kind"]
        elif f.get("kind") is not None:
            raise _input("unknown_field", f"{path}.kind")
        amount = _number(f["amount"], f"{path}.amount")
        if amount <= 0:
            raise _input("bad_number", f"{path}.amount")
        flows.append(Flow(i, date, f["type"], kind, amount))
    return flows


def read(inputs):
    """The fund's inputs, read, or a Refusal raised (F18)."""
    if not isinstance(inputs, dict):
        raise _input("bad_field", "")
    _unsupported(inputs.get("terms"))
    for key in inputs:
        if key not in TOP_KEYS:
            raise _input("unknown_field", key)
    for key in REQUIRED_TOP:
        if key not in inputs:
            raise _input("missing_field", key)
    as_of = _date(inputs["as_of"], "as_of")
    terms = _terms(inputs["terms"])
    flows = _flows(inputs["cash_flows"])
    d = as_of if inputs.get("distribution_date") is None else _date(inputs["distribution_date"], "distribution_date")
    final = _flag(inputs, "final", "final", False)
    nav = None
    if inputs.get("nav") is not None:
        nav = _number(inputs["nav"], "nav")
        if nav < 0:
            raise _input("bad_number", "nav")

    # F4: refused, no calls at all, or a distribution before the first call; D on or after every cash flow.
    calls = [f for f in flows if f.type == "call"]
    if not calls:
        raise _input("no_calls", "cash_flows")
    first_call = min(f.date for f in calls)
    for f in flows:
        if f.type == "distribution" and f.date < first_call:
            raise _input("distribution_before_call", f"cash_flows[{f.index}]")
    for f in flows:
        if f.date > d:
            raise _input("cash_flow_after_distribution_date", f"cash_flows[{f.index}]")

    # F4: on one date, calls come before distributions; same-day distributions go in the order listed.
    ordered = sorted(flows, key=lambda f: (f.date, 0 if f.type == "call" else 1, f.index))
    return Fund(as_of=as_of, distribution_date=d, final=final, nav=nav, flows=ordered, **terms)
