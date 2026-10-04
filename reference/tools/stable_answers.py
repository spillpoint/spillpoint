#!/usr/bin/env python3
"""Searches for exits with more than one stable answer, or none (asked for before M2c; ASSUMPTIONS E8, E15).

It builds random cap tables under our rules and, at many exit values each, uses
the reference waterfall to find every stable set of decisions. This is the
reference's own method: every combination, keeping those where no decision-maker
gains by switching. Fixed seeds make every number reproducible.

    python3 reference/tools/stable_answers.py            # all four studies, a few minutes
    python3 reference/tools/stable_answers.py search     # one study

Studies:
  search    Random cap tables with realistic caps (every cap above its preference). Counts exit
            values with more than one stable answer, with none, where E15's both-ends search
            agrees but misses another answer (the gap), and where it cycles although an answer exists.
  caps      A fixed cap table where one series' cap sits below its preference (which no real charter
            has) and another's equals it: it has two stable answers at $28,318,750.
  options   Small tables with two series in one conversion group plus options. Compares the
            reference's method (each option class decides with the others held fixed) with letting
            option exercise follow the common price inside each conversion combination.
  leads     Random tables with one conversion group. Options follow the price, and the group decides
            first: for each group decision the other series settle, and the group votes on the two
            settled outcomes. Checks that this always gives one answer, and the reference's answer
            wherever the reference has one.
"""

import itertools
import random
import sys
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from spillpoint_ref.model import CapTable  # noqa: E402
from spillpoint_ref.waterfall import Waterfall  # noqa: E402

POINTS_PER_TABLE = 120


# ---------- random cap tables ----------


def random_table(rng, realistic_caps=True):
    holders = ["f"]
    secs = [{"id": "common", "name": "c", "kind": "common"}]
    pos = [{"holder": "f", "security": "common", "shares": rng.choice([1, 2, 4, 6, 8]) * 1_000_000}]
    ids = []
    for i in range(rng.choice([2, 2, 3, 3, 4])):
        sid = f"s{i}"
        ids.append(sid)
        holders.append(f"h{i}")
        oip = F(rng.choice([1, 2, 3, 4, 5, 6, 8, 10]), rng.choice([1, 2, 4]))
        part = rng.choice(["non_participating", "non_participating", "participating", "participating_capped"])
        mult = rng.choice([1, 1, F(3, 2), 2, 3])
        cap = (mult + rng.choice([1, 2, 3])) if realistic_caps else rng.choice([2, 3, 4])
        secs.append(
            {
                "id": sid, "name": sid, "kind": "preferred", "original_issue_price": str(oip),
                "conversion_price": str(oip * F(rng.choice([4, 5, 6, 8]), 8)) if rng.random() < 0.3 else str(oip),
                "preference_multiple": str(mult), "participation": part,
                "cap_multiple": str(cap) if part == "participating_capped" else None,
            }
        )
        pos.append({"holder": f"h{i}", "security": sid, "shares": rng.choice([1, 2, 3, 5]) * 500_000})
    for j in range(rng.choice([0, 0, 1, 2])):
        holders.append(f"e{j}")
        secs.append({"id": f"o{j}", "name": f"o{j}", "kind": "option", "strike": str(F(rng.choice([1, 2, 5, 10, 20, 40]), 4))})
        pos.append({"holder": f"e{j}", "security": f"o{j}", "shares": rng.choice([1, 2, 5]) * 200_000})
    order = ids[:]
    rng.shuffle(order)
    tiers = []
    for sid in order:
        if tiers and rng.random() < 0.4:
            tiers[-1].append(sid)
        else:
            tiers.append([sid])
    groups = []
    convertible = [s["id"] for s in secs if s["kind"] == "preferred" and s["participation"] != "participating"]
    if len(convertible) >= 2 and rng.random() < 0.35:
        groups.append({"series": rng.sample(convertible, 2), "vote_threshold_percent": "50",
                       "vote_rule": rng.choice(["more_than", "at_least"])})
    return {"holders": [{"id": h, "name": h} for h in holders], "securities": secs, "seniority": tiers,
            "conversion_groups": groups, "positions": pos, "unissued_pool": 0}


def small_group_table(rng):
    secs = [{"id": "common", "name": "c", "kind": "common"}]
    for sid in ("a", "b"):
        secs.append({"id": sid, "name": sid, "kind": "preferred", "original_issue_price": str(rng.choice([1, 2, 3, 4])),
                     "preference_multiple": str(rng.choice([1, 2, 3])), "participation": "non_participating", "cap_multiple": None})
    secs.append({"id": "o", "name": "o", "kind": "option", "strike": str(F(rng.choice([1, 2, 4, 8, 12]), 4))})
    pos = [{"holder": "f", "security": "common", "shares": rng.choice([1, 2, 4, 8]) * 1_000_000},
           {"holder": "x", "security": "a", "shares": rng.choice([1, 2, 3]) * 1_000_000},
           {"holder": "y", "security": "b", "shares": rng.choice([1, 2, 3]) * 1_000_000},
           {"holder": "e", "security": "o", "shares": rng.choice([1, 5, 10]) * 100_000}]
    return {"holders": [{"id": h, "name": h} for h in "fxye"], "securities": secs,
            "seniority": rng.choice([[["a", "b"]], [["a"], ["b"]]]),
            "conversion_groups": [{"series": ["a", "b"], "vote_threshold_percent": "50",
                                   "vote_rule": rng.choice(["more_than", "at_least"])}],
            "positions": pos, "unissued_pool": 0}


def tables(seed, count, make):
    rng = random.Random(seed)
    for _ in range(count):
        data = make(rng)
        try:
            wf = Waterfall(CapTable.from_json(data))
        except ValueError:
            continue
        top = (sum(wf.pref.values()) or F(1)) * rng.choice([3, 6, 12])
        yield wf, [top * F(k, POINTS_PER_TABLE) for k in range(1, POINTS_PER_TABLE + 1)]


# ---------- stability ----------


def flip(bits, i):
    return bits[:i] + (not bits[i],) + bits[i + 1:]


def outcome(wf, total):
    return tuple(sorted(wf.split_to_lines(total).items()))


def stable_held(wf, results):
    """The reference's method: each decision-maker, options included, compares switching with the rest held fixed."""
    def stable(bits):
        for i, player in enumerate(wf.players):
            other = flip(bits, i)
            if player in wf.vote:
                on, off = (bits, other) if bits[i] else (other, bits)
                if wf.vote_converts(player, results[on][0], results[off][0]) != bits[i]:
                    return False
            elif wf.player_value(results[other][0], player) > wf.player_value(results[bits][0], player):
                return False
        return True
    return [b for b in results if stable(b)]


def both_ends(wf, results, start):
    """E15's search: from one end, the single switch that gains most, until no one switches. Returns (end, cycled)."""
    bits, seen = start, {start}
    while True:
        best, best_gain = None, 0
        for i, player in enumerate(wf.players):
            other = flip(bits, i)
            if player in wf.vote:
                on, off = (bits, other) if bits[i] else (other, bits)
                gain = F(10**30) if wf.vote_converts(player, results[on][0], results[off][0]) != bits[i] else 0
            else:
                gain = wf.player_value(results[other][0], player) - wf.player_value(results[bits][0], player)
            if gain > best_gain:
                best, best_gain = i, gain
        if best is None:
            return bits, False
        bits = flip(bits, best)
        if bits in seen:
            return bits, True
        seen.add(bits)


def options_settled(wf, results, conv_bits):
    """Options follow the common price: the exercise set where no option class gains by switching (E5: fewest exercises on a tie)."""
    nc, no = len(wf.converters), len(wf.options)
    fits = []
    for obits in itertools.product((False, True), repeat=no):
        bits = conv_bits + obits + tuple([False] * (len(wf.players) - nc - no))
        if all(wf.player_value(results[flip(bits, nc + j)][0], wf.players[nc + j]) <= wf.player_value(results[bits][0], wf.players[nc + j])
               for j in range(no)):
            fits.append(bits)
    return min(fits, key=sum) if fits else None


def stable_options_follow(wf, results):
    """Series and groups compare switching with option exercise re-settled under each choice."""
    nc = len(wf.converters)
    settled = {cb: options_settled(wf, results, cb) for cb in itertools.product((False, True), repeat=nc)}
    out = []
    for cb, bits in settled.items():
        ok = True
        for i, player in enumerate(wf.converters):
            other = settled[flip(cb, i)]
            if player in wf.vote:
                on, off = (bits, other) if cb[i] else (other, bits)
                ok = wf.vote_converts(player, results[on][0], results[off][0]) == cb[i]
            else:
                ok = wf.player_value(results[other][0], player) <= wf.player_value(results[bits][0], player)
            if not ok:
                break
        if ok:
            out.append(bits)
    return out


def group_leads(wf, results):
    """One group decides first: for each of its decisions the other series settle (options following the price); it votes on the two settled outcomes."""
    nc = len(wf.converters)
    (g,) = [i for i, p in enumerate(wf.converters) if p in wf.vote]
    settled_opts = {cb: options_settled(wf, results, cb) for cb in itertools.product((False, True), repeat=nc)}
    settled = {}
    for decision in (False, True):
        fits = []
        for cb, bits in settled_opts.items():
            if cb[g] != decision:
                continue
            if all(wf.player_value(results[settled_opts[flip(cb, i)]][0], p) <= wf.player_value(results[bits][0], p)
                   for i, p in enumerate(wf.converters) if i != g):
                fits.append(bits)
        if len({outcome(wf, results[b][0]) for b in fits}) != 1:
            return None
        settled[decision] = min(fits, key=sum)
    converts = wf.vote_converts(wf.converters[g], results[settled[True]][0], results[settled[False]][0])
    return outcome(wf, results[settled[converts]][0])


# ---------- studies ----------


def study_search(realistic_caps=True, seeds=(2, 3, 4, 5, 6, 7), count=600):
    c = dict(tables=0, exit_values=0, two_or_more=0, none=0, none_with_group=0, gap=0, cycle_with_answer=0)
    for seed in seeds:
        for wf, xs in tables(seed, count, lambda r: random_table(r, realistic_caps)):
            c["tables"] += 1
            for x in xs:
                c["exit_values"] += 1
                results = {b: wf.run(x, b) for b in wf.decision_sets()}
                held = stable_held(wf, results)
                answers = {outcome(wf, results[b][0]) for b in held}
                c["two_or_more"] += len(answers) > 1
                if not held:
                    c["none"] += 1
                    c["none_with_group"] += bool(wf.vote)
                n = len(wf.players)
                lo, cyc_lo = both_ends(wf, results, tuple([False] * n))
                hi, cyc_hi = both_ends(wf, results, tuple([True] * n))
                if (cyc_lo or cyc_hi) and held:
                    c["cycle_with_answer"] += 1
                elif not (cyc_lo or cyc_hi) and outcome(wf, results[lo][0]) == outcome(wf, results[hi][0]) and len(answers) > 1:
                    c["gap"] += 1
    return c


DEGENERATE_CAPS = {
    "holders": [{"id": h, "name": h} for h in ("f", "h0", "h1", "h2", "h3")],
    "securities": [
        {"id": "common", "name": "c", "kind": "common"},
        {"id": "s0", "name": "s0", "kind": "preferred", "original_issue_price": "8", "conversion_price": "6",
         "preference_multiple": "2", "participation": "non_participating", "cap_multiple": None},
        # 3x preference but a 2x total cap: the cap sits below the preference.
        {"id": "s1", "name": "s1", "kind": "preferred", "original_issue_price": "5/2", "conversion_price": "5/2",
         "preference_multiple": "3", "participation": "participating_capped", "cap_multiple": "2"},
        {"id": "s2", "name": "s2", "kind": "preferred", "original_issue_price": "1", "conversion_price": "5/8",
         "preference_multiple": "1", "participation": "non_participating", "cap_multiple": None},
        # 2x preference and a 2x cap: no room to participate.
        {"id": "s3", "name": "s3", "kind": "preferred", "original_issue_price": "2", "conversion_price": "3/2",
         "preference_multiple": "2", "participation": "participating_capped", "cap_multiple": "2"},
    ],
    "seniority": [["s2", "s1"], ["s3"], ["s0"]],
    "positions": [{"holder": "f", "security": "common", "shares": 6_000_000}, {"holder": "h0", "security": "s0", "shares": 1_500_000},
                  {"holder": "h1", "security": "s1", "shares": 2_500_000}, {"holder": "h2", "security": "s2", "shares": 2_500_000},
                  {"holder": "h3", "security": "s3", "shares": 1_000_000}],
    "unissued_pool": 0,
}


def study_caps():
    wf = Waterfall(CapTable.from_json(DEGENERATE_CAPS))
    x = F(28_318_750)
    results = {b: wf.run(x, b) for b in wf.decision_sets()}
    held = stable_held(wf, results)
    return {"exit_value": "28318750", "stable_answers": len({outcome(wf, results[b][0]) for b in held}),
            "who_converts": [[p for p, on in zip(wf.players, b) if on] for b in held]}


def study_options(seed=11, count=1500):
    c = dict(exit_values=0, none_options_held=0, none_options_follow=0, different_answers=0)
    for wf, xs in tables(seed, count, small_group_table):
        for x in xs:
            c["exit_values"] += 1
            results = {b: wf.run(x, b) for b in wf.decision_sets()}
            held = {outcome(wf, results[b][0]) for b in stable_held(wf, results)}
            follow = {outcome(wf, results[b][0]) for b in stable_options_follow(wf, results)}
            c["none_options_held"] += not held
            c["none_options_follow"] += not follow
            c["different_answers"] += bool(held and follow and held != follow)
    return c


def study_leads(seed=31, count=4000):
    c = dict(exit_values=0, one_answer=0, same_as_reference=0, reference_has_none=0, different=0, no_single_answer=0)
    for wf, xs in tables(seed, count, random_table):
        if len(wf.vote) != 1:
            continue
        for x in xs:
            c["exit_values"] += 1
            results = {b: wf.run(x, b) for b in wf.decision_sets()}
            answer = group_leads(wf, results)
            if answer is None:
                c["no_single_answer"] += 1
                continue
            c["one_answer"] += 1
            held = {outcome(wf, results[b][0]) for b in stable_held(wf, results)}
            if not held:
                c["reference_has_none"] += 1
            elif held == {answer}:
                c["same_as_reference"] += 1
            else:
                c["different"] += 1
    return c


STUDIES = {
    "search": lambda: study_search(True),
    "caps": study_caps,
    "options": study_options,
    "leads": study_leads,
}

if __name__ == "__main__":
    for name in sys.argv[1:] or list(STUDIES):
        print(name, STUDIES[name](), flush=True)
