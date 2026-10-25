"""Hand-checkable tests for the fund reference.

Each test uses numbers small enough to check on paper, with the working in the
comments. The spec's worked examples A, B and C are here too, to the cent.

    python3 -m unittest discover packages/fund/reference/tests
"""

import copy
import datetime
import json
import random
import sys
import unittest
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
CASES = Path(__file__).resolve().parents[2] / "cases"

from fund_ref import breakpoints, fees  # noqa: E402
from fund_ref.accounts import Model  # noqa: E402
from fund_ref.case import apply_change, run_case  # noqa: E402
from fund_ref.closes import equalization  # noqa: E402
from fund_ref.inputs import Refusal, read  # noqa: E402
from fund_ref.lps import each_lp, shares  # noqa: E402
from fund_ref.num import days, exact, money, multiple, percent, usd  # noqa: E402
from fund_ref.waterfall import Waterfall  # noqa: E402


def call(date, amount, kind="investment"):
    return {"date": date, "type": "call", "kind": kind, "amount": amount}


def dist(date, amount):
    return {"date": date, "type": "distribution", "amount": amount}


def fund(terms, flows, as_of, **more):
    return Waterfall(read({"as_of": as_of, "terms": terms, "cash_flows": flows, **more}))


def codes(found):
    return [(money(x), [r["code"] for r in rs]) for x, rs in found]


EXAMPLE_A = {
    "terms": {
        "carry": {"steps": [{"rate": "0.20"}, {"rate": "0.25", "from_lp_multiple": "3"}]},
        "gp_commitment": {"share": "0.01"},
    },
    "flows": [
        call("2021-01-15", "8000000"),
        call("2021-01-15", "495000", "fee"),
        call("2022-01-15", "495000", "fee"),
        call("2022-06-01", "2000000"),
        dist("2024-05-01", "4000000"),
    ],
    "as_of": "2026-09-30",
}

EXAMPLE_B = {
    "terms": {"carry": "0.20", "pref": {"rate": "0.08"}, "catch_up": {"gp_share": "1"}},
    "flows": [call("2020-01-01", "10000000")],
    "as_of": "2025-01-01",
}

EXAMPLE_C = {
    "terms": {"carry": "0.20"},
    "flows": [call("2020-03-01", "10000000"), dist("2022-03-01", "15000000"), call("2023-03-01", "2000000")],
    "as_of": "2025-03-01",
}


class Numbers(unittest.TestCase):
    def test_money_rounds_half_away_from_zero(self):
        self.assertEqual(money(F(4004383561643, 1000000)), "4004383.56")
        self.assertEqual(money(F(5, 1000)), "0.01")
        self.assertEqual(money(0), "0.00")

    def test_reason_wording(self):
        # FC6: whole dollars without cents, otherwise to the cent; rates as percents; multiples to one place at least.
        self.assertEqual(usd(10890000), "$10,890,000")
        self.assertEqual(usd(F(292320000, 73)), "$4,004,383.56")
        self.assertEqual(percent(F(8, 100)), "8%")
        self.assertEqual(percent(F(75, 1000)), "7.5%")
        self.assertEqual(multiple(3), "3.0x")
        self.assertEqual(multiple(F(9, 4)), "2.25x")
        self.assertEqual(exact(F(1, 3)), "1/3")

    def test_whole_days_with_leap_days(self):
        # F6, F17: 2020 and 2024 are leap years. 366 + 365 + 365 + 365 + 366 = 1,827.
        self.assertEqual(days(datetime.date(2020, 1, 1), datetime.date(2025, 1, 1)), 1827)
        self.assertEqual(days(datetime.date(2023, 7, 1), datetime.date(2024, 7, 1)), 366)


class GpCommitment(unittest.TestCase):
    """F3: fee-free by default, paying its share of investment and expense calls."""

    flows = [call("2021-01-01", "1000"), call("2021-01-01", "100", "fee"), call("2021-01-01", "50", "expense")]

    def paid_in(self, gp):
        wf = fund({"gp_commitment": gp}, self.flows, "2022-01-01")
        return wf.before.lps_paid_in, wf.before.gp_commitment_paid_in

    def test_defaults(self):
        # 10% of 1,000 and of 50: 105. LPs: 900 + 100 + 45 = 1,045.
        self.assertEqual(self.paid_in({"share": "0.1"}), (1045, 105))

    def test_pays_fees_and_not_expenses(self):
        # 10% of 1,000 and of 100: 110. LPs: 900 + 90 + 50 = 1,040.
        self.assertEqual(self.paid_in({"share": "0.1", "pays_fees": True, "pays_expenses": False}), (1040, 110))

    def test_gets_its_share_of_every_distribution_outside_the_tiers(self):
        # X = 2,000: 200 to the GP commitment, 1,800 down the tiers: 1,045 capital, then 755 at 80/20.
        out = fund({"gp_commitment": {"share": "0.1"}}, self.flows, "2022-01-01").evaluate(2000)
        self.assertEqual(out.this.gp_commitment, 200)
        self.assertEqual(out.this.lp_capital, 1045)
        self.assertEqual(out.this.gp_carry, [F(151)])


class SpecExamples(unittest.TestCase):
    def test_a_the_vc_default(self):
        wf = fund(**EXAMPLE_A)
        # The earlier $4,000,000: $40,000 to the GP commitment, $3,960,000 to LPs as capital.
        self.assertEqual(wf.before.to_date.gp_commitment, 40000)
        self.assertEqual(wf.before.to_date.lp_capital, 3960000)
        self.assertEqual(wf.before.lps_paid_in, 10890000)
        self.assertEqual(codes(breakpoints.find(wf)), [("7000000.00", ["capital_returned"]), ("34500000.00", ["carry_step"])])
        out = wf.evaluate(34500000)
        self.assertEqual(out.this.gp_carry, [F(5445000), F(0)])
        self.assertEqual(out.this.gp_commitment, 345000)
        self.assertEqual(out.ledger.to_date.lps, 3 * 10890000)
        # Above $34,500,000: 75% LPs, 25% carry, of the 99% that runs the tiers.
        above = wf.evaluate(34600000)
        self.assertEqual(above.this.gp_carry[1], F(100000) * F(99, 100) * F(1, 4))

    def test_a_reasons_read_as_the_spec_words_them(self):
        found = dict(breakpoints.find(fund(**EXAMPLE_A)))
        self.assertEqual(found[F(7000000)][0]["text"], "LPs have their $10,890,000 of paid-in capital back")
        self.assertEqual(found[F(34500000)][0]["text"], "LPs reach 3.0x: carry is 25% from here")

    def test_b_a_pref_and_full_catch_up(self):
        wf = fund(**EXAMPLE_B)
        # 1,827 days: 10,000,000 × 8% × 1,827 / 365 = 4,004,383.56.
        self.assertEqual(money(wf.before.pref_accrued), "4004383.56")
        found = breakpoints.find(wf)
        self.assertEqual(
            [(money(x), rs[0]["code"]) for x, rs in found],
            [("10000000.00", "capital_returned"), ("14004383.56", "pref_met"), ("15005479.45", "catch_up_done")],
        )
        out = wf.evaluate(found[2][0])
        self.assertEqual(money(out.this.gp_catch_up), "1001095.89")  # 20% of 5,005,479.45 of profit
        self.assertEqual(found[1][1][0]["text"], "LPs have their 8% pref, $4,004,383.56")
        self.assertEqual(found[2][1][0]["text"], "the GP has 20% of the profit")

    def test_b_as_a_hard_hurdle(self):
        terms = dict(EXAMPLE_B["terms"])
        del terms["catch_up"]
        wf = fund(terms, EXAMPLE_B["flows"], EXAMPLE_B["as_of"])
        found = breakpoints.find(wf)
        # F15: both tiers are all to LPs, but each ends, so each is a breakpoint.
        self.assertEqual(codes(found), [("10000000.00", ["capital_returned"]), ("14004383.56", ["pref_met"])])
        # 80/20 from there: $1,000 more gives the GP $200.
        self.assertEqual(wf.evaluate(found[1][0] + 1000).this.gp_carry, [F(200)])

    def test_c_a_clawback(self):
        wf = fund(**EXAMPLE_C, final=True)
        # Paid $1,000,000 of carry on $5,000,000 of profit; total profit is $3,000,000 + X.
        for x, entitled, owed in [(0, 600000, 400000), (1000000, 800000, 200000), (2000000, 1000000, 0), (3000000, 1200000, 0)]:
            out = wf.evaluate(x)
            self.assertEqual((out.entitlement, out.clawback), (entitled, owed), x)
        # Capital returned and clawback cleared together.
        self.assertEqual(codes(breakpoints.find(wf)), [("2000000.00", ["capital_returned", "clawback_cleared"])])


class Pref(unittest.TestCase):
    def test_accrues_on_a_balance_that_falls(self):
        # 10% on 1,000 for 2021 is 100. The 2022-01-01 distribution of 400 is all capital (F5 before F6), so 600 is
        # unreturned through 2022: 60 more. Pref to D: 160, of which none is paid.
        wf = fund({"pref": {"rate": "0.1"}}, [call("2021-01-01", "1000"), dist("2022-01-01", "400")], "2023-01-01")
        self.assertEqual(wf.before.pref_accrued, 160)
        self.assertEqual(codes(breakpoints.find(wf)), [("600.00", ["capital_returned"]), ("760.00", ["pref_met"])])

    def test_capital_called_on_d_accrues_none(self):
        # F4: calls come first on D, and X returns them the same day.
        wf = fund({"pref": {"rate": "0.1"}}, [call("2021-01-01", "1000"), call("2022-01-01", "500")], "2022-01-01")
        self.assertEqual(wf.before.pref_accrued, 100)
        self.assertEqual(wf.before.lps_paid_in, 1500)

    def test_hurdle_balance_never_below_zero(self):
        # F12: 1,000 called, 3,000 back after a year, 500 called the next year. The hurdle balance is 1,000 for the
        # first year and max(0, 1,500 − 3,000) = 0 after, so the run on the totals has 100 of pref, not 150.
        terms = {"pref": {"rate": "0.1"}}
        flows = [call("2020-01-01", "1000"), dist("2021-01-01", "3000"), call("2022-01-01", "500")]
        wf = fund(terms, flows, "2023-01-01", final=True)
        # 2020 has 366 days: 10% × 1,000 × 366 / 365.
        self.assertEqual(wf.before.hurdle_pref, F(100 * 366, 365))
        # The running pref adds 10% × 500 for 2022.
        self.assertEqual(wf.before.pref_accrued, F(100 * 366, 365) + 50)


class Steps(unittest.TestCase):
    terms = {"carry": {"steps": [{"rate": "0.2"}, {"rate": "0.3", "from_lp_multiple": "2"}]}}

    def test_a_step_applies_only_above_its_threshold(self):
        # F11: 100 called. 20% until LPs have 200: they keep 80 of each 100, so 125 more after capital. Then 30%.
        wf = fund(self.terms, [call("2021-01-01", "100")], "2022-01-01")
        self.assertEqual(codes(breakpoints.find(wf)), [("100.00", ["capital_returned"]), ("225.00", ["carry_step"])])
        self.assertEqual(wf.evaluate(325).this.gp_carry, [F(25), F(30)])

    def test_carry_starts_at_the_step_the_lps_are_already_past(self):
        # 100 called, 300 back: capital 100, 125 at 20% (GP 25), 75 at 30% (GP 22.5). LPs have 252.5.
        # Then 20 more called: LPs are at 252.5 / 120, past 2x, so after X's 20 of capital the carry tier is at 30%.
        wf = fund(self.terms, [call("2020-01-01", "100"), dist("2021-01-01", "300"), call("2022-01-01", "20")], "2023-01-01")
        self.assertEqual(wf.before.to_date.lps, F(505, 2))
        self.assertEqual(codes(breakpoints.find(wf)), [("20.00", ["capital_returned"])])
        self.assertEqual(wf.evaluate(120).this.gp_carry, [F(0), F(30)])

    def test_a_late_call_leaves_a_clawback_more_distributions_never_clear(self):
        # F12's last paragraph, in case 13's shape at a tenth of a millionth: it holds at 0.65625 for good.
        flows = [call("2020-01-01", "10"), dist("2022-01-01", "30"), call("2023-01-01", "10")]
        wf = fund(self.terms, flows, "2025-01-01", final=True)
        self.assertEqual([wf.evaluate(x).clawback for x in (0, 10, 15, F(255, 16), 100)], [F(11, 4), F(3, 4), F(3, 4), F(21, 32), F(21, 32)])
        found = breakpoints.find(wf)
        self.assertEqual(
            [(exact(x), [(r["code"], r.get("change")) for r in rs]) for x, rs in found],
            [
                ("10", [("capital_returned", None), ("clawback_changes", "stops_falling")]),
                ("15", [("clawback_changes", "starts_to_fall")]),
                ("15.9375", [("carry_step", None), ("clawback_changes", "stops_falling")]),
            ],
        )
        self.assertEqual(found[1][1][0]["fund_totals"], "carry_step")
        self.assertEqual(
            found[1][1][0]["text"], "the clawback owed starts to fall: on the fund's totals, LPs reach 2.0x: carry is 30% from here"
        )


class Nav(unittest.TestCase):
    def test_the_nav_point_is_final(self):
        # F14: the NAV point reports the clawback even when X isn't final; the other points don't.
        case = {
            "case": "nav",
            "xs": ["1"],
            "fund": {"as_of": "2025-03-01", "terms": {"carry": "0.2"}, "cash_flows": EXAMPLE_C["flows"], "nav": "1000000"},
        }
        points = {p["x"]: p for p in run_case(case)["points"]}
        self.assertNotIn("clawback", points["1.00"])
        self.assertEqual(points["1000000.00"]["clawback"], {"carry_paid": "1000000.00", "entitlement": "800000.00", "owed": "200000.00"})
        self.assertEqual(points["1000000.00"]["tags"], ["nav"])


BASE = {"as_of": "2025-01-01", "terms": EXAMPLE_B["terms"], "cash_flows": EXAMPLE_B["flows"]}


class Refusals(unittest.TestCase):
    """F18 beyond the fixtures in packages/fund/cases/fund-14-refused."""

    def refused(self, change):
        with self.assertRaises(Refusal) as ctx:
            read(apply_change(BASE, change))
        return (ctx.exception.kind, ctx.exception.term, ctx.exception.path)

    def test_input_fields(self):
        self.assertEqual(self.refused({"set": {"currency": "USD"}}), ("input", "unknown_field", "currency"))
        self.assertEqual(self.refused({"del": "as_of"}), ("input", "missing_field", "as_of"))
        self.assertEqual(self.refused({"set": {"final": "yes"}}), ("input", "bad_field", "final"))
        self.assertEqual(self.refused({"set": {"distribution_date": "2025-13-01"}}), ("input", "bad_date", "distribution_date"))
        self.assertEqual(self.refused({"set": {"nav": "-1"}}), ("input", "bad_number", "nav"))
        self.assertEqual(self.refused({"set": {"cash_flows[0].amount": "0"}}), ("input", "bad_number", "cash_flows[0].amount"))
        self.assertEqual(self.refused({"set": {"cash_flows[0].type": "transfer"}}), ("input", "bad_field", "cash_flows[0].type"))
        self.assertEqual(self.refused({"del": "cash_flows[0].kind"}), ("input", "missing_field", "cash_flows[0].kind"))

    def test_terms(self):
        self.assertEqual(self.refused({"set": {"terms.pref.rate": "0"}}), ("input", "bad_number", "terms.pref.rate"))
        self.assertEqual(self.refused({"set": {"terms.catch_up.gp_share": "1.5"}}), ("input", "bad_number", "terms.catch_up.gp_share"))
        self.assertEqual(self.refused({"set": {"terms.carry": "-0.1"}}), ("input", "bad_number", "terms.carry"))
        self.assertEqual(self.refused({"set": {"terms.carry": None}}), ("input", "bad_number", "terms.carry"))
        first_with_multiple = {"steps": [{"rate": "0.2", "from_lp_multiple": "2"}]}
        self.assertEqual(self.refused({"set": {"terms.carry": first_with_multiple}}), ("input", "steps_out_of_order", "terms.carry.steps[0]"))
        missing_multiple = {"steps": [{"rate": "0.2"}, {"rate": "0.3"}]}
        self.assertEqual(
            self.refused({"set": {"terms.carry": missing_multiple}}), ("input", "missing_field", "terms.carry.steps[1].from_lp_multiple")
        )
        self.assertEqual(self.refused({"set": {"terms.gp_commitment": {"share": "0.01", "pays_fees": 1}}}), ("input", "bad_field", "terms.gp_commitment.pays_fees"))

    def test_unsupported_inside_a_term_and_before_anything_else(self):
        self.assertEqual(self.refused({"set": {"terms.catch_up.lookback": "1"}}), ("unsupported", "lookback", "terms.catch_up.lookback"))
        # FA2: unsupported first, even with an input problem earlier in the file.
        self.assertEqual(self.refused({"set": {"as_of": "soon", "terms.american": True}}), ("unsupported", "american", "terms.american"))

    def test_what_is_read(self):
        # Simple compounding is the default, and null is the same as leaving an optional term out (FA3).
        read(apply_change(BASE, {"set": {"terms.pref.compounding": "simple"}}))
        f = read(apply_change(BASE, {"set": {"terms.gp_commitment": None, "nav": None}, "del": "terms.catch_up"}))
        self.assertEqual((f.has_gp_commitment, f.nav, f.catch_up), (False, None, None))
        self.assertEqual(read({"as_of": "2025-01-01", "terms": {}, "cash_flows": EXAMPLE_B["flows"]}).steps[0].rate, F(1, 5))


ONE_CALL = {"as_of": "2026-03-01", "terms": {"carry": "0.20"}, "cash_flows": [call("2022-03-01", "5000000")]}
THREE = [{"name": "Alder", "commitment": "1000000"}, {"name": "Birch", "commitment": "1000000"}, {"name": "Cedar", "commitment": "1000000"}]


def lp_case(inputs, lps, xs):
    return run_case({"case": "lps", "xs": xs, "fund": {**inputs, "lps": lps}})


def by_lp(point, key):
    return [e[key]["exact"] for e in point["by_lp"]]


class Lps(unittest.TestCase):
    """F19, F20: each LP's share of what the LPs get."""

    def test_a_share_is_the_commitment_over_all_the_commitments_exactly(self):
        # 700,000 + 1,100,000 + 300,000 = 2,100,000: 1/3, 11/21 and 1/7, which add up to exactly 1.
        f = read({**ONE_CALL, "lps": [{"name": "A", "commitment": "700000"}, {"name": "B", "commitment": "1100000"}, {"name": "C", "commitment": "300000"}]})
        self.assertEqual(shares(f), [F(1, 3), F(11, 21), F(1, 7)])
        self.assertEqual(sum(shares(f)), 1)

    def test_commitments_only_divide(self):
        # F19: $5M, $3.5M and $1.5M add up to $10M, whatever the calls: halves, 7/20 and 3/20. Any amounts in the same
        # proportions give the same shares, an "a/b" commitment included (FA18).
        dollars = [{"name": "A", "commitment": "5000000"}, {"name": "B", "commitment": "3500000"}, {"name": "C", "commitment": "1500000"}]
        tenths = [{"name": "A", "commitment": "10/2"}, {"name": "B", "commitment": "3.5"}, {"name": "C", "commitment": "1.5"}]
        self.assertEqual(shares(read({**ONE_CALL, "lps": dollars})), [F(1, 2), F(7, 20), F(3, 20)])
        self.assertEqual(shares(read({**ONE_CALL, "lps": tenths})), [F(1, 2), F(7, 20), F(3, 20)])

    def test_each_lp_gets_its_share_of_the_lps_amounts_exactly(self):
        # Case 1's fund: $5,000,000 called, 20% carry. Three equal LPs: each has paid in $5,000,000 / 3.
        # X = $2,000,000 is all capital: each LP gets $2,000,000 / 3 = $666,666.666…, to the cent $666,666.67.
        # X = $12,500,000: LPs get $5,000,000 + 80% of $7,500,000 = $11,000,000, so each $11,000,000 / 3.
        out = lp_case(ONE_CALL, THREE, ["2000000", "12500000"])
        self.assertEqual([lp["paid_in"]["exact"] for lp in out["lps"]], ["5000000/3"] * 3)
        self.assertEqual([lp["share"] for lp in out["lps"]], ["1/3"] * 3)
        at = {p["x"]: p for p in out["points"]}
        self.assertEqual(by_lp(at["2000000.00"], "distribution"), ["2000000/3"] * 3)
        self.assertEqual([e["distribution"]["amount"] for e in at["2000000.00"]["by_lp"]], ["666666.67"] * 3)
        self.assertEqual(by_lp(at["12500000.00"], "distribution"), ["11000000/3"] * 3)
        # Nothing was distributed before X, so to date is X's; not final, so no clawback.
        self.assertEqual(by_lp(at["12500000.00"], "to_date"), ["11000000/3"] * 3)
        self.assertNotIn("clawback", at["12500000.00"]["by_lp"][0])

    def test_each_lp_gets_its_share_of_the_clawback_owed_back(self):
        # Example C, final, with LPs at 70% and 30%. X = 0: the GP owes $400,000 back, $280,000 and $120,000.
        # X = $1,000,000: $200,000 owed, $140,000 and $60,000. X = $2,000,000: nothing owed, so zero each (F20).
        lps = [{"name": "Alder", "commitment": "7"}, {"name": "Birch", "commitment": "3"}]
        inputs = {"as_of": EXAMPLE_C["as_of"], "terms": EXAMPLE_C["terms"], "cash_flows": EXAMPLE_C["flows"], "final": True}
        at = {p["x"]: p for p in lp_case(inputs, lps, ["0", "1000000", "2000000"])["points"]}
        self.assertEqual(by_lp(at["0.00"], "clawback"), ["280000", "120000"])
        self.assertEqual(by_lp(at["1000000.00"], "clawback"), ["140000", "60000"])
        self.assertEqual(by_lp(at["2000000.00"], "clawback"), ["0", "0"])
        # To date: the earlier $15,000,000 gave the LPs $14,000,000, and X = $1,000,000 returns the late call.
        self.assertEqual(by_lp(at["1000000.00"], "to_date"), ["10500000", "4500000"])

    def test_the_nav_point_has_each_lps_clawback_though_x_is_not_final(self):
        # F14, F20: the NAV point is final by definition. Example C at NAV $1,000,000 owes $200,000: halves, $100,000.
        lps = [{"name": "Alder", "commitment": "1"}, {"name": "Birch", "commitment": "1"}]
        inputs = {"as_of": EXAMPLE_C["as_of"], "terms": EXAMPLE_C["terms"], "cash_flows": EXAMPLE_C["flows"], "nav": "1000000"}
        at = {p["x"]: p for p in lp_case(inputs, lps, ["1"])["points"]}
        self.assertEqual(by_lp(at["1000000.00"], "clawback"), ["100000", "100000"])
        self.assertNotIn("clawback", at["1.00"]["by_lp"][0])

    def test_the_lps_change_nothing_else(self):
        # F20: the waterfall, the GP commitment's line, the clawback and the breakpoints are as without LPs.
        inputs = {"as_of": EXAMPLE_A["as_of"], "terms": EXAMPLE_A["terms"], "cash_flows": EXAMPLE_A["flows"], "nav": "40000000", "final": True}
        without = run_case({"case": "lps", "xs": ["20000000", "50000000"], "fund": inputs})
        with_lps = lp_case(inputs, THREE, ["20000000", "50000000"])
        del with_lps["lps"]
        for p in with_lps["points"]:
            del p["by_lp"]
        self.assertEqual(with_lps, without)

    def test_left_out_null_or_empty_are_no_lps(self):
        for lps in (None, []):
            out = lp_case(ONE_CALL, lps, ["1"])
            self.assertNotIn("lps", out)
            self.assertNotIn("by_lp", out["points"][0])
        self.assertEqual(read(ONE_CALL).lps, [])

    def test_the_lps_amounts_add_up_to_theirs_exactly(self):
        # Shares add up to exactly 1, so the LPs' amounts do too, whatever the commitments.
        rng = random.Random(20261018)
        f = read(ONE_CALL)
        for _ in range(50):
            f.lps = read({**ONE_CALL, "lps": [{"name": str(i), "commitment": str(rng.randint(1, 10**7))} for i in range(rng.randint(1, 9))]}).lps
            amount = F(rng.randint(0, 10**9), rng.randint(1, 10**4))
            self.assertEqual(sum(each_lp(f, amount)), amount)


class LpRefusals(unittest.TestCase):
    """F21 beyond the fixtures in packages/fund/cases/fund-21-lps-refused, and FA17 to FA19."""

    def refused(self, inputs):
        with self.assertRaises(Refusal) as ctx:
            read(inputs)
        return (ctx.exception.kind, ctx.exception.term, ctx.exception.path)

    def lps(self, lps):
        return self.refused({**ONE_CALL, "lps": lps})

    def test_the_shape(self):
        self.assertEqual(self.lps({}), ("input", "bad_field", "lps"))
        self.assertEqual(self.lps("Alder"), ("input", "bad_field", "lps"))
        self.assertEqual(self.lps([{"name": "Alder", "commitment": "1"}, None]), ("input", "bad_field", "lps[1]"))

    def test_missing_or_null(self):
        # F21: null is missing. With both missing, the name comes first (FA19).
        self.assertEqual(self.lps([{"name": None, "commitment": "1"}]), ("input", "missing_field", "lps[0].name"))
        self.assertEqual(self.lps([{"name": "Alder", "commitment": None}]), ("input", "missing_field", "lps[0].commitment"))
        self.assertEqual(self.lps([{}]), ("input", "missing_field", "lps[0].name"))

    def test_other_fields_whatever_their_value(self):
        # FA18: unsupported even when null, and of two the first in the file's order; before a missing name (F21).
        self.assertEqual(self.lps([{"name": "Alder", "commitment": "1", "carry": None}]), ("unsupported", "carry", "lps[0].carry"))
        self.assertEqual(self.lps([{"mgmt_fee": "0.015", "carry": "0.15"}]), ("unsupported", "mgmt_fee", "lps[0].mgmt_fee"))

    def test_a_blank_name_is_whitespace_as_javascripts_trim_takes_it(self):
        # FA17: blank names, then names that aren't: U+001C is whitespace to Python, not to trim.
        for name in ["", " ", "\u00a0", "\ufeff\t", "\u2003\u3000\n"]:
            self.assertEqual(self.lps([{"name": name, "commitment": "1"}]), ("input", "bad_field", "lps[0].name"), repr(name))
        for name in ["\x1c", "\u0085", "\u200b"]:
            self.assertEqual(read({**ONE_CALL, "lps": [{"name": name, "commitment": "1"}]}).lps[0].name, name)

    def test_names_are_kept_and_compared_as_written(self):
        # FA17: not trimmed or case-folded, so these are three LPs.
        names = ["Alder", "Alder ", "alder"]
        f = read({**ONE_CALL, "lps": [{"name": n, "commitment": "1"} for n in names]})
        self.assertEqual([lp.name for lp in f.lps], names)
        self.assertEqual(self.lps([{"name": n, "commitment": "1"} for n in ["Alder", "Birch", "Birch"]]), ("input", "lp_name_repeated", "lps[2].name"))

    def test_names_and_commitments_of_the_wrong_kind(self):
        for name in [True, ["Alder"], {"en": "Alder"}]:
            self.assertEqual(self.lps([{"name": name, "commitment": "1"}]), ("input", "bad_field", "lps[0].name"))
        for commitment in ["1e6", "", "1,000,000", "1/0", True]:
            self.assertEqual(self.lps([{"name": "Alder", "commitment": commitment}]), ("input", "bad_number", "lps[0].commitment"))

    def test_the_lps_come_after_everything_else(self):
        # FA19: a fourth stage. A bad as_of, a flow after D and an unsupported term each come before the LPs' problems.
        bad = [{"name": "Alder", "commitment": "1", "carry": "0.15"}]
        self.assertEqual(self.refused({**ONE_CALL, "as_of": "soon", "lps": bad}), ("input", "bad_date", "as_of"))
        self.assertEqual(self.refused({**ONE_CALL, "distribution_date": "2020-01-01", "lps": "x"}), ("input", "cash_flow_after_distribution_date", "cash_flows[0]"))
        self.assertEqual(self.refused({**ONE_CALL, "terms": {"carry": "0.2", "hurdle_irr": "0.08"}, "lps": bad}), ("unsupported", "hurdle_irr", "terms.hurdle_irr"))

    def test_one_lp_at_a_time_in_f21s_order(self):
        # An LP is checked through before the next: lps[1]'s repeated name before lps[2]'s bad commitment.
        lps = [{"name": "Alder", "commitment": "1"}, {"name": "Alder", "commitment": "1"}, {"name": "Birch", "commitment": "0"}]
        self.assertEqual(self.lps(lps), ("input", "lp_name_repeated", "lps[1].name"))
        # Within an LP: fields, then presence, then the name, then the commitment, then the repeat.
        self.assertEqual(self.lps([{"name": "", "commitment": "0", "carry": "0.15"}]), ("unsupported", "carry", "lps[0].carry"))
        self.assertEqual(self.lps([{"name": "", "commitment": "0"}]), ("input", "bad_field", "lps[0].name"))
        self.assertEqual(self.lps([{"name": "Alder", "commitment": "1"}, {"name": "Alder", "commitment": "0"}]), ("input", "bad_number", "lps[1].commitment"))


def model(terms, flows, as_of, lps, **more):
    return Model(read({"as_of": as_of, "terms": terms, "cash_flows": flows, "lps": lps, **more}))


def named(found):
    return [(money(x), [r["text"] for r in rs]) for x, rs in found]


class Classes(unittest.TestCase):
    """F22, F23: each class's account runs the tiers on its own."""

    STEPS = {"carry": {"steps": [{"rate": "0.2"}, {"rate": "0.3", "from_lp_multiple": "2"}]}}

    def test_a_fee_rate_weights_the_fee_calls(self):
        # F22: A on the fund's 2%, B in a class at 1%: fee weights 1 and 1 × 1% / 2% = 1/2, so of a 90 fee call A pays
        # 60 and B 30. The 1,000 investment call is by commitment, 500 each. Paid in: 560 and 530.
        terms = {"carry": "0.2", "fee_rate": "0.02", "lp_classes": [{"name": "Half", "fee_rate": "0.01"}]}
        flows = [call("2021-01-01", "1000"), call("2021-01-01", "90", "fee")]
        m = model(terms, flows, "2022-01-01", [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "class": "Half"}])
        self.assertEqual([a.fee_share for a in m.accounts], [F(2, 3), F(1, 3)])
        self.assertEqual([a.run.before.lps_paid_in for a in m.accounts], [560, 530])
        self.assertEqual(m.lps_paid_in(), 1090)
        # F23, F27: each account gets half of X, so its capital is back at twice its paid-in, each reason named.
        self.assertEqual(
            named(breakpoints.find(m)),
            [("1060.00", ["Half: LPs have their $530 of paid-in capital back"]), ("1120.00", ["Fund terms: LPs have their $560 of paid-in capital back"])],
        )

    def test_each_account_runs_its_own_tiers(self):
        # 1,000 called, A and B committing equally, B's class paying no carry. X = 3,000 gives each account 1,500:
        # A's returns its 500 and pays 20% on the other 1,000 (GP 200); B's returns its 500 and keeps the rest.
        terms = {"carry": "0.2", "lp_classes": [{"name": "F&F", "carry": "0"}]}
        m = model(terms, [call("2021-01-01", "1000")], "2022-01-01", [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "class": "F&F"}])
        out = m.evaluate(3000)
        (a, oa), (b, ob) = out.by_account
        self.assertEqual((oa.this.lp_capital, oa.this.gp_carry, oa.this.lps), (500, [F(200)], 1300))
        self.assertEqual((ob.this.lp_capital, ob.this.gp_carry, ob.this.lps), (500, [F(0)], 1500))
        # Both capitals are back at X = 1,000: one breakpoint, the fund's terms first (F27, FA15).
        self.assertEqual(
            named(breakpoints.find(m)),
            [("1000.00", ["Fund terms: LPs have their $500 of paid-in capital back", "F&F: LPs have their $500 of paid-in capital back"])],
        )

    def test_a_class_on_the_funds_terms_gives_the_same_amounts_as_none(self):
        # F23: example A's fund with three LPs, the third in a class with no terms of its own. Every amount the fund
        # reports is the same; the breakpoints are at the same X, each now with a reason from both accounts.
        inputs = {"as_of": EXAMPLE_A["as_of"], "terms": EXAMPLE_A["terms"], "cash_flows": EXAMPLE_A["flows"], "nav": "40000000", "final": True}
        plain = run_case({"case": "same", "xs": ["20000000", "50000000"], "fund": {**inputs, "lps": THREE}})
        same = [dict(THREE[0]), dict(THREE[1]), {**THREE[2], "class": "Same"}]
        classed = run_case({"case": "same", "xs": ["20000000", "50000000"], "fund": {**inputs, "terms": {**inputs["terms"], "lp_classes": [{"name": "Same"}]}, "lps": same}})
        self.assertEqual([b["exact"] for b in classed["breakpoints"]], [b["exact"] for b in plain["breakpoints"]])
        self.assertEqual([len(b["reasons"]) for b in classed["breakpoints"]], [2 * len(b["reasons"]) for b in plain["breakpoints"]])
        for p, q in zip(plain["points"], classed["points"]):
            for key in ("x", "tags", "clawback"):
                self.assertEqual(p.get(key), q.get(key))
            for block in ("distribution", "to_date"):
                self.assertEqual(p[block]["lps"], q[block]["lps"])
                self.assertEqual(p[block]["gp"]["total"], q[block]["gp"]["total"])
                self.assertEqual(p[block].get("gp_commitment"), q[block].get("gp_commitment"))
            self.assertEqual(p["by_lp"], q["by_lp"])

    def test_an_lps_share_is_f19s_and_its_paid_in_its_accounts(self):
        # FC11 (f03a review): A commits 3 and B 1, B in a class paying no fees. Shares are 3/4 and 1/4 of all the
        # commitments, as in 0.2.0. Paid-in is each account's: A pays 750 of the 1,000 and all of the 100 fee call.
        terms = {"carry": "0.2", "fee_rate": "0.02", "lp_classes": [{"name": "F&F", "fee_rate": "0"}]}
        flows = [call("2021-01-01", "1000"), call("2021-01-01", "100", "fee")]
        out = run_case({"case": "c", "xs": ["1"], "fund": {"as_of": "2022-01-01", "terms": terms, "cash_flows": flows,
                                                         "lps": [{"name": "A", "commitment": "3"}, {"name": "B", "commitment": "1", "class": "F&F"}]}})
        self.assertEqual([(lp["share"], lp["paid_in"]["exact"]) for lp in out["lps"]], [("0.75", "850"), ("0.25", "250")])

    def test_an_accounts_clawback_reason_is_on_its_own_totals(self):
        # F27, FA29: the late-call fund above at a tenth of a millionth, B in a class paying no carry. The fund terms'
        # clawback starts to fall where the run on its own totals reaches 2x, and with two accounts it says so.
        terms = {**self.STEPS, "lp_classes": [{"name": "F&F", "carry": "0"}]}
        flows = [call("2020-01-01", "10"), dist("2022-01-01", "30"), call("2023-01-01", "10")]
        m = model(terms, flows, "2025-01-01", [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "class": "F&F"}], final=True)
        texts = [r["text"] for _, rs in breakpoints.find(m) for r in rs if r.get("fund_totals")]
        self.assertEqual(texts, ["Fund terms: the clawback owed starts to fall: on its own totals, LPs reach 2.0x: carry is 30% from here"])

    def test_a_class_no_lp_names_has_no_account(self):
        # FA22: its terms are checked (F28) and do nothing.
        terms = {"carry": "0.2", "lp_classes": [{"name": "Empty", "carry": "0.1"}]}
        m = model(terms, [call("2021-01-01", "1000")], "2022-01-01", [{"name": "A", "commitment": "1"}])
        self.assertEqual([a.class_name for a in m.accounts], [None])
        self.assertFalse(m.named)

    def test_one_accounts_surplus_never_offsets_anothers_clawback(self):
        # F24, FA23: case 11's fund, half its LPs in a class whose carry steps to 30% from 1.5x. At X = $5,500,000,
        # the fund's-terms account has been paid $50,000 less carry than it's entitled to, and the class's GP owes
        # $81,250 back. The fund owes $81,250, not the $31,250 of carry paid less entitlement.
        f = json.loads((CASES / "fund-11-clawback-pref" / "inputs.json").read_text())["fund"]
        f["terms"]["lp_classes"] = [{"name": "Stepped", "carry": {"steps": [{"rate": "0.2"}, {"rate": "0.3", "from_lp_multiple": "1.5"}]}}]
        f["lps"] = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "class": "Stepped"}]
        out = Model(read(f)).evaluate(5500000)
        self.assertEqual([o.owed_before_floor for _, o in out.by_account], [-50000, 81250])
        self.assertEqual((out.carry_paid - out.entitlement, out.clawback), (31250, 81250))

    def test_without_lps_the_classes_change_nothing(self):
        # F23: no listed LPs is one account, the whole LPs' side, whatever classes the terms list.
        terms = {**EXAMPLE_A["terms"], "fee_rate": "0.02", "lp_classes": [{"name": "Half", "fee_rate": "0.01", "carry": "0.1"}]}
        with_classes = run_case({"case": "c", "xs": ["20000000"], "fund": {"as_of": EXAMPLE_A["as_of"], "terms": terms, "cash_flows": EXAMPLE_A["flows"]}})
        without = run_case({"case": "c", "xs": ["20000000"], "fund": {"as_of": EXAMPLE_A["as_of"], "terms": EXAMPLE_A["terms"], "cash_flows": EXAMPLE_A["flows"]}})
        self.assertEqual(with_classes, without)


def eq_moves(e):
    return [(m.capital_paid, m.capital_returned, m.interest_paid, m.interest_received) for m in e.totals]


class Closes(unittest.TestCase):
    """F25: later closes and their equalization."""

    def test_one_later_close(self):
        # 1,000 called on 2021-01-01 and paid by A alone. B, committing as much, joins on 2021-07-01, 181 days later:
        # it pays in 500 and A gets 500 back. B pays 10% on 500 for 181 days, 9,050 / 365, all to A.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-07-01"}]
        f = read({"as_of": "2022-01-01", "terms": {"equalization_rate": "0.1"}, "cash_flows": [call("2021-01-01", "1000")], "lps": lps})
        e = equalization(f)
        self.assertEqual([c.date.isoformat() for c in e.closes], ["2021-07-01"])
        self.assertEqual(eq_moves(e), [(0, 500, 0, F(9050, 365)), (500, 0, F(9050, 365), 0)])

    def test_a_call_on_the_close_date_is_paid_by_the_joining_lps(self):
        # FA21: B is in on its close's date, so it pays half of that day's 200 as it's made; only the earlier call is
        # caught up on, with interest.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-07-01"}]
        flows = [call("2021-01-01", "1000"), call("2021-07-01", "200")]
        e = equalization(read({"as_of": "2022-01-01", "terms": {"equalization_rate": "0.1"}, "cash_flows": flows, "lps": lps}))
        self.assertEqual(eq_moves(e), [(0, 500, 0, F(9050, 365)), (500, 0, F(9050, 365), 0)])

    def test_lps_closing_on_one_date_join_together(self):
        # F25: B and C join on one date: one close, each paying a third of the 1,000, A getting 2,000/3 back.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-07-01"}, {"name": "C", "commitment": "1", "close": "2021-07-01"}]
        e = equalization(read({"as_of": "2022-01-01", "terms": {"equalization_rate": "0"}, "cash_flows": [call("2021-01-01", "1000")], "lps": lps}))
        self.assertEqual(len(e.closes), 1)
        self.assertEqual([lp.name for lp in e.closes[0].joining], ["B", "C"])
        self.assertEqual(eq_moves(e), [(0, F(2000, 3), 0, 0), (F(1000, 3), 0, 0, 0), (F(1000, 3), 0, 0, 0)])

    def test_a_close_rebalances_no_fee_call(self):
        # F29: a 90 fee call A paid alone. B joins in a class paying no fees, so its fee weight is 0 and it owes no back
        # fees; nothing moves for the fee call either way. B pays interest only on its half of the 1,000.
        terms = {"fee_rate": "0.02", "equalization_rate": "0.1", "lp_classes": [{"name": "F&F", "fee_rate": "0"}]}
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "class": "F&F", "close": "2021-07-01"}]
        flows = [call("2021-01-01", "1000"), call("2021-01-01", "90", "fee")]
        e = equalization(read({"as_of": "2022-01-01", "terms": terms, "cash_flows": flows, "lps": lps}))
        self.assertEqual(eq_moves(e), [(0, 500, 0, F(9050, 365)), (500, 0, F(9050, 365), 0)])
        self.assertEqual([m.back_fees for m in e.totals], [0, 0])

    def test_the_gp_commitment_is_outside_the_equalization(self):
        # F25: a 2% GP commitment pays 20 of the 1,000 as it's made. The LPs' part is 980, so B pays in 490.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-07-01"}]
        terms = {"gp_commitment": {"share": "0.02"}, "equalization_rate": "0"}
        e = equalization(read({"as_of": "2022-01-01", "terms": terms, "cash_flows": [call("2021-01-01", "1000")], "lps": lps}))
        self.assertEqual(eq_moves(e), [(0, 490, 0, 0), (490, 0, 0, 0)])

    def test_two_closes_rebalance_in_date_order(self):
        # A pays 1,200 on 2021-01-01. B joins on 2021-04-01: halves, so B pays 600 and A gets 600 back. C joins on
        # 2021-07-01: thirds, so C pays 400, and A and B each get 200 back. At 0% interest only capital moves.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-04-01"}, {"name": "C", "commitment": "1", "close": "2021-07-01"}]
        e = equalization(read({"as_of": "2022-01-01", "terms": {"equalization_rate": "0"}, "cash_flows": [call("2021-01-01", "1200")], "lps": lps}))
        self.assertEqual([c.date.isoformat() for c in e.closes], ["2021-04-01", "2021-07-01"])
        self.assertEqual(eq_moves(e), [(0, 800, 0, 0), (600, 200, 0, 0), (400, 0, 0, 0)])

    def test_each_lp_already_in_receives_the_rate_on_what_it_gets_back(self):
        # FA30: the interest on a call goes to the LPs already in pro rata to what each gets back of it, which comes to
        # each receiving the rate on what it gets back for the same days. Paid and received balance at every close.
        rng = random.Random(20261023)
        for _ in range(40):
            n = rng.randint(2, 5)
            start = datetime.date(2021, 1, 1)
            lps = [{"name": "LP 0", "commitment": str(rng.randint(1, 9))}]
            for i in range(1, n):
                lp = {"name": f"LP {i}", "commitment": str(rng.randint(1, 9))}
                if rng.random() < 0.7:
                    lp["close"] = (start + datetime.timedelta(days=rng.randint(1, 400))).isoformat()
                lps.append(lp)
            flows = [call(start.isoformat(), str(rng.randint(1, 50) * 100))]
            for _ in range(rng.randint(0, 3)):
                flows.append(call((start + datetime.timedelta(days=rng.randint(0, 400))).isoformat(), str(rng.randint(1, 50) * 100)))
            f = read({"as_of": "2023-01-01", "terms": {"equalization_rate": "0.07"}, "cash_flows": flows, "lps": lps})
            e = equalization(f)
            if e is None:
                continue
            for close in e.closes:
                moves = close.moves.values()
                self.assertEqual(sum(m.capital_paid for m in moves), sum(m.capital_returned for m in moves))
                self.assertEqual(sum(m.interest_paid for m in moves), sum(m.interest_received for m in moves))
                for i, m in close.moves.items():
                    if f.lps[i].close == close.date:
                        continue
                    want = sum(
                        F(7, 100) * (part(f, c, i, close.date, before=True) - part(f, c, i, close.date)) * days(c.date, close.date) / 365
                        for c in f.flows
                        if c.date < close.date
                    )
                    self.assertEqual(m.interest_received, want)
            # F25: after the last close every LP holds its share of every call, as if in from the start.
            last = e.closes[-1].date
            held = {i: sum(part(f, c, i, max(last, c.date)) for c in f.flows) for i in range(len(f.lps))}
            total = sum(c.amount for c in f.flows)
            for i, lp in enumerate(f.lps):
                self.assertEqual(held[i], total * lp.commitment / sum(x.commitment for x in f.lps))

    def test_the_waterfall_is_as_if_every_lp_were_in_from_the_start(self):
        # F25, F29: case 25 with Cedar's close taken out, and the January 2021 fee call at its full size, $100,000 with
        # Cedar's $20,000 of back fees in it, gives every amount, breakpoint and paid-in the same. The GP commitment
        # pays no fees here, so the call is all the LPs'.
        inputs = json.loads((CASES / "fund-25-later-close" / "inputs.json").read_text())
        late = run_case(inputs)
        fund = copy.deepcopy(inputs["fund"])
        del fund["lps"][2]["close"]
        self.assertEqual(fund["cash_flows"][1], call("2021-01-15", "80000", "fee"))
        fund["cash_flows"][1]["amount"] = "100000"
        start = run_case({**inputs, "fund": fund})
        del late["equalization"]
        del late["lps"][2]["close"]
        self.assertNotIn("equalization", start)
        self.assertEqual(late, start)

    def test_a_close_on_or_before_the_first_call_is_in_from_the_start(self):
        # F25: no later close, so no equalization rate is needed and none is worked out.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-01-01"}, {"name": "C", "commitment": "1", "close": "2020-06-30"}]
        f = read({"as_of": "2022-01-01", "terms": {}, "cash_flows": [call("2021-01-01", "1000")], "lps": lps})
        self.assertIsNone(equalization(f))
        self.assertNotIn("close", json.dumps(run_case({"case": "c", "xs": ["1"], "fund": {"as_of": "2022-01-01", "terms": {}, "cash_flows": [call("2021-01-01", "1000")], "lps": lps}})["lps"]))


SCHEDULED = {
    "as_of": "2021-12-31",
    "terms": {"carry": "0.2", "management_fee": {"start": "2021-02-15", "steps": [{"rate": "0.02"}], "commitments": "40000000"}},
    "cash_flows": [call("2021-03-01", "10000000")],
}


def schedule_of(inputs):
    """The schedule's calls as (date, first day, last day, fee factor, call)."""
    f = read(inputs)
    return [(c.date.isoformat(), c.period.first_day.isoformat(), c.period.last_day.isoformat(), c.factor, c.amount) for c in f.flows if c.scheduled]


class Schedule(unittest.TestCase):
    """F30: the management fee schedule's calls."""

    def test_a_part_first_quarter_then_whole_quarters(self):
        # Fees from 15 Feb 2021 at 2% on $40,000,000, quarterly. Q1 2021 has 90 days, 45 of them from 15 Feb: a factor
        # of 0.02 x 45 / (4 x 90) = 1/400, $100,000. Each whole quarter is 0.02 / 4, $200,000. D is 31 Dec 2021.
        self.assertEqual(
            schedule_of(SCHEDULED),
            [
                ("2021-02-15", "2021-02-15", "2021-03-31", F(1, 400), 100000),
                ("2021-04-01", "2021-04-01", "2021-06-30", F(1, 200), 200000),
                ("2021-07-01", "2021-07-01", "2021-09-30", F(1, 200), 200000),
                ("2021-10-01", "2021-10-01", "2021-12-31", F(1, 200), 200000),
            ],
        )

    def test_a_step_inside_a_period_is_worked_by_its_days(self):
        # Case 30's half-year: H1 2022 has 181 days, 59 at 2% (1 Jan to 28 Feb) and 122 at 1.5%: (0.02 x 59 + 0.015 x
        # 122) / (2 x 181) = 3.01 / 362. On $25,000,000 that's 37,625,000 / 181.
        terms = {"management_fee": {"start": "2022-01-01", "frequency": "semiannual", "steps": [{"rate": "0.02"}, {"rate": "0.015", "from": "2022-03-01"}], "commitments": "25000000"}}
        calls = schedule_of({"as_of": "2022-06-30", "terms": terms, "cash_flows": []})
        self.assertEqual(calls, [("2022-01-01", "2022-01-01", "2022-06-30", F(301, 36200), F(37625000, 181))])

    def test_leap_years_count_their_days(self):
        # Q1 2024 has 91 days; from 15 Feb that's 46 of them (15 to 29 Feb, then March). 2024 has 366 days; from 1 Jul,
        # 184 of them.
        q = {"management_fee": {"start": "2024-02-15", "steps": [{"rate": "0.02"}], "commitments": "1"}}
        self.assertEqual(schedule_of({"as_of": "2024-03-31", "terms": q, "cash_flows": []})[0][3], F(2, 100) * 46 / (4 * 91))
        a = {"management_fee": {"start": "2024-07-01", "frequency": "annual", "steps": [{"rate": "0.02"}], "commitments": "1"}}
        self.assertEqual(schedule_of({"as_of": "2025-01-01", "terms": a, "cash_flows": []}), [
            ("2024-07-01", "2024-07-01", "2024-12-31", F(2, 100) * 184 / 366, F(2, 100) * 184 / 366),
            ("2025-01-01", "2025-01-01", "2025-12-31", F(2, 100), F(2, 100)),
        ])

    def test_no_call_is_dated_after_d(self):
        # F30, FA39: no period starting after D. D on a period's first day calls it, in advance.
        dates = lambda d: [c[0] for c in schedule_of({**SCHEDULED, "as_of": d})]  # noqa: E731
        self.assertEqual(dates("2021-06-30"), ["2021-02-15", "2021-04-01"])
        self.assertEqual(dates("2021-07-01"), ["2021-02-15", "2021-04-01", "2021-07-01"])
        # A start after D calls nothing yet; with no other call the fund has none (F4).
        late = {**SCHEDULED, "as_of": "2021-02-14", "cash_flows": [call("2021-01-01", "100")]}
        self.assertEqual(schedule_of(late), [])
        with self.assertRaises(Refusal) as ctx:
            read({**late, "cash_flows": []})
        self.assertEqual(ctx.exception.term, "no_calls")

    def test_a_rate_of_0_ends_fees_and_a_period_all_at_0_is_no_call(self):
        # F30, FA40: 2% from 1 Apr, 0 from 16 May, 1% from 1 Oct. Q2's 91 days: 45 at 2%, 46 at 0. Q3 is all at 0, so it
        # isn't a call. Q4 is all at 1% (FA47: a later rate can be higher).
        terms = {"management_fee": {"start": "2021-04-01", "steps": [{"rate": "0.02"}, {"rate": "0", "from": "2021-05-16"}, {"rate": "0.01", "from": "2021-10-01"}], "commitments": "1"}}
        calls = schedule_of({"as_of": "2021-12-31", "terms": terms, "cash_flows": []})
        self.assertEqual([(c[0], c[3]) for c in calls], [("2021-04-01", F(2, 100) * 45 / (4 * 91)), ("2021-10-01", F(1, 400))])

    def test_a_class_steps_down_with_the_funds_rate(self):
        # F22, F30: a class at 1% against the schedule's 2% has a class factor of 1/2, so when the fund's rate steps to
        # 1.5% the class pays 0.75%. A on the fund's terms commits 4; B, in the class, 2: weights 4 and 1.
        terms = {
            "management_fee": {"start": "2021-01-01", "frequency": "annual", "steps": [{"rate": "0.02"}, {"rate": "0.015", "from": "2022-01-01"}]},
            "lp_classes": [{"name": "Anchor", "fee_rate": "0.01"}],
        }
        lps = [{"name": "A", "commitment": "4"}, {"name": "B", "commitment": "2", "class": "Anchor"}]
        f = read({"as_of": "2022-12-31", "terms": terms, "cash_flows": [call("2021-06-01", "6")], "lps": lps})
        fees_of = [[fees.lp_fee(f, lp, c.factor) for lp in f.lps] for c in f.flows if c.scheduled]
        self.assertEqual(fees_of, [[F(8, 100), F(2, 100)], [F(6, 100), F(15, 1000)]])
        self.assertEqual([c.amount for c in f.flows if c.scheduled], [F(1, 10), F(75, 1000)])

    def test_the_gp_commitment_pays_g_of_the_call_when_it_pays_fees(self):
        # F3, F30: the LPs' fees are $200,000 a quarter. A 2% GP commitment that pays fees makes the call 200,000 / 0.98,
        # of which it pays 2%; a fee-free one pays none, and the call is the LPs' fees.
        def first_whole(g):
            terms = {**SCHEDULED["terms"], "gp_commitment": g}
            c = [c for c in read({**SCHEDULED, "terms": terms}).flows if c.scheduled][1]
            return c.amount
        self.assertEqual(first_whole({"share": "0.02", "pays_fees": True}), F(200000) / F(98, 100))
        self.assertEqual(first_whole({"share": "0.02"}), 200000)
        m = Model(read({**SCHEDULED, "terms": {**SCHEDULED["terms"], "gp_commitment": {"share": "0.02", "pays_fees": True}}}))
        self.assertEqual(m.gp_commitment_paid_in(), F(2, 100) * 10000000 + F(2, 98) * 700000)

    def test_the_schedules_calls_run_as_entered_fee_calls(self):
        # F30: a schedule's calls are calls. The same fund with them entered as fee calls gives every amount the same, at
        # every X, with the same breakpoints, a pref accruing on each from its date.
        terms = {**SCHEDULED["terms"], "pref": {"rate": "0.08"}, "catch_up": {"gp_share": "1"}, "gp_commitment": {"share": "0.01"}}
        flows = SCHEDULED["cash_flows"] + [dist("2021-08-01", "4000000")]
        scheduled = Model(read({**SCHEDULED, "terms": terms, "cash_flows": flows}))
        entered_flows = flows + [call(c[0], exact(c[4]), "fee") for c in schedule_of({**SCHEDULED, "terms": terms})]
        plain = {k: v for k, v in terms.items() if k != "management_fee"}
        entered = Model(read({**SCHEDULED, "terms": plain, "cash_flows": entered_flows}))
        self.assertEqual(breakpoints.find(scheduled), breakpoints.find(entered))
        for x in [0, 5000000, 11000000, 13000000]:
            (_, a), (_, b) = scheduled.evaluate(x).by_account[0], entered.evaluate(x).by_account[0]
            self.assertEqual((a.this.vector(), a.ledger.to_date.vector()), (b.this.vector(), b.ledger.to_date.vector()))

    def test_with_listed_lps_their_commitments_are_the_base(self):
        # F30, F31: LPs of 3,000,000 and 1,000,000: each pays its own 2% a year; the case file gives each LP's fee.
        lps = [{"name": "A", "commitment": "3000000"}, {"name": "B", "commitment": "1000000"}]
        terms = {"carry": "0.2", "management_fee": {"start": "2021-10-01", "steps": [{"rate": "0.02"}], "commitments": "4000000"}}
        out = run_case({"case": "c", "xs": ["0"], "fund": {"as_of": "2021-12-31", "terms": terms, "cash_flows": [call("2021-10-01", "400000")], "lps": lps}})
        self.assertEqual(out["fee_calls"], [{
            "date": "2021-10-01", "first_day": "2021-10-01", "last_day": "2021-12-31",
            "call": {"amount": "20000.00", "exact": "20000"}, "lps": {"amount": "20000.00", "exact": "20000"},
            "by_lp": [{"name": "A", "fee": {"amount": "15000.00", "exact": "15000"}}, {"name": "B", "fee": {"amount": "5000.00", "exact": "5000"}}],
        }])
        self.assertEqual(out["lps_paid_in"], "420000.00")


def back_fees(e):
    return [m.back_fees for m in e.totals]


class FeeCallsAtCloses(unittest.TestCase):
    """F29: a fee is each LP's own; a joiner owes its back fees to the manager, and fees aren't rebalanced."""

    LPS = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-07-01"}]

    def test_a_joiner_owes_its_own_part_of_an_earlier_fee_call(self):
        # A pays a 100 fee call alone on 2021-01-01: 100 a unit of fee weight. B, committing as much, owes 100 of back
        # fees at its close; A gets nothing back. In the waterfall the call counts at 200, so the LPs' paid-in is 200.
        f = read({"as_of": "2022-01-01", "terms": {}, "cash_flows": [call("2021-01-01", "100", "fee")], "lps": self.LPS})
        e = equalization(f)
        self.assertEqual(eq_moves(e), [(0, 0, 0, 0), (0, 0, 0, 0)])
        self.assertEqual(back_fees(e), [0, 100])
        self.assertEqual(Model(f).lps_paid_in(), 200)
        # No investment or expense call before the close, so no equalization rate is needed, and the case file's is null.
        out = run_case({"case": "c", "xs": ["0"], "fund": {"as_of": "2022-01-01", "terms": {}, "cash_flows": [call("2021-01-01", "100", "fee")], "lps": self.LPS}})
        self.assertIsNone(out["equalization"]["rate"])
        self.assertEqual(out["equalization"]["lps"][1]["back_fees"], {"amount": "100.00", "exact": "100"})

    def test_back_fees_count_from_the_calls_date_with_no_interest(self):
        # F29: in the waterfall B's part of the fee call is in from 2021-01-01, so a 10% pref accrues on all 200 from
        # then: 20 a year. The equalization charges no interest on back fees, whatever the rate.
        terms = {"pref": {"rate": "0.1"}, "equalization_rate": "0.1"}
        f = read({"as_of": "2022-01-01", "terms": terms, "cash_flows": [call("2021-01-01", "100", "fee")], "lps": self.LPS})
        self.assertEqual(Model(f).pref_accrued(), F(200 * 365, 10 * 365))
        e = equalization(f)
        self.assertEqual((eq_moves(e), back_fees(e)), ([(0, 0, 0, 0), (0, 0, 0, 0)], [0, 100]))

    def test_a_fee_call_on_the_close_date_is_the_joiners_as_made(self):
        # FA21: B is in on its close's date, so it pays its half of that day's 60 as it's made: no back fee for it.
        flows = [call("2021-01-01", "100", "fee"), call("2021-07-01", "60", "fee")]
        f = read({"as_of": "2022-01-01", "terms": {}, "cash_flows": flows, "lps": self.LPS})
        self.assertEqual(back_fees(equalization(f)), [0, 100])
        self.assertEqual(Model(f).lps_paid_in(), 260)

    def test_each_joiner_owes_for_the_fee_calls_before_its_own_close(self):
        # A in from the start, B from 2021-04-01, C from 2021-07-01, each committing 1. A pays 90 on 2021-01-01 (90 a
        # unit); A and B pay 60 on 2021-05-01 (30 a unit). B owes 90 at its close, C 90 + 30 = 120 at its; A and B get
        # nothing back. The waterfall counts the calls at 270 and 90.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-04-01"}, {"name": "C", "commitment": "1", "close": "2021-07-01"}]
        flows = [call("2021-01-01", "90", "fee"), call("2021-05-01", "60", "fee")]
        f = read({"as_of": "2022-01-01", "terms": {}, "cash_flows": flows, "lps": lps})
        e = equalization(f)
        self.assertEqual([[m.back_fees for _, m in sorted(c.moves.items())] for c in e.closes], [[0, 90], [0, 0, 120]])
        self.assertEqual(back_fees(e), [0, 90, 120])
        self.assertEqual([fees.lps_part(f, c) for c in f.flows], [270, 90])

    def test_the_gp_commitment_pays_g_of_the_fee_call_as_entered(self):
        # F3, F29: a 2% GP commitment that pays fees pays 2 of an entered 100, and is in no equalization. A pays the
        # LPs' 98 alone: 98 a unit, so B owes 98 and the LPs' part counts at 196.
        terms = {"gp_commitment": {"share": "0.02", "pays_fees": True}}
        f = read({"as_of": "2022-01-01", "terms": terms, "cash_flows": [call("2021-01-01", "100", "fee")], "lps": self.LPS})
        self.assertEqual(back_fees(equalization(f)), [0, 98])
        m = Model(f)
        self.assertEqual((m.lps_paid_in(), m.gp_commitment_paid_in()), (196, 2))

    def test_a_schedules_calls_before_a_close_are_back_fees(self):
        # F30: quarterly at 2% from 2021-01-01 on commitments of 1,000,000 each; B joins on 2021-08-15, mid-Q3. It owes
        # the whole of its Q1, Q2 and Q3 fees, 5,000 each: 15,000. The calls are every LP's own fee: 10,000 a quarter.
        lps = [{"name": "A", "commitment": "1000000"}, {"name": "B", "commitment": "1000000", "close": "2021-08-15"}]
        terms = {"management_fee": {"start": "2021-01-01", "steps": [{"rate": "0.02"}]}}
        f = read({"as_of": "2021-12-31", "terms": terms, "cash_flows": [], "lps": lps})
        self.assertEqual([c.amount for c in f.flows], [10000] * 4)
        self.assertEqual(back_fees(equalization(f)), [0, 15000])

    def test_the_equalization_rate_is_needed_only_for_an_investment_or_expense_call_before_a_close(self):
        # F29, F32: only investment and expense calls carry interest, so only they need the rate.
        base = {"as_of": "2022-01-01", "terms": {}, "lps": self.LPS}
        for flows in ([call("2021-01-01", "100", "fee")], [call("2021-07-01", "100")], [call("2021-01-01", "100", "fee"), call("2021-09-01", "100", "expense")]):
            read({**base, "cash_flows": flows})
        for kind in ("investment", "expense"):
            with self.assertRaises(Refusal) as ctx:
                read({**base, "cash_flows": [call("2021-01-01", "100", "fee"), call("2021-06-30", "100", kind)]})
            self.assertEqual((ctx.exception.term, ctx.exception.path), ("missing_field", "terms.equalization_rate"))

    def test_with_no_fee_call_before_a_close_the_close_changes_no_amount(self):
        # F25 as in 0.3.0: a fee call after the close is paid as made by everyone in, so the waterfall is the same as with
        # B in from the start, to the last digit.
        flows = [call("2021-01-01", "1000"), call("2021-09-01", "50", "fee"), dist("2021-10-01", "300")]
        terms = {"pref": {"rate": "0.08"}, "equalization_rate": "0.05"}
        late = Model(read({"as_of": "2022-01-01", "terms": terms, "cash_flows": flows, "lps": self.LPS}))
        start = Model(read({"as_of": "2022-01-01", "terms": terms, "cash_flows": flows, "lps": [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1"}]}))
        for x in [0, 500, 900, 2000]:
            (_, a), (_, b) = late.evaluate(x).by_account[0], start.evaluate(x).by_account[0]
            self.assertEqual((a.this.vector(), a.ledger.to_date.vector()), (b.this.vector(), b.ledger.to_date.vector()))


class FeeRefusals(unittest.TestCase):
    """F32 beyond the fixtures in packages/fund/cases/fund-32-fees-refused, and FA39 to FA47."""

    def refused(self, change, base=SCHEDULED):
        with self.assertRaises(Refusal) as ctx:
            read(apply_change(base, change))
        return (ctx.exception.kind, ctx.exception.term, ctx.exception.path)

    def test_null_is_left_out(self):
        # FA41: a null schedule is none; a null frequency is quarterly; null commitments are none (and needed without
        # LPs); a first step's null `from` isn't given. A null start, steps, rate or later `from` is missing.
        self.assertIsNone(read(apply_change(SCHEDULED, {"set": {"terms.management_fee": None}})).schedule)
        self.assertEqual(read(apply_change(SCHEDULED, {"set": {"terms.management_fee.frequency": None}})).schedule.frequency, "quarterly")
        read(apply_change(SCHEDULED, {"set": {"terms.management_fee.steps[0].from": None}}))
        self.assertEqual(self.refused({"set": {"terms.management_fee.commitments": None}}), ("input", "missing_field", "terms.management_fee.commitments"))
        for path in ("start", "steps", "steps[0].rate"):
            self.assertEqual(self.refused({"set": {f"terms.management_fee.{path}": None}}), ("input", "missing_field", f"terms.management_fee.{path}"))
        two = [{"rate": "0.02"}, {"rate": "0.01", "from": None}]
        self.assertEqual(self.refused({"set": {"terms.management_fee.steps": two}}), ("input", "missing_field", "terms.management_fee.steps[1].from"))

    def test_a_frequency_is_one_of_three_words_exactly(self):
        for value in ("Quarterly", "quarterly ", "monthly", 4, ["annual"]):
            self.assertEqual(self.refused({"set": {"terms.management_fee.frequency": value}}), ("input", "bad_field", "terms.management_fee.frequency"))

    def test_within_a_step_its_shape_then_its_rate_then_its_from(self):
        steps = [{"rate": "0.02"}, {"rate": "2", "from": "x"}]
        self.assertEqual(self.refused({"set": {"terms.management_fee.steps": steps}}), ("input", "bad_number", "terms.management_fee.steps[1].rate"))
        steps = [{"rate": "0.02", "from": "2021-02-15"}, {"rate": "x"}]
        self.assertEqual(self.refused({"set": {"terms.management_fee.steps": steps}}), ("input", "steps_out_of_order", "terms.management_fee.steps[0]"))
        steps = [{"rate": "0.02"}, {"rate": "0.01", "from": "2021-01-01"}, "0.01"]
        self.assertEqual(self.refused({"set": {"terms.management_fee.steps": steps}}), ("input", "steps_out_of_order", "terms.management_fee.steps[1]"))
        # A step's rate as a JSON number isn't an exact string (FC1); 0 after the first is allowed, and so is a rise (FA47).
        self.assertEqual(self.refused({"set": {"terms.management_fee.steps[0].rate": 0.02}}), ("input", "bad_number", "terms.management_fee.steps[0].rate"))
        read(apply_change(SCHEDULED, {"set": {"terms.management_fee.steps": [{"rate": "0.01"}, {"rate": "0.03", "from": "2021-06-01"}]}}))

    def test_the_schedules_keys_in_the_files_order_among_the_terms(self):
        # Stage 1: a term's own keys in the file's order, the steps' keys at the steps' place; an unknown term first.
        fee = {"steps": [{"rate": "0.02", "basis": "nav"}], "offset": "1", "start": "x"}
        self.assertEqual(self.refused({"set": {"terms.management_fee": fee}}), ("unsupported", "basis", "terms.management_fee.steps[0].basis"))
        terms = {"hurdle_irr": "0.1", "management_fee": {"offset": "1"}}
        self.assertEqual(self.refused({"set": {"terms": terms}}), ("unsupported", "hurdle_irr", "terms.hurdle_irr"))

    def test_the_schedule_after_the_funds_own_terms_and_before_the_classes(self):
        # Stage 2: the carry before the schedule; fee_rate's own number before the schedule; the schedule before
        # fee_rate_with_schedule; that before the classes; and the cash flows after all of terms.
        self.assertEqual(self.refused({"set": {"terms.carry": "1", "terms.management_fee.start": "x"}}), ("input", "carry_rate_not_below_one", "terms.carry"))
        self.assertEqual(self.refused({"set": {"terms.fee_rate": "-1", "terms.management_fee.start": "x"}}), ("input", "bad_number", "terms.fee_rate"))
        self.assertEqual(self.refused({"set": {"terms.management_fee.commitments": "-1", "terms.fee_rate": "0.02"}}), ("input", "bad_number", "terms.management_fee.commitments"))
        self.assertEqual(self.refused({"set": {"terms.management_fee.start": "x", "cash_flows[0].amount": "0"}}), ("input", "bad_date", "terms.management_fee.start"))

    def test_an_entered_fee_call_is_named_in_the_inputs_order(self):
        # F32: the first in the input's order, not by date; after every cash flow's own fields (stage 2).
        flows = [call("2021-06-01", "10", "fee"), call("2021-03-01", "10", "fee")]
        self.assertEqual(self.refused({"set": {"cash_flows[1]": flows[0], "cash_flows[2]": flows[1]}}), ("input", "fee_call_with_schedule", "cash_flows[1]"))
        self.assertEqual(self.refused({"set": {"cash_flows[1]": flows[0], "cash_flows[2]": {**flows[1], "amount": "x"}}}), ("input", "bad_number", "cash_flows[2].amount"))

    def test_commitments_compare_as_numbers(self):
        # FA41: "40000000.00" is the LPs' total of 40,000,000; with listed LPs commitments can be left out.
        lps = [{"name": "A", "commitment": "30000000"}, {"name": "B", "commitment": "10000000"}]
        read(apply_change(SCHEDULED, {"set": {"lps": lps, "terms.management_fee.commitments": "40000000.00"}}))
        read(apply_change(SCHEDULED, {"set": {"lps": lps}, "del": "terms.management_fee.commitments"}))
        self.assertEqual(self.refused({"set": {"lps": lps, "terms.management_fee.commitments": "40000000.01"}}), ("input", "fee_commitments_mismatch", "terms.management_fee.commitments"))

    def test_a_class_fee_rate_against_the_schedules(self):
        # F32: with a schedule a class's fee rate needs no fee_rate; without either it's missing, at terms.fee_rate.
        classes = [{"name": "Anchor", "fee_rate": "0.01"}]
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "class": "Anchor"}]
        read(apply_change(SCHEDULED, {"set": {"terms.lp_classes": classes, "lps": lps}, "del": "terms.management_fee.commitments"}))
        no_fees = {"set": {"terms.lp_classes": classes, "lps": lps}, "del": "terms.management_fee"}
        self.assertEqual(self.refused(no_fees), ("input", "missing_field", "terms.fee_rate"))

    def test_a_schedules_call_has_no_payers_to_check(self):
        # F32: a schedule's calls are every LP's own fee, so one made before any LP has closed isn't refused, as an entered
        # call then would be. Both LPs join on 2021-05-01, after the first call, the schedule's on 2021-02-15: each owes
        # its own fees for Q1 from 15 Feb and for Q2, 2,500 and 5,000 on 1,000,000.
        lps = [{"name": "A", "commitment": "1000000", "close": "2021-05-01"}, {"name": "B", "commitment": "1000000", "close": "2021-05-01"}]
        f = read(apply_change(SCHEDULED, {"set": {"lps": lps, "cash_flows[0].date": "2021-06-01"}, "del": "terms.management_fee.commitments"}))
        self.assertEqual(back_fees(equalization(f)), [7500, 7500])
        entered = {"set": {"lps": lps, "terms.equalization_rate": "0", "cash_flows[1]": call("2021-03-01", "10", "fee")}, "del": "terms.management_fee"}
        self.assertEqual(self.refused(entered), ("input", "call_without_payers", "cash_flows[0]"))


def part(f, c, i, date, before=False):
    """LP i's part of call c among the LPs in by `date`, or with `before` the LPs in just before it: the call times its
    weight over theirs (F25). No GP commitment here, so the LPs' part is the call."""
    members = [j for j, lp in enumerate(f.lps) if lp.close is None or (lp.close < date if before else lp.close <= date)]
    if i not in members:
        return F(0)
    w = {j: f.weight(f.lps[j], c.kind) for j in members}
    return c.amount * w[i] / sum(w.values())


CLASSED = {
    "as_of": "2026-06-30",
    "terms": {"carry": "0.2", "fee_rate": "0.02", "equalization_rate": "0.08", "lp_classes": [{"name": "F&F", "fee_rate": "0", "carry": "0"}]},
    "cash_flows": [call("2022-01-01", "9000000"), call("2022-01-01", "160000", "fee")],
    "lps": [{"name": "Alder", "commitment": "6"}, {"name": "Cedar", "commitment": "1", "class": "F&F"}],
}


class ClassRefusals(unittest.TestCase):
    """F28 beyond the fixtures in packages/fund/cases/fund-27-classes-refused, and FA24 to FA27."""

    def refused(self, change, base=CLASSED):
        with self.assertRaises(Refusal) as ctx:
            read(apply_change(base, change))
        return (ctx.exception.kind, ctx.exception.term, ctx.exception.path)

    def test_null_is_left_out_but_for_a_carry(self):
        # FA24: null fee rates, classes, an LP's class and close are left out; a null class carry is refused.
        read(apply_change(CLASSED, {"set": {"terms.equalization_rate": None, "terms.lp_classes[0].fee_rate": None, "lps[1].class": None, "lps[0].close": None}}))
        self.assertEqual(read(apply_change(CLASSED, {"set": {"terms.lp_classes": None, "lps[1].class": None}})).classes, [])
        self.assertEqual(read(apply_change(CLASSED, {"set": {"terms.lp_classes": [], "lps[1].class": None}})).classes, [])
        self.assertEqual(self.refused({"set": {"terms.lp_classes[0].carry": None}}), ("input", "bad_number", "terms.lp_classes[0].carry"))
        self.assertEqual(self.refused({"set": {"terms.fee_rate": None}}), ("input", "missing_field", "terms.fee_rate"))

    def test_a_classs_keys_in_the_files_order_its_carrys_among_them(self):
        # FA25: the first unsupported key in the class, its carry's own keys at the carry's place.
        cls = {"name": "F&F", "carry": {"steps": [{"rate": "0", "hurdle": "x"}]}, "pref": {"rate": "0.06"}}
        self.assertEqual(self.refused({"set": {"terms.lp_classes[0]": cls}}), ("unsupported", "hurdle", "terms.lp_classes[0].carry.steps[0].hurdle"))
        cls = {"name": "F&F", "pref": {"rate": "0.06"}, "carry": {"tiers": []}}
        self.assertEqual(self.refused({"set": {"terms.lp_classes[0]": cls}}), ("unsupported", "pref", "terms.lp_classes[0].pref"))
        # Stage 1 comes first: an unsupported class key before a bad fund carry.
        self.assertEqual(self.refused({"set": {"terms.carry": "2", "terms.lp_classes[0].mgmt_fee": "1"}}), ("unsupported", "mgmt_fee", "terms.lp_classes[0].mgmt_fee"))

    def test_the_order_within_and_between_classes(self):
        # F28, FA25: shape, name, repeat, fee rate (its own number before the fund's rate), carry, carry against the
        # catch-up; each class through before the next.
        no_rate = {"carry": "0.2", "lp_classes": [{"name": "A", "fee_rate": "-1"}]}
        self.assertEqual(self.refused({"set": {"terms": no_rate}}), ("input", "bad_number", "terms.lp_classes[0].fee_rate"))
        two = [{"name": "A", "carry": "2"}, {"name": "A"}]
        self.assertEqual(self.refused({"set": {"terms.lp_classes": two}}), ("input", "carry_rate_not_below_one", "terms.lp_classes[0].carry"))
        two = [{"name": "A"}, {"name": "A", "carry": "2"}]
        self.assertEqual(self.refused({"set": {"terms.lp_classes": two}}), ("input", "lp_class_name_repeated", "terms.lp_classes[1].name"))
        # The fund's own terms come first: a bad fee rate before a bad class, a bad fund carry before both.
        self.assertEqual(self.refused({"set": {"terms.fee_rate": "-1", "terms.lp_classes[0].name": ""}}), ("input", "bad_number", "terms.fee_rate"))
        self.assertEqual(self.refused({"set": {"terms.equalization_rate": "x", "terms.lp_classes[0].name": ""}}), ("input", "bad_number", "terms.equalization_rate"))

    def test_class_names_compare_as_written(self):
        # FA27: as LP names do (FA17): "F&F " and "f&f" aren't "F&F"; a blank name is JavaScript trim's whitespace.
        for cls in ["F&F ", "f&f", " F&F"]:
            self.assertEqual(self.refused({"set": {"lps[1].class": cls}}), ("input", "lp_class_unknown", "lps[1].class"))
        for name in ["", " ", "﻿"]:
            self.assertEqual(self.refused({"set": {"terms.lp_classes[0].name": name}}), ("input", "bad_field", "terms.lp_classes[0].name"))
        self.assertEqual(self.refused({"set": {"terms.lp_classes[0].name": ["F&F"]}}), ("input", "bad_field", "terms.lp_classes[0].name"))

    def test_an_lps_class_and_close_come_after_its_other_checks(self):
        # F28: within an LP, F21's checks first, then its class, then its close; each LP through before the next.
        self.assertEqual(self.refused({"set": {"lps[1].class": "X", "lps[1].commitment": "0"}}), ("input", "bad_number", "lps[1].commitment"))
        self.assertEqual(self.refused({"set": {"lps[1].class": "X", "lps[1].close": "soon"}}), ("input", "lp_class_unknown", "lps[1].class"))
        self.assertEqual(self.refused({"set": {"lps[0].close": "soon", "lps[1].class": "X"}}), ("input", "bad_date", "lps[0].close"))
        self.assertEqual(self.refused({"set": {"lps[1].class": True}}), ("input", "bad_field", "lps[1].class"))
        # A class the terms don't have, when they have none at all.
        self.assertEqual(self.refused({"set": {"terms.lp_classes": None, "terms.fee_rate": None}}), ("input", "lp_class_unknown", "lps[1].class"))

    def test_a_close_must_come_before_d(self):
        # FA32: with no distribution in the cash flows, D is the limit: X is a distribution on D.
        self.assertEqual(self.refused({"set": {"lps[1].close": "2026-06-30"}}), ("input", "lp_close_after_distribution", "lps[1].close"))
        read(apply_change(CLASSED, {"set": {"lps[1].close": "2026-06-29"}}))

    def test_what_the_lps_need_comes_last(self):
        # F28's fifth stage: after every LP is read. An LP's bad close comes before a missing equalization rate.
        change = {"del": "terms.equalization_rate", "set": {"lps[1].close": "2023-01-01", "lps[0].close": "x"}}
        self.assertEqual(self.refused(change), ("input", "bad_date", "lps[0].close"))
        change = {"del": "terms.equalization_rate", "set": {"lps[1].close": "2023-01-01"}}
        self.assertEqual(self.refused(change), ("input", "missing_field", "terms.equalization_rate"))
        # Fee calls no LP pays, as every LP pays no fees: the first by date, whatever its place in the list.
        late = {"cash_flows[1]": call("2023-01-01", "100", "fee"), "cash_flows[2]": call("2022-06-01", "100", "fee"), "lps[0].class": "F&F"}
        self.assertEqual(self.refused({"set": late}), ("input", "call_without_payers", "cash_flows[2]"))
        # Without listed LPs, nothing here applies: the LPs' side pays every call (F23).
        read(apply_change(CLASSED, {"set": {"lps": None}}))


def random_fund(rng):
    """A small fund with a pref or not, a catch-up or not, one to three carry steps, a GP commitment or not, and calls
    and distributions in any order after the first call: its X final."""
    steps = [{"rate": str(rng.choice([F(1, 10), F(3, 20), F(1, 5)]))}]
    for m in sorted(rng.sample([2, 3, 4], rng.randint(0, 2))):
        steps.append({"rate": str(F(steps[-1]["rate"]) + F(1, 20)), "from_lp_multiple": str(m)})
    terms = {"carry": {"steps": steps}}
    if rng.random() < 0.6:
        terms["pref"] = {"rate": rng.choice(["0.06", "0.08"])}
        if rng.random() < 0.6:
            terms["catch_up"] = {"gp_share": rng.choice(["1", "0.5"])}
    if rng.random() < 0.4:
        terms["gp_commitment"] = {"share": "0.02", "pays_fees": rng.random() < 0.5}
    start = datetime.date(2015, 1, 1)
    flows = [call(start.isoformat(), str(rng.randint(5, 20) * 100000))]
    day = start
    for _ in range(rng.randint(1, 6)):
        day += datetime.timedelta(days=rng.randint(30, 500))
        if rng.random() < 0.5:
            flows.append(call(day.isoformat(), str(rng.randint(1, 10) * 100000), rng.choice(["investment", "fee", "expense"])))
        else:
            flows.append(dist(day.isoformat(), str(rng.randint(1, 40) * 100000)))
    d = day + datetime.timedelta(days=rng.randint(0, 400))
    return {"as_of": d.isoformat(), "terms": terms, "cash_flows": flows, "final": True}


def random_classes(rng, inputs):
    """The same fund with two to four LPs, some in classes with their own fee rate or carry, some at later closes."""
    first = inputs["terms"]["carry"]["steps"][0]["rate"]
    s = F(inputs["terms"].get("catch_up", {}).get("gp_share", "1"))
    classes = []
    for name in ("Anchor", "F&F", "Stepped"):
        if rng.random() < 0.6:
            c = {"name": name}
            if rng.random() < 0.6:
                c["fee_rate"] = rng.choice(["0", "0.01", "0.025"])
            if rng.random() < 0.7:
                rates = [r for r in (F(0), F(1, 20), F(1, 10), F(1, 4)) if r < s]
                lo = rng.choice(rates)
                c["carry"] = str(lo) if rng.random() < 0.5 else {"steps": [{"rate": str(lo)}, {"rate": str(lo + F(1, 10)), "from_lp_multiple": rng.choice(["1.5", "2"])}]}
            classes.append(c)
    terms = {**inputs["terms"], "fee_rate": "0.02", "equalization_rate": rng.choice(["0", "0.06"]), "lp_classes": classes}
    calls = sorted(f["date"] for f in inputs["cash_flows"] if f["type"] == "call")
    dists = sorted(f["date"] for f in inputs["cash_flows"] if f["type"] == "distribution") + [inputs["as_of"]]
    lps = [{"name": "LP 0", "commitment": str(rng.randint(1, 9))}]
    if classes and rng.random() < 0.3:
        lps[0]["class"] = rng.choice(classes)["name"]
    for i in range(1, rng.randint(2, 4)):
        lp = {"name": f"LP {i}", "commitment": str(rng.randint(1, 9))}
        if classes and rng.random() < 0.6:
            lp["class"] = rng.choice(classes)["name"]
        later = [d for d in calls if d < dists[0]]
        if rng.random() < 0.4 and len(later) > 1:
            lp["close"] = later[-1]
        lps.append(lp)
    return {**inputs, "terms": terms, "lps": lps}


def random_fees(rng, inputs):
    """random_classes' fund with fees two ways (F29, F30): half the time a schedule in place of its entered fee calls,
    from near its first call, quarterly, half-yearly or yearly, perhaps stepping down or to 0; otherwise its entered fee
    calls kept, a fee call on the first call's date added most of the time. Either way most LPs after the first join at
    a later close, on any day before the first distribution."""
    out = copy.deepcopy(inputs)
    first = datetime.date(2015, 1, 1)  # random_fund's first call
    limit = min(datetime.date.fromisoformat(f["date"]) for f in out["cash_flows"] + [{"date": out["as_of"]}] if f.get("type") != "call")
    for lp in out["lps"][1:]:
        lp.pop("close", None)
        if rng.random() < 0.7 and (limit - first).days > 1:
            lp["close"] = (first + datetime.timedelta(days=rng.randint(1, (limit - first).days - 1))).isoformat()
    if rng.random() < 0.5:
        out["cash_flows"] = [f for f in out["cash_flows"] if f.get("kind") != "fee"]
        start = datetime.date(2015, 1, 1) + datetime.timedelta(days=rng.randint(-90, 300))
        steps = [{"rate": rng.choice(["0.02", "0.025", "0.015"])}]
        if rng.random() < 0.6:
            steps.append({"rate": rng.choice(["0.015", "0.01", "0"]), "from": (start + datetime.timedelta(days=rng.randint(1, 1500))).isoformat()})
        fee = {"start": start.isoformat(), "frequency": rng.choice(["quarterly", "semiannual", "annual"]), "steps": steps}
        out["terms"] = {**{k: v for k, v in out["terms"].items() if k != "fee_rate"}, "management_fee": fee}
    elif rng.random() < 0.7:
        out["cash_flows"].append(call(first.isoformat(), str(rng.randint(1, 9) * 10000), "fee"))
    return out


class RandomFunds(unittest.TestCase):
    def test_breakpoints_are_found_and_the_clawback_never_rises(self):
        # Every random fund's breakpoints are found and checked straight between (breakpoints.find raises if not).
        # As X grows, the clawback only holds or falls, so it never starts: F15's wording for its changes covers
        # them all (find raises NotSettled otherwise).
        rng = random.Random(20261013)
        for i in range(60):
            inputs = random_fund(rng)
            wf = Waterfall(read(inputs))
            found = breakpoints.find(wf)
            for x, rs in found:
                self.assertNotIn("clawback_starts", [r["code"] for r in rs], (i, inputs))
            xs = sorted({F(0)} | {x for x, _ in found})
            owed = [wf.evaluate(x).clawback for x in xs + [xs[-1] + 10**7]]
            self.assertEqual(owed, sorted(owed, reverse=True), (i, inputs))



    def test_with_classes_and_closes(self):
        # The same random funds with LPs in classes and at later closes: every account's breakpoints are found and
        # checked straight between, no account's clawback ever rises (FA9), the fund's amounts are the accounts' sums
        # (F23), and on the fund's terms alone the accounts give exactly 0.2.0's amounts.
        rng = random.Random(20261024)
        for i in range(40):
            inputs = random_classes(rng, random_fund(rng))
            try:
                f = read(inputs)
            except Refusal as r:
                self.assertEqual(r.term, "call_without_payers", (i, inputs))
                continue
            m = Model(f)
            found = breakpoints.find(m)
            # The case file's shapes (FC11) are written for it too.
            run_case({"case": "random", "xs": ["0"], "fund": inputs})
            xs = sorted({F(0)} | {x for x, _ in found})
            for a_i in range(len(m.accounts)):
                owed = [m.evaluate(x).by_account[a_i][1].clawback for x in xs + [xs[-1] + 10**7]]
                self.assertEqual(owed, sorted(owed, reverse=True), (i, inputs))
            for x in xs[1:] + [xs[-1] + 1]:
                out = m.evaluate(x)
                self.assertEqual(sum(o.this.lps + o.this.gp for _, o in out.by_account) + out.gp_commitment, x)
            plain = {**inputs, "lps": [{"name": lp["name"], "commitment": lp["commitment"]} for lp in inputs["lps"]]}
            one, wf = Model(read(plain)), Waterfall(read(plain))
            for x in xs + [xs[-1] + 1]:
                (_, o), w = one.evaluate(x).by_account[0], wf.evaluate(x)
                self.assertEqual((o.this.vector()[:-1], o.ledger.to_date.lps, o.clawback), (w.this.vector()[:-1], w.ledger.to_date.lps, w.clawback))

    def test_with_fees(self):
        # The random funds with classes and closes again, with a schedule or with entered fee calls before later closes
        # (F29, F30): every account's breakpoints are found, no account's clawback rises, and the fund's amounts are the
        # accounts' sums. What the waterfall counts as the LPs' fees is what the LPs in at each fee call's date paid as it
        # was made, plus every joiner's back fees: nothing is lost or counted twice, and nothing about fees moves between
        # LPs. And with no fee call before a later close, the closes change no amount, as in 0.3.0.
        rng = random.Random(20261025)
        seen = {"schedule": 0, "back fees": 0, "no fee call before a close": 0}
        for i in range(30):
            inputs = random_fees(rng, random_classes(rng, random_fund(rng)))
            try:
                f = read(inputs)
            except Refusal as r:
                self.assertEqual(r.term, "call_without_payers", (i, inputs))
                continue
            m = Model(f)
            found = breakpoints.find(m)
            run_case({"case": "random", "xs": ["0"], "fund": inputs})
            xs = sorted({F(0)} | {x for x, _ in found})
            for a_i in range(len(m.accounts)):
                owed = [m.evaluate(x).by_account[a_i][1].clawback for x in xs + [xs[-1] + 10**7]]
                self.assertEqual(owed, sorted(owed, reverse=True), (i, inputs))
            for x in xs[1:] + [xs[-1] + 1]:
                out = m.evaluate(x)
                self.assertEqual(sum(o.this.lps + o.this.gp for _, o in out.by_account) + out.gp_commitment, x)
            seen["schedule"] += f.schedule is not None
            fee_calls = [c for c in f.flows if c.type == "call" and c.kind == "fee"]
            counted = sum((fees.lps_part(f, c) for c in fee_calls), F(0))
            as_made = sum((c.amount - (f.gp_share * c.amount if f.pays_fees else 0) for c in fee_calls if not c.scheduled), F(0))
            as_made += sum((f.fee_weight(lp) * c.factor for c in fee_calls if c.scheduled for lp in f.lps if f.is_in(lp, c.date)), F(0))
            e = equalization(f)
            owed_back = sum((t.back_fees for t in e.totals), F(0)) if e else F(0)
            self.assertEqual(counted, as_made + owed_back, (i, inputs))
            seen["back fees"] += owed_back > 0
            if e:
                for close in e.closes:
                    moves = close.moves.values()
                    self.assertEqual(sum(t.capital_paid for t in moves), sum(t.capital_returned for t in moves))
                    self.assertEqual(sum(t.interest_paid for t in moves), sum(t.interest_received for t in moves))
                    for j, t in close.moves.items():
                        self.assertTrue(t.back_fees == 0 or f.lps[j].close == close.date, (i, inputs))
            if e and owed_back == 0 and f.schedule is None and not any(c.date < lp.close for c in fee_calls for lp in f.lps if f.joins_later(lp)):
                seen["no fee call before a close"] += 1
                start = Model(read({**inputs, "lps": [{k: v for k, v in lp.items() if k != "close"} for lp in inputs["lps"]]}))
                for x in xs + [xs[-1] + 1]:
                    for (_, a), (_, b) in zip(m.evaluate(x).by_account, start.evaluate(x).by_account):
                        self.assertEqual((a.this.vector(), a.ledger.to_date.vector(), a.clawback), (b.this.vector(), b.ledger.to_date.vector(), b.clawback))
        self.assertTrue(all(seen.values()), seen)


if __name__ == "__main__":
    unittest.main()
