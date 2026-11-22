"""What changes beside the decision-maker at a jump (10k): SAFEs following a group, options following a SAFE.

At a jump the reference places the breakpoint where the decision-maker whose
choice changed is indifferent, and words a reason for everything that changed.
10j's random tables found two gaps there, and comparing them in full in 10k a
third:

1. A conversion group that must convert together (E11, E17) is one
   decision-maker, and its player is its series joined with "+". Where its
   conversion moved a SAFE into its Conversion Amount (E20), the SAFE's reason
   looked up what it follows among the securities and the notes, found neither,
   and the search stopped with "generator raised StopIteration". A group is now
   named by its series (SPEC, Breakpoints), as its own reason names it.
2. An option class isn't a decision-maker (E16): it settles on the common
   price under each choice of the others. Where a SAFE's conversion dropped
   common below a strike, the class changed with the SAFE, and the reference took
   the class for the one deciding. Flipping the class alone gives no point where
   anyone is indifferent, so the search stopped with "cannot place the jump near
   ...: []". The SAFE now decides, with the class re-settled under each of its
   choices.
3. A group votes on its two settled outcomes (E17). Where one of them jumps
   by itself, as when a SAFE starts converting under the group's conversion
   (E20), the vote can change with no voter indifferent anywhere near, and the
   search stopped with "cannot place the jump". It now places the jump where
   what changed inside that outcome is indifferent, with the group's choice
   held.

The first table is many-11-0006 from `random_many_safes.py tables 240 11
--most-safes 6 --most-strikes 4 --groups`, shrunk. The other two are made by
hand: the second beside many-11-0125, and the third beside many-11-0002 and
many-11-0011, whose cut-down versions all needed three option classes.

    python3 -m unittest discover reference/tests
"""

import sys
import unittest
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from spillpoint_ref import breakpoints  # noqa: E402
from spillpoint_ref.model import CapTable  # noqa: E402
from spillpoint_ref.waterfall import Waterfall  # noqa: E402

CENT = F(1, 100)


def preferred(sid, name, price):
    return {
        "id": sid, "name": name, "kind": "preferred", "original_issue_price": price, "conversion_price": price,
        "preference_multiple": "1", "participation": "non_participating", "cap_multiple": None, "anti_dilution": "none",
    }


def safe(fid, holder, amount, cap):
    return {"id": fid, "holder": holder, "purchase_amount": amount, "post_money_cap": cap, "discount": "0"}


GROUP_AND_SAFE = {
    "holders": [
        {"id": "founder_a", "name": "Founder A"},
        {"id": "founder_b", "name": "Founder B"},
        {"id": "investor_0", "name": "Investor 0"},
        {"id": "investor_1", "name": "Investor 1"},
        {"id": "safe_holder_1", "name": "SAFE Investor 1"},
    ],
    "securities": [
        {"id": "common", "name": "Common Stock", "kind": "common"},
        preferred("series_0", "Series 0 Preferred", "1"),
        preferred("series_1", "Series 1 Preferred", "2"),
    ],
    "seniority": [["series_0"], ["series_1"]],
    "positions": [
        {"holder": "founder_a", "security": "common", "shares": 5000000},
        {"holder": "founder_b", "security": "common", "shares": 1000000},
        {"holder": "investor_0", "security": "series_0", "shares": 4000000},
        {"holder": "investor_1", "security": "series_1", "shares": 500000},
    ],
    "unissued_pool": 0,
    "unconverted_safes": [safe("safe_1", "safe_holder_1", "75000", "10000000")],
    "conversion_groups": [["series_0", "series_1"]],
}

TWO_SAFES_AND_OPTIONS = {
    "holders": [
        {"id": "founder_a", "name": "Founder A"},
        {"id": "founder_b", "name": "Founder B"},
        {"id": "employee_0", "name": "Employee 0"},
        {"id": "safe_holder_0", "name": "SAFE Investor 0"},
        {"id": "safe_holder_1", "name": "SAFE Investor 1"},
    ],
    "securities": [
        {"id": "common", "name": "Common Stock", "kind": "common"},
        {"id": "options", "name": "Options", "kind": "option", "strike": "1.39"},
    ],
    "seniority": [],
    "positions": [
        {"holder": "founder_a", "security": "common", "shares": 4000000},
        {"holder": "founder_b", "security": "common", "shares": 2000000},
        {"holder": "employee_0", "security": "options", "shares": 100000},
    ],
    "unissued_pool": 0,
    "unconverted_safes": [
        safe("safe_0", "safe_holder_0", "1200000", "8000000"),
        safe("safe_1", "safe_holder_1", "2000000", "12000000"),
    ],
}


GROUP_AND_TWO_SAFES = {
    "holders": [
        {"id": "founder", "name": "Founder"},
        {"id": "investor_0", "name": "Investor 0"},
        {"id": "investor_1", "name": "Investor 1"},
        {"id": "holder_a", "name": "SAFE Investor A"},
        {"id": "holder_b", "name": "SAFE Investor B"},
    ],
    "securities": [
        {"id": "common", "name": "Common Stock", "kind": "common"},
        preferred("series_0", "Series 0 Preferred", "1"),
        preferred("series_1", "Series 1 Preferred", "1"),
    ],
    "seniority": [["series_0", "series_1"]],
    "positions": [
        {"holder": "founder", "security": "common", "shares": 10000000},
        {"holder": "investor_0", "security": "series_0", "shares": 5000000},
        {"holder": "investor_1", "security": "series_1", "shares": 5000000},
    ],
    "unissued_pool": 0,
    "unconverted_safes": [safe("safe_a", "holder_a", "4500000", "27000000"), safe("safe_b", "holder_b", "1000000", "10000000")],
    "conversion_groups": [["series_0", "series_1"]],
}


def codes(rs):
    return [(r["code"], r.get("security", r.get("securities"))) for r in rs]


class SafeFollowingAGroup(unittest.TestCase):
    """Series 0 and Series 1 convert together, by more than half their shares (E11).

    The SAFE converts into a fixed 0.75% ($75,000 ÷ its $10M cap) of its Liquidity Capitalization (X1). While the
    group keeps its preferences ($4M, then $1M) the group isn't in that count, so the SAFE's shares are 0.75% of
    (6,000,000 + its own): 0.75% of the residual, x − $5M, which beats its $75,000 only above $15M. Once the group
    converts, everyone is common and the count is 10,500,000 + its own shares n: n = 0.0075 × (10,500,000 + n), so
    n = 78,750 ÷ 0.9925 = 79,345.09, and the SAFE gets 0.75% of x, more than its cash above $10M. So the SAFE follows
    the group (E20).

    Investor 0 votes on the two settled outcomes (E17): $4,000,000 staying, or 4,000,000 shares at
    x × 0.9925 ÷ 10,500,000 converting, with the SAFE then converting. Those are equal at x = 10,500,000 ÷ 0.9925 =
    4,200,000,000/397 = $10,579,345.09. Above it Investor 0, with 88.89% of the group's shares, does better
    converting, which carries the vote; Investor 1's 500,000 shares are worth $500,000 there, less than its $1M.
    """

    def setUp(self):
        self.wf = Waterfall(CapTable.from_json(GROUP_AND_SAFE), None)
        self.jump = F(4200000000, 397)

    def test_the_jump_is_where_investor_0_is_indifferent(self):
        found = breakpoints.find(self.wf, 0, 100000000, 500000)
        self.assertEqual([(x, jumps) for x, _, _, jumps in found], [(4000000, False), (5075000, False), (self.jump, True)])

    def test_its_reasons_name_the_group_by_its_series(self):
        x, sl, sr, jumps = breakpoints.find(self.wf, 10000000, 11000000, 500000)[0]
        self.assertEqual(x, self.jump)
        rs = breakpoints.reasons(self.wf, x, sl, sr, jumps)
        # The engine's codes and subjects here: the group's series, the SAFE alone, and the jump.
        self.assertEqual(codes(rs), [("series_converts", "series_0+series_1"), ("safe_switches", "safe_1"), ("payouts_jump", None)])
        self.assertEqual(rs[1]["conversion_amount"], True)
        self.assertIn(
            "SAFE Investor 1's SAFE switches from its Cash-Out Amount to its Conversion Amount, following Series 0 Preferred "
            "and Series 1 Preferred: its Liquidity Capitalization now counts them, so its 79,345.09 conversion shares",
            rs[1]["text"],
        )
        self.assertIn("are worth $1.000000 each just above this exit value, $79,345.09 in all", rs[1]["text"])
        self.assertIn("Investor 0 (holding 88.89% of the group's shares) does better converting", rs[0]["text"])

    def test_payouts_a_cent_either_side(self):
        below, at, above = (self.wf.evaluate(e)[0] for e in (self.jump - CENT, self.jump, self.jump + CENT))
        # Below, and at exactly the jump (E13: an indifferent holder votes to stay): the preferences, the SAFE's cash,
        # and common the rest, 5:1 between the founders. $5,504,345.07 in all a cent below.
        rest = self.jump - CENT - 5075000
        self.assertEqual(below["lines"], {
            ("investor_0", "series_0"): 4000000, ("investor_1", "series_1"): 1000000, ("safe_holder_1", "safe_1"): 75000,
            ("founder_a", "common"): rest * 5 / 6, ("founder_b", "common"): rest / 6,
        })
        self.assertEqual((round(float(rest * 5 / 6), 2), round(float(rest / 6), 2)), (4586954.23, 917390.85))
        self.assertEqual(at["decisions"], (False, False))
        self.assertEqual(at["lines"][("investor_0", "series_0")], 4000000)
        # Above: everyone is common, at x × 0.9925 ÷ 10,500,000 a share, a hair over $1.00; the SAFE gets 0.75% of x.
        e = self.jump + CENT
        price = e * F(397, 4200000000)
        self.assertEqual(above["decisions"], (True, True))
        self.assertEqual(above["lines"], {
            ("investor_0", "series_0"): 4000000 * price, ("investor_1", "series_1"): 500000 * price,
            ("safe_holder_1", "safe_1"): e * F(3, 400),
            ("founder_a", "common"): 5000000 * price, ("founder_b", "common"): 1000000 * price,
        })
        cents = {k: round(float(v), 2) for k, v in above["lines"].items()}
        self.assertEqual(cents, {
            ("investor_0", "series_0"): 4000000.0, ("investor_1", "series_1"): 500000.0, ("safe_holder_1", "safe_1"): 79345.09,
            ("founder_a", "common"): 5000000.0, ("founder_b", "common"): 1000000.0,
        })


class AVoteOnAnOutcomeThatJumps(unittest.TestCase):
    """The group stops converting where SAFE A starts converting under its conversion, though no voter is indifferent.

    Series 0 and Series 1 are $5M each at $1.00, in one tier, and vote together; Investor 0 and Investor 1 hold half
    each. SAFE A ($4.5M at a $27M cap) converts into 1/6 of its Liquidity Capitalization, and SAFE B ($1M at $10M)
    into 1/10. The tier, with the SAFEs' cash, is $15.5M. While the group keeps its preferences it isn't in the
    count (X1), so SAFE B gets 1/10 of what is left after them and SAFE A's cash, more than $1M above $24.5M.

    Converting, with SAFE A taking its cash, the count is 20,000,000 ÷ 0.9 shares, all sharing x − $4.5M, so the
    series get 0.45 × (x − $4.5M): $10M at x = 240,500,000/9 = $26,722,222.22, and the group converts above it.
    Under that conversion SAFE A converts too above $27M, its 1/6 of x more than its $4.5M, and the count becomes
    20,000,000 ÷ (1 − 1/6 − 1/10) = 300,000,000/11. So at $27M the converting outcome the group votes on (E17) jumps
    from 0.45 × $22.5M = $10,125,000 for the series to 11/30 × $27M = $9,900,000, below their $10M: the vote fails
    above $27M, though neither voter is indifferent there. It passes again at 300,000,000/11 = $27,272,727.27, where
    11/30 of x reaches $10M, with SAFE A converting with it.

    The 10j table many-11-0125 has the same stretch, $83,403 wide, between $23,787,077.06 and $23,870,480.48.
    """

    def setUp(self):
        self.wf = Waterfall(CapTable.from_json(GROUP_AND_TWO_SAFES), None)

    def test_the_vote_fails_where_safe_a_converts_under_it(self):
        found = breakpoints.find(self.wf, 0, 40000000, 250000)
        self.assertEqual(
            [(x, jumps) for x, _, _, jumps in found],
            [(15500000, False), (24500000, False), (F(240500000, 9), True), (27000000, True), (F(300000000, 11), True)],
        )
        x, sl, sr, jumps = found[3]
        rs = breakpoints.reasons(self.wf, x, sl, sr, jumps)
        self.assertEqual(codes(rs), [("series_converts", "series_0+series_1"), ("payouts_jump", None)])
        self.assertEqual(rs[0]["converts"], False)
        x, sl, sr, jumps = found[4]
        rs = breakpoints.reasons(self.wf, x, sl, sr, jumps)
        self.assertEqual(codes(rs), [("series_converts", "series_0+series_1"), ("safe_switches", "safe_a"), ("payouts_jump", None)])
        self.assertIn("following Series 0 Preferred and Series 1 Preferred", rs[1]["text"])

    def test_payouts_a_cent_either_side_of_27m(self):
        below, at, above = (self.wf.evaluate(e)[0] for e in (F(27000000) - CENT, F(27000000), F(27000000) + CENT))
        # Below, and at exactly $27M, where SAFE A is indifferent and takes its cash (X16): the group converts.
        e = F(27000000) - CENT
        self.assertEqual(below["decisions"], (True, False, True))
        self.assertEqual(below["lines"], {
            ("investor_0", "series_0"): F(9, 40) * (e - 4500000), ("investor_1", "series_1"): F(9, 40) * (e - 4500000),
            ("founder", "common"): F(9, 20) * (e - 4500000), ("holder_a", "safe_a"): 4500000, ("holder_b", "safe_b"): (e - 4500000) / 10,
        })
        self.assertEqual(at["decisions"], (True, False, True))
        self.assertEqual(at["lines"][("investor_0", "series_0")], 5062500)
        # Above: the group keeps its preferences, SAFE A its cash, and SAFE B 1/10 of what is left.
        e = F(27000000) + CENT
        self.assertEqual(above["decisions"], (False, False, True))
        self.assertEqual(above["lines"], {
            ("investor_0", "series_0"): 5000000, ("investor_1", "series_1"): 5000000, ("founder", "common"): F(9, 10) * (e - 14500000),
            ("holder_a", "safe_a"): 4500000, ("holder_b", "safe_b"): (e - 14500000) / 10,
        })
        # The outcome the group votes on, converting, has jumped below its $10M of preferences (E17).
        self.assertEqual(self.wf.group_choice(e, True), (True, True, True))
        converting = self.wf.group_choice_totals(e)[True]
        self.assertLess(converting["series_0"] + converting["series_1"], 10000000)


class OptionsFollowingASafe(unittest.TestCase):
    """SAFE 1's conversion drops common below the options' $1.39 strike, so the options leave the money at its jump.

    SAFE 0 ($1.2M at an $8M cap) converts into 15% of its Liquidity Capitalization, and SAFE 1 ($2M at $12M) into
    1/6. Issued options count there whether or not they're exercised (X1), so with SAFE 1 taking its cash the count
    is 6,100,000 ÷ 0.85, and common is (x − $2,000,000 + $139,000 of strike cash) × 0.85 ÷ 6,100,000 a share. With
    both converting the count is 6,100,000 ÷ (41/60) = 366,000,000/41.

    SAFE 1 decides (E20); the options settle under each of its choices (E16). Converting, common is x × 41 ÷
    361,900,000 a share, below $1.39 here, so the options aren't exercised, and SAFE 1 gets 61,000,000/361,900,000
    of x. That equals its $2M at x = 723,800,000/61 = $11,865,573.77: the same exit value as at a $1.40 strike,
    where the options don't change at the jump. Just below it common is $1.3941, above the strike; just above,
    $1.3443, below it. The options came into the money at $11,836,294.12, and come back at $12,269,292.68, where
    (x + $139,000) × 41 ÷ 366,000,000 reaches $1.39 with both SAFEs converting.
    """

    def test_the_jump_is_safe_1s_with_the_options_re_settled(self):
        wf = Waterfall(CapTable.from_json(TWO_SAFES_AND_OPTIONS), None)
        found = breakpoints.find(wf, 0, 30000000, 500000)
        jump = F(723800000, 61)
        self.assertEqual(
            [(x, jumps) for x, _, _, jumps in found],
            [(3200000, False), (F(603200000, 61), False), (F(201217000, 17), False), (jump, True), (F(503041000, 41), False)],
        )
        x, sl, sr, jumps = found[3]
        self.assertEqual(
            codes(breakpoints.reasons(wf, x, sl, sr, jumps)),
            [("option_in_the_money", "options"), ("safe_switches", "safe_1"), ("payouts_jump", None)],
        )
        below, above = wf.evaluate(jump - CENT)[0], wf.evaluate(jump + CENT)[0]
        self.assertEqual(below["decisions"], (True, True, False))  # options exercised, SAFE 0 converting, SAFE 1 cash
        self.assertEqual(above["decisions"], (False, True, True))
        self.assertEqual(below["lines"][("safe_holder_1", "safe_1")], 2000000)
        self.assertEqual(above["lines"][("safe_holder_1", "safe_1")], (jump + CENT) * F(610, 3619))
        self.assertEqual(round(float(below["common_price"]), 4), 1.3941)
        self.assertEqual(round(float(above["common_price"]), 4), 1.3443)


if __name__ == "__main__":
    unittest.main()
