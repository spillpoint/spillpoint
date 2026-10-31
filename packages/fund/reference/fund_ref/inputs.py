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
3. The cash flows against each other and against D; from 0.5.0, then the
   investments against the cash flows and D (F37).
4. The LPs (F21, FA19): `lps` itself, then each LP in the list's order, each
   checked through before the next: its shape and its fields, that the name
   and commitment are there, the name, the commitment, whether the name
   repeats, then its class and its close (F28).
5. What the LPs need of the rest (F28, F32): `equalization_rate` when an
   investment or expense call comes before a later close (F29); a schedule's
   `commitments`, missing without listed LPs (from 0.6.0, only with a step on
   commitments, F40) or not their total; a schedule no listed LP pays; then
   each entered call in date order for an LP to pay it.

Within `terms`, stage 2 checks the carry, pref, catch-up and GP commitment, the
terms against each other, then `fee_rate`, `equalization_rate`, the management
fee schedule (F30, F32), `fee_rate_with_schedule`, each class in order (F28),
then `carry_basis` (F37). A schedule's step is checked for its shape, its
rate, its basis (F40, from 0.6.0), then its `from`. After `nav` it checks the
investments, then `distribution_from` (F37), then a step on invested capital
without investments (F40). Stage 3 starts with `fee_call_with_schedule`, and
counts the schedule's calls among the calls by their dates (F30, F39). Stage 1
ends with `deal_by_deal_pref` (F37).

null is the same as leaving an optional field out (FA3, FA24), except `carry`,
the fund's or a class's: a null carry could mean "none" or "the default", so
it's refused.
"""

from dataclasses import dataclass, field
from fractions import Fraction

from . import deals, fees
from .num import parse_exact, parse_date

TERM_KEYS = {
    "carry": None,  # a rate, or {"steps": [...]}
    "pref": ("rate", "compounding"),
    "catch_up": ("gp_share",),
    "gp_commitment": ("share", "pays_fees", "pays_expenses"),
    "fee_rate": None,  # a rate (F22)
    "equalization_rate": None,  # a rate (F25)
    "lp_classes": None,  # a list of classes (F22)
    "management_fee": ("start", "frequency", "steps", "commitments"),  # the schedule (F30)
    "carry_basis": None,  # "whole_fund" or "deal_by_deal" (F34)
}
CARRY_BASES = ("whole_fund", "deal_by_deal")  # F34
STEP_KEYS = ("rate", "from_lp_multiple")
FEE_STEP_KEYS = ("rate", "from", "basis")  # a schedule's step (F30), its basis from 0.6.0 (F39)
CLASS_KEYS = ("name", "fee_rate", "carry")
TOP_KEYS = ("as_of", "terms", "cash_flows", "distribution_date", "final", "nav", "lps", "investments", "distribution_from")
REQUIRED_TOP = ("as_of", "terms", "cash_flows")
FLOW_KEYS = ("date", "type", "kind", "amount", "investment", "share")
FLOW_TYPES = ("call", "distribution", "write_off")  # a write-off from 0.5.0 (F33)
CALL_KINDS = ("investment", "fee", "expense")
DEAL_KEYS = ("investment", "share")  # a distribution's or a write-off's, and X's in `distribution_from` (F33)
WRITE_OFF_NOT = ("kind", "amount", "share")  # a write-off has none of these (F37)
INVESTMENT_KEYS = ("name", "checks")
CHECK_KEYS = ("date", "amount")
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
    index: int | None  # its place in the input's list; None for a schedule's call (F30)
    date: object
    type: str  # "call" or "distribution"
    kind: str | None  # a call's kind (F3)
    amount: Fraction | None  # a schedule's call has its amount once the LPs are read (F30)
    scheduled: bool = False  # a schedule's fee call, not an entered one (F30)
    period: object = None  # fees.Period, for a schedule's call
    investment: str | None = None  # a distribution's investment, as named (F33)
    share: Fraction = Fraction(1)  # how much of what's left of it the distribution sells (F33)
    realized: Fraction | None = None  # the cost realized so far, this distribution's included (F35, deals.py)
    made: Fraction | None = None  # the cost made by its date (F35, deals.py)

    @property
    def factor(self):
        return self.period.factor


@dataclass
class WriteOff:
    """F33: a write-off, a cash flow of its own with no amount: it ends what's left of an investment at its date."""

    index: int  # its place in the input's cash flows
    date: object
    investment: str


@dataclass
class Check:
    """F33: one of an investment's checks, the fund's cost, a whole-fund amount (F2)."""

    index: int  # its place in its investment's `checks`
    date: object
    amount: Fraction


@dataclass
class Investment:
    """F33: one of the fund's investments, in the order the GP shows them."""

    index: int  # its place in `investments`
    name: str  # as written, compared exactly (FA17)
    checks: list  # Check, as listed

    @property
    def first_check(self):
        return min(c.date for c in self.checks)


@dataclass
class DistributionFrom:
    """F33: X's investment, and how much of what's left of it X sells."""

    investment: str
    share: Fraction


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
    schedule: object = None  # F30: fees.Schedule, or None when fee calls are entered
    carry_basis: str = "whole_fund"  # F34
    investments: list = field(default_factory=list)  # F33: Investment, in the input's order
    write_offs: list = field(default_factory=list)  # F33: WriteOff, in the input's order
    distribution_from: object = None  # F33: DistributionFrom, or None
    # F35: the part of each check's cost that's this run's LPs': 1 − g for the fund (F3), and an account's part of that
    # by commitment (F23, accounts.py).
    lps_cost_share: Fraction = Fraction(1)
    holdings: list = field(default_factory=list)  # F33, F36: deals.Holding, one an investment, at D before X
    made_at_d: Fraction = Fraction(0)  # F35: the cost made by D
    x_realized: Fraction = Fraction(0)  # F33, F35: the cost realized so far with X's share of its investment, X not final
    invested: list = field(default_factory=list)  # F38: (date, net invested capital from that date on), deals.py
    # F39: the schedule's first call by its date, kept as the fund's first call (F25) even when it has nothing to call.
    first_scheduled: object = None

    @property
    def deal_by_deal(self):
        """F34: carry deal by deal, F35's tier 1."""
        return self.carry_basis == "deal_by_deal"

    @property
    def first_rate(self):
        """c in F8: the catch-up runs until the GP has the first carry rate of all profit."""
        return self.steps[0].rate

    @property
    def first_call(self):
        """F4, F25: the fund's first call, entered or the schedule's. The schedule's count by their dates (F39), so one
        with nothing to call, left out of the flows, is still the first if it's earliest."""
        dates = [f.date for f in self.flows if f.type == "call"]
        return min(dates + ([self.first_scheduled] if self.first_scheduled is not None else []))

    def lp_class(self, lp):
        """The LP's class, or None when it's on the fund's terms (F22)."""
        return next((c for c in self.classes if c.name == lp.cls), None) if lp.cls is not None else None

    @property
    def standard_fee_rate(self):
        """F22, F30: the fund's fee rate a class's own is set against: `fee_rate`, or with a schedule its first rate."""
        return self.schedule.first_rate if self.schedule is not None else self.fee_rate

    def fee_weight(self, lp):
        """F22: an LP pays fee calls in proportion to its commitment times its class's fee rate over the fund's. On the
        fund's terms, or in a class without a fee rate, its weight is its commitment. With a schedule, the fund's rate is
        its first (F30), so a class's fee steps down with the fund's."""
        c = self.lp_class(lp)
        if c is None or c.fee_rate is None:
            return lp.commitment
        return lp.commitment * c.fee_rate / self.standard_fee_rate

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


def _unsupported_schedule(schedule):
    """F32, F40: a schedule's key other than `start`, `frequency`, `steps` and `commitments`, or a step's other than
    `rate`, `from` and `basis`, named by its own key (an `offset`); its steps' keys at the steps' place among them."""
    for key, value in schedule.items():
        path = f"terms.management_fee.{key}"
        if key not in TERM_KEYS["management_fee"]:
            raise Refusal("unsupported", key, path)
        if key == "steps" and isinstance(value, list):
            for i, step in enumerate(value):
                if isinstance(step, dict):
                    for k in step:
                        if k not in FEE_STEP_KEYS:
                            raise Refusal("unsupported", k, f"{path}[{i}].{k}")


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
        if not isinstance(value, dict) or key in ("fee_rate", "equalization_rate", "carry_basis"):
            continue
        if key == "carry":
            _unsupported_carry(value, path)
            continue
        if key == "management_fee":
            _unsupported_schedule(value)
            continue
        for k2, v2 in value.items():
            if k2 not in TERM_KEYS[key]:
                raise Refusal("unsupported", k2, f"{path}.{k2}")
            # F7: simple pref only in v1.
            if key == "pref" and k2 == "compounding" and v2 is not None and v2 != "simple":
                raise Refusal("unsupported", "compounded_pref", f"{path}.compounding")
    # F35, F37: no pref deal by deal in 0.5.0, so no catch-up either (F8 needs a pref). Last in stage 1, and only for a
    # `carry_basis` of exactly "deal_by_deal": any other is refused in stage 2 (FA54).
    if terms.get("carry_basis") == "deal_by_deal" and terms.get("pref") is not None:
        raise Refusal("unsupported", "deal_by_deal_pref", "terms.pref")


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

    # F30, F32: the management fee schedule; with one, the fund's rate is the schedule's, so `fee_rate` isn't given.
    schedule = _schedule(terms.get("management_fee"))
    if schedule is not None and fee_rate is not None:
        raise _input("fee_rate_with_schedule", "terms.fee_rate")

    classes = _classes(terms.get("lp_classes"), fee_rate is not None or schedule is not None, catch_up)

    # F34, F37: the carry basis, after the classes; null is the default, the whole fund (FA52).
    carry_basis = terms.get("carry_basis")
    if carry_basis is None:
        carry_basis = "whole_fund"
    elif not isinstance(carry_basis, str) or carry_basis not in CARRY_BASES:
        raise _input("bad_field", "terms.carry_basis")

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
        "schedule": schedule,
        "classes": classes,
        "carry_basis": carry_basis,
    }


def _schedule(raw):
    """F30, F32: the schedule, checked in order: its shape, `start`, `frequency`, `steps` in order (each its shape, its
    rate, its basis (F40), then its `from`), then `commitments`. null is the same as leaving it out, as for each of its
    optional fields (FA41, FA63)."""
    if raw is None:
        return None
    at = "terms.management_fee"
    if not isinstance(raw, dict):
        raise _input("bad_field", at)
    if raw.get("start") is None:
        raise _input("missing_field", f"{at}.start")
    start = _date(raw["start"], f"{at}.start")
    frequency = raw.get("frequency")
    if frequency is None:
        frequency = "quarterly"  # F30's default
    elif not isinstance(frequency, str) or frequency not in fees.PERIODS:
        raise _input("bad_field", f"{at}.frequency")
    if raw.get("steps") is None:
        raise _input("missing_field", f"{at}.steps")
    raw_steps = raw["steps"]
    if not isinstance(raw_steps, list) or not raw_steps:
        raise _input("bad_field", f"{at}.steps")
    steps = []
    for i, s in enumerate(raw_steps):
        path = f"{at}.steps[{i}]"
        if not isinstance(s, dict):
            raise _input("bad_field", path)
        if s.get("rate") is None:
            raise _input("missing_field", f"{path}.rate")
        rate = _number(s["rate"], f"{path}.rate")
        # F30: a rate on commitments, from 0 up to, not including, 1; the first above 0, since a fee holiday is a later
        # `start`. A later rate of 0 ends fees from its date.
        if rate < 0 or rate >= 1 or (i == 0 and rate == 0):
            raise _input("bad_number", f"{path}.rate")
        # F39, F40: what the rate is on, after the rate and before the `from`: commitments, the default, or net invested
        # capital. null is the default (FA63); the word is compared exactly, as `frequency` is (FA41).
        basis = s.get("basis")
        if basis is None:
            basis = fees.COMMITMENTS
        elif not isinstance(basis, str) or basis not in fees.BASES:
            raise _input("bad_field", f"{path}.basis")
        if i == 0:
            # The first step is in force from `start`, so it isn't given a date of its own.
            if s.get("from") is not None:
                raise _input("steps_out_of_order", path)
            steps.append(fees.FeeStep(rate, start, basis))
            continue
        if s.get("from") is None:
            raise _input("missing_field", f"{path}.from")
        frm = _date(s["from"], f"{path}.from")
        # Each step after the one before it; the first's date is `start`.
        if frm <= steps[-1].start:
            raise _input("steps_out_of_order", path)
        steps.append(fees.FeeStep(rate, frm, basis))
    commitments = None
    if raw.get("commitments") is not None:
        commitments = _number(raw["commitments"], f"{at}.commitments")
        if commitments <= 0:
            raise _input("bad_number", f"{at}.commitments")
    return fees.Schedule(start, frequency, steps, commitments)


def _classes(raw, has_fee_rate, catch_up):
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
        # F22: a class's fee rate is 0 or more, against the fund's standard rate, which must then be given: `fee_rate`,
        # or a schedule's first rate (F32). Its own number is checked before the fund's rate is looked for (FA25).
        class_fee = None
        if c.get("fee_rate") is not None:
            class_fee = _number(c["fee_rate"], f"{path}.fee_rate")
            if class_fee < 0:
                raise _input("bad_number", f"{path}.fee_rate")
            if not has_fee_rate:
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
    """Each cash flow, in the list's order (F18, F37): its unknown fields, an `investment` or `share` on a call among them,
    in the file's order; the fields it needs (`amount` not for a write-off); the date; the type; a call's kind; a
    write-off's own fields; the `investment`; the `share`; then the amount. Returns the calls and distributions, and the
    write-offs apart (F33), each with its place in the list."""
    if not isinstance(raw, list):
        raise _input("bad_field", "cash_flows")
    flows, write_offs = [], []
    for i, f in enumerate(raw):
        path = f"cash_flows[{i}]"
        if not isinstance(f, dict):
            raise _input("bad_field", path)
        # F37: a call has no investment and sells no share. null is left out (FA52).
        is_call = f.get("type") == "call"
        for key in f:
            if key not in FLOW_KEYS or (is_call and key in DEAL_KEYS and f[key] is not None):
                raise _input("unknown_field", f"{path}.{key}")
        write_off = f.get("type") == "write_off"
        for key in ("date", "type") if write_off else ("date", "type", "amount"):
            if f.get(key) is None:
                raise _input("missing_field", f"{path}.{key}")
        date = _date(f["date"], f"{path}.date")
        if f["type"] not in FLOW_TYPES:
            raise _input("bad_field", f"{path}.type")
        kind = None
        if f["type"] == "call":
            if f.get("kind") is None:
                raise _input("missing_field", f"{path}.kind")
            if f["kind"] not in CALL_KINDS:
                raise _input("bad_field", f"{path}.kind")
            kind = f["kind"]
        elif f["type"] == "distribution" and f.get("kind") is not None:
            raise _input("unknown_field", f"{path}.kind")
        if write_off:
            # F37: a write-off's own fields. It has no kind, no amount and sells no share: it ends all that's left of its
            # investment. Each in the file's order, null left out, as a distribution's kind is (FA52); then its investment.
            for key in f:
                if key in WRITE_OFF_NOT and f[key] is not None:
                    raise _input("unknown_field", f"{path}.{key}")
            if f.get("investment") is None:
                raise _input("missing_field", f"{path}.investment")
        investment = None
        if f["type"] != "call":
            investment = f.get("investment")
            if investment is not None and (not isinstance(investment, str) or _blank(investment)):
                raise _input("bad_field", f"{path}.investment")
            # F37: a share sold is of an investment, so a share without one is the investment missing (FA53).
            if investment is None and f.get("share") is not None:
                raise _input("missing_field", f"{path}.investment")
        share = Fraction(1)
        if f["type"] == "distribution" and f.get("share") is not None:
            share = _share(f["share"], f"{path}.share")
        if write_off:
            write_offs.append(WriteOff(i, date, investment))
            continue
        amount = _number(f["amount"], f"{path}.amount")
        if amount <= 0:
            raise _input("bad_number", f"{path}.amount")
        flows.append(Flow(i, date, f["type"], kind, amount, investment=investment, share=share))
    return flows, write_offs


def _share(value, path):
    """F33: how much of what's left of an investment a distribution sells: above 0 and at most 1."""
    share = _number(value, path)
    if share <= 0 or share > 1:
        raise _input("bad_number", path)
    return share


def _investments(raw):
    """Stage 2, after `nav` (F37): the investments in order, each with its fields, its checks in order, then its name
    against the ones before. Left out, null or an empty list: none (FA52)."""
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise _input("bad_field", "investments")
    investments, names = [], set()
    for i, inv in enumerate(raw):
        path = f"investments[{i}]"
        if not isinstance(inv, dict):
            raise _input("bad_field", path)
        for key in inv:
            if key not in INVESTMENT_KEYS:
                raise _input("unknown_field", f"{path}.{key}")
        for key in INVESTMENT_KEYS:
            if inv.get(key) is None:
                raise _input("missing_field", f"{path}.{key}")
        name = inv["name"]
        if not isinstance(name, str) or _blank(name):
            raise _input("bad_field", f"{path}.name")
        raw_checks = inv["checks"]
        if not isinstance(raw_checks, list) or not raw_checks:
            raise _input("bad_field", f"{path}.checks")
        checks = []
        for j, c in enumerate(raw_checks):
            at = f"{path}.checks[{j}]"
            if not isinstance(c, dict):
                raise _input("bad_field", at)
            for key in c:
                if key not in CHECK_KEYS:
                    raise _input("unknown_field", f"{at}.{key}")
            for key in CHECK_KEYS:
                if c.get(key) is None:
                    raise _input("missing_field", f"{at}.{key}")
            date = _date(c["date"], f"{at}.date")
            amount = _number(c["amount"], f"{at}.amount")
            # F33: a check is an exact amount above 0, the fund's cost.
            if amount <= 0:
                raise _input("bad_number", f"{at}.amount")
            checks.append(Check(j, date, amount))
        # F33: no two investments share a name, compared exactly as written (FA17), checked after its checks (F37).
        if name in names:
            raise _input("investment_name_repeated", f"{path}.name")
        names.add(name)
        investments.append(Investment(i, name, checks))
    return investments


def _distribution_from(raw):
    """Stage 2, after the investments (F37): X's investment and the share it sells, `"1"` by default. null is left out
    (FA52)."""
    if raw is None:
        return None
    at = "distribution_from"
    if not isinstance(raw, dict):
        raise _input("bad_field", at)
    for key in raw:
        if key not in DEAL_KEYS:
            raise _input("unknown_field", f"{at}.{key}")
    investment = raw.get("investment")
    if investment is None:
        raise _input("missing_field", f"{at}.investment")
    if not isinstance(investment, str) or _blank(investment):
        raise _input("bad_field", f"{at}.investment")
    share = Fraction(1) if raw.get("share") is None else _share(raw["share"], f"{at}.share")
    return DistributionFrom(investment, share)


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


def _investments_against_flows(carry_basis, investments, flows, write_offs, distribution_from, d):
    """Stage 3, after 0.4.0's checks (F37): the investments against the cash flows, each other and D, in this order. A
    check after D; deal by deal, the investments themselves; each distribution and write-off in the input's order, for
    its investment (named deal by deal, listed, and made by its date); X's investment; then the cost made against the
    investment calls."""
    for inv in investments:
        for c in inv.checks:
            if c.date > d:
                raise _input("cash_flow_after_distribution_date", f"investments[{inv.index}].checks[{c.index}]")
    deal_by_deal = carry_basis == "deal_by_deal"
    if deal_by_deal and not investments:
        raise _input("missing_field", "investments")
    listed = {inv.name: inv for inv in investments}
    dists = [f for f in flows if f.type == "distribution"]
    for f in sorted(dists + write_offs, key=lambda f: f.index):
        path = f"cash_flows[{f.index}]"
        # F35: deal by deal, every distribution is from an investment; a distribution of unused capital is later.
        if f.investment is None:
            if deal_by_deal:
                raise _input("missing_field", f"{path}.investment")
            continue
        if f.investment not in listed:
            raise _input("investment_unknown", f"{path}.investment")
        if f.date < listed[f.investment].first_check:
            raise _input("investment_not_made", path)
    if distribution_from is None:
        if deal_by_deal:
            raise _input("missing_field", "distribution_from")
    elif distribution_from.investment not in listed:
        raise _input("investment_unknown", "distribution_from.investment")
    # F37: the cost made by a check's date can't be more than the investment calls up to that date, both whole-fund
    # amounts: checks aren't calls, but a check can't be paid before its money is called (credit lines are later). The
    # first such check in date order, on one date in the investments' order, then the checks' (FA53).
    checks = sorted(((c.date, inv.index, c.index, c.amount) for inv in investments for c in inv.checks))
    calls = [f for f in flows if f.type == "call" and f.kind == "investment"]
    for date, i, j, _ in checks:
        made = sum((a for day, _, _, a in checks if day <= date), Fraction(0))
        called = sum((f.amount for f in calls if f.date <= date), Fraction(0))
        if made > called:
            raise _input("investments_exceed_calls", f"investments[{i}].checks[{j}].amount")


def _what_the_lps_need(fund):
    """Stage 5 (F28, F32): an equalization rate when an investment or expense call comes before a later close (F29);
    a schedule's `commitments`, needed without listed LPs when a step is on commitments (F40; FA64: any step, whatever
    its date) and their total with them; a schedule needs a listed LP that pays it, one not in a class at a fee rate of
    0, as an entered fee call does (F28, F32): its calls are every LP's own fee, whatever its close, so a fee weight above
    0 is all it needs; then each entered call, in date order, needs an LP in the fund at its date to pay it (FA21): for a
    fee call, one with a fee weight above 0 (F22)."""
    if fund.lps and fund.equalization_rate is None:
        rebalanced = [f for f in fund.flows if f.type == "call" and f.kind != "fee"]
        if any(fund.joins_later(lp) and any(f.date < lp.close for f in rebalanced) for lp in fund.lps):
            raise _input("missing_field", "terms.equalization_rate")
    if fund.schedule is not None:
        at = "terms.management_fee.commitments"
        if not fund.lps and fund.schedule.commitments is None and fund.schedule.charges_commitments:
            raise _input("missing_field", at)
        total = sum((lp.commitment for lp in fund.lps), Fraction(0))
        if fund.lps and fund.schedule.commitments is not None and fund.schedule.commitments != total:
            raise _input("fee_commitments_mismatch", at)
        if fund.lps and not any(fund.fee_weight(lp) > 0 for lp in fund.lps):
            raise _input("call_without_payers", "terms.management_fee")
    for f in fund.flows:
        if f.type != "call" or f.scheduled or not fund.lps:
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
    raw_flows = inputs["cash_flows"]
    flows, write_offs = _flows(raw_flows)
    d = as_of if inputs.get("distribution_date") is None else _date(inputs["distribution_date"], "distribution_date")
    final = _flag(inputs, "final", "final", False)
    nav = None
    if inputs.get("nav") is not None:
        nav = _number(inputs["nav"], "nav")
        if nav < 0:
            raise _input("bad_number", "nav")
    investments = _investments(inputs.get("investments"))
    distribution_from = _distribution_from(inputs.get("distribution_from"))
    # F39, F40: a step on invested capital charges the cost of the investments still held (F38), so it needs them: last
    # in stage 2, after `distribution_from`. An empty list is none (FA52). Any step, whatever its date (FA64).
    if terms["schedule"] is not None and terms["schedule"].charges_invested_capital and not investments:
        raise _input("missing_field", "investments")

    # F32: with a schedule, no fee call is entered, so nothing is counted twice: the first such call in the input's order.
    schedule = terms["schedule"]
    if schedule is not None:
        for f in flows:
            if f.type == "call" and f.kind == "fee":
                raise _input("fee_call_with_schedule", f"cash_flows[{f.index}]")
        # F30: the schedule's calls are calls, dated from the schedule alone, none after D (FA39, FA40). From 0.6.0 they
        # count here by their dates, even one that turns out to have nothing to call on invested capital (F39, FA66).
        flows = flows + [Flow(None, p.date, "call", "fee", None, True, p) for p in fees.periods(schedule, d)]

    # F4: refused, no calls at all, or a distribution before the first call; D on or after every cash flow.
    calls = [f for f in flows if f.type == "call"]
    if not calls:
        raise _input("no_calls", "cash_flows")
    first_call = min(f.date for f in calls)
    for f in flows:
        if f.type == "distribution" and f.date < first_call:
            raise _input("distribution_before_call", f"cash_flows[{f.index}]")
    # F37: write-offs among the cash flows, in the input's order.
    for f in sorted([f for f in flows if not f.scheduled] + write_offs, key=lambda f: f.index):
        if f.date > d:
            raise _input("cash_flow_after_distribution_date", f"cash_flows[{f.index}]")
    _investments_against_flows(terms["carry_basis"], investments, flows, write_offs, distribution_from, d)

    # FA32: a close must come before the first distribution in the cash flows, and before D, X's date.
    close_limit = min([d] + [f.date for f in flows if f.type == "distribution"])
    lps = _lps(inputs.get("lps"), [c.name for c in terms["classes"]], close_limit)

    # F4: on one date, calls come before distributions; same-day distributions go in the order listed. A schedule's
    # call has no place in the list: it comes after the entered calls of its date, which changes nothing, since calls
    # on one date only add up.
    ordered = sorted(flows, key=lambda f: (f.date, 0 if f.type == "call" else 1, len(raw_flows) if f.index is None else f.index))
    fund = Fund(
        as_of=as_of,
        distribution_date=d,
        final=final,
        nav=nav,
        flows=ordered,
        lps=lps,
        investments=investments,
        write_offs=write_offs,
        distribution_from=distribution_from,
        lps_cost_share=1 - terms["gp_share"],
        **terms,
    )
    _what_the_lps_need(fund)
    # F33, F35: what each distribution realizes, the cost made by its date, and the investments at D; F38: the net
    # invested capital on every day.
    deals.realize(fund)
    # F39: each of the schedule's periods on invested capital, day by day, now the investments are read. A period with
    # nothing to call isn't a call; the fund's first call is still the schedule's first by its date (F25, FA66).
    scheduled = [f for f in fund.flows if f.scheduled]
    if scheduled:
        fund.first_scheduled = scheduled[0].date
    for f in scheduled:
        f.period.on_invested = fees.invested(fund, f.period)
    fund.flows = [f for f in fund.flows if not (f.scheduled and f.period.nothing_to_call)]
    # F30: each of the schedule's calls is the LPs' fees, as if every LP were in from the start, once the LPs are read.
    for f in fund.flows:
        if f.scheduled:
            f.amount = fees.call_amount(fund, f.period)
    return fund
