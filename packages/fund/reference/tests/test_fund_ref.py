"""Hand-checkable tests for the fund reference.

Each test uses numbers small enough to check on paper, with the working in the
comments. The spec's worked examples A, B and C are here too, to the cent.

    python3 -m unittest discover packages/fund/reference/tests
"""

import datetime
import random
import sys
import unittest
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fund_ref import breakpoints  # noqa: E402
from fund_ref.case import apply_change, run_case  # noqa: E402
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


if __name__ == "__main__":
    unittest.main()
