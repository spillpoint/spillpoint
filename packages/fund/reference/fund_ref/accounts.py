"""The LPs' side as accounts, one for each class (F22 to F24).

The LPs on the fund's terms form one account, and each class with LPs another;
a fund without listed LPs has one account, the whole LPs' side (F23). Each
account is a fund of its own, run by waterfall.py exactly as a fund with one
kind of LP is:
- its terms are the fund's, with its class's carry (F22);
- its calls are its part of the LPs' part of each call: investment and expense
  calls by commitment, fee calls by F22's fee weight (F23);
- its distributions are its part, by commitment, of the LPs' part of each
  distribution, X's included (F23);
- it has no GP commitment: the GP commitment's line is the fund's, beside the
  accounts (F3, F23).

So with one account the run is the fund's own, and 0.2.0's amounts come out
exactly. The fund's amounts are the accounts' sums (F23), and each account
settles its own clawback (F24). Later closes change nothing here: every LP is
in from the start (F25); closes.py works out the equalization.
"""

import dataclasses
from dataclasses import dataclass
from fractions import Fraction

from .waterfall import Waterfall, gp_commitment_part

FUND_TERMS = "Fund terms"  # F27: the account of the LPs on the fund's terms, as its reasons name it


@dataclass
class Account:
    cls: object  # its LpClass, or None for the LPs on the fund's terms
    lps: list  # its LPs, in the input's order
    commitment: Fraction  # its LPs' commitments
    share: Fraction  # its part of every distribution, and of every investment and expense call (F23)
    fee_share: Fraction  # its part of every fee call (F22, F23)
    run: Waterfall  # the tiers on its own (F23)

    @property
    def name(self):
        """F27: how its reasons name it."""
        return FUND_TERMS if self.cls is None else self.cls.name

    @property
    def class_name(self):
        return None if self.cls is None else self.cls.name

    def lp_share(self, lp):
        """F23: within an account, its LPs share its amounts by commitment."""
        return lp.commitment / self.commitment

    def part_of_x(self, fund):
        """F23: its part of X, which is distributed less the GP commitment's g, divided by commitment."""
        return self.share * (1 - fund.gp_share)


def _account_fund(fund, steps, share, fee_share):
    """An account's own run: the fund's terms with its carry, its part of every flow, and no GP commitment."""
    flows = []
    for f in fund.flows:
        if f.type == "call":
            lps_part = f.amount - gp_commitment_part(fund, f.kind, f.amount)
            amount = lps_part * (fee_share if f.kind == "fee" else share)
        else:
            amount = f.amount * (1 - fund.gp_share) * share
        flows.append(dataclasses.replace(f, amount=amount))
    return dataclasses.replace(
        fund,
        steps=steps,
        has_gp_commitment=False,
        gp_share=Fraction(0),
        pays_fees=False,
        pays_expenses=True,
        flows=flows,
        lps=[],
        classes=[],
    )


def accounts(fund):
    """F23: the fund's terms first, then each class with LPs in the input's order (F26, FA22)."""
    if not fund.lps:
        return [Account(None, [], Fraction(0), Fraction(1), Fraction(1), Waterfall(_account_fund(fund, fund.steps, 1, 1)))]
    groups = [(None, [lp for lp in fund.lps if lp.cls is None])]
    groups += [(c, [lp for lp in fund.lps if lp.cls == c.name]) for c in fund.classes]
    total = sum((lp.commitment for lp in fund.lps), Fraction(0))
    total_fee = sum((fund.fee_weight(lp) for lp in fund.lps), Fraction(0))
    out = []
    for cls, lps in groups:
        if not lps:
            continue
        commitment = sum((lp.commitment for lp in lps), Fraction(0))
        share = commitment / total
        # Every fee weight can be 0 only when no fee call has a payer, which F28 refuses unless there's no fee call.
        fee_share = sum((fund.fee_weight(lp) for lp in lps), Fraction(0)) / total_fee if total_fee else Fraction(0)
        steps = cls.steps if cls is not None and cls.steps is not None else fund.steps
        out.append(Account(cls, lps, commitment, share, fee_share, Waterfall(_account_fund(fund, steps, share, fee_share))))
    return out


@dataclass
class FundOutcome:
    """X on D for the whole fund (F26): each account's outcome, in F26's order, and the GP commitment's line."""

    x: Fraction
    final: bool
    by_account: list  # (Account, waterfall.Outcome)
    gp_commitment: Fraction  # X's
    gp_commitment_to_date: Fraction
    distributed: Fraction  # every distribution to date, X included

    @property
    def carry_paid(self):
        return sum((o.carry_paid for _, o in self.by_account), Fraction(0))

    @property
    def entitlement(self):
        return sum((o.entitlement for _, o in self.by_account), Fraction(0))

    @property
    def clawback(self):
        """F24, FA23: the accounts' clawbacks summed, each floored at zero first: one account's surplus never offsets
        another's."""
        return sum((o.clawback for _, o in self.by_account), Fraction(0))


class Model:
    """The fund as accounts (F23), evaluated at X (F14)."""

    def __init__(self, fund):
        self.fund = fund
        self.accounts = accounts(fund)
        # F27: with two or more accounts, reasons name their account.
        self.named = len(self.accounts) > 1
        self._distributed = sum((f.amount for f in fund.flows if f.type == "distribution"), Fraction(0))

    @property
    def final(self):
        return self.fund.final

    def evaluate(self, x, final=None):
        final = self.fund.final if final is None else final
        x = Fraction(x)
        outs = [(a, a.run.evaluate(a.part_of_x(self.fund) * x, final=final)) for a in self.accounts]
        g = self.fund.gp_share
        distributed = self._distributed + x
        return FundOutcome(x, final, outs, g * x, g * distributed, distributed)

    def lps_paid_in(self):
        return sum((a.run.before.lps_paid_in for a in self.accounts), Fraction(0))

    def gp_commitment_paid_in(self):
        return sum((gp_commitment_part(self.fund, f.kind, f.amount) for f in self.fund.flows if f.type == "call"), Fraction(0))

    def pref_accrued(self):
        return sum((a.run.before.pref_accrued for a in self.accounts), Fraction(0))

    def hurdle_pref(self):
        return sum((a.run.before.hurdle_pref for a in self.accounts), Fraction(0))
