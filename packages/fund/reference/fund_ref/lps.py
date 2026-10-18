"""Each LP's share of what the LPs get (F19, F20).

Every LP is on the same terms (F19): the same fees, the same carry, every call
pro rata to commitments. So nothing in the waterfall changes, and each LP's
amounts are the LPs' amounts scaled by its share, exactly. They bend where the
LPs' do, so the breakpoints are as before (F20).
"""

from fractions import Fraction


def shares(fund):
    """F19: LP i's share is its commitment over the sum of all the LPs' commitments, exactly. The commitments only
    divide: they aren't checked against the calls."""
    total = sum((lp.commitment for lp in fund.lps), Fraction(0))
    return [lp.commitment / total for lp in fund.lps]


def each_lp(fund, lps_amount):
    """F20: one of the LPs' amounts (their paid-in, their total from X or to date, the clawback owed back to them),
    divided between the LPs by share, in the input's order."""
    return [share * lps_amount for share in shares(fund)]
