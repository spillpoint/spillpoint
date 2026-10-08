"""Hand-checkable tests for the reference calculator.

Each test uses numbers small enough to verify on paper; the expected values
are written out in the comments.

    python3 -m unittest discover reference/tests
"""

import datetime
import json
import sys
import unittest
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

CASES = Path(__file__).resolve().parent.parent.parent / "cases"

from spillpoint_ref import breakpoints  # noqa: E402
from spillpoint_ref.case import _schedule_json, run_case  # noqa: E402
from spillpoint_ref.model import CapTable, compounding_periods, safe_from_json  # noqa: E402
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

    def test_warrants_issued_count_like_options(self):
        # R29: 900,000 common; a 10% pool, 100,000; warrants for 100,000 common at $1 to l, not drawn
        # from the pool. A $110k round at $1.1M pre-money with no pool target is priced on 1,100,000
        # shares, warrants included: $1.00 a share, so b gets 110,000. Without them it would be $1.10.
        events = [
            {"id": "f", "type": "issue", "security": COMMON, "issues": [{"holder": "a", "shares": 900_000}]},
            {"id": "p", "type": "create_pool", "percent": "10"},
            {"id": "w", "type": "issue_warrants", "warrants": [{"holder": "l", "shares": 100_000, "strike": "1", "underlying": "common"}]},
            self.round_event(pre_money="1100000", investments=[{"holder": "b", "amount": "110000"}], seniority=[["seed"]]),
        ]
        out = self.run_events(events, holders=("a", "b", "l"))
        _, after_warrants, _ = out[2]
        self.assertEqual((after_warrants.unissued_pool, after_warrants.positions[("l", "warrants_common_1")]), (100_000, 100_000))
        _, ct, d = out[-1]
        self.assertEqual(d["price_per_share"], "1")
        self.assertEqual(ct.positions[("b", "seed")], 110_000)
        events[2]["warrants"][0]["underlying"] = "series_z"
        with self.assertRaisesRegex(ValueError, "not common or an issued preferred series"):
            self.run_events(events, holders=("a", "b", "l"))

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

    def test_dividends_on_a_rounds_series(self):
        # R30: 9,000,000 common; a $1M SAFE at a $10M post-money cap; a $2M round at $18M pre, its
        # series with an 8% cumulative dividend. They accrue from the round's date, and the series from
        # SAFEs carries the same terms from the same date, on its own $1.00 issue price.
        def events(dividend, date="2024-01-01"):
            series = pref("seed", "1", "1", "non_participating") | {"anti_dilution": "none", "cumulative_dividend": dividend}
            series.pop("original_issue_price")
            return [
                {"id": "f", "type": "issue", "security": COMMON, "issues": [{"holder": "a", "shares": 9_000_000}]},
                {"id": "s", "type": "safes", "safes": [{"id": "s1", "holder": "s", "purchase_amount": "1000000", "post_money_cap": "10000000", "discount": "0"}]},
                self.round_event(series=series, date=date),
            ]

        _, ct, _ = self.run_events(events({"rate": "0.08", "method": "simple", "on_conversion": "forfeited"}))[-1]
        for sid in ("seed", "seed_shadow"):
            self.assertEqual(ct.securities[sid]["cumulative_dividend"]["accrual_start"], datetime.date(2024, 1, 1))
        self.assertEqual(ct.securities["seed_shadow"]["original_issue_price"], 1)
        with self.assertRaisesRegex(ValueError, "accrue from its date; give no accrual_start"):
            self.run_events(events({"rate": "0.08", "accrual_start": "2023-01-01"}))
        with self.assertRaisesRegex(ValueError, "so the round needs a date"):
            self.run_events(events({"rate": "0.08"}, date=None))

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

    def test_pro_rata_above_entitlement_is_refused(self):
        # Edge case 18 with Investor X marking $1,200,000 as pro-rata. The round is then $6,200,000 and X's
        # entitlement 2,000,000 ÷ 11,000,000 of it, $1,127,272.72 to the cent, rounded down (M4d, R6).
        inputs = json.loads((CASES / "edge-18-pro-rata-with-safe" / "inputs.json").read_text())
        inputs["events"][-1]["investments"] = [
            {"holder": "investor_y", "amount": "5000000"},
            {"holder": "investor_x", "amount": "1200000", "pro_rata": True},
        ]
        with self.assertRaises(ValueError) as caught:
            run_case(inputs)
        self.assertIn(
            "Investor X's pro-rata investment of $1,200,000.00 is more than its pro-rata entitlement of $1,127,272.72 "
            "(18.181818% of the $6,200,000.00 round). Mark $1,127,272.72 as pro-rata and enter the other $72,727.28 "
            "as an ordinary investment in the same round.",
            str(caught.exception),
        )

    def test_post_money_safe_with_a_note_is_refused(self):
        # A post-money SAFE's Company Capitalization counts every other converting security: owed before release.
        inputs = json.loads((CASES / "edge-18-pro-rata-with-safe" / "inputs.json").read_text())
        inputs["holders"].append({"id": "investor_n", "name": "Investor N"})
        inputs["events"].insert(3, {"id": "note", "date": "2023-05-01", "type": "notes", "notes": [{
            "id": "note_n", "holder": "investor_n", "principal": "500000", "interest_rate": "0", "interest_method": "simple",
            "issue_date": "2023-05-01", "valuation_cap": "9000000", "cap_type": "pre_money", "conversion_base": "with_pool",
            "discount": "0", "repayment_multiple": "1"}]})
        inputs["events"][-1]["convert_notes"] = True
        with self.assertRaisesRegex(ValueError, "post-money SAFE converting alongside notes or pre-money SAFEs"):
            run_case(inputs)

    def test_a_safe_has_one_kind_of_cap(self):
        with self.assertRaisesRegex(ValueError, "not both"):
            safe_from_json({"id": "s", "holder": "h", "purchase_amount": "1", "post_money_cap": "10", "pre_money_cap": "8"})

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

    def test_compounding_dividends(self):
        # X5: 1M preferred at $1, 10% compounding annually from 2024-02-29. Its anniversaries fall on
        # 28 February in other years: two full years to 2026-02-28, $1 × 1.1² = $1.21 a share, then
        # 181 days to a 2026-08-28 exit, simple on $1.21: $1.21 × (1 + 0.1 × 181/365) − $1 accrued.
        def wf(start, exit_date):
            sec = pref("p", "1", "1", "non_participating") | {
                "cumulative_dividend": {"rate": "0.10", "method": "compounding", "accrual_start": start}
            }
            return Waterfall(table([COMMON, sec], [("x", "common", 1_000_000), ("y", "p", 1_000_000)], [["p"]]), exit_date)

        self.assertEqual(compounding_periods(datetime.date(2024, 2, 29), datetime.date(2026, 8, 28)), (2, 181))
        accrued = wf("2024-02-29", datetime.date(2026, 8, 28)).dividend["p"]
        self.assertEqual(accrued, 1_000_000 * (F(121, 100) * (1 + F(1, 10) * F(181, 365)) - 1))
        # A full year is exactly the rate, even with 366 days in it.
        self.assertEqual(wf("2023-03-01", datetime.date(2024, 3, 1)).dividend["p"], 100_000)

    def test_dividends_paid_on_conversion(self):
        # X5: 1M preferred at $1 (1x non-participating), 1M common; 10% simple from 2023-01-01 to a
        # 2024-01-01 exit, 365 days: $100,000. Paid on conversion, converting keeps a $100,000 claim
        # in p's tier and shares half of the rest: p converts once (E − $100k)/2 > $1M, E > $2.1M.
        # (Forfeited, it would convert at E/2 > $1.1M, E > $2.2M.) At $3M: $100k + $1.45M = $1.55M.
        def ct(on_conversion):
            sec = pref("p", "1", "1", "non_participating") | {
                "cumulative_dividend": {"rate": "0.10", "method": "simple", "accrual_start": "2023-01-01", "on_conversion": on_conversion}
            }
            return table([COMMON, sec], [("x", "common", 1_000_000), ("y", "p", 1_000_000)], [["p"]])

        wf = Waterfall(ct("paid"), datetime.date(2024, 1, 1))
        self.assertEqual([t[0] for t in breakpoints.find(wf, 0, 5_000_000, 100_000)], [1_100_000, 2_100_000])
        self.assertEqual(wf.evaluate(F(3_000_000))[0]["lines"][("y", "p")], 1_550_000)
        # The other reading, the dividends added to what converts, is refused.
        with self.assertRaisesRegex(ValueError, "X5's other reading"):
            ct("added_to_conversion")

    def test_carve_out_alongside_preferences(self):
        # X7: 1M preferred at $1 (1x non-participating, $1M), 1M common; a flat 10% carve-out to m,
        # paid alongside the preferences. It shares p's tier pro rata by claim, and its claim is 0.1E,
        # so it gets E × 0.1E ÷ (0.1E + $1M): a curve, until the tier is paid at E = $1M + 0.1E,
        # E = $10M/9. At $1M: m $1M × $100k ÷ $1.1M = $90,909.09…, p $909,090.90…
        # Above, as before the preferences: p converts once 0.9E/2 > $1M, E > $20M/9.
        def ct(seniority=(["p"],), securities=None, positions=None):
            return CapTable.from_json(
                {
                    "holders": [{"id": h, "name": h} for h in ("x", "y", "m")],
                    "securities": securities or [COMMON, pref("p", "1", "1", "non_participating")],
                    "seniority": list(seniority),
                    "positions": positions or [{"holder": "x", "security": "common", "shares": 1_000_000},
                                               {"holder": "y", "security": "p", "shares": 1_000_000}],
                    "carve_out": {
                        "timing": "alongside_preferences",
                        "tiers": [{"from": "0", "to": None, "percent": "10"}],
                        "allocation": [{"holder": "m", "percent": "100"}],
                    },
                }
            )

        wf = Waterfall(ct())
        found = breakpoints.find(wf, 0, 5_000_000, 100_000)
        self.assertEqual([(x, jumps) for x, _, _, jumps in found], [(F(10_000_000, 9), False), (F(20_000_000, 9), False)])
        self.assertEqual([(breakpoints.curved(wf, sa), breakpoints.curved(wf, sb)) for _, sa, sb, _ in found], [(True, False), (False, False)])
        p = payouts(ct(), 1_000_000)
        self.assertEqual((p[("m", "carve_out")], p[("y", "p")]), (F(1_000_000, 11), F(10_000_000, 11)))
        # With no preferred, alongside them is simply first.
        common_only = ct(seniority=(), securities=[COMMON], positions=[{"holder": "x", "security": "common", "shares": 1_000_000}])
        p = payouts(common_only, 1_000_000)
        self.assertEqual((p[("m", "carve_out")], p[("x", "common")]), (100_000, 900_000))

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

    def test_unconverted_safe_with_a_cap_ignores_its_discount(self):
        # X9: at a sale a capped SAFE converts at its cap; a discount applies only in a financing.
        securities = [COMMON, {"id": "o", "name": "o", "kind": "option", "strike": "10"}]
        positions = [("x", "common", 800_000), ("e", "o", 100_000)]
        plain = self.unconverted_safe(securities, positions)
        discounted = self.unconverted_safe(securities, positions)
        discounted.safes[0]["discount"] = F(1, 5)
        for e in (50_000, 500_000, 1_800_000):
            self.assertEqual(payouts(discounted, e), payouts(plain, e))
        self.assertEqual(bp_values(discounted, 5_000_000), [100_000, 900_000])

    def test_unconverted_safe_with_no_cap_jumps_where_it_can_first_convert(self):
        # 800,000 common and a $100k SAFE with no cap and a 20% discount. Converting at the common
        # price less 20% is worth exactly $100k / 0.8 = $125k wherever 0.8 x the exit value exceeds
        # $100k. Below $125k no such price exists, so it takes its $100k Cash-Out Amount (X9,
        # the literal reading); above, $125k. Its payout jumps at $125k, by $25k.
        ct = self.unconverted_safe([COMMON], [("x", "common", 800_000)])
        ct.safes[0]["post_money_cap"] = None
        ct.safes[0]["discount"] = F(1, 5)
        self.assertEqual(bp_values(ct, 1_000_000), [100_000, 125_000])
        found = breakpoints.find(Waterfall(ct), 0, 1_000_000, 100_000)
        self.assertEqual([t[3] for t in found], [False, True])
        self.assertEqual(payouts(ct, 120_000)[("s", "safe")], 100_000)
        self.assertEqual(payouts(ct, 125_000)[("s", "safe")], 100_000)  # the outcome from below holds at the jump
        self.assertEqual(payouts(ct, 500_000)[("s", "safe")], 125_000)
        # An MFN SAFE, with no discount either: converting is worth exactly its purchase amount, a tie, so the Cash-Out Amount (E5).
        ct.safes[0]["discount"] = F(0)
        self.assertEqual(Waterfall(ct).evaluate(F(500_000))[0]["decisions"], (False,))

    def test_unconverted_safe_with_no_cap_beside_a_capped_series(self):
        # 800,000 common; p, 200,000 shares at $1, participating, capped at 2x ($400k in all), its own tier;
        # a $100k SAFE with no cap and a 20% discount, its Cash-Out Amount ranking with p's tier. Converting
        # is worth exactly $100k / 0.8 = $125k, taken out first; p and common share the rest, p stopping at
        # its cap (12i, 0.3.0 work). The tier ($200k + $100k) is paid at $300k; conversion is possible above
        # $200k + $125k = $325k; at a price of (X - $325k) / 1,000,000 = $1 p reaches its cap, at $1,325k;
        # and p converts once a fifth of X - $125k beats $400k, above $2,125k.
        ct = self.unconverted_safe(
            [COMMON, pref("p", "1", "1", "participating_capped", cap="2")], [("x", "common", 800_000), ("y", "p", 200_000)], [["p"]]
        )
        ct.safes[0]["post_money_cap"] = None
        ct.safes[0]["discount"] = F(1, 5)
        self.assertEqual(bp_values(ct, 3_000_000), [300_000, 325_000, 1_325_000, 2_125_000])
        # At $1M: the price is $0.675; p gets $200k + $135k, common $540k, the SAFE $125k.
        self.assertEqual(payouts(ct, 1_000_000), {("x", "common"): 540_000, ("y", "p"): 335_000, ("s", "safe"): 125_000})
        # At $1.8M p sits at its cap; at $3M it has converted, a fifth of $2,875k.
        self.assertEqual(payouts(ct, 1_800_000), {("x", "common"): 1_275_000, ("y", "p"): 400_000, ("s", "safe"): 125_000})
        self.assertEqual(payouts(ct, 3_000_000), {("x", "common"): 2_300_000, ("y", "p"): 575_000, ("s", "safe"): 125_000})

    def test_unconverted_safe_alongside_preferred(self):
        # 800,000 common; p, 100,000 shares at $1 (non-participating, its own tier); a $100k SAFE
        # capped at $1M. Its Cash-Out Amount ranks with p's tier, pro rata: at $150k each gets 1/2.
        # Its Liquidity Capitalization leaves p out while p keeps its preference:
        # 800,000 / 0.9 = 888,888.89, a Liquidity Price of $1.125; counting p it would be 1,000,000 and $1.
        ct = self.unconverted_safe(
            [COMMON, pref("p", "1", "1", "non_participating")],
            [("x", "common", 800_000), ("y", "p", 100_000)],
            [["p"]],
        )
        wf = Waterfall(ct)
        (f,) = wf.safes
        self.assertEqual(wf.liquidity_capitalization(f, {"p": False}), F(8_000_000, 9))
        self.assertEqual(wf.liquidity_capitalization(f, {"p": True}), 1_000_000)
        p = payouts(ct, 150_000)
        self.assertEqual((p[("s", "safe")], p[("y", "p")], p[("x", "common")]), (75_000, 75_000, 0))
        # Participating preferred takes its preference and an as-converted share, so it counts.
        part = self.unconverted_safe(
            [COMMON, pref("p", "1", "1", "participating")],
            [("x", "common", 800_000), ("y", "p", 100_000)],
            [["p"]],
        )
        self.assertEqual(Waterfall(part).liquidity_capitalization(part.safes[0], {}), 1_000_000)

    def add_safe(self, ct, sid, holder, amount, **caps):
        ct.add_holder(holder, holder)
        ct.safes.append(safe_from_json({"id": sid, "holder": holder, "purchase_amount": amount, "discount": "0", **caps}))

    def test_two_safes_share_one_liquidity_capitalization(self):
        # 800,000 common; SAFE s, $100k at a $1M post-money cap; SAFE t, $50k at $250k.
        # Cash-outs share pro rata by purchase amount up to $150k (X13): at $90k, s $60k and t $30k.
        # One Liquidity Capitalization for the company, counting every converting SAFE:
        # t alone 800,000 ÷ 0.8 = 1,000,000, t's shares 1/5 of it; both 800,000 ÷ 0.7.
        # t converts at (E − $100k) ÷ 5 = $50k, E = $350k. s converts, with t converting, at
        # E ÷ 10 = $100k, E = $1M. There t's shares grow from 200,000 to 228,571.43, so its payout
        # jumps from $180k to $200k and common's drops from $720k to $700k. At exactly $1M s is
        # indifferent and takes its Cash-Out Amount (X16), so the outcome from below holds.
        ct = self.unconverted_safe([COMMON], [("x", "common", 800_000)])
        self.add_safe(ct, "safe_t", "t", "50000", post_money_cap="250000")
        wf = Waterfall(ct)
        s, t = wf.safes
        self.assertEqual(wf.liquidity_capitalization(s, {}, [s, t]), F(8_000_000, 7))
        self.assertEqual(wf.liquidity_capitalization(t, {}, [t]), 1_000_000)
        found = breakpoints.find(wf, 0, 3_000_000, 100_000)
        self.assertEqual([(x, jumps) for x, _, _, jumps in found], [(150_000, False), (350_000, False), (1_000_000, True)])
        p = payouts(ct, 90_000)
        self.assertEqual((p[("s", "safe")], p[("t", "safe_t")]), (60_000, 30_000))
        p = payouts(ct, 1_000_000)
        self.assertEqual((p[("s", "safe")], p[("t", "safe_t")], p[("x", "common")]), (100_000, 180_000, 720_000))
        p = payouts(ct, 2_000_000)
        self.assertEqual((p[("s", "safe")], p[("t", "safe_t")], p[("x", "common")]), (200_000, 400_000, 1_400_000))

    def test_two_safes_need_post_money_caps(self):
        ct = self.unconverted_safe([COMMON], [("x", "common", 800_000)])
        self.add_safe(ct, "safe_t", "t", "50000")
        with self.assertRaisesRegex(ValueError, "only when each has a post-money cap"):
            Waterfall(ct)

    def test_safe_cash_out_ranks_with_a_named_series(self):
        # p (senior) and q (junior), 100,000 shares each at $1, 1x non-participating; 800,000 common;
        # a $100k SAFE. By default its Cash-Out Amount ranks with q, the most junior tier: at $150k,
        # p $100k, then q and the SAFE $25k each. Ranking with p: p and the SAFE $75k each, q nothing.
        def ct(ranks_with=None):
            c = self.unconverted_safe(
                [COMMON, pref("p", "1", "1", "non_participating"), pref("q", "1", "1", "non_participating")],
                [("x", "common", 800_000), ("y", "p", 100_000), ("z", "q", 100_000)],
                [["p"], ["q"]],
            )
            c.safes[0]["cash_out_ranks_with"] = ranks_with
            return c

        p = payouts(ct(), 150_000)
        self.assertEqual((p[("y", "p")], p[("s", "safe")], p[("z", "q")]), (100_000, 25_000, 25_000))
        p = payouts(ct("p"), 150_000)
        self.assertEqual((p[("y", "p")], p[("s", "safe")], p[("z", "q")]), (75_000, 75_000, 0))
        with self.assertRaisesRegex(ValueError, "not a preferred series in the seniority tiers"):
            Waterfall(ct("r"))

    def test_pre_money_safe_at_a_sale(self):
        # 800,000 common, 100,000 options at $10, a 50,000 unissued pool, and a $100k SAFE on a
        # $1.8M pre-money cap (X14). Its Liquidity Capitalization counts stock and options, not the
        # pool or itself: 900,000, so $2 a share and 50,000 shares, on top. It converts once
        # 50,000 ÷ 850,000 of the exit value beats $100k: E = $1.7M.
        ct = self.unconverted_safe(
            [COMMON, {"id": "o", "name": "o", "kind": "option", "strike": "10"}],
            [("x", "common", 800_000), ("e", "o", 100_000)],
        )
        ct.safes[0].update(post_money_cap=None, pre_money_cap=F(1_800_000))
        wf = Waterfall(ct)
        (f,) = wf.safes
        self.assertEqual((wf.liquidity_capitalization(f), wf.liquidity_price(f), wf.safe_conversion_shares(f)), (900_000, 2, 50_000))
        self.assertEqual(bp_values(ct, 3_000_000), [100_000, 1_700_000])
        self.assertEqual(payouts(ct, 3_400_000)[("s", "safe")], 200_000)
        # Alongside preferred it is refused: the pre-money text ranks its cash only against other SAFEs.
        with_p = self.unconverted_safe([COMMON, pref("p", "1", "1", "non_participating")], [("x", "common", 800_000), ("y", "p", 1)], [["p"]])
        with_p.safes[0].update(post_money_cap=None, pre_money_cap=F(1_800_000))
        with self.assertRaisesRegex(ValueError, "pre-money SAFE alongside preferred"):
            Waterfall(with_p)

    def test_two_notes_rank_equally(self):
        # 800,000 common. Note n: $100k at 0%, cap $800k on the with_pool base, so $1 a share and
        # 100,000 shares; note m: $50k, cap $200k, $0.25 and 200,000 shares. Neither counts the other
        # (X15). Both repaid at 1x, sharing a shortfall pro rata up to $150k: at $90k, $60k and $30k.
        # m converts at 200,000 ÷ 1,000,000 × (E − $100k) = $50k, E = $350k; then n at
        # 100,000 ÷ 1,100,000 × E = $100k, E = $1.1M.
        ct = self.note_table("800000", "0")
        ct.add_holder("m", "m")
        ct.notes.append(dict(ct.notes[0], id="note_m", holder="m", principal=F(50_000), valuation_cap=F(200_000)))
        wf = Waterfall(ct, datetime.date(2024, 1, 1))
        self.assertEqual([wf.note_conversion_shares(n) for n in wf.notes], [100_000, 200_000])
        self.assertEqual([(x, jumps) for x, _, _, jumps in breakpoints.find(wf, 0, 2_000_000, 100_000)],
                         [(150_000, False), (350_000, False), (1_100_000, False)])
        lines = wf.evaluate(F(90_000))[0]["lines"]
        self.assertEqual((lines[("n", "note")], lines[("m", "note_m")]), (60_000, 30_000))
        ct.notes[1]["valuation_cap"] = None
        ct.notes[1]["discount"] = F(1, 5)
        with self.assertRaisesRegex(ValueError, "only when each has a valuation cap"):
            Waterfall(ct, datetime.date(2024, 1, 1))

    def note_table(self, cap, discount, multiple="1", preferred=False):
        securities = [COMMON] + ([pref("p", "1", "1", "non_participating")] if preferred else [])
        positions = [{"holder": "x", "security": "common", "shares": 800_000}]
        if preferred:
            positions.append({"holder": "y", "security": "p", "shares": 100_000})
        return CapTable.from_json(
            {
                "holders": [{"id": h, "name": h} for h in ("x", "y", "n")],
                "securities": securities,
                "seniority": [["p"]] if preferred else [],
                "positions": positions,
                "unconverted_notes": [
                    {"id": "note", "holder": "n", "principal": "100000", "interest_rate": "0", "issue_date": "2023-01-01",
                     "valuation_cap": cap, "conversion_base": "with_pool", "discount": discount, "repayment_multiple": multiple}
                ],
            }
        )

    def test_unconverted_note_with_no_cap(self):
        # A $100k note at 0% with no cap and a 20% discount, repaid at 1x: converting is worth
        # exactly $125k wherever there is room, so it is repaid $100k below $125k and takes $125k
        # above, a jump (X12, the literal reading). With neither a cap nor a discount it is only repaid.
        exit_date = datetime.date(2024, 1, 1)
        wf = Waterfall(self.note_table(None, "0.2"), exit_date)
        self.assertEqual([wf.evaluate(F(e))[0]["lines"][("n", "note")] for e in (120_000, 500_000)], [100_000, 125_000])
        found = breakpoints.find(wf, 0, 1_000_000, 100_000)
        self.assertEqual([(t[0], t[3]) for t in found], [(100_000, False), (125_000, True)])
        repay_only = Waterfall(self.note_table(None, "0"), exit_date)
        self.assertEqual(repay_only.note_ids, [])
        self.assertEqual(repay_only.evaluate(F(10_000_000))[0]["lines"][("n", "note")], 100_000)

    def test_unconverted_note_with_a_cap_ignores_its_discount_and_counts_preferred_in_its_base(self):
        # X12: a capped note converts at its cap price at a sale. Its with_pool base counts preferred
        # as converted: 800,000 + 100,000 = 900,000, so a $900k cap is $1 a share and 100,000 shares.
        exit_date = datetime.date(2024, 1, 1)
        wf = Waterfall(self.note_table("900000", "0.2", preferred=True), exit_date)
        (n,) = wf.notes
        self.assertEqual((wf.note_conversion_base(n), wf.note_conversion_price(n), wf.note_conversion_shares(n)), (900_000, 1, 100_000))
        # Repayment is debt, ahead of p's preference: at $150k the note gets $100k and p $50k.
        lines = wf.evaluate(F(150_000))[0]["lines"]
        self.assertEqual((lines[("n", "note")], lines[("y", "p")]), (100_000, 50_000))

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


class SaleTerms(unittest.TestCase):
    """A carve-out given on the exit, as a term of the sale (C6, case 24, 0.3.0 work)."""

    def company(self, **exit_terms):
        return {
            "case": "carve-out on the sale",
            "holders": [{"id": "a", "name": "A"}, {"id": "m", "name": "M"}],
            "events": [
                {"id": "founding", "date": None, "type": "issue", "security": dict(COMMON), "issues": [{"holder": "a", "shares": 1_000_000}]},
            ],
            "exit": {"cap_table_after_event": "founding", "range": ["0", "1000000"], "exit_values": ["500000"], **exit_terms},
        }

    def test_carve_out_on_the_exit_of_a_company_built_from_rounds(self):
        # 10% of $500k to M, before everything; A's common takes the other $450k.
        carve_out = {"tiers": [{"from": "0", "to": None, "percent": "10"}], "allocation": [{"holder": "m", "percent": "100"}]}
        out = run_case(self.company(carve_out=carve_out))
        totals = out["exit"]["payouts"][0]["equilibria"][0]["holder_totals"]
        self.assertEqual(totals, {"a": "450000.00", "m": "50000.00"})

    def test_carve_out_on_both_the_cap_table_and_the_exit_is_refused(self):
        carve_out = {"tiers": [{"from": "0", "to": None, "percent": "10"}], "allocation": [{"holder": "m", "percent": "100"}]}
        inputs = self.company(carve_out=carve_out)
        table = CapTable.from_json(
            {
                "holders": inputs["holders"],
                "securities": [dict(COMMON)],
                "seniority": [],
                "positions": [{"holder": "a", "security": "common", "shares": 1_000_000}],
                "carve_out": carve_out,
            }
        ).to_json()
        exit_ = {k: v for k, v in inputs["exit"].items() if k != "cap_table_after_event"}
        with self.assertRaisesRegex(ValueError, "on both the cap table and the exit"):
            run_case({"case": "both", "exit": {**exit_, "cap_table": table}})
