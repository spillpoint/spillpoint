# Review: 10l (a first visit that explains itself)

Branch `10l-first-visit`, from main at `f0ed325` (#144 merged).

**CI and permissions:** no change to `.github/workflows/` or `.claude/`. I added two dashboard entries to my own `.claude/launch.json`, to serve the page while checking it, but git excludes that file, so they're not in this PR.

**`cases/` and `packages/`:** nothing. No engine change. Outside `apps/dashboard`:
- `apps/site/links.ts` gains the new-issue address.
- `apps/fund/test/site.test.ts` changes because it checks the whole built site's links out (section 4).
- `CLAUDE.md`, `notes/release-1.0.md` and `docs/ASSUMPTIONS.md` (O15) each get a line or two.

## What to look at first

1. **The top of the page,** in the screenshots below: the export is now the first thing under the title, with "or" before "Start from".
2. **How I read "Carta's OCX report, an Excel file".** The line says "Carta's OCX report (an Excel file)", one thing, not two (open question 1).
3. **The line on a refused import,** and its link to a new issue.

## 1. What changed

### Opening an export as a way to start

- **Before:** one row reading "Start from [picker] Save Open [Open a cap table export]", with the export last, after the picker. That's the row your founder read as steps.
- **Now:** under the title, two rows:
  1. "Open a cap table export", drawn as the page's main button (navy, white text), with its line beside it.
  2. "*or* Start from [picker]", and at the right end of the row, Save and Open, set apart as the page's own file.
- **On a phone:** everything stacks at full width: the button, its line, "or" between two rules, "Start from", the picker, then Save and Open.
- **Screen readers:** the two ways in are a group named "Start", and the button is described by its line, so the line is read out with the button.
- **Why stacked:** I tried the two side by side first. The picker is as wide as its longest option, which left no room at 1280: the start broke into three ragged rows. Stacked holds at every width.

### The line with it

> Opens Carta's OCX report (an Excel file) or an OCF export. The file is read in this browser and never uploaded.

- **Carta, by its report only** (rule 11): no menus, no site, no path to the export.
- **On a laptop:** a sentence a line, beside the button.
- **On a phone:** under the button, at full width.

### A refused import

> “Copy a summary to share” holds no names, amounts or dates, so it's safe to post. To ask for help with this file, copy it and paste it into [a new issue on GitHub].

- **Where it shows:** just above "Copy a summary to share", in two places:
  - when an import is refused as it's read, under the alert below the masthead
  - when the engine refuses at "Use this cap table", in the review, beside the summary

  It stays above the summary once it's opened.
- **Where it doesn't show** (ASSUMPTIONS O15):
  - on a review nothing has refused yet
  - when a "No" to "One strike?" stops the import: that's the founder's own answer, not a refusal
  - on "Open an OCX workbook on its own", which has no summary to share
- **The link:**
  - goes to `https://github.com/spillpoint/spillpoint/issues/new`, as `ISSUE_URL` in `apps/site/links.ts`
  - opens in a new tab, `rel="noopener"` like the star link, so GitHub sees only `https://spillpoint.io/` as where the visit came from
  - has nothing else in its address: no title, no body, no summary. The founder pastes the summary in.
- **Still sends nothing:** the page's Content-Security-Policy is unchanged, and following a link isn't a request from the page.
- **Why "safe to post" is true:** the summary is O15's counts and codes. For an OCX workbook it adds the structure, which has only the format's own tab names and headers, never a value or a header the company wrote (OX2). An existing test holds this: a refused workbook's summary has none of its holders' names, its series names, or its amounts.

## 2. How to check it by behavior

Run `pnpm --filter @spillpoint/dashboard dev` and open the address it prints.

1. **A first visit, on a laptop:** the navy "Open a cap table export" is right under the title, with its line beside it, and "*or* Start from Millrace Robotics (fictional)" is under that. Click the button without touching "Start from": the file picker opens straight away.
2. **On a phone,** using your browser's device toolbar at 375 and then 320 wide:
   - the same, stacked
   - the page doesn't scroll sideways
   - nothing overlaps
3. **A refused import:**
   1. Click "Open a cap table export" and choose, together, the eight files in `cases/ocf-01-larkspur/package/` and `cases/ocf-03-refused/fixtures/conversion-ratio-loose.ocf.json`.
   2. You should see the alert, "Couldn't import it: its files disagree…", then the line, then the button.
   3. Click "a new issue on GitHub": GitHub's new-issue page opens in a new tab. You'll need to be signed in to GitHub.
   4. Back on the page, click "Copy a summary to share": the line stays, above the summary.
4. **Refused at Use** is in the tests (section 4). A by-hand check needs an OCX case written out as an .xlsx, which the tests do and the repo doesn't keep.
5. **Optional, the Carta report on your machine:** open the founder's Carta OCX report from `local/`. If it's refused, the line shows under the alert. If it reads, you get the review as before. Either way, nothing leaves your computer.

## 3. Screenshots

These come from the screenshot script's headless Chrome, at 1280, 375 and 320 wide. For each one, the script printed "no sideways scroll at <width> wide": the page is no wider than the screen. I also measured the boxes of everything in the masthead, and of the alert, the line, the button and the summary: none overlap. That's at 375 as the page opens, refused and with the summary open, and at 320 as it opens and refused. At 320 with the summary open, I checked by eye in the shot.

**1280, as the page opens:**

![The top at 1280](screenshots/10l-top.webp)

**375 and 320, as the page opens:**

![The top at 375](screenshots/10l-phone-top.webp) ![The top at 320](screenshots/10l-small-top.webp)

**1280, a refused import:**

![A refused import at 1280](screenshots/10l-refused.webp)

**375 and 320, a refused import:**

![A refused import at 375](screenshots/10l-phone-refused.webp) ![A refused import at 320](screenshots/10l-small-refused.webp)

**The summary opened, at 1280, 375 and 320:**

![The summary open at 1280](screenshots/10l-refused-open.webp)

![The summary open at 375](screenshots/10l-phone-refused-open.webp) ![The summary open at 320](screenshots/10l-small-refused-open.webp)

**Not the Browser pane:** I took the widths' numbers from the script's Chrome. While the app's Browser pane is hidden, its page doesn't render. The chart never learns its width, so it stays at its 960-pixel default and the page seems to scroll sideways at phone widths. Main shows the same thing there. A real browser, and the script's Chrome, don't.

## 4. Tests

- **`apps/dashboard/test/first-visit.test.tsx`** (new, 11 tests):
  - **The start:**
    - The export's button is the first control under the title, in the "Start" group, before "or" and "Start from".
    - It's drawn as the main button.
    - Save and Open sit apart from it.
    - Clicking it opens the export picker from the page as it first opens: Millrace still chosen, and nothing asked.
    - An export chosen then opens its review.
  - **The line:**
    - word for word
    - visible, under the button
    - read out with the button, as its description
    - "Carta" once, as "Carta's OCX report", and no address or menu
  - **A refused import:**
    - The help line, word for word, shows for a refused OCX workbook (also with the summary open), for a refused OCF export, and when the engine refuses at Use.
    - It doesn't show on the review before the refusal, on the page as it opens, or on the one-workbook message.
    - Its link: `ISSUE_URL`, new tab, `rel="noopener"`.
    - `ISSUE_URL` is the repository's address plus `/issues/new`, with no query or fragment.
    - With the line shown, the page's links out are its usual three plus this one.
- **`apps/dashboard/test/privacy.test.ts`:** the built page may name the new-issue page as a third link out, matched exactly, and must. Nothing else changes: still no way to send anything, no browser storage, and the same policy.
- **`apps/fund/test/site.test.ts`:** the same for the whole site:
  - the form and the repository on both pages
  - the new-issue page on the main page only
  - addresses read whole: the repository's address is the start of the new-issue page's, so a search for it inside the text would find the new-issue link and count it as the star link
- **Unchanged:** `links.test.tsx` (the page as it opens still has exactly its three links out). The other tests find the export's picker and "Start from" by their labels, which didn't change.

CI's sequence passes locally: install, typecheck, build, the tests and the reference checks.

## 5. The screenshot script

- **Its import helper was broken.** It looked for the export picker by its label before 06g (#88), "Open an OCF export", so every shot that imports (04f, 05b3a, 05b3b, 05c2) had failed since then. The fix is that one selector. I didn't retake those shots.
- **It now prints, for each shot,** whether the page scrolls sideways at the shot's width.
- **The new shots** are `10l-*`.

## 6. Assumptions added

- **O15:** where the line on a refused import shows, and where it doesn't (section 1). It's a page choice, not a modeling one.
- **No modeling choices.**

## 7. Open questions

1. **"Carta's OCX report, an Excel file, or an OCF export."** I read "an Excel file" as saying what the OCX report is, since the page reads no other spreadsheet, and wrote "Carta's OCX report (an Excel file)". If you meant three things, a founder's own spreadsheet would be refused.
2. **"Open" beside Save opens only a spillpoint file** (.json). It now sits apart from the start, at the right, but a founder holding an export might still try it. Should it say "Open a saved file"? I left it: the tests and the screenshot script click it by "Open".
3. **An issue template?** The new-issue page is GitHub's blank form. A template, say "An import was refused: paste the summary here", would go in `.github/ISSUE_TEMPLATE/`, a change under `.github/`, so it's your call. Not done.
4. **The root README** doesn't mention the line yet. The release step updates both READMEs.
5. **On a phone, the start takes more room.** At 375 × 812 the payout headline, "At $100M you get $9.75M", now begins near the bottom of the first screen. On a laptop it's still in full view.
