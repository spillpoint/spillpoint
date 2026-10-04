"""Brute-force exit waterfall.

At each exit value, try every combination of decisions (each convertible
preferred series, or conversion group, converts or not; each option strike
class and each warrant exercises or not; each unconverted SAFE takes its
Cash-Out Amount or its Conversion Amount; each unconverted note takes its
repayment or converts), run the waterfall for each, and keep
the combinations that are stable: no single decision-maker would be better
off flipping its own decision.

Option exercise is not a free choice: it follows the common price (E16).
Under each set of the other decisions, the option classes settle on the
exercise set where no class gains by switching. A conversion group decides
first (E17): for each of its two choices everyone else settles, and the
group votes on the two settled outcomes.

This is deliberately a different method from the engine, which solves for
the stable decisions directly.
"""

import itertools
from fractions import Fraction

from .model import accrued_dividend_per_share, carve_out_pool, note_interest

CARVE_OUT = "carve_out"  # the security column carve-out payouts are reported under

ZERO = Fraction(0)


class Waterfall:
    def __init__(self, ct, exit_date=None):
        self.ct = ct
        sec = ct.securities
        # Convertible series: non-participating and capped participating.
        # Participating uncapped preferred never converts (SPEC).
        convertible = [
            sid
            for sid in ct.preferred_ids()
            if sec[sid]["participation"] in ("non_participating", "participating_capped")
        ]
        # Conversion groups (SPEC toggle): series that must convert together,
        # as when a class vote forces conversion. The group converts only if
        # holders of more than (or at least) the threshold share of its
        # as-converted shares each do strictly better converting; a holder who
        # is indifferent votes to stay.
        self.members = {}
        self.vote = {}
        grouped = set()
        if len(ct.conversion_groups) > 1:
            raise ValueError(
                "more than one conversion group is not supported yet (E17): the order in which groups decide "
                "isn't settled until a case needs it"
            )
        for g in ct.conversion_groups:
            pid = "+".join(g["series"])
            self.members[pid] = list(g["series"])
            self.vote[pid] = g
            grouped.update(g["series"])
        for sid in convertible:
            if sid not in grouped:
                self.members[sid] = [sid]
        order = {sid: i for i, sid in enumerate(convertible)}
        self.converters = sorted(self.members, key=lambda p: order[self.members[p][0]])
        self.options = [sid for sid in ct.option_ids() if ct.shares_of(sid) > 0]
        self.warrants = [sid for sid in ct.warrant_ids() if ct.shares_of(sid) > 0]
        # Unconverted post-money SAFEs at a Liquidity Event. Only what the
        # cases use is supported; anything else is refused, never skipped.
        self.safes = list(ct.safes)
        if len(self.safes) > 1:
            raise ValueError("more than one unconverted SAFE at exit is not supported by the reference yet")
        for f in self.safes:
            if f["post_money_cap"] is None:
                raise ValueError(f"{f['id']}: an unconverted SAFE without a valuation cap is not supported by the reference yet")
            if f["discount"]:
                raise ValueError(f"{f['id']}: an unconverted SAFE with a discount is not supported by the reference yet")
            if ct.preferred_ids():
                raise ValueError(
                    f"{f['id']}: an unconverted SAFE alongside preferred stock is not supported by the reference yet"
                )
        self.safe_ids = [f["id"] for f in self.safes]
        # Unconverted convertible notes at exit, under the same rule.
        self.notes = list(ct.notes)
        if len(self.notes) > 1:
            raise ValueError("more than one unconverted note at exit is not supported by the reference yet")
        for n in self.notes:
            if n["valuation_cap"] is None:
                raise ValueError(f"{n['id']}: an unconverted note without a valuation cap is not supported by the reference yet")
            if n["discount"]:
                raise ValueError(f"{n['id']}: an unconverted note with a discount is not supported by the reference yet")
            if ct.preferred_ids() or self.safes or ct.carve_out:
                raise ValueError(
                    f"{n['id']}: an unconverted note alongside preferred stock, a SAFE or a carve-out "
                    "is not supported by the reference yet"
                )
        self.note_ids = [n["id"] for n in self.notes]
        self.note_interest = {n["id"]: note_interest(n, exit_date) for n in self.notes}
        self.players = self.converters + self.options + self.warrants + self.safe_ids + self.note_ids
        self.shares = {sid: ct.shares_of(sid) for sid in sec}
        self.ratio = {sid: ct.conversion_ratio(sid) for sid in sec}
        # Cumulative dividends accrued and unpaid at the exit date. They add to
        # the preference at 1x: the preference multiple applies to the
        # original issue price only (NVCA: "Original Issue Price, plus any
        # Accruing Dividends accrued but unpaid"). A series that converts
        # forfeits them.
        self.dividend = {
            sid: self.shares[sid] * accrued_dividend_per_share(sec[sid], exit_date) for sid in ct.preferred_ids()
        }
        # Preference amount = shares × original issue price × multiple, plus accrued dividends.
        self.pref = {
            sid: self.shares[sid] * sec[sid]["original_issue_price"] * sec[sid]["preference_multiple"]
            + self.dividend[sid]
            for sid in ct.preferred_ids()
        }
        # Cap on total return for capped participating = shares × OIP × cap multiple.
        self.cap_total = {
            sid: self.shares[sid] * sec[sid]["original_issue_price"] * sec[sid]["cap_multiple"]
            for sid in ct.preferred_ids()
            if sec[sid]["participation"] == "participating_capped"
        }
        self.lines = [(h, s, n) for (h, s), n in ct.positions.items() if n > 0]
        # Carve-out recipients get their own holder × carve-out line, split by
        # their fixed percentage of the pool.
        if ct.carve_out:
            for a in ct.carve_out["allocation"]:
                self.lines.append((a["holder"], CARVE_OUT, a["share"]))
            self.shares[CARVE_OUT] = sum((a["share"] for a in ct.carve_out["allocation"]), ZERO)
        # Each unconverted SAFE is its own holder × security line and its own class.
        for f in self.safes:
            self.lines.append((f["holder"], f["id"], 1))
            self.shares[f["id"]] = 1
        for n in self.notes:
            self.lines.append((n["holder"], n["id"], 1))
            self.shares[n["id"]] = 1
        # Voting weight in each group: a holder's as-converted shares of its series.
        self.voters = {}
        for pid, members in self.members.items():
            if pid in self.vote:
                weights = {}
                for h, s, n in self.lines:
                    if s in members:
                        weights[h] = weights.get(h, ZERO) + n * self.ratio[s]
                self.voters[pid] = weights

    def holder_group_payout(self, total, pid, holder):
        """What one holder receives on its shares of a conversion group's series."""
        members = self.members[pid]
        return sum(
            (total[s] * n / self.shares[s] for h, s, n in self.lines if h == holder and s in members),
            ZERO,
        )

    def vote_converts(self, pid, total_convert, total_stay):
        """Class vote: do holders of enough of the group's shares each do strictly better converting?"""
        g = self.vote[pid]
        weights = self.voters[pid]
        yes = sum(
            (w for h, w in weights.items()
             if self.holder_group_payout(total_convert, pid, h) > self.holder_group_payout(total_stay, pid, h)),
            ZERO,
        )
        share = yes / sum(weights.values(), ZERO)
        return share > g["threshold"] if g["rule"] == "more_than" else share >= g["threshold"]

    def liquidity_capitalization(self, f):
        """Post-money SAFE Liquidity Capitalization when the SAFE takes its Conversion Amount.

        Counted just before the Liquidity Event: all issued stock as converted,
        all issued options and warrants whether or not they are in the money,
        and the SAFE's own conversion shares. The unissued pool is left out.
        (A SAFE taking its Cash-Out Amount is left out too, but then its
        Liquidity Price is never used.) The SAFE's shares are purchase amount ÷
        (cap ÷ LC), so LC = everything else ÷ (1 − purchase amount ÷ cap).
        """
        return self.ct.outstanding_as_converted() / (1 - f["purchase_amount"] / f["post_money_cap"])

    def liquidity_price(self, f):
        """Liquidity Price = post-money valuation cap ÷ Liquidity Capitalization."""
        return f["post_money_cap"] / self.liquidity_capitalization(f)

    def safe_conversion_shares(self, f):
        """Purchase amount ÷ Liquidity Price, exact: at exit, as-converted shares aren't rounded (SPEC)."""
        return f["purchase_amount"] / self.liquidity_price(f)

    def note_repayment(self, n):
        """Repayment at exit: the repayment multiple × (principal + accrued interest)."""
        return n["repayment_multiple"] * (n["principal"] + self.note_interest[n["id"]])

    def note_conversion_base(self, n):
        """The share count a note's pre-money cap divides by, just before the sale.

        The note itself is never counted: the cap is pre-money, so its shares
        sit on top. Notes have no standard form, so the base is a toggle:
        - with_pool (default): all issued stock as converted, all issued
          options and warrants whether or not they are in the money, and the
          unissued pool (fully diluted, as in R2)
        - without_pool: the same, without the unissued pool
        - common_only: issued common stock only
        """
        ct = self.ct
        base = n["conversion_base"]
        if base == "with_pool":
            return ct.outstanding_as_converted() + ct.unissued_pool
        if base == "without_pool":
            return ct.outstanding_as_converted()
        return Fraction(sum(ct.shares_of(sid) for sid in ct.securities if ct.kind(sid) == "common"))

    def note_conversion_price(self, n):
        """Conversion price = valuation cap ÷ conversion base."""
        return n["valuation_cap"] / self.note_conversion_base(n)

    def note_conversion_shares(self, n):
        """Principal plus accrued interest converts, at the conversion price. Exact: at exit, as-converted shares aren't rounded (SPEC)."""
        return (n["principal"] + self.note_interest[n["id"]]) / self.note_conversion_price(n)

    def decision_sets(self):
        for bits in itertools.product((False, True), repeat=len(self.players)):
            yield tuple(bits)

    def pref_amount(self, sid, units):
        """Preference of a series with `units` shares, including accrued dividends.

        Shares from a warrant exercised at exit carry no accrued dividends.
        """
        sec = self.ct.securities[sid]
        return units[sid] * sec["original_issue_price"] * sec["preference_multiple"] + self.dividend[sid]

    def unit_shares(self, bits):
        """Shares of each preferred series, counting exercised warrants for that series."""
        d = dict(zip(self.players, bits))
        units = {sid: self.shares[sid] for sid in self.ct.preferred_ids()}
        for w in self.warrants:
            u = self.ct.securities[w]["underlying"]
            if d[w] and u != "common":
                units[u] += self.shares[w]
        return units

    def run(self, exit_value, bits):
        """Waterfall for one fixed set of decisions.

        Returns (per-security totals, common price per share, state flags).
        Option and warrant totals are net of strike.
        """
        ct = self.ct
        sec = ct.securities
        d = dict(zip(self.players, bits))
        converted = {s: d[p] for p in self.converters for s in self.members[p]}
        total = {sid: ZERO for sid in sec}
        total[CARVE_OUT] = ZERO
        for fid in self.safe_ids + self.note_ids:
            total[fid] = ZERO

        # Warrant for preferred: once exercised, its shares are shares of that
        # series, with the series' per-share preference, participation, cap,
        # and conversion. Preference is per share at the series' original
        # issue price, not the warrant's strike.
        units = self.unit_shares(bits)
        oip = {s: sec[s]["original_issue_price"] for s in units}
        pref = {s: self.pref_amount(s, units) for s in units}
        cap_total = {s: units[s] * oip[s] * sec[s]["cap_multiple"] for s in self.cap_total}

        # Exercised options and warrants pay their strike, which is added to proceeds.
        exercised = [x for x in self.options + self.warrants if d[x]]
        strike_cash = sum((self.shares[x] * sec[x]["strike"] for x in exercised), ZERO)
        remaining = exit_value + strike_cash

        # Unconverted note at exit: the holder takes the greater of repayment
        # (a multiple of principal plus accrued interest) or conversion at the
        # cap. Repayment is debt, so it is paid ahead of all equity.
        note_paid = None
        for n in self.notes:
            if not d[n["id"]]:
                claim = self.note_repayment(n)
                paid = min(remaining, claim)
                total[n["id"]] += paid
                note_paid = remaining >= claim
                remaining -= paid

        # Management carve-out: a percentage of the exit value (before strike
        # cash), paid to listed people before any preference.
        band = None
        if ct.carve_out:
            pool, band = carve_out_pool(ct.carve_out, exit_value)
            total[CARVE_OUT] = pool
            remaining -= pool

        # Unconverted post-money SAFE at a Liquidity Event (YC): it gets the
        # greater of its Cash-Out Amount (the purchase amount, paid ahead of
        # common) or its Conversion Amount (what its conversion shares earn
        # alongside common). Here: a SAFE taking cash out is paid before the
        # residual.
        safe_paid = None
        for f in self.safes:
            if not d[f["id"]]:
                paid = min(remaining, f["purchase_amount"])
                total[f["id"]] += paid
                safe_paid = remaining >= f["purchase_amount"]
                remaining -= paid

        # Preferences, tier by tier, most senior first. Within a tier, pari
        # passu: a shortfall is shared pro rata by preference amount.
        tier_full = []
        for tier in ct.seniority:
            claims = {s: pref[s] for s in tier if not converted.get(s, False) and pref[s] > 0}
            need = sum(claims.values(), ZERO)
            if need == 0:
                tier_full.append(None)
                continue
            paid = min(remaining, need)
            for s, c in claims.items():
                total[s] += paid * c / need
            tier_full.append(remaining >= need)
            remaining -= paid

        # Residual: common, exercised options and common warrants, converted
        # preferred, and participating preferred, all on an exact as-converted basis.
        part = {}
        for sid, s in sec.items():
            if s["kind"] == "common":
                part[sid] = Fraction(self.shares[sid])
            elif s["kind"] in ("option", "warrant"):
                if d.get(sid, False) and (s["kind"] == "option" or s["underlying"] == "common"):
                    part[sid] = Fraction(self.shares[sid])
            elif converted.get(sid, False) or s["participation"] != "non_participating":
                part[sid] = units[sid] * self.ratio[sid]
        # A SAFE taking its Conversion Amount shares alongside common on its
        # conversion shares.
        for f in self.safes:
            if d[f["id"]]:
                part[f["id"]] = self.safe_conversion_shares(f)
        # A note that converts shares alongside common on its conversion shares.
        for n in self.notes:
            if d[n["id"]]:
                part[n["id"]] = self.note_conversion_shares(n)
        part = {k: v for k, v in part.items() if v > 0}

        # Capped participation: preference plus participation stops at the cap.
        room = {
            sid: cap_total[sid] - total[sid]
            for sid in cap_total
            if sid in part and not converted.get(sid, False)
        }
        capped_at = set()
        active = dict(part)
        while True:
            n = sum(active.values(), ZERO)
            p = remaining / n if n else ZERO
            over = [s for s in active if s in room and p * active[s] > room[s]]
            if not over:
                break
            s = min(over, key=lambda k: room[k] / active[k])
            total[s] += room[s]
            remaining -= room[s]
            capped_at.add(s)
            del active[s]
        for s, n_s in active.items():
            total[s] += p * n_s
        common_price = p

        # Split each series' total between its original shares and the shares
        # from exercised warrants for it, pro rata by shares.
        for w in self.warrants:
            u = sec[w]["underlying"]
            if d[w] and u != "common":
                part_w = total[u] * self.shares[w] / units[u]
                total[w] += part_w
                total[u] -= part_w

        for x in exercised:
            total[x] -= self.shares[x] * sec[x]["strike"]

        flags = (tuple(tier_full), tuple(sorted(capped_at)), band, safe_paid, note_paid)
        return total, common_price, flags

    def player_value(self, total, player):
        if player in self.members:
            return sum((total[s] for s in self.members[player]), ZERO)
        return total[player]

    def equilibria(self, exit_value):
        """All stable decision sets at this exit value, under E16 and E17."""
        return _AtExit(self, exit_value).stable()

    def group_choice_totals(self, exit_value):
        """For the conversion group: the settled outcome if it converts and if it stays (E17)."""
        at = _AtExit(self, exit_value)
        return {v: at.res(at.group_choice(v))[0] for v in (False, True)}

    def settled(self, exit_value, bits):
        """These decisions with option exercise settled for them (E16)."""
        return _AtExit(self, exit_value).settle(bits)

    def split_to_lines(self, total):
        """Per holder × security amounts. A security's total splits pro rata by shares."""
        out = {}
        for h, s, n in self.lines:
            out[(h, s)] = total[s] * n / self.shares[s]
        return out

    def evaluate(self, exit_value):
        """Distinct equilibrium outcomes at one exit value.

        Stable decision sets that pay every holder exactly the same are one
        outcome. Its canonical decisions are the ones with the fewest
        conversions and exercises: a series converts, or an option or warrant
        is exercised, only when that strictly pays more. The tie-break never
        changes a payout.
        """
        exit_value = Fraction(exit_value)
        groups = {}
        for bits, total, price, flags in self.equilibria(exit_value):
            lines = self.split_to_lines(total)
            key = tuple(sorted(lines.items()))
            groups.setdefault(key, []).append((bits, total, price, flags, lines))
        outcomes = []
        for members in groups.values():
            members.sort(key=lambda m: (sum(m[0]), m[0]))
            bits, total, price, flags, lines = members[0]
            outcomes.append(
                {
                    "decisions": bits,
                    "lines": lines,
                    "totals": total,
                    "common_price": price,
                    "flags": flags,
                }
            )
        outcomes.sort(key=lambda o: o["decisions"])
        return outcomes

    def signature(self, exit_value):
        """Everything that fixes the slope of every payout: decisions, tiers filled, caps binding."""
        return tuple(sorted((o["decisions"], o["flags"]) for o in self.evaluate(exit_value)))

    def payout_vector(self, exit_value):
        outs = self.evaluate(exit_value)
        if len(outs) != 1:
            return None
        lines = outs[0]["lines"]
        return [lines[(h, s)] for h, s, _ in self.lines]


def _flip(bits, i):
    return bits[:i] + (not bits[i],) + bits[i + 1 :]


class _AtExit:
    """Every combination of decisions at one exit value, under E16 and E17.

    Option classes follow the common price: they are settled, not chosen. The
    free decision-makers (series outside a group, warrants, SAFEs, notes) are
    stable when none gains by switching, with the options re-settled under
    each choice. A conversion group decides first: for each of its two
    choices the free decision-makers settle, and the group votes (E11) on the
    two settled outcomes.
    """

    def __init__(self, wf, exit_value):
        self.wf = wf
        self.x = Fraction(exit_value)
        self.results = {}
        self.settled_cache = {}
        self.options = [i for i, p in enumerate(wf.players) if p in wf.options]
        deciders = [i for i in range(len(wf.players)) if i not in self.options]
        self.group = [i for i in deciders if wf.players[i] in wf.vote]
        self.free = [i for i in deciders if i not in self.group]

    def res(self, bits):
        if bits not in self.results:
            self.results[bits] = self.wf.run(self.x, bits)
        return self.results[bits]

    def value(self, bits, i):
        return self.wf.player_value(self.res(bits)[0], self.wf.players[i])

    def outcome(self, bits):
        return tuple(sorted(self.wf.split_to_lines(self.res(bits)[0]).items()))

    def settle(self, bits):
        """The option exercise set where no class gains by switching (E5: fewest exercises on a tie)."""
        key = tuple(v for i, v in enumerate(bits) if i not in self.options)
        if key not in self.settled_cache:
            fits = []
            for obits in itertools.product((False, True), repeat=len(self.options)):
                b = list(bits)
                for i, v in zip(self.options, obits):
                    b[i] = v
                b = tuple(b)
                if all(self.value(_flip(b, i), i) <= self.value(b, i) for i in self.options):
                    fits.append(b)
            if len({self.outcome(b) for b in fits}) != 1:
                raise ValueError(f"option exercise settles {len(fits)} ways at exit {self.x}")
            self.settled_cache[key] = min(fits, key=lambda b: (sum(b), b))
        return self.settled_cache[key]

    def stable_free(self, bits):
        return all(self.value(self.settle(_flip(bits, i)), i) <= self.value(bits, i) for i in self.free)

    def settled_sets(self, fixed):
        out = []
        for fbits in itertools.product((False, True), repeat=len(self.free)):
            b = [False] * len(self.wf.players)
            for i, v in fixed.items():
                b[i] = v
            for i, v in zip(self.free, fbits):
                b[i] = v
            b = self.settle(tuple(b))
            if self.stable_free(b):
                out.append(b)
        return out

    def group_choice(self, converts):
        """The settled decisions if the group converts (or stays). The others must settle one way."""
        (g,) = self.group
        sets = self.settled_sets({g: converts})
        if len({self.outcome(b) for b in sets}) != 1:
            raise ValueError(
                f"at exit {self.x} the other decisions settle {len(sets)} ways when the group "
                f"{'converts' if converts else 'stays'}, so its vote has no single comparison (E17)"
            )
        return min(sets, key=lambda b: (sum(b), b))

    def stable(self):
        if not self.group:
            stable = self.settled_sets({})
        else:
            (g,) = self.group
            on, off = self.group_choice(True), self.group_choice(False)
            converts = self.wf.vote_converts(self.wf.players[g], self.res(on)[0], self.res(off)[0])
            stable = self.settled_sets({g: converts})
        if not stable:
            raise ValueError(f"no stable decision set at exit {self.x}")
        return [(bits, *self.res(bits)) for bits in stable]
