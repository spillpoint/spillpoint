"""Turns a case's inputs.json into its expected.json."""

import datetime
from fractions import Fraction

from . import breakpoints
from .model import CapTable
from .num import parse, exact, money, decimal
from .rounds import build
from .waterfall import Waterfall

GRID_STEP = Fraction(250_000)


def _cap_table_summary(ct):
    data = ct.to_json()
    by_class = {sid: ct.shares_of(sid) for sid in ct.securities}
    by_holder = {}
    for (h, s), n in ct.positions.items():
        by_holder.setdefault(h, {})[s] = n
    fd = ct.fully_diluted()
    data["totals"] = {
        "shares_by_security": by_class,
        "as_converted_by_security": {sid: exact(ct.as_converted(sid)) for sid in ct.securities},
        "fully_diluted": exact(fd),
        "fully_diluted_percent_by_holder": {
            h: decimal(sum(n * ct.conversion_ratio(s) for s, n in secs.items()) / fd * 100, 4)
            for h, secs in by_holder.items()
        },
        "unissued_pool_percent": decimal(Fraction(ct.unissued_pool) / fd * 100, 4) if fd else "0.0000",
    }
    return data


def _outcome_json(wf, outcome):
    ct = wf.ct
    lines = outcome["lines"]
    holder_totals, class_totals = {}, {}
    out_lines = []
    for h, s, _ in wf.lines:
        amt = lines[(h, s)]
        out_lines.append({"holder": h, "security": s, "amount": money(amt)})
        holder_totals[h] = holder_totals.get(h, 0) + amt
        class_totals[s] = class_totals.get(s, 0) + amt
    return {
        "decisions": _decisions_json(wf, outcome["decisions"]),
        "common_price_per_share": decimal(outcome["common_price"], 6),
        "lines": out_lines,
        "holder_totals": {h: money(v) for h, v in holder_totals.items()},
        "class_totals": {s: money(v) for s, v in class_totals.items()},
    }


def _payout_entry(wf, x, tags):
    outcomes = wf.evaluate(x)
    return {
        "exit_value": money(x),
        "tags": tags,
        "multiple_equilibria": len(outcomes) > 1,
        "equilibria": [_outcome_json(wf, o) for o in outcomes],
    }


def run_exit(ct, spec):
    exit_date = datetime.date.fromisoformat(spec["exit_date"]) if spec.get("exit_date") else None
    wf = Waterfall(ct, exit_date)
    lo, hi = parse(spec["range"][0]), parse(spec["range"][1])
    listed = [parse(v) for v in spec["exit_values"]]
    found = breakpoints.find(wf, lo, hi, parse(spec.get("grid_step", exact(GRID_STEP))), extra=listed)
    bps = []
    for x, sa, sb, jumps in found:
        entry = {"exit_value": money(x), "exact": exact(x)}
        if jumps:
            entry["payouts_jump"] = True
        entry["reasons"] = breakpoints.reasons(wf, x, sa, sb, jumps)
        bps.append(entry)
    points = {}
    for v in listed:
        points.setdefault(v, []).append("listed")
    for x, *_ in found:
        points.setdefault(x, []).append("breakpoint")
    payouts = [_payout_entry(wf, x, tags) for x, tags in sorted(points.items())]
    out = {}
    accrued = [sid for sid in ct.preferred_ids() if ct.securities[sid].get("cumulative_dividend")]
    if accrued:
        out["accrued_dividends"] = [_accrued_json(ct, wf, sid, exit_date) for sid in accrued]
    if wf.safes:
        top = wf.evaluate(hi)[0]["decisions"]
        out["unconverted_safes"] = [_safe_json(wf, f, top) for f in wf.safes]
    if wf.notes:
        out["unconverted_notes"] = [_note_json(wf, n, exit_date) for n in wf.notes]
    out.update({"breakpoints": bps, "payouts": payouts})
    if spec.get("payment_schedules"):
        out["payment_schedules"] = [_schedule_json(wf, sched) for sched in spec["payment_schedules"]]
    return out


def _accrued_json(ct, wf, sid, exit_date):
    sec = ct.securities[sid]
    d = sec["cumulative_dividend"]
    return {
        "security": sid,
        "accrual_start": d["accrual_start"].isoformat(),
        "exit_date": exit_date.isoformat(),
        "days": (exit_date - d["accrual_start"]).days,
        "per_share": exact(wf.dividend[sid] / wf.shares[sid]),
        "total": exact(wf.dividend[sid]),
        "total_display": money(wf.dividend[sid]),
        "preference_including_dividends": money(wf.pref[sid]),
    }


def _safe_json(wf, f, top):
    """The Liquidity Event figures for an unconverted post-money SAFE (YC, X1, X9).

    With a cap, they are the figures used when the SAFE takes its Conversion
    Amount. Alongside preferred, its Liquidity Capitalization depends on which
    series convert, so it is given for the decisions at the top of the range,
    and the preferred it counts are listed; its Cash-Out Amount ranks with the
    most junior preferred tier. With no cap, converting is worth the purchase
    amount ÷ (1 − discount) wherever it is possible.
    """
    ct = wf.ct
    out = {"safe": f["id"], "holder": f["holder"], "cash_out_amount": exact(f["purchase_amount"])}
    if ct.seniority:
        out["cash_out_ranks_with"] = list(ct.seniority[-1])
    if wf.priced(f):
        worth = wf.priced_conversion_worth(f)
        out.update({"discount": exact(f["discount"]), "conversion_amount": exact(worth), "approx": {"conversion_amount": money(worth)}})
        return out
    d = dict(zip(wf.players, top))
    converted = {s: d[p] for p in wf.converters for s in wf.members[p]}
    lc, lp, n = wf.liquidity_capitalization(f, converted), wf.liquidity_price(f, converted), wf.safe_conversion_shares(f, converted)
    if ct.preferred_ids():
        out["liquidity_capitalization_counts_preferred"] = [s for s in ct.preferred_ids() if not wf.keeps_preference_in_lieu(s, converted)]
    out.update(
        {
            "liquidity_capitalization": exact(lc),
            "liquidity_price": exact(lp),
            "conversion_shares": exact(n),
            "approx": {
                "liquidity_capitalization": decimal(lc, 2),
                "liquidity_price": decimal(lp, 6),
                "conversion_shares": decimal(n, 2),
            },
        }
    )
    return out


def _note_json(wf, n, exit_date):
    """The exit figures for an unconverted convertible note. They don't depend on the exit value."""
    interest = wf.note_interest[n["id"]]
    head = {
        "note": n["id"],
        "holder": n["holder"],
        "issue_date": n["issue_date"].isoformat(),
        "exit_date": exit_date.isoformat(),
        "days": (exit_date - n["issue_date"]).days,
        "interest": exact(interest),
        "repayment": exact(wf.note_repayment(n)),
    }
    if wf.priced(n):
        # X12: no cap, so it converts at the common price less its discount, worth (principal + interest) ÷ (1 − discount).
        if not wf.note_can_convert(n):
            return {**head, "converts": False, "approx": {"interest": money(interest), "repayment": money(wf.note_repayment(n))}}
        worth = wf.priced_conversion_worth(n)
        return {
            **head,
            "discount": exact(n["discount"]),
            "conversion_amount": exact(worth),
            "approx": {"interest": money(interest), "repayment": money(wf.note_repayment(n)), "conversion_amount": money(worth)},
        }
    base, price, shares = wf.note_conversion_base(n), wf.note_conversion_price(n), wf.note_conversion_shares(n)
    return {
        "note": n["id"],
        "holder": n["holder"],
        "issue_date": n["issue_date"].isoformat(),
        "exit_date": exit_date.isoformat(),
        "days": (exit_date - n["issue_date"]).days,
        "interest": exact(interest),
        "repayment": exact(wf.note_repayment(n)),
        "conversion_base": n["conversion_base"],
        "conversion_base_shares": exact(base),
        "conversion_price": exact(price),
        "conversion_shares": exact(shares),
        "approx": {
            "interest": money(interest),
            "repayment": money(wf.note_repayment(n)),
            "conversion_price": decimal(price, 6),
            "conversion_shares": decimal(shares, 2),
        },
    }


def run_case(inputs):
    out = {"case": inputs["case"], "generated_by": "reference/generate.py"}
    tables = {}
    if "events" in inputs:
        out["cap_tables"] = []
        for ev, ct, details in build(inputs):
            tables[ev["id"]] = ct
            out["cap_tables"].append(
                {"after_event": ev["id"], "date": ev.get("date"), "details": details, "cap_table": _cap_table_summary(ct)}
            )
    if "exit" in inputs:
        spec = inputs["exit"]
        if "cap_table_after_event" in spec:
            ct = tables[spec["cap_table_after_event"]]
        else:
            ct = CapTable.from_json(spec["cap_table"])
        out["exit"] = run_exit(ct, spec)
    return out


def _decisions_json(wf, bits):
    def word(p, b):
        if p in wf.converters:
            return "converts" if b else "keeps_preference"
        if p in wf.safe_ids:
            return "conversion_amount" if b else "cash_out_amount"
        if p in wf.note_ids:
            return "converts" if b else "repayment"
        return "exercised" if b else "not_exercised"

    return {p: word(p, b) for p, b in zip(wf.players, bits)}


def _schedule_json(wf, sched):
    """Escrow and earnouts (SPEC): proceeds arrive as a schedule of payments.

    The waterfall runs on cumulative proceeds, so each later payment goes where
    it would have gone if it had been paid at closing. A payment's take for a
    holder is that holder's cumulative payout after the payment minus before
    it. Conversion and exercise decisions are re-made at each cumulative
    amount; a strike is paid in the payment where the option is first
    exercised. A negative take (a holder owing money back) is reported as is.
    """
    cumulative = Fraction(0)
    prev = {(h, s): Fraction(0) for h, s, _ in wf.lines}
    payments = []
    for pay in sched["payments"]:
        amount = parse(pay["amount"])
        cumulative += amount
        outs = wf.evaluate(cumulative)
        if len(outs) != 1:
            raise ValueError(f"schedule {sched['id']}: more than one stable outcome at cumulative {money(cumulative)}")
        lines = outs[0]["lines"]
        take = {k: lines[k] - prev[k] for k in prev}
        holder_totals, class_totals = {}, {}
        for (h, s), v in take.items():
            holder_totals[h] = holder_totals.get(h, Fraction(0)) + v
            class_totals[s] = class_totals.get(s, Fraction(0)) + v
        payments.append(
            {
                "label": pay["label"],
                "amount": money(amount),
                "cumulative": money(cumulative),
                "decisions_at_cumulative": _decisions_json(wf, outs[0]["decisions"]),
                "lines": [{"holder": h, "security": s, "amount": money(take[(h, s)])} for h, s, _ in wf.lines],
                "holder_totals": {h: money(v) for h, v in holder_totals.items()},
                "class_totals": {c: money(v) for c, v in class_totals.items()},
            }
        )
        prev = dict(lines)
    return {"id": sched["id"], "description": sched.get("description", ""), "payments": payments}
