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


if __name__ == "__main__":
    unittest.main()
