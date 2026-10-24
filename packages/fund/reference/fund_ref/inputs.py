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
4. The LPs (F21, FA19): `lps` itself, then each LP in the list's order, each
   checked through before the next: its shape and its fields, that the name
   and commitment are there, the name, the commitment, whether the name
   repeats, then its class and its close (F28).
5. What the LPs need of the rest (F28): a later close's `equalization_rate`,
   then each call in date order for an LP to pay it.

Within `terms`, stage 2 checks the carry, pref, catch-up and GP commitment, the
terms against each other, then `fee_rate`, `equalization_rate` and each class
in order (F28).

null is the same as leaving an optional field out (FA3, FA24), except `carry`,
the fund's or a class's: a null carry could mean "none" or "the default", so
it's refused.
"""

from dataclasses import dataclass, field
from fractions import Fraction

from .num import parse_exact, parse_date

TERM_KEYS = {
    "carry": None,  # a rate, or {"steps": [...]}
    "pref": ("rate", "compounding"),
    "catch_up": ("gp_share",),
    "gp_commitment": ("share", "pays_fees", "pays_expenses"),
    "fee_rate": None,  # a rate (F22)
    "equalization_rate": None,  # a rate (F25)
    "lp_classes": None,  # a list of classes (F22)
}
STEP_KEYS = ("rate", "from_lp_multiple")
CLASS_KEYS = ("name", "fee_rate", "carry")
TOP_KEYS = ("as_of", "terms", "cash_flows", "distribution_date", "final", "nav", "lps")
REQUIRED_TOP = ("as_of", "terms", "cash_flows")
FLOW_KEYS = ("date", "type", "kind", "amount")
CALL_KINDS = ("investment", "fee", "expense")
LP_KEYS = ("name", "commitment", "class", "close")
REQUIRED_LP = ("name", "commitment")
# FA17: whitespace as JavaScript's String.prototype.trim takes it off, listed so the reference and the engine agree on
# what a blank name is. Python's str.isspace differs: it counts U+001C to U+001F and U+0085, and not U+FEFF.
WHITESPACE = frozenset(
    "\t\n\v\f\r \u00a0\u1680\u2028\u2029\u202f\u205f\u3000\ufeff" + "".join(chr(c) for c in range(0x2000, 0x200B))
)
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
class LpClass:
    """F22: a class of LPs with its own fee rate, its own carry, or both. None means the fund's."""

    name: str  # as written (FA27)
    fee_rate: Fraction | None
    steps: list | None


@dataclass
class LP:
    name: str  # as written (FA17)
    commitment: Fraction
    cls: str | None = None  # its class's name; None for the fund's terms (F22)
    close: object = None  # the date it joined, as given; None for none (F25)


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
    lps: list = field(default_factory=list)  # F19: in the input's order; empty when the input has none
    fee_rate: Fraction | None = None  # F22: the fund's standard fee rate
    equalization_rate: Fraction | None = None  # F25
    classes: list = field(default_factory=list)  # F22: in the input's order

    @property
    def first_rate(self):
        """c in F8: the catch-up runs until the GP has the first carry rate of all profit."""
        return self.steps[0].rate

    @property
    def first_call(self):
        return min(f.date for f in self.flows if f.type == "call")

    def lp_class(self, lp):
        """The LP's class, or None when it's on the fund's terms (F22)."""
        return next((c for c in self.classes if c.name == lp.cls), None) if lp.cls is not None else None

    def fee_weight(self, lp):
        """F22: an LP pays fee calls in proportion to its commitment times its class's fee rate over the fund's. On the
        fund's terms, or in a class without a fee rate, its weight is its commitment."""
        c = self.lp_class(lp)
        if c is None or c.fee_rate is None:
            return lp.commitment
        return lp.commitment * c.fee_rate / self.fee_rate

    def weight(self, lp, kind):
        """F23: investment and expense calls by commitment, fee calls by F22's fee weight."""
        return self.fee_weight(lp) if kind == "fee" else lp.commitment

    def joins_later(self, lp):
        """F25: an LP whose close is after the fund's first call joins at a later close."""
        return lp.close is not None and lp.close > self.first_call

    def is_in(self, lp, date):
        """FA21: an LP is in the fund at a date when it has no close, or its close is on or before that date."""
        return lp.close is None or lp.close <= date


def _unsupported_carry(carry, path):
    """A carry's own keys, the fund's or a class's: only `steps`, and each step's `rate` and `from_lp_multiple`."""
    if not isinstance(carry, dict):
        return
    for k2, steps in carry.items():
        if k2 != "steps":
            raise Refusal("unsupported", k2, f"{path}.{k2}")
        if isinstance(steps, list):
            for i, step in enumerate(steps):
                if isinstance(step, dict):
                    for k3 in step:
                        if k3 not in STEP_KEYS:
                            raise Refusal("unsupported", k3, f"{path}.steps[{i}].{k3}")


def _unsupported_classes(classes):
    """F28: a class's field other than its name, fee rate and carry, such as its own pref, named by its own key; its
    carry's keys at the carry's place among them (FA25)."""
    if not isinstance(classes, list):
        return
    for i, c in enumerate(classes):
        if not isinstance(c, dict):
            continue
        for key, value in c.items():
            path = f"terms.lp_classes[{i}].{key}"
            if key not in CLASS_KEYS:
                raise Refusal("unsupported", key, path)
            if key == "carry":
                _unsupported_carry(value, path)


def _unsupported(terms):
    """Step 1 (F18, unsupported): a term v1 doesn't model, named by its own key."""
    if not isinstance(terms, dict):
        return
    for key, value in terms.items():
        path = f"terms.{key}"
        if key not in TERM_KEYS:
            raise Refusal("unsupported", key, path)
        if key == "lp_classes":
            _unsupported_classes(value)
            continue
        if not isinstance(value, dict) or key in ("fee_rate", "equalization_rate"):
            continue
        if key == "carry":
            _unsupported_carry(value, path)
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
    return _carry_at(terms["carry"], "terms.carry")


def _carry_at(carry, at):
    """F9: a carry, the fund's or a class's (F22), refused at its own path."""
    if not isinstance(carry, dict):
        return [Step(_rate(carry, at), None)]
    if carry.get("steps") is None:
        raise _input("missing_field", f"{at}.steps")
    raw = carry["steps"]
    if not isinstance(raw, list) or not raw:
        raise _input("bad_field", f"{at}.steps")
    steps = []
    for i, s in enumerate(raw):
        path = f"{at}.steps[{i}]"
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

    # F28: the fund's standard fee rate is above 0; equalization interest is 0 or more.
    fee_rate = None
    if terms.get("fee_rate") is not None:
        fee_rate = _number(terms["fee_rate"], "terms.fee_rate")
        if fee_rate <= 0:
            raise _input("bad_number", "terms.fee_rate")
    equalization_rate = None
    if terms.get("equalization_rate") is not None:
        equalization_rate = _number(terms["equalization_rate"], "terms.equalization_rate")
        if equalization_rate < 0:
            raise _input("bad_number", "terms.equalization_rate")

    return {
        "steps": steps,
        "pref": pref,
        "catch_up": catch_up,
        "has_gp_commitment": g is not None,
        "gp_share": share,
        "pays_fees": pays_fees,
        "pays_expenses": pays_expenses,
        "fee_rate": fee_rate,
        "equalization_rate": equalization_rate,
        "classes": _classes(terms.get("lp_classes"), fee_rate, catch_up),
    }


def _classes(raw, fee_rate, catch_up):
    """F22, F28: the classes, each checked through before the next: its shape, its name, the name repeating, its fee
    rate, its carry, then its carry against the catch-up. Left out, null or an empty list: none (FA24)."""
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise _input("bad_field", "terms.lp_classes")
    classes, names = [], set()
    for i, c in enumerate(raw):
        path = f"terms.lp_classes[{i}]"
        if not isinstance(c, dict):
            raise _input("bad_field", path)
        if c.get("name") is None:
            raise _input("missing_field", f"{path}.name")
        name = c["name"]
        if not isinstance(name, str) or _blank(name):
            raise _input("bad_field", f"{path}.name")
        # FA27: class names compare exactly as written, as LP names do (FA17).
        if name in names:
            raise _input("lp_class_name_repeated", f"{path}.name")
        names.add(name)
        # F22: a class's fee rate is 0 or more, against the fund's standard rate, which must then be given. Its own
        # number is checked before the fund's rate is looked for (FA25).
        class_fee = None
        if c.get("fee_rate") is not None:
            class_fee = _number(c["fee_rate"], f"{path}.fee_rate")
            if class_fee < 0:
                raise _input("bad_number", f"{path}.fee_rate")
            if fee_rate is None:
                raise _input("missing_field", "terms.fee_rate")
        # F22: without a carry, the class pays the fund's. A null carry is refused, as the fund's is (FA3, FA24).
        class_steps = None
        if "carry" in c:
            class_steps = _carry_at(c["carry"], f"{path}.carry")
            # F8, F22: the class's catch-up runs to its own first carry rate, so the share must be above it.
            if catch_up is not None and catch_up <= class_steps[0].rate:
                raise _input("catch_up_share_not_above_carry", f"{path}.carry")
        classes.append(LpClass(name, class_fee, class_steps))
    return classes


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


def _blank(name):
    return all(ch in WHITESPACE for ch in name)


def _lps(raw, classes, close_limit):
    """Stage 4 (F21, FA19): the fund's LPs, each a name and a commitment (F19), and from 0.3.0 a class and a close
    (F28). Left out, null or an empty list: none."""
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise _input("bad_field", "lps")
    lps, names = [], set()
    for i, lp in enumerate(raw):
        path = f"lps[{i}]"
        if not isinstance(lp, dict):
            raise _input("bad_field", path)
        # F21, FA18: a per-LP term v1 doesn't model, such as a side letter's carry, named by its own key.
        for key in lp:
            if key not in LP_KEYS:
                raise Refusal("unsupported", key, f"{path}.{key}")
        for key in REQUIRED_LP:
            if lp.get(key) is None:
                raise _input("missing_field", f"{path}.{key}")
        name = lp["name"]
        if not isinstance(name, str) or _blank(name):
            raise _input("bad_field", f"{path}.name")
        commitment = _number(lp["commitment"], f"{path}.commitment")
        if commitment <= 0:
            raise _input("bad_number", f"{path}.commitment")
        # F19: no two LPs share a name, compared exactly as written (FA17).
        if name in names:
            raise _input("lp_name_repeated", f"{path}.name")
        names.add(name)
        # F28: a class is a class's name, compared exactly (FA27). null is none: the fund's terms (FA24).
        cls = lp.get("class")
        if cls is not None:
            if not isinstance(cls, str):
                raise _input("bad_field", f"{path}.class")
            if cls not in classes:
                raise _input("lp_class_unknown", f"{path}.class")
        # F25, F28: a close comes before the fund's first distribution, X's on D included (FA32).
        close = None
        if lp.get("close") is not None:
            close = _date(lp["close"], f"{path}.close")
            if close >= close_limit:
                raise _input("lp_close_after_distribution", f"{path}.close")
        lps.append(LP(name, commitment, cls, close))
    return lps


def _what_the_lps_need(fund):
    """Stage 5 (F28): a later close needs an equalization rate; then each call, in date order, needs an LP in the
    fund at its date to pay it (FA21): for a fee call, one with a fee weight above 0 (F22)."""
    if not fund.lps:
        return
    if fund.equalization_rate is None and any(fund.joins_later(lp) for lp in fund.lps):
        raise _input("missing_field", "terms.equalization_rate")
    for f in fund.flows:
        if f.type != "call":
            continue
        if not any(fund.is_in(lp, f.date) and fund.weight(lp, f.kind) > 0 for lp in fund.lps):
            raise _input("call_without_payers", f"cash_flows[{f.index}]")


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

    # FA32: a close must come before the first distribution in the cash flows, and before D, X's date.
    close_limit = min([d] + [f.date for f in flows if f.type == "distribution"])
    lps = _lps(inputs.get("lps"), [c.name for c in terms["classes"]], close_limit)

    # F4: on one date, calls come before distributions; same-day distributions go in the order listed.
    ordered = sorted(flows, key=lambda f: (f.date, 0 if f.type == "call" else 1, f.index))
    fund = Fund(as_of=as_of, distribution_date=d, final=final, nav=nav, flows=ordered, lps=lps, **terms)
    _what_the_lps_need(fund)
    return fund
