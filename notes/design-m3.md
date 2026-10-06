# Dashboard design (M3)

The direction for the dashboard's look, set in M3a for you to approve before M3b–M3e build on it. Founders are the users: **plain, serious and readable beats clever.**

![The founder view on Millrace](screenshots/m3a-overview.webp)

## Principles

1. **Answer the founder's question first.** The page opens on one sentence: "At $100M you get $9.75M". Under it, what that is against what you own, and where your payout starts. Everything else (all holders, classes, curves, the cap table) supports that answer.
2. **Say it in words before numbers.** Headings and reasons are sentences ("Who gets what at $100M"), not labels or codes. The engine's reasons follow the M2d review's wording rules.
3. **Numbers you can trust at a glance:**
   - **Headlines** use three significant digits ($9.75M, $39.4M).
   - **Tables** show whole dollars ($9,750,990).
   - **Columns** are right-aligned, with figures of equal width so digits line up.
   - **Every table** has a total that adds up to 100%.
4. **The caveat is always on screen,** plain and not alarming. "The charter and the signed documents govern, not this tool" sits under the masthead on every view, with the promise that nothing leaves the computer.
5. **Never color alone.**
   - **Your row** is marked "(you)" in words, with a bar, as well as a tint.
   - **The toggle's** selected state is announced to screen readers.
   - **The curves (M3b)** are told apart by emphasis, not by nine colors: your curve is blue, thicker and labelled at its end; the one you point at is lifted in orange and labelled too; the rest are thin grey context. The legend under the chart names every curve with its value, and the hover readout lists them all. (Emphasis in place of nine line styles, approved in the M3b review.)

## The look

- **Type:** the operating system's own font: San Francisco, Segoe UI or Roboto. That's familiar, legible, and needs no download, so the page fetches nothing. One weight for text, semibold for headings, and a large semibold headline.
- **Color:** near-black text on white cards over a light grey page. **One accent, a dark blue (#1d3557),** used for the selected state, your row's bar and the slider. Error text is a muted red, used only for errors. Nothing decorative.
- **Layout:** one column, at most 1,040 pixels wide, in cards with thin borders and generous padding. On a phone the cards stack and nothing runs off the screen, down to 320 pixels wide. The editor's shares grid is the one thing that scrolls sideways, inside its card, with the holder column held in view.
- **Controls:** standard browser controls (selects, a range slider, a text box), lightly styled, so they behave the way people expect and work with the keyboard and screen readers.

## What later PRs add in the same style

- **M3b:** curves as their own card, with direct labels, emphasis instead of nine colors, and numbered breakpoints. The breakpoint list as a numbered list of plain sentences, with the same numbers. Each breakpoint that changes your payout says how, in one line: what each extra $1M adds to your payout above it against below it, or how far your payout jumps.
- **M3c:** the cap table editor as forms in cards, with the engine's own error messages next to the field they name. Built as a second tab, "Cap table", beside "Payouts": one card each for holders, classes and their terms, who holds what (a grid of holders by classes), who is paid first, series that convert together, and the range. A line at the top says what the current table pays you, or what to fix. While an edit has a problem, the payouts stay on the last table the engine accepted and say so.
- **M3d:** "Save" and "Open" as plain buttons in the masthead, beside "Start from". A cap table has a name, set at the top of the editor, and a saved file is named after it. Changes not yet saved are marked "Not saved" beside the name of what you're working on. Save and Open report in one line under the masthead: what was saved, or why a file couldn't be opened. A save also keeps where you were looking, the exit value and who you are, so a file reopens there.
- **M3e:** the narrow-screen and keyboard pass, as built:
  - **The example picker** takes the full width on a phone.
  - **The payouts table** shows its two shares as a line under each name ("9.8% of the proceeds, 12.9% of the company") instead of two columns, so it fits without scrolling.
  - **The chart** fits down to 320 pixels.
  - **A breakpoint mark's box** stays on screen near either end.
  - **The keyboard:** Escape closes a mark's box; the tabs take the arrow keys, Home and End; and the chart's drawing is no longer a focus stop, since its values are in the legend.
- **M4i:** a cap table built from the company's rounds, as Millrace now is.
  - **A third tab, "Rounds",** lists the events in order as numbered cards: a title ("Seed Preferred, a priced round"), the date, and what the event did in plain sentences. The card the payouts use is marked with a tag.
  - **The cap table after each event** sits behind "The cap table after it", a standard disclosure, in the payouts table's style, with a total and the fully diluted footnote. On a phone the class moves under the holder's name, as the payouts table's shares do, so it fits without scrolling sideways.
  - **The Cap table tab is read-only** while the rounds build the table: a note at the top says why, beside "Edit the cap table directly". The fields keep their values and stay readable, on the page's grey; the add and remove buttons are hidden. The name and the range stay editable.
  - **"Edit the cap table directly"** asks first, and says what goes: the events and what each worked out. The table stays as it is.
  - **The label above the tabs** says "built from its 10 events".
- **M4j:** editing the rounds, on the Rounds tab.
  - **Each card has "Edit"** beside its date; it opens the event's fields in the card, above what the event did, and becomes "Done". Several can be open at once.
  - **The fields** are the cap table editor's: labels above, hints under, the engine's message under the field it names, in the error red. Lines within an event (investors, grants, SAFEs, notes) are each a bordered group, named "Investor 1: Harbor Lane Ventures Fund I", with "Remove", and "Add an investor" under them. Less common terms sit under "More terms".
  - **A problem** also shows at the top of its event, and on the Payouts tab as "Your last change to the rounds has a problem", with "Fix it", which opens the event at the field.
  - **"For you"** follows the holder chosen on the Payouts tab: "For you: 46.5% → 25.5% fully diluted." in the accent blue, as in the breakpoint list.
  - **Holders** are a card below the events. One still named in an event has its Remove button off, with a line saying why.
- **M4k:** building a company's history.
  - **"Add an event"** is a card after the events: a type and "Add it at the end". The new event opens at its Date, with its fields blank and the engine naming the first one to fill in ("Fill this in: it can't be blank."). It says "Not built yet" until it builds.
  - **An open event** ends with "Move earlier", "Move later" and "Remove this event", which asks first. The last event left can't be removed.
  - **"The payouts use the cap table after"** is a choice at the top of the tab: the last event, unless you pick an earlier one.
  - **Start from** offers "A blank company, built from its rounds": one founder with all the common stock, as one event.
