"""Hand-checkable tests for the reference calculator.

Each test uses numbers small enough to verify on paper; the expected values
are written out in the comments.

    python3 -m unittest discover reference/tests
"""

import datetime
import sys
import unittest
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from spillpoint_ref import breakpoints  # noqa: E402
from spillpoint_ref.case import _schedule_json  # noqa: E402
from spillpoint_ref.model import CapTable  # noqa: E402
from spillpoint_ref.num import exact, money  # noqa: E402
from spillpoint_ref.rounds import build, _anti_dilution_factor  # noqa: E402
from spillpoint_ref.waterfall import Waterfall  # noqa: E402

COMMON = {"id": "common", "name": "Common Stock", "kind": "common"}


def table(securities, positions, seniority, pool=0, groups=()):
    holders = sorted({p[0] for p in positions})
    return CapTable.from_json(
        {
            "holders": [{"id": h, "name": h} for h in holders],
            "securities": securities,
            "seniority": seniority,
            "conversion_groups": list(groups),
            "positions": [{"holder": h, "security": s, "shares": n} for h, s, n in positions],
            "unissued_pool": pool,
        }
    )


def pref(sid, oip, mult, participation, cap=None):
    return {
        "id": sid,
        "name": sid,
        "kind": "preferred",
        "original_issue_price": oip,
        "preference_multiple": mult,
        "participation": participation,
        "cap_multiple": cap,
    }


def payouts(ct, exit_value):
    outs = Waterfall(ct).evaluate(F(exit_value))
    assert len(outs) == 1
    return {k: v for k, v in outs[0]["lines"].items()}


def bp_values(ct, hi):
    return [t[0] for t in breakpoints.find(Waterfall(ct), 0, hi, 100_000)]


class Numbers(unittest.TestCase):
    def test_exact_and_money(self):
        self.assertEqual(exact(F(1, 20)), "0.05")
        self.assertEqual(exact(F(1, 3)), "1/3")
        self.assertEqual(money(F(1, 200)), "0.01")  # half a cent rounds up
        self.assertEqual(money(F(-1, 3)), "-0.33")


class Rounds(unittest.TestCase):
    def run_events(self, events, holders=("a", "b", "c", "s")):
        return build({"holders": [{"id": h, "name": h} for h in holders], "events": events})

    def test_issue_percent(self):
        # Millrace: 6% of the company after issuance on 10,000,000 founder shares.
        # x / (10,000,000 + x) = 0.06  =>  x = 638,297.87…, rounded down to 638,297.
        out = self.run_events(
            [
                {"id": "f", "type": "issue", "security": COMMON, "issues": [{"holder": "a", "shares": 10_000_000}]},
                {"id": "h", "type": "issue_percent", "security": COMMON, "holder": "b", "percent": "6"},
            ]
        )
        self.assertEqual(out[-1][1].positions[("b", "common")], 638_297)

    def test_pool_creation(self):
        # Pool = 10% of (issued + pool): P = 10,638,297 / 9 = 1,182,033 exactly.
        out = self.run_events(
            [
                {"id": "f", "type": "issue", "security": COMMON, "issues": [{"holder": "a", "shares": 10_638_297}]},
                {"id": "p", "type": "create_pool", "percent": "10"},
            ]
        )
        self.assertEqual(out[-1][1].unissued_pool, 1_182_033)

    def round_event(self, **kw):
        ev = {
            "id": "r",
            "type": "priced_round",
            "series": pref("seed", "1", "1", "non_participating") | {"anti_dilution": "none"},
            "pre_money": "18000000",
            "investments": [{"holder": "b", "amount": "2000000"}],
            "pool_target_unissued_percent_post": "0",
            "seniority": [["seed", "seed_shadow"]],
        }
        ev["series"].pop("original_issue_price")
        ev.update(kw)
        return ev

    def test_post_money_safe_cap(self):
        # 9,000,000 common; a $1M SAFE at a $10M post-money cap owns 10% of
        # Company Capitalization, so CC = 9M / 0.9 = 10M and the Safe Price is $1.00.
        # Round: $2M at $18M pre (SAFE in the pre-money), no pool:
        #   post FD = (9M + 1M) / (1 − 2/20) = 11,111,111.1…, price = 20M / that = $1.80.
        #   SAFE: 1,000,000 shares at $1.00. New money: floor(2M / 1.8) = 1,111,111.
        out = self.run_events(
            [
                {"id": "f", "type": "issue", "security": COMMON, "issues": [{"holder": "a", "shares": 9_000_000}]},
                {"id": "s", "type": "safes", "safes": [{"id": "s1", "holder": "s", "purchase_amount": "1000000", "post_money_cap": "10000000", "discount": "0"}]},
                self.round_event(),
            ]
        )
        ev, ct, d = out[-1]
        self.assertEqual(d["price_per_share"], "1.8")
        self.assertEqual(d["company_capitalization"], "10000000")
        self.assertEqual(ct.positions[("s", "seed_shadow")], 1_000_000)
        self.assertEqual(ct.securities["seed_shadow"]["original_issue_price"], F(1))
        self.assertEqual(ct.positions[("b", "seed")], 1_111_111)

    def test_post_money_safe_discount_beats_cap(self):
        # Same company, but the SAFE has a $100M cap and a 20% discount.
        # Discount branch: SAFE shares = 1M / (0.8 × price) = post FD / 16.
        #   post FD × (1 − 0.1 − 1/16) = 9M  =>  post FD = 10,746,268.65…, price = $1.86111…
        #   discount price = $1.48888…, SAFE shares = floor(1M / 1.48888…) = 671,641.
        # Cap price = 100M / (9M / 0.99) = $11.00, which is higher, so the discount wins.
        out = self.run_events(
            [
                {"id": "f", "type": "issue", "security": COMMON, "issues": [{"holder": "a", "shares": 9_000_000}]},
                {"id": "s", "type": "safes", "safes": [{"id": "s1", "holder": "s", "purchase_amount": "1000000", "post_money_cap": "100000000", "discount": "0.2"}]},
                self.round_event(),
            ]
        )
        ev, ct, d = out[-1]
        self.assertEqual(F(d["price_per_share"]), F(20_000_000) / (F(9_000_000) / F(67, 80)))
        self.assertEqual(d["safe_conversions"][0]["method"], "discount")
        self.assertEqual(ct.positions[("s", "seed_shadow")], 671_641)

    def test_pool_already_meets_target(self):
        # 900,000 common and a 100,000-share pool (10% of 1,000,000). Round:
        # $2M at $8M pre ($10M post), pool target 5% of post-money FD.
        # Without a top-up: x = 1,000,000 + 0.2x  =>  x = 1,250,000, and the
        # pool is 8% of that, already above 5%. So no top-up (R16): price
        # $10M ÷ 1,250,000 = $8.00, the investor gets 250,000 shares, exactly 20%.
        # (Pricing as if the pool were at 5% would give x = 900,000 ÷ 0.75 =
        # 1,200,000 and $8.33, leaving the investor below 20% of the real total.)
        out = self.run_events(
            [
                {"id": "f", "type": "issue", "security": COMMON, "issues": [{"holder": "a", "shares": 900_000}]},
                {"id": "p", "type": "create_pool", "percent": "10"},
                self.round_event(pre_money="8000000", pool_target_unissued_percent_post="5", seniority=[["seed"]]),
            ]
        )
        ev, ct, d = out[-1]
        self.assertEqual((d["price_per_share"], d["pool_top_up"]), ("8", 0))
        self.assertEqual((ct.positions[("b", "seed")], ct.unissued_pool), (250_000, 100_000))
        self.assertEqual(ct.fully_diluted(), 1_250_000)

    def test_pay_to_play(self):
        # 450,000 common; preferred p at $2 (no anti-dilution): s1 300,000, s2 100,000.
        # Round: $200,000 at $800,000 pre ($1M post). Pay-to-play on p, with
        # $100,000 offered to p's holders: s1 must buy 75% = $75,000, s2 25% = $25,000.
        # s1 buys $75,000 and keeps p. s2 buys nothing: 100,000 p × 1/2 = 50,000 common.
        # Priced after the conversion (default): 800,000 shares before the
        # money, x = 800,000 ÷ 0.8 = 1,000,000, $1.00 a share; s1 gets 75,000, b 125,000.
        # Priced before it: x = 850,000 ÷ 0.8 = 1,062,500, $16/17 a share;
        # s1 gets floor(79,687.5) = 79,687, b floor(132,812.5) = 132,812.
        def run(after=True, s2_amount=None, ad="none", partial=None):
            invest = [{"holder": "s1", "amount": "75000"}, {"holder": "b", "amount": "125000"}]
            if s2_amount:
                invest.append({"holder": "s2", "amount": s2_amount})
            return self.run_events(
                [
                    {"id": "f", "type": "issue", "security": COMMON, "issues": [{"holder": "a", "shares": 450_000}]},
                    # p at $2: $800,000 at $900,000 pre on 450,000 shares, so x = 850,000.
                    self.round_event(
                        id="p", series=pref("p", "2", "1", "non_participating") | {"anti_dilution": ad}, pre_money="900000",
                        investments=[{"holder": "s1", "amount": "600000"}, {"holder": "s2", "amount": "200000"}],
                        seniority=[["p"]],
                    ),
                    self.round_event(
                        pre_money="800000",
                        investments=invest,
                        seniority=[["seed"], ["p"]],
                        pay_to_play={"series": ["p"], "offered_amount": "100000", "conversion_ratio": "0.5",
                                     "priced_after_conversion": after}
                        | ({"partial_participation": partial} if partial else {}),
                    ),
                ],
                holders=("a", "b", "s1", "s2"),
            )[-1]

        ev, ct, d = run()
        self.assertEqual(d["price_per_share"], "1")
        self.assertEqual([(r["holder"], r["required"], r["participates"]) for r in d["pay_to_play"]["holders"]],
                         [("s1", "75000", True), ("s2", "25000", False)])
        self.assertEqual((ct.positions[("s2", "common")], ct.positions.get(("s2", "p"))), (50_000, None))
        self.assertEqual((ct.positions[("s1", "seed")], ct.positions[("b", "seed")], ct.fully_diluted()), (75_000, 125_000, 1_000_000))
        ev, ct, d = run(after=False)
        self.assertEqual(F(d["price_per_share"]), F(16, 17))
        self.assertEqual((ct.positions[("s1", "seed")], ct.positions[("b", "seed")], ct.positions[("s2", "common")]), (79_687, 132_812, 50_000))
        # Partial participation (R20): s2 buys $10,000 of its $25,000, 40%.
        # By default all its p converts: 100,000 × 1/2 = 50,000 common.
        ev, ct, d = run(s2_amount="10000")
        self.assertEqual((ct.positions[("s2", "common")], ct.positions.get(("s2", "p"))), (50_000, None))
        self.assertEqual(d["pay_to_play"]["holders"][1]["fraction_bought"], "0.4")
        # Proportionally, it keeps floor(100,000 × 40%) = 40,000 p, and 60,000 convert to 30,000 common.
        ev, ct, d = run(s2_amount="10000", partial="convert_proportionally")
        self.assertEqual((ct.positions[("s2", "common")], ct.positions[("s2", "p")]), (30_000, 40_000))
        # With anti-dilution (R21): the round is down ($1 against p's $2); s2 converts with no adjustment,
        # s1's p is adjusted, and A counts the table after the conversion: 450,000 + 300,000 + 50,000.
        for after in (True, False):
            ev, ct, d = run(ad="broad_based", after=after)
            (adj,) = d["anti_dilution"]
            self.assertEqual((adj["series"], adj["A"]), ("p", "800000"))
            self.assertEqual(ct.positions[("s2", "common")], 50_000)
            self.assertLess(F(adj["cp2"]), F(2))

    def test_broad_based_weighted_average(self):
        # Textbook: A = 2,000,000 (1M common + 1M Series A as converted), CP1 = $1.00.
        # New issue: 1,000,000 shares for $500,000. B = 500,000, C = 1,000,000.
        # CP2 = 1.00 × (2.0M + 0.5M) / (2.0M + 1.0M) = $0.8333…
        ct = table(
            [COMMON, pref("a", "1", "1", "non_participating") | {"anti_dilution": "broad_based"}],
            [("x", "common", 1_000_000), ("y", "a", 1_000_000)],
            [["a"]],
            pool=500_000,
        )
        factor = _anti_dilution_factor(ct, "a", "broad_based", 1_000_000, 500_000, F(1, 2), False)
        self.assertEqual(F(1) / factor, F(5, 6))
        # Toggle: counting the 500,000 unissued pool in A gives (2.5M + 0.5M)/(2.5M + 1M) = 6/7.
        factor = _anti_dilution_factor(ct, "a", "broad_based", 1_000_000, 500_000, F(1, 2), True)
        self.assertEqual(F(1) / factor, F(6, 7))

    def test_narrow_based_and_full_ratchet(self):
        # Same issue: 1,000,000 new shares for $500,000 at $0.50, CP1 = $1.00.
        # Narrow-based A = the 1,000,000 Series A shares only (R15):
        #   CP2 = 1.00 × (1.0M + 0.5M) / (1.0M + 1.0M) = $0.75.
        # Full ratchet: CP2 = the new issue price, $0.50.
        def ct(rule, a_def):
            return table(
                [COMMON, pref("a", "1", "1", "non_participating") | {"anti_dilution": rule, "anti_dilution_a": a_def}],
                [("x", "common", 1_000_000), ("y", "a", 1_000_000)],
                [["a"]],
                pool=500_000,
            )

        factor = _anti_dilution_factor(ct("narrow_based", "outstanding_preferred"), "a", "narrow_based", 1_000_000, 500_000, F(1, 2), False)
        self.assertEqual(F(1) / factor, F(3, 4))
        factor = _anti_dilution_factor(ct("full_ratchet", None), "a", "full_ratchet", 1_000_000, 500_000, F(1, 2), False)
        self.assertEqual(F(1) / factor, F(1, 2))
        # A definition that doesn't fit the method is refused.
        with self.assertRaisesRegex(ValueError, "doesn't fit narrow_based"):
            ct("narrow_based", "outstanding_common_options_preferred")


class Exits(unittest.TestCase):
    def test_common_only(self):
        ct = table([COMMON], [("x", "common", 600), ("y", "common", 400)], [])
        p = payouts(ct, 1000)
        self.assertEqual(p[("x", "common")], 600)
        self.assertEqual(p[("y", "common")], 400)
        self.assertEqual(bp_values(ct, 1_000_000), [])

    def test_non_participating(self):
        # 1M preferred at $1 (1x, $1M preference), 1M common.
        # Below $1M all to preferred; then common; converts when E/2 > $1M, i.e. E > $2M.
        ct = table([COMMON, pref("p", "1", "1", "non_participating")], [("x", "common", 1_000_000), ("y", "p", 1_000_000)], [["p"]])
        self.assertEqual(payouts(ct, 1_500_000), {("x", "common"): 500_000, ("y", "p"): 1_000_000})
        self.assertEqual(payouts(ct, 3_000_000), {("x", "common"): 1_500_000, ("y", "p"): 1_500_000})
        self.assertEqual(bp_values(ct, 5_000_000), [1_000_000, 2_000_000])

    def test_breakpoints_strictly_inside_the_range(self):
        # Edge case 2's shape: the preference is paid at $3M and the series converts at $15M.
        # A breakpoint at either end of the range isn't inside it, so it isn't reported (SPEC).
        ct = table([COMMON, pref("p", "1.5", "1", "non_participating")],
                   [("x", "common", 8_000_000), ("y", "p", 2_000_000)], [["p"]])
        self.assertEqual(bp_values(ct, 20_000_000), [3_000_000, 15_000_000])
        found = [t[0] for t in breakpoints.find(Waterfall(ct), 3_000_000, 15_000_000, 1_000_000)]
        self.assertEqual(found, [])

    def test_participating(self):
        # 1x participating, uncapped: at $3M, preferred takes $1M then half of $2M.
        ct = table([COMMON, pref("p", "1", "1", "participating")], [("x", "common", 1_000_000), ("y", "p", 1_000_000)], [["p"]])
        self.assertEqual(payouts(ct, 3_000_000), {("x", "common"): 1_000_000, ("y", "p"): 2_000_000})
        self.assertEqual(bp_values(ct, 5_000_000), [1_000_000])

    def test_participating_capped(self):
        # 1x participating capped at 2x ($2M total). Pref $1M + half the residual
        # hits $2M at E = $3M. Flat until E/2 > $2M, i.e. converts above $4M.
        ct = table([COMMON, pref("p", "1", "1", "participating_capped", "2")], [("x", "common", 1_000_000), ("y", "p", 1_000_000)], [["p"]])
        self.assertEqual(payouts(ct, 3_500_000), {("x", "common"): 1_500_000, ("y", "p"): 2_000_000})
        self.assertEqual(payouts(ct, 5_000_000), {("x", "common"): 2_500_000, ("y", "p"): 2_500_000})
        self.assertEqual(bp_values(ct, 6_000_000), [1_000_000, 3_000_000, 4_000_000])

    def test_options_with_strike_cash(self):
        # 1M common, 1M options at $1. In the money once common > $1, i.e. E > $1M.
        # At E = $3M: proceeds = 3M + 1M strike = 4M over 2M shares = $2.00.
        # Common $2M; options $2M gross − $1M strike = $1M net. Net payouts sum to E.
        ct = table(
            [COMMON, {"id": "o", "name": "o", "kind": "option", "strike": "1"}],
            [("x", "common", 1_000_000), ("y", "o", 1_000_000)],
            [],
        )
        self.assertEqual(payouts(ct, 3_000_000), {("x", "common"): 2_000_000, ("y", "o"): 1_000_000})
        self.assertEqual(payouts(ct, 500_000), {("x", "common"): 500_000, ("y", "o"): 0})
        self.assertEqual(bp_values(ct, 5_000_000), [1_000_000])

    def test_pari_passu_shortfall(self):
        # Two series in one tier, preferences $1M and $3M; $2M exit splits 1:3.
        ct = table(
            [COMMON, pref("p", "1", "1", "non_participating"), pref("q", "3", "1", "non_participating")],
            [("x", "common", 1_000_000), ("y", "p", 1_000_000), ("z", "q", 1_000_000)],
            [["p", "q"]],
        )
        p = payouts(ct, 2_000_000)
        self.assertEqual(p[("y", "p")], 500_000)
        self.assertEqual(p[("z", "q")], 1_500_000)

    def two_series(self, groups=()):
        # 8M common; series s1: 1M shares at $1 (1x, $1M); s2: 1M shares at $3 (1x, $3M); one tier.
        return table(
            [COMMON, pref("s1", "1", "1", "non_participating"), pref("s2", "3", "1", "non_participating")],
            [("x", "common", 8_000_000), ("y", "s1", 1_000_000), ("z", "s2", 1_000_000)],
            [["s1", "s2"]],
            groups=groups,
        )

    def test_per_series_conversion(self):
        # Tier paid at $4M. s1 converts when (E − $3M) / 9M > $1, so above $12M.
        # s2 converts when E / 10M > $3, so above $30M.
        self.assertEqual(bp_values(self.two_series(), 40_000_000), [4_000_000, 12_000_000, 30_000_000])

    def test_group_vote_more_than_half(self):
        # Must convert together; converts only if holders of MORE than 50% of the
        # group's shares each do strictly better converting. Each series is
        # exactly 50%, so both must gain. Converting pays each series E/10:
        # s1 gains above $10M (E/10 > $1M), s2 above $30M (E/10 > $3M).
        # So the group converts above $30M, and payouts jump there.
        ct = self.two_series(groups=[["s1", "s2"]])
        self.assertEqual(bp_values(ct, 40_000_000), [4_000_000, 30_000_000])
        # At $30M s2 is indifferent and votes to stay: s1 $1M, s2 $3M, common $26M.
        p = payouts(ct, 30_000_000)
        self.assertEqual((p[("y", "s1")], p[("z", "s2")], p[("x", "common")]), (1_000_000, 3_000_000, 26_000_000))
        # Just above, converted: each series E/10, common 80%.
        p = payouts(ct, 35_000_000)
        self.assertEqual((p[("y", "s1")], p[("z", "s2")], p[("x", "common")]), (3_500_000, 3_500_000, 28_000_000))

    def test_group_vote_at_least_half(self):
        # Threshold AT LEAST 50%: s1 alone carries the vote once it gains, above $10M.
        ct = self.two_series(
            groups=[{"series": ["s1", "s2"], "vote_threshold_percent": "50", "vote_rule": "at_least"}]
        )
        self.assertEqual(bp_values(ct, 40_000_000), [4_000_000, 10_000_000])
        p = payouts(ct, 10_000_000)  # s1 indifferent, votes to stay
        self.assertEqual((p[("y", "s1")], p[("z", "s2")], p[("x", "common")]), (1_000_000, 3_000_000, 6_000_000))
        p = payouts(ct, 12_000_000)  # converted: s2 drops to E/10
        self.assertEqual((p[("y", "s1")], p[("z", "s2")], p[("x", "common")]), (1_200_000, 1_200_000, 9_600_000))

    def test_warrant_for_preferred(self):
        # 8M common; seed 2M shares at $1 (1x non-participating, $2M); a warrant
        # for 200,000 seed at $0.50.
        # Exercise once each seed share is worth more than $0.50:
        #   (E + $100k) / 2.2M > $0.50  =>  E > $1M.
        # Seed tier (now 2.2M shares, $2.2M) is fully paid at E + $100k = $2.2M  =>  E = $2.1M.
        # Seed converts when (E + $100k) / 10.2M > $1  =>  E > $10.1M.
        ct = table(
            [
                COMMON,
                pref("seed", "1", "1", "non_participating"),
                {"id": "w", "name": "w", "kind": "warrant", "strike": "0.5", "underlying": "seed"},
            ],
            [("x", "common", 8_000_000), ("y", "seed", 2_000_000), ("l", "w", 200_000)],
            [["seed"]],
        )
        self.assertEqual(bp_values(ct, 20_000_000), [1_000_000, 2_100_000, 10_100_000])
        # At $1.5M: $1.6M of proceeds over 2.2M seed shares. The warrant gets
        # 200k/2.2M of it, less the $100k strike.
        p = payouts(ct, 1_500_000)
        self.assertEqual(p[("l", "w")], F(200_000 * 1_600_000, 2_200_000) - 100_000)
        self.assertEqual(p[("y", "seed")], F(2_000_000 * 1_600_000, 2_200_000))
        self.assertEqual(p[("x", "common")], 0)

    def test_cumulative_dividends(self):
        # 1M preferred at $1 (1x non-participating), 1M common. 10% simple
        # cumulative dividend from 2024-01-01 to a 2025-01-01 exit: 366 actual
        # days (2024 is a leap year), Actual/365, so $0.10 × 366/365 per share.
        # Preference P = $1,000,000 + $100,000 × 366/365 = $1,100,273.97…
        # Tier paid at E = P. Converts (forfeiting dividends) when E/2 > P, i.e. E > 2P.
        sec = pref("p", "1", "1", "non_participating") | {
            "cumulative_dividend": {"rate": "0.10", "method": "simple", "accrual_start": "2024-01-01"}
        }
        ct = table([COMMON, sec], [("x", "common", 1_000_000), ("y", "p", 1_000_000)], [["p"]])
        wf = Waterfall(ct, datetime.date(2025, 1, 1))
        p_amt = F(1_000_000) + F(100_000) * F(366, 365)
        self.assertEqual(wf.pref["p"], p_amt)
        self.assertEqual([t[0] for t in breakpoints.find(wf, 0, 5_000_000, 100_000)], [p_amt, 2 * p_amt])
        # Converted at $3M: each side gets half; the dividends are gone.
        out = wf.evaluate(F(3_000_000))[0]["lines"]
        self.assertEqual(out[("y", "p")], 1_500_000)

    def test_carve_out_tiered(self):
        # 1M preferred at $1 (1x non-participating), 1M common. Carve-out: 10%
        # of the first $2M of exit value, nothing above, all to manager m.
        # Below $2M the waterfall runs on 0.9 × E: the preference is paid at
        # 0.9E = $1M, E = $1,111,111.11…  The carve-out ends at $2M ($200k).
        # Above that, the preferred converts when (E − $200k)/2 > $1M, E > $2.2M.
        ct = CapTable.from_json(
            {
                "holders": [{"id": h, "name": h} for h in ("x", "y", "m")],
                "securities": [COMMON, pref("p", "1", "1", "non_participating")],
                "seniority": [["p"]],
                "positions": [{"holder": "x", "security": "common", "shares": 1_000_000},
                              {"holder": "y", "security": "p", "shares": 1_000_000}],
                "carve_out": {
                    "tiers": [{"from": "0", "to": "2000000", "percent": "10"}],
                    "allocation": [{"holder": "m", "percent": "100"}],
                },
            }
        )
        self.assertEqual(bp_values(ct, 5_000_000), [F(10_000_000, 9), 2_000_000, 2_200_000])
        p = payouts(ct, 3_000_000)  # pool $200k; $2.8M shared 50/50 after conversion
        self.assertEqual((p[("m", "carve_out")], p[("y", "p")], p[("x", "common")]), (200_000, 1_400_000, 1_400_000))

    def test_earnout_runs_on_cumulative_proceeds(self):
        # 1M preferred at $1 (1x non-participating), 1M common.
        # $500k at closing: all to preferred. A later $1M takes the cumulative
        # total to $1.5M: preferred $1M, common $500k. So the later payment's
        # take is $500k each, not $1M to preferred as a standalone waterfall
        # on $1M would give.
        ct = table([COMMON, pref("p", "1", "1", "non_participating")], [("x", "common", 1_000_000), ("y", "p", 1_000_000)], [["p"]])
        sched = {"id": "s", "payments": [{"label": "closing", "amount": "500000"}, {"label": "earnout", "amount": "1000000"}]}
        closing, earnout = _schedule_json(Waterfall(ct), sched)["payments"]
        self.assertEqual(closing["holder_totals"], {"x": "0.00", "y": "500000.00"})
        self.assertEqual(earnout["holder_totals"], {"x": "500000.00", "y": "500000.00"})

    def group_with_options(self, groups=None):
        # 1M common; Series A 2M at $2 (1x, $4M) senior to Series B 3M at $2 (1x, $6M);
        # A and B must convert together by more than 50%; 500,000 options at $0.50.
        return CapTable.from_json(
            {
                "holders": [{"id": h, "name": h} for h in "fxye"],
                "securities": [COMMON, pref("a", "2", "1", "non_participating"), pref("b", "2", "1", "non_participating"),
                               {"id": "o", "name": "o", "kind": "option", "strike": "0.5"}],
                "seniority": [["a"], ["b"]],
                "conversion_groups": groups if groups is not None else [["a", "b"]],
                "positions": [{"holder": "f", "security": "common", "shares": 1_000_000},
                              {"holder": "x", "security": "a", "shares": 2_000_000},
                              {"holder": "y", "security": "b", "shares": 3_000_000},
                              {"holder": "e", "security": "o", "shares": 500_000}],
            }
        )

    def test_options_follow_the_price_and_the_group_decides_first(self):
        # At $7.2M, holding the options fixed left no stable answer (the vote and the
        # exercise chased each other). With E16 and E17 the group compares two settled outcomes:
        #   stays:    A $4M, B $3.2M, common $0, so the options aren't exercised.
        #   converts: ($7.2M + $250k strike) / 6.5M shares = $1.146154 a share, so they are:
        #             B gets 3M × that = $3,438,461.54.
        # B does better converting and holds 60% of the group, so the group converts.
        wf = Waterfall(self.group_with_options())
        (out,) = wf.evaluate(F(7_200_000))
        price = F(7_450_000, 6_500_000)
        self.assertEqual(out["decisions"], (True, True))
        self.assertEqual(out["lines"][("y", "b")], 3_000_000 * price)
        self.assertEqual(out["lines"][("e", "o")], 500_000 * (price - F(1, 2)))

    def test_jump_where_the_pivotal_voter_stops_being_indifferent(self):
        # E13: s1 ($7.5M, 1x) and s0 ($15M, 3x, capped at 4x) share the senior tier;
        # s2 ($9M, 3x) is junior; s0 and s2 convert together by at least 50%, half each.
        # Below $7.5M, s2's holder gets nothing whether the group converts or stays: if it
        # converts, s1's $7.5M preference takes everything; if it stays, the senior tier
        # absorbs it all. Just above $7.5M, converting pays s2 a share of the excess, so it
        # votes yes and its 50% carries the vote. Its two outcomes don't cross; they
        # separate after being equal. The jump sits exactly at $7.5M.
        ct = CapTable.from_json(
            {
                "holders": [{"id": h, "name": h} for h in ("f", "h0", "h1", "h2")],
                "securities": [
                    COMMON,
                    pref("s0", "5", "3", "participating_capped", cap="4"),
                    pref("s1", "3", "1", "non_participating"),
                    pref("s2", "3", "3", "non_participating"),
                ],
                "seniority": [["s1", "s0"], ["s2"]],
                "conversion_groups": [{"series": ["s0", "s2"], "vote_threshold_percent": "50", "vote_rule": "at_least"}],
                "positions": [{"holder": "f", "security": "common", "shares": 4_000_000},
                              {"holder": "h0", "security": "s0", "shares": 1_000_000},
                              {"holder": "h1", "security": "s1", "shares": 2_500_000},
                              {"holder": "h2", "security": "s2", "shares": 1_000_000}],
            }
        )
        found = {x: jumps for x, _, _, jumps in breakpoints.find(Waterfall(ct), 0, 10_000_000, 1_000_000)}
        self.assertIs(found.get(F(7_500_000)), True)
        # At exactly $7.5M the outcome from below holds: the group stays, and s0 takes 2/3 of the tier.
        self.assertEqual(payouts(ct, 7_500_000)[("h0", "s0")], 5_000_000)

    def test_more_than_one_group_is_refused(self):
        with self.assertRaisesRegex(ValueError, "more than one conversion group"):
            Waterfall(self.group_with_options(groups=[["a"], ["b"]]))

    def test_cap_below_preference_is_refused_and_an_equal_cap_is_non_participating(self):
        with self.assertRaisesRegex(ValueError, "below its preference"):
            table([COMMON, pref("p", "1", "2", "participating_capped", cap="1.5")], [("x", "common", 1)], [["p"]])
        # A 1x cap on a 1x preference leaves no room to participate: same payouts as non-participating.
        rows = [("x", "common", 1_000_000), ("y", "p", 1_000_000)]
        capped = table([COMMON, pref("p", "1", "1", "participating_capped", cap="1")], rows, [["p"]])
        plain = table([COMMON, pref("p", "1", "1", "non_participating")], rows, [["p"]])
        for e in (500_000, 1_500_000, 2_000_000, 3_000_000):
            self.assertEqual(payouts(capped, e), payouts(plain, e))

    def unconverted_safe(self, securities, positions, seniority=()):
        holders = sorted({p[0] for p in positions} | {"s"})
        return CapTable.from_json(
            {
                "holders": [{"id": h, "name": h} for h in holders],
                "securities": securities,
                "seniority": list(seniority),
                "positions": [{"holder": h, "security": sec, "shares": n} for h, sec, n in positions],
                "unissued_pool": 50_000,
                "unconverted_safes": [
                    {"id": "safe", "holder": "s", "purchase_amount": "100000", "post_money_cap": "1000000", "discount": "0"}
                ],
            }
        )

    def test_unconverted_safe_at_liquidity_event(self):
        # 800,000 common, 100,000 options at $10 (out of the money), a 50,000
        # unissued pool, and a $100k post-money SAFE with a $1M cap.
        # Liquidity Capitalization counts common, all options, and the SAFE's
        # own shares, not the pool: LC = 900,000 ÷ (1 − 100k/1M) = 1,000,000.
        # Liquidity Price = $1M ÷ 1,000,000 = $1, so 100,000 conversion shares.
        # Cash-out ($100k ahead of common) is fully paid at $100k. Converting
        # pays more once common is worth more than $1 a share: E ÷ 900,000 > $1,
        # E > $900k. That is below $1M because the options count in LC but
        # don't share. Options come in only at (E + $1M) ÷ 1M > $10, E > $9M.
        ct = self.unconverted_safe(
            [COMMON, {"id": "o", "name": "o", "kind": "option", "strike": "10"}],
            [("x", "common", 800_000), ("e", "o", 100_000)],
        )
        wf = Waterfall(ct)
        (f,) = wf.safes
        self.assertEqual((wf.liquidity_capitalization(f), wf.liquidity_price(f)), (1_000_000, 1))
        self.assertEqual(bp_values(ct, 5_000_000), [100_000, 900_000])
        p = payouts(ct, 500_000)  # cash-out
        self.assertEqual((p[("s", "safe")], p[("x", "common")], p[("e", "o")]), (100_000, 400_000, 0))
        p = payouts(ct, 1_800_000)  # converted: 100,000 of 900,000 sharing shares
        self.assertEqual((p[("s", "safe")], p[("x", "common")], p[("e", "o")]), (200_000, 1_600_000, 0))

    def test_unconverted_safe_with_preferred_is_refused(self):
        ct = self.unconverted_safe(
            [COMMON, pref("p", "1", "1", "non_participating")],
            [("x", "common", 800_000), ("y", "p", 100_000)],
            [["p"]],
        )
        with self.assertRaisesRegex(ValueError, "alongside preferred stock"):
            Waterfall(ct)

    def test_unconverted_note_at_exit(self):
        # 800,000 common, 100,000 options at $10 (out of the money), a 100,000
        # unissued pool. A $100k note at 10% simple from 2023-01-01 to a
        # 2024-01-01 exit: 365 days, so $10k interest. Repayment is
        # 2 × $110k = $220k, paid ahead of common. Principal plus interest
        # converts at the $1M pre-money cap ÷ the base, the note not counted:
        #   with pool:    1,000,000 shares, $1.00,  110,000 shares
        #   without pool:   900,000 shares, $1.111…, 99,000 shares
        #   common only:    800,000 shares, $1.25,   88,000 shares
        # Converting pays more once note shares × E ÷ (800,000 + note shares) > $220k:
        #   with pool $220k × 910/110 = $1,820,000; without $220k × 899/99 =
        #   $17,980,000/9; common only $220k × 888/88 = $2,220,000.
        def ct(base):
            return CapTable.from_json(
                {
                    "holders": [{"id": h, "name": h} for h in ("x", "e", "n")],
                    "securities": [COMMON, {"id": "o", "name": "o", "kind": "option", "strike": "10"}],
                    "seniority": [],
                    "positions": [{"holder": "x", "security": "common", "shares": 800_000},
                                  {"holder": "e", "security": "o", "shares": 100_000}],
                    "unissued_pool": 100_000,
                    "unconverted_notes": [
                        {"id": "note", "holder": "n", "principal": "100000", "interest_rate": "0.10",
                         "issue_date": "2023-01-01", "valuation_cap": "1000000", "conversion_base": base,
                         "discount": "0", "repayment_multiple": "2"}
                    ],
                }
            )

        exit_date = datetime.date(2024, 1, 1)
        for base, shares, switch in (
            ("with_pool", 110_000, 1_820_000),
            ("without_pool", 99_000, F(17_980_000, 9)),
            ("common_only", 88_000, 2_220_000),
        ):
            wf = Waterfall(ct(base), exit_date)
            (n,) = wf.notes
            self.assertEqual((wf.note_repayment(n), wf.note_conversion_shares(n)), (220_000, shares))
            self.assertEqual([t[0] for t in breakpoints.find(wf, 0, 3_000_000, 100_000)], [220_000, switch])
        wf = Waterfall(ct("with_pool"), exit_date)
        p = wf.evaluate(F(1_000_000))[0]["lines"]  # repayment
        self.assertEqual((p[("n", "note")], p[("x", "common")], p[("e", "o")]), (220_000, 780_000, 0))
        p = wf.evaluate(F(2_730_000))[0]["lines"]  # converted: 110,000 of 910,000 sharing shares
        self.assertEqual((p[("n", "note")], p[("x", "common")], p[("e", "o")]), (330_000, 2_400_000, 0))


if __name__ == "__main__":
    unittest.main()
