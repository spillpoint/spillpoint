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
        # Unconverted SAFEs at a Liquidity Event (X1, X9, X13, X14). A SAFE
        # with a cap converts at its cap at a sale; its discount, if it has
        # one, applies only in a financing. One with no cap converts at the
        # sale's common price per share less its discount (an MFN SAFE, with
        # neither, at the common price itself). Alongside preferred, its
        # Cash-Out Amount ranks with the most junior preferred tier, or with
        # the series it names. Only what the cases use is supported; anything
        # else is refused, never skipped.
        self.safes = list(ct.safes)
        if len(self.safes) > 1 and any(self.priced(f) or f.get("pre_money_cap") is not None for f in self.safes):
            raise ValueError(
                "more than one unconverted SAFE at exit is supported only when each has a post-money cap"
            )
        for f in self.safes:
            if f.get("pre_money_cap") is not None and ct.preferred_ids():
                raise ValueError(f"{f['id']}: an unconverted pre-money SAFE alongside preferred stock is not supported by the reference yet")
            ranks_with = f.get("cash_out_ranks_with")
            if ranks_with is not None and not any(ranks_with in tier for tier in ct.seniority):
                raise ValueError(f"{f['id']}: cash_out_ranks_with names {ranks_with}, which is not a preferred series in the seniority tiers")
        self.safe_ids = [f["id"] for f in self.safes]
        # Unconverted convertible notes at exit (X3, X10-X12, X15). Repayment is
        # debt, ahead of all equity. A note with a cap converts at its cap
        # price; one with no cap at the sale's common price per share less its
        # discount; one with neither is repaid and never converts. Beside SAFEs
        # (X18, 0.5.0): the repayment still comes first, and a converting note
        # counts in a post-money SAFE's Liquidity Capitalization. Only a note
        # with a cap beside SAFEs with post-money caps is supported; a note
        # beside a carve-out is still refused.
        self.notes = list(ct.notes)
        if len(self.notes) > 1 and any(self.priced(n) for n in self.notes):
            raise ValueError("more than one unconverted note at exit is supported only when each has a valuation cap")
        for n in self.notes:
            if ct.carve_out:
                raise ValueError(f"{n['id']}: an unconverted note alongside a carve-out is not supported by the reference yet")
            if self.safes and (self.priced(n) or any(f.get("post_money_cap") is None for f in self.safes)):
                raise ValueError(
                    f"{n['id']}: an unconverted note alongside a SAFE is supported only when the note has a valuation cap "
                    "and every SAFE a post-money cap"
                )
        self.note_ids = [n["id"] for n in self.notes if self.note_can_convert(n)]
        self.note_interest = {n["id"]: note_interest(n, exit_date) for n in self.notes}
        self.players = self.converters + self.options + self.warrants + self.safe_ids + self.note_ids
        self.shares = {sid: ct.shares_of(sid) for sid in sec}
        self.ratio = {sid: ct.conversion_ratio(sid) for sid in sec}
        # Cumulative dividends accrued and unpaid at the exit date. They add to
        # the preference at 1x: the preference multiple applies to the
        # original issue price only (NVCA: "Original Issue Price, plus any
        # Accruing Dividends accrued but unpaid"). A series that converts
        # forfeits them, or, when they are paid on conversion (X5), keeps a
        # claim for them in its own tier.
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

    def dividends_paid_on_conversion(self, sid):
        d = self.ct.securities[sid].get("cumulative_dividend")
        return bool(d) and d["on_conversion"] == "paid"

    def tier_claim(self, sid, pref, converted):
        """A series' claim in its tier: its preference, or, once converted, only dividends paid on conversion (X5)."""
        if not converted.get(sid, False):
            return pref[sid]
        return self.dividend[sid] if self.dividends_paid_on_conversion(sid) else ZERO

    def carve_out_alongside(self):
        """A carve-out paid alongside preferences joins the most senior tier (X7); with no preferred it is paid first."""
        return bool(self.ct.carve_out) and self.ct.carve_out["timing"] == "alongside_preferences" and bool(self.ct.seniority)

    def curved(self, flags):
        """Whether payouts curve here (X7): a carve-out alongside preferences, in a senior tier not paid in full.

        Its claim grows with the exit value while it shares the tier pro rata,
        so its share, exit value × claim ÷ (claim + the preferences there), is
        not a straight line. Past the carve-out's last tier its claim is fixed,
        and the payouts are straight again.
        """
        tier_full, _, band, _, _ = flags
        return self.carve_out_alongside() and tier_full[0] is False and band < len(self.ct.carve_out["tiers"])

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

    @staticmethod
    def priced(x):
        """A SAFE or note with no cap: it converts at the sale's common price per share less its discount."""
        if "purchase_amount" in x:
            return x.get("post_money_cap") is None and x.get("pre_money_cap") is None
        return x["valuation_cap"] is None

    def safe_tier(self, f):
        """The seniority tier a SAFE's Cash-Out Amount ranks in (X9).

        The YC text puts it "on par with" preferred. With several tiers it ranks
        with the most junior, unless the SAFE names a series to rank with.
        """
        ranks_with = f.get("cash_out_ranks_with")
        if ranks_with is None:
            return len(self.ct.seniority) - 1
        return next(i for i, tier in enumerate(self.ct.seniority) if ranks_with in tier)

    def note_can_convert(self, n):
        """A note with neither a cap nor a discount is only ever repaid (X12)."""
        return n["valuation_cap"] is not None or n["discount"] > 0

    def keeps_preference_in_lieu(self, sid, converted):
        """A non-participating series that keeps its preference takes it in lieu of converting.

        Participating preferred takes its preference and an as-converted share
        too, so it isn't taking either in lieu of the other.
        """
        return self.ct.securities[sid]["participation"] == "non_participating" and not converted.get(sid, False)

    def liquidity_capitalization(self, f, converted=None, safes_converting=None, notes_converting=()):
        """A SAFE's Liquidity Capitalization when it takes its Conversion Amount.

        Post-money SAFE (YC): counted just before the Liquidity Event, all
        issued stock as converted, all issued options and warrants whether or
        not they are in the money, and every SAFE taking its Conversion Amount,
        this one included. It is one count for the company, the same for every
        SAFE (X13). The unissued pool is left out, and so is anything taking a
        cash-out or a liquidation preference in lieu of converting: a SAFE
        taking its Cash-Out Amount, or a non-participating series that keeps
        its preference. A note converting beside it is one of its "Converting
        Securities", counted at its conversion shares; a note being repaid
        takes a payment in lieu of converting, and isn't counted (X18). The
        note's own shares don't depend on the SAFE: its base counts no SAFE.
        Each converting SAFE's shares are purchase amount ÷ (its cap ÷ LC),
        so LC = everything else ÷ (1 − Σ purchase amount ÷ cap).

        Pre-money SAFE (YC, X14): "shares of Capital Stock (on an as-converted
        basis) outstanding, assuming exercise or conversion of all outstanding
        vested and unvested options, warrants and other convertible
        securities", excluding the unissued pool, this SAFE, other SAFEs and
        notes. So its shares sit on top, and the count doesn't depend on who
        converts.
        """
        ct = self.ct
        if f.get("pre_money_cap") is not None:
            return ct.outstanding_as_converted()
        converted = converted or {}
        safes_converting = [f] if safes_converting is None else safes_converting
        others = ct.outstanding_as_converted() - sum(
            (ct.as_converted(s) for s in ct.preferred_ids() if self.keeps_preference_in_lieu(s, converted)), ZERO
        )
        others += sum((self.note_conversion_shares(n) for n in notes_converting), ZERO)
        own = sum((g["purchase_amount"] / g["post_money_cap"] for g in safes_converting), ZERO)
        return others / (1 - own)

    def safes_converting(self, f, d):
        """The SAFEs taking their Conversion Amount under decisions d, counting f as converting."""
        return [g for g in self.safes if g is f or d.get(g["id"], False)]

    def notes_converting(self, d):
        """The notes converting under decisions d: a post-money SAFE's Liquidity Capitalization counts them (X18)."""
        return [n for n in self.notes if d.get(n["id"], False)]

    def safe_cap(self, f):
        return f["pre_money_cap"] if f.get("pre_money_cap") is not None else f["post_money_cap"]

    def liquidity_price(self, f, converted=None, safes_converting=None, notes_converting=()):
        """Liquidity Price = valuation cap ÷ Liquidity Capitalization."""
        return self.safe_cap(f) / self.liquidity_capitalization(f, converted, safes_converting, notes_converting)

    def safe_conversion_shares(self, f, converted=None, safes_converting=None, notes_converting=()):
        """Purchase amount ÷ Liquidity Price, exact: at exit, as-converted shares aren't rounded (SPEC)."""
        return f["purchase_amount"] / self.liquidity_price(f, converted, safes_converting, notes_converting)

    def converting_amount(self, x):
        """What a SAFE or note converts: the purchase amount, or principal plus accrued interest."""
        return x["purchase_amount"] if "purchase_amount" in x else x["principal"] + self.note_interest[x["id"]]

    def priced_conversion_worth(self, x):
        """A no-cap SAFE or note converting at the common price less its discount is worth amount ÷ (1 − discount)."""
        return self.converting_amount(x) / (1 - x["discount"])

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

    def run(self, exit_value, bits, room_of=None, tier_margin=None):
        """Waterfall for one fixed set of decisions.

        Returns (per-security totals, common price per share, state flags).
        Option and warrant totals are net of strike. A SAFE or note with no cap
        set to convert where it can't is paid its cash-out or repayment (X9,
        X12). With room_of, returns that instrument's room to convert instead:
        (1 − discount) × what is left for the residual, less its amount. With
        tier_margin, returns what is left for that tier less its claims.
        """
        ct = self.ct
        sec = ct.securities
        d = dict(zip(self.players, bits))
        converted = {s: d[p] for p in self.converters for s in self.members[p]}
        total = {sid: ZERO for sid in sec}
        total[CARVE_OUT] = ZERO
        # Every note has a line, including one that can only be repaid and so isn't a decision-maker.
        for fid in self.safe_ids + [n["id"] for n in self.notes]:
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
        # cap. Repayment is debt, so it is paid ahead of all equity. Notes rank
        # equally with each other: a shortfall is shared pro rata by repayment
        # (X15).
        note_paid = None
        repaid = {n["id"]: self.note_repayment(n) for n in self.notes if not d.get(n["id"], False)}
        if repaid:
            need = sum(repaid.values(), ZERO)
            paid = min(remaining, need)
            for nid, claim in repaid.items():
                total[nid] += paid * claim / need
            note_paid = remaining >= need
            remaining -= paid

        # Management carve-out: a percentage of the exit value (before strike
        # cash), paid to listed people before any preference (X7). Alongside
        # preferences (the SPEC toggle), it is a claim in the most senior tier
        # instead, shared pro rata with the preferences there.
        band = None
        carve_in_tier = None
        if ct.carve_out:
            pool, band = carve_out_pool(ct.carve_out, exit_value)
            if self.carve_out_alongside():
                carve_in_tier = pool
            else:
                total[CARVE_OUT] = pool
                remaining -= pool

        # Unconverted SAFE at a Liquidity Event (YC): it gets the greater of
        # its Cash-Out Amount (the purchase amount, paid ahead of common) or
        # its Conversion Amount (what its conversion shares earn alongside
        # common). Here: a SAFE taking cash out is paid before the residual.
        # SAFEs taking cash out share a shortfall pro rata by purchase amount
        # ("with equal priority and pro rata", X13). Alongside preferred, the
        # Cash-Out Amount ranks on par with the most junior preferred tier, or
        # the tier of the series it names (X9), shared pro rata with it.
        safe_paid = None
        safe_in_tier = {}
        cash = [f for f in self.safes if not d[f["id"]]]
        if ct.seniority:
            for f in cash:
                safe_in_tier.setdefault(self.safe_tier(f), []).append(f)
        elif cash:
            need = sum((f["purchase_amount"] for f in cash), ZERO)
            paid = min(remaining, need)
            for f in cash:
                total[f["id"]] += paid * f["purchase_amount"] / need
            safe_paid = remaining >= need
            remaining -= paid

        # Preferences, tier by tier, most senior first. Within a tier, pari
        # passu: a shortfall is shared pro rata by preference amount.
        tier_full = []
        for i, tier in enumerate(ct.seniority):
            claims = {s: self.tier_claim(s, pref, converted) for s in tier}
            claims = {s: c for s, c in claims.items() if c > 0}
            if i == 0 and carve_in_tier:
                claims[CARVE_OUT] = carve_in_tier
            for f in safe_in_tier.get(i, []):
                claims[f["id"]] = f["purchase_amount"]
            need = sum(claims.values(), ZERO)
            if tier_margin == i:
                return remaining - need
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
        # conversion shares; so does a note that converts. With a cap the
        # shares are fixed; with none they depend on the price they help set.
        priced = []
        for f in self.safes:
            if d[f["id"]]:
                if self.priced(f):
                    priced.append(f)
                else:
                    part[f["id"]] = self.safe_conversion_shares(f, converted, self.safes_converting(f, d), self.notes_converting(d))
        for n in self.notes:
            if d.get(n["id"], False):
                if self.priced(n):
                    priced.append(n)
                else:
                    part[n["id"]] = self.note_conversion_shares(n)
        part = {k: v for k, v in part.items() if v > 0}
        # No cap: shares s at the common price p less the discount, s = amount ÷ ((1 − d) p), each
        # worth p, so the conversion is worth exactly amount ÷ (1 − d), whatever p is. It takes that
        # out of the residual first, and the rest share what is left, capped participating preferred
        # stopping at its cap (M5 owed cases 12i, 13h); p is then the price they share it at. Where
        # (1 − d) × remaining is no more than the amount there is no such price: converting isn't
        # possible, so the greater-of falls back to the cash-out or repayment (X9, X12, the literal
        # reading). It is paid exactly as if it had chosen that, which ties, and E5 reports the
        # cash-out or repayment.
        fixed = {}
        for x in priced:
            others = sum(part.values(), ZERO)
            room = (1 - x["discount"]) * remaining - self.converting_amount(x)
            if room_of == x["id"]:
                return room
            if room <= 0 or others == 0:
                i = self.players.index(x["id"])
                return self.run(exit_value, bits[:i] + (False,) + bits[i + 1 :])
            fixed[x["id"]] = self.converting_amount(x) / (1 - x["discount"])
            remaining -= fixed[x["id"]]

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
        for fid, worth in fixed.items():
            total[fid] += worth
        common_price = p

        # Split each series' total between its original shares and the shares
        # from exercised warrants for it, pro rata by shares (E12). Each part is
        # of the series' whole total, taken before any warrant's part comes out:
        # with two warrants for one series, the second was a share of what the
        # first left (found in the engine's 03f work).
        whole = dict(total)
        for w in self.warrants:
            u = sec[w]["underlying"]
            if d[w] and u != "common":
                part_w = whole[u] * self.shares[w] / units[u]
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

    def payout_vector_with(self, exit_value, bits):
        """The payout lines under one fixed set of decisions, in line order."""
        lines = self.split_to_lines(self.run(exit_value, bits)[0])
        return [lines[(h, s)] for h, s, _ in self.lines]

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
        self.instruments = set(wf.safe_ids) | set(wf.note_ids)

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
        """No free decision-maker gains by switching.

        A SAFE takes its Conversion Amount, and a note converts, only when that
        strictly pays more (E5, X16): where it is indifferent but its choice
        changes what others get, as when one SAFE's conversion enlarges the
        Liquidity Capitalization another SAFE's shares are counted on, it takes
        its Cash-Out Amount or repayment, so the outcome from below holds at
        exactly that exit value, as in E13.
        """
        for i in self.free:
            here, there = self.value(bits, i), self.value(self.settle(_flip(bits, i)), i)
            if there > here or (there == here and bits[i] and self.wf.players[i] in self.instruments):
                return False
        return True

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
