"""The fund-level waterfall, exactly (F1 to F13).

European, cumulative (F1): every distribution, earlier ones included, runs the
same tiers in date order against the fund's running balances. The tiers:
capital (F5), pref (F6), catch-up (F8), carry in steps (F9 to F11). The GP
commitment takes its share of every distribution outside the tiers (F3).

When X is final, or at the NAV point (F14), the tiers also run once on the
fund's totals (F12): the GP's entitlement. The clawback owed is the carry paid
to date less that entitlement, when that's positive.

From 0.5.0 a fund can pay carry deal by deal (F34, F35): tier 1 then runs, at
each distribution, only to what's due on the investments realized so far, its
cost and its share of the fees and expenses (deals.py works out what's
realized). Everything else, the clawback's run on the totals among it, is as on
the whole fund.
"""

import copy
from dataclasses import dataclass, field
from fractions import Fraction

from .num import days

YEAR = 365  # Actual/365 (F6)


@dataclass
class Pot:
    """Amounts by tier: one distribution's, or the fund's to date. The GP's catch-up and carry by step are its carry (FA1)."""

    steps: int
    lp_capital: Fraction = Fraction(0)
    lp_pref: Fraction = Fraction(0)
    lp_catch_up: Fraction = Fraction(0)
    gp_catch_up: Fraction = Fraction(0)
    lp_carry: list = field(default_factory=list)  # the LPs' share of the carry tier, by step
    gp_carry: list = field(default_factory=list)  # the GP's carry, by step
    gp_commitment: Fraction = Fraction(0)

    def __post_init__(self):
        if not self.lp_carry:
            self.lp_carry = [Fraction(0)] * self.steps
        if not self.gp_carry:
            self.gp_carry = [Fraction(0)] * self.steps

    @property
    def lps(self):
        return self.lp_capital + self.lp_pref + self.lp_catch_up + sum(self.lp_carry)

    @property
    def gp(self):
        return self.gp_catch_up + sum(self.gp_carry)

    def add(self, other):
        self.lp_capital += other.lp_capital
        self.lp_pref += other.lp_pref
        self.lp_catch_up += other.lp_catch_up
        self.gp_catch_up += other.gp_catch_up
        self.lp_carry = [a + b for a, b in zip(self.lp_carry, other.lp_carry)]
        self.gp_carry = [a + b for a, b in zip(self.gp_carry, other.gp_carry)]
        self.gp_commitment += other.gp_commitment

    def vector(self):
        """Every amount, in a fixed order, for fitting lines (breakpoints.py)."""
        return [self.lp_capital, self.lp_pref, self.lp_catch_up, self.gp_catch_up, *self.lp_carry, *self.gp_carry, self.gp_commitment]


def step_at(fund, lp_to_date, paid_in):
    """F10, F11: the carry step the LPs are at, by their net multiple on paid-in capital. A step applies from its
    multiple on, so LPs exactly at 3x are at the step from 3x."""
    k = 0
    for i, s in enumerate(fund.steps):
        if s.from_lp_multiple is not None and lp_to_date >= s.from_lp_multiple * paid_in:
            k = i
    return k


def pay_tiers(fund, amount, *, capital_due, pref_due, lp_before, gp_before, profit_before, paid_in):
    """Runs `amount` down the tiers. Returns the amounts by tier and the tier its last dollar fell in.

    lp_before, gp_before and profit_before are the fund's to date, before this amount: the LPs' distributions from
    the tiers, the GP's carry, and everything that ran the tiers beyond capital (F8, F10).
    """
    pot = Pot(len(fund.steps))
    left = Fraction(amount)
    lp, gp, profit = lp_before, gp_before, profit_before
    last = None

    # F5, tier 1: LPs get back all their paid-in capital to date first.
    x = min(left, capital_due)
    if x > 0:
        pot.lp_capital = x
        left -= x
        lp += x
        last = "capital"

    # F6, tier 2: the pref accrued to date and not yet paid, all to LPs.
    if fund.pref is not None and left > 0:
        x = min(left, pref_due)
        if x > 0:
            pot.lp_pref = x
            left -= x
            lp += x
            profit += x
            last = "pref"

    # F8, tier 3: the GP gets s of each dollar until its carry to date is c of all profit to date.
    # Each dollar adds 1 to profit and s to the GP's carry, so the gap c × profit − carry closes by s − c a dollar.
    if fund.catch_up is not None and left > 0:
        s, c = fund.catch_up, fund.first_rate
        need = (c * profit - gp) / (s - c)
        if need > 0:
            x = min(left, need)
            pot.gp_catch_up = s * x
            pot.lp_catch_up = (1 - s) * x
            left -= x
            gp += s * x
            lp += (1 - s) * x
            profit += x
            last = "catch_up"

    # F9 to F11, tier 4: carry at the step the LPs are at; a higher rate only on profit above its threshold.
    while left > 0:
        k = step_at(fund, lp, paid_in)
        rate = fund.steps[k].rate
        x = left
        if k + 1 < len(fund.steps):
            # The LPs keep 1 − rate of each dollar until they reach the next step's multiple.
            room = (fund.steps[k + 1].from_lp_multiple * paid_in - lp) / (1 - rate)
            x = min(left, room)
        pot.gp_carry[k] += rate * x
        pot.lp_carry[k] += (1 - rate) * x
        left -= x
        gp += rate * x
        lp += (1 - rate) * x
        profit += x
        last = ("carry", k)

    return pot, last


def gp_commitment_part(fund, kind, amount):
    """F3: the GP commitment pays g of investment calls, of expense calls if it pays expenses (default), and of fee
    calls only if it pays fees (default not)."""
    pays = kind == "investment" or (kind == "expense" and fund.pays_expenses) or (kind == "fee" and fund.pays_fees)
    return fund.gp_share * Fraction(amount) if pays else Fraction(0)


class Ledger:
    """The fund's running balances (F1), replayed flow by flow in F4's order."""

    def __init__(self, fund):
        self.fund = fund
        self.lps_paid_in = Fraction(0)  # P
        self.gp_commitment_paid_in = Fraction(0)
        self.fees_and_expenses = Fraction(0)  # the LPs' part of the fee and expense calls to date (F35)
        self.capital_returned = Fraction(0)  # R
        self.through_tiers = Fraction(0)  # T: every distribution that ran the tiers, net of the GP commitment's share
        self.distributed = Fraction(0)
        self.pref_accrued = Fraction(0)
        self.pref_paid = Fraction(0)
        self.hurdle_pref = Fraction(0)  # F12's pref, on the hurdle balance
        self.to_date = Pot(len(fund.steps))
        self.date = None
        self.dues = []  # F35, deal by deal: each distribution's (cost, uninvested, fees and expenses) due, in F4's order

    def advance(self, date):
        """Accrues the pref up to `date`, Actual/365, on the balances since the last cash flow (F6, F12)."""
        if self.date is not None and self.fund.pref is not None:
            n = days(self.date, date)
            r = self.fund.pref
            # F6: on the LPs' unreturned capital.
            self.pref_accrued += r * (self.lps_paid_in - self.capital_returned) * n / YEAR
            # F12: on paid-in minus every distribution that ran the tiers, never below zero.
            self.hurdle_pref += r * max(Fraction(0), self.lps_paid_in - self.through_tiers) * n / YEAR
        self.date = date

    def call(self, kind, amount):
        """F3: the GP commitment pays its part; the LPs pay the rest of every call."""
        gp_part = gp_commitment_part(self.fund, kind, amount)
        self.gp_commitment_paid_in += gp_part
        self.lps_paid_in += amount - gp_part
        if kind != "investment":
            self.fees_and_expenses += amount - gp_part

    def due(self, realized, made, end=False):
        """F35, deal by deal: what's due before carry, with `realized` of the `made` cost realized so far (whole-fund
        amounts). The cost realized, the LPs' part of it (1 − g, the GP commitment's part aside, F3; an account's part
        of that by commitment, F23); and the LPs' fees and expenses to date (an account's own, F29) times the share of
        the cost made that's been realized, by cost. At the end (X final, and the NAV point), all the LPs' paid-in: the
        fund ends and its unused cash comes back as capital, as on the whole fund (FA49). Everything made is realized
        then, so the cost is the LPs' part of the cost made and the fees and expenses are all of them; the rest of their
        paid-in is the capital called for investments and never invested, due at the end only. Returns the three: the
        cost, the uninvested, and the fees and expenses."""
        cost = self.fund.lps_cost_share * realized
        if end:
            return cost, self.lps_paid_in - self.fees_and_expenses - cost, self.fees_and_expenses
        return cost, Fraction(0), self.fees_and_expenses * realized / made

    def distribute(self, amount, realized=None, made=None, end=False):
        """F3: g of the distribution to the GP commitment, outside the tiers; the rest runs the tiers. Deal by deal, tier
        1 runs to what's due with `realized` of the `made` cost realized, or at the `end` to all paid-in (F35, FA49); on
        the whole fund, to all paid-in (F5)."""
        amount = Fraction(amount)
        gpc = self.fund.gp_share * amount
        tiers = amount - gpc
        capital_due = self.lps_paid_in - self.capital_returned
        if self.fund.deal_by_deal:
            cost, uninvested, fees = self.due(realized, made, end)
            self.dues.append((cost, uninvested, fees))
            # What's due can be less than what the LPs have had back (a new investment lowers the fees' share): then no
            # capital comes first, and nothing already returned is taken back.
            capital_due = max(Fraction(0), cost + uninvested + fees - self.capital_returned)
        pot, last = pay_tiers(
            self.fund,
            tiers,
            capital_due=capital_due,
            pref_due=self.pref_accrued - self.pref_paid,
            lp_before=self.to_date.lps,
            gp_before=self.to_date.gp,
            profit_before=self.through_tiers - self.capital_returned,
            paid_in=self.lps_paid_in,
        )
        pot.gp_commitment = gpc
        self.to_date.add(pot)
        self.capital_returned += pot.lp_capital
        self.pref_paid += pot.lp_pref
        self.through_tiers += tiers
        self.distributed += amount
        return pot, last

    def entitlement(self):
        """F12: the tiers run once on the fund's totals. All LP paid-in as capital, the hurdle pref, and every
        distribution that ran the tiers, X included, as the amount. The GP's catch-up and carry there are its
        entitlement."""
        return pay_tiers(
            self.fund,
            self.through_tiers,
            capital_due=self.lps_paid_in,
            pref_due=self.hurdle_pref,
            lp_before=Fraction(0),
            gp_before=Fraction(0),
            profit_before=Fraction(0),
            paid_in=self.lps_paid_in,
        )


def before_x(fund):
    """The ledger with every cash flow given, its pref accrued to D: what X runs against (F14)."""
    ledger = Ledger(fund)
    for f in fund.flows:
        ledger.advance(f.date)
        if f.type == "call":
            ledger.call(f.kind, f.amount)
        else:
            ledger.distribute(f.amount, f.realized, f.made)
    ledger.advance(fund.distribution_date)
    return ledger


@dataclass
class Outcome:
    x: Fraction
    this: Pot  # X, by tier
    this_tier: object  # the tier X's last dollar fell in
    ledger: Ledger  # the fund to date, X included
    totals: Pot | None = None  # the run on the fund's totals (final, or at the NAV point)
    totals_tier: object = None
    carry_paid: Fraction | None = None
    entitlement: Fraction | None = None
    owed_before_floor: Fraction | None = None  # carry paid less entitlement; the clawback owed is this when positive
    due: tuple | None = None  # deal by deal: what's due before carry on X, (cost, uninvested, fees and expenses) (F35, F36, FA49)

    @property
    def clawback(self):
        return max(Fraction(0), self.owed_before_floor)


class Waterfall:
    def __init__(self, fund):
        self.fund = fund
        self._before = before_x(fund)

    def evaluate(self, x, final=None):
        """X distributed on D, after every earlier cash flow (F14). final=None means the fund's own `final`."""
        final = self.fund.final if final is None else final
        ledger = copy.deepcopy(self._before)
        this, tier = ledger.distribute(x, self.x_realized(final), self.fund.made_at_d, final)
        out = Outcome(Fraction(x), this, tier, ledger)
        if self.fund.deal_by_deal:
            out.due = ledger.dues[-1]
        if final:
            totals, totals_tier = ledger.entitlement()
            out.totals, out.totals_tier = totals, totals_tier
            out.carry_paid = ledger.to_date.gp
            out.entitlement = totals.gp
            out.owed_before_floor = out.carry_paid - out.entitlement
        return out

    @property
    def before(self):
        return self._before

    def x_realized(self, final):
        """F33: the cost realized with X: its share of what's left of its investment; when final, and at the NAV point,
        everything left of every investment, so all the cost made."""
        return self.fund.made_at_d if final else self.fund.x_realized

    def due_on_x(self, final=None):
        """F35: what's due before carry on X, (cost, uninvested, fees and expenses): when final, all the LPs' paid-in
        (FA49). It doesn't change with X (F14)."""
        final = self.fund.final if final is None else final
        return self._before.due(self.x_realized(final), self.fund.made_at_d, final)
