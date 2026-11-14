# Review: 10h (spillpoint.io and the sign-up link)

Branch `10h-spillpoint-io-and-sign-up`, from main at `09c1deb` (#139 merged).

**CI and permissions:** `.github/workflows/pages.yml` changes in its opening comment only: the address it publishes to, and that the domain is set in Settings, not by a file. No step changes. No change to `.claude/`.

**`cases/` and `packages/`:** nothing in `cases/`. In `packages/`, only the link in `packages/fund/README.md`, which you asked for. The engine's README has no link to the old address, so it's unchanged. No code in either package changes.

## What to look at first

1. **I didn't change the base paths.** Both pages already build with relative paths (`./`), and that is what makes this move safe. The same build works at `spillpoint.io/` and at the old `spillpoint.github.io/spillpoint/`, so the live page is never broken, whichever comes first, the merge or the switch. With `/` as the base, the old address would serve a blank page between the merge and the switch. That's the same failure as last time (section 1), and the new tests fail if anyone tries it.
2. **Why the last attempt went blank** (section 1). Two things together: a redirect browsers keep forever, and the page's own policy refusing its files from another address. I reproduced both in Chrome.
3. **Most of your steps come before the merge** (section 6), and the domain must never be taken off once it's set.
4. **The form address is the one you sent**, in `apps/site/links.ts` and the root README.

## 1. Why the last attempt went blank

**What's on record: nothing.** No commit or CNAME file in this repo or in `spillpoint/spillpoint.github.io`. All 127 Pages deployments published to `spillpoint.github.io/spillpoint/`. Nothing in `notes/`. One trace is at Porkbun: a `_github-pages-challenge-spillpoint` TXT record, from starting GitHub's domain verification. spillpoint.io itself is still Porkbun's parking page, over plain HTTP only; HTTPS fails at the handshake. So I can't say exactly what was done. What follows is the cause, found and reproduced.

**Two facts explain it:**

- **GitHub's redirect never expires.** Once a custom domain is set, GitHub answers every old address with a 301 that has no `Cache-Control` or `Expires`. I checked this on a live GitHub Pages site that redirects. A browser keeps a redirect like that until its cache is cleared. Taking the domain off GitHub stops new redirects, but it can't take back the ones browsers already hold.
- **The page refuses its own files from another address.** Its Content-Security-Policy lets scripts, styles and images load only from `'self'`, the page's own origin. If the page loads from the old address but its files are redirected to spillpoint.io, every one of them is refused. The page stays white: the blank page.

**The reproduction:** two local servers stand in for the old and new addresses, sending GitHub's headers, and a fresh headless Chrome runs on main's build.

- **Domain set, then taken off.** The old address kept going to the new one, with the redirect "from the browser's cache". The server never heard from Chrome. Reloading didn't help, and clearing the cache did.
- **The page from the old address, its files redirected.** The page was blank, and the console showed "Loading the script 'http://localhost:4402/assets/index-….js' violates the following Content Security Policy directive: "script-src 'self'"". The stylesheet and both icons were refused the same way. With the domain taken off, a reload fetched the page itself fresh, but its files still went through the cached redirects, so it stayed blank. Only clearing the cache fixed it.

You may have seen the second, a blank page, or the first, which lands on whatever spillpoint.io showed then: Porkbun's parking page over HTTP, or a browser error over HTTPS, since Porkbun has no certificate for it.

**What this means for this time:**
- spillpoint.io must already serve the page when the redirect starts.
- Once the domain is set, it's never taken off. If something goes wrong, fix it in place.
- The page and its files must stay at one address. Relative paths do that.

## 2. The domain

- **Base paths stay `./`** (above). Each Vite config now says why, beside `base`.
- **Nothing in the repo sets the domain.** With an Actions deploy, GitHub ignores a CNAME file, as its docs say, so the domain lives only in Settings → Pages (section 6). `pages.yml` says so in its comment.
- **Links moved to spillpoint.io:**
  - the root README (the page and the fund page)
  - `packages/fund/README.md`
  - `CLAUDE.md`: the fund page twice, the dashboard in the repo layout, and "Where things stand", where the domain is now 10h's
  - the comments in `pages.yml` and both Vite configs

  The pages link to each other by relative paths, `./fund/` and `../`, so they don't change.
- **On npm:** spillpoint-fund 0.6.0's README keeps the old link until its next release. That link redirects.
- **Saved files and the summary to share don't change.** Neither names the page's address. The page keeps nothing in browser storage (an existing test holds that), so nothing is left behind at the old address.

## 3. What a visitor with the old page cached will see

From the same reproduction, run on this branch's build, with the move done in the order of section 6:

- **Back within 10 minutes of their last visit:** the old page at the old address, from their browser's cache. It works, worker included, since its files were cached with it. A reload, or any visit after the 10 minutes GitHub lets a browser keep a page, follows the redirect to spillpoint.io.
- **A tab left open:** keeps working. Its link to the other page goes to spillpoint.io.
- **The worst case, a browser that kept the page but not its files,** say a tab restored much later: blank, the CSP refusal above, until one reload, which lands on spillpoint.io. They don't need to clear the cache, as long as the domain stays set.
- **Anyone with redirects cached from the last attempt:** those point at spillpoint.io, which will now serve the page.
- **Between setting the domain and ticking Enforce HTTPS:** GitHub redirects to `http://spillpoint.io/`. The page works there, apart from Copy under "Copy a summary to share", since the clipboard needs HTTPS. This usually lasts under an hour.

## 4. The sign-up

- **`apps/site/links.ts`** (`signUp.ts` in the first commit): `FORM_URL`, your Google Form, and the line, word for word. `apps/site` is a plain folder both pages import from, not a package; pnpm's workspace and the lockfile don't change.
- **Both footers:** the line is a second line under the version. "Leave your email to hear about releases." is the link, and the rest is plain text. It opens in a new tab, with `rel="noopener noreferrer"` since your review.
- **The root README:** the same line, at the end of "Try it". A test holds its address to `FORM_URL`.
- **Still sends nothing:**
  - The CSP is unchanged: the policy's lines aren't in the diff, and the fund page's still equals the main page's.
  - Following a link isn't a request from the page.
  - The page has no form, frame or script for the sign-up.
  - In the reproduction, nothing was requested from the form's host.
- **What the form's host learns:** since your review, not even which site sent the visitor (`noreferrer`). Nothing about a cap table is in any URL.

## 5. Tests

- **`apps/fund/test/site.test.ts`:** the built site, the fund page in `fund/` as Pages uploads it, served from `https://spillpoint.io/` and from the old address. At each:
  - every file each page loads is on the page's own origin and is there
  - the main page's worker starts from a file beside its script, on the page's origin
  - each page's link lands on the other

  I checked these fail with `/` as the main page's base: the old address fails, and so does the worker at both addresses.
- **`apps/dashboard/test/links.test.tsx`, `apps/fund/test/links.test.tsx`** (`sign-up.test.tsx` in the first commit): the line word for word, the link's address, `target="_blank"` and its `rel`, the page's links out, and that nothing on the page takes an email. The main page's also checks the README's line. The header's links are in "After your review", below.
- **The privacy tests** (both pages' and the site's): the one change is that the page's links out are allowed, each exactly. Each must be there, and each is matched whole, so nothing else on its host gets through. The rest holds as before: no way to send anything, no browser storage, the policy.
- **Both `app.test.tsx` footer tests** read the footer's first line, since the second is the sign-up.

CI's sequence passes locally: install, typecheck, build, the tests and the reference checks.

## 6. Your steps on GitHub and at Porkbun, in order

**Before the merge:**

1. **Verify the domain for the organization.** Go to github.com/organizations/spillpoint/settings/pages, under "Verified domains".
   - If spillpoint.io shows as verified, go on.
   - If not, click "Add a domain" and enter `spillpoint.io`. GitHub shows a TXT record named `_github-pages-challenge-spillpoint.spillpoint.io`. One is already at Porkbun; if GitHub's value differs, replace it. Then click Verify.

   Verifying is what stops anyone else claiming spillpoint.io on GitHub while it points there, so it comes before the DNS.
2. **At Porkbun,** in spillpoint.io's DNS records:
   - **Delete** the parking records: the one for `spillpoint.io` itself pointing at `pixie.porkbun.com` (an ALIAS, or A records 207.207.210.x), and the wildcard `*.spillpoint.io` → `pixie.porkbun.com`, which GitHub advises against. Also delete a `www` record if there's one of its own, and any URL forward set for spillpoint.io under its Details.
   - **Keep** the `_github-pages-challenge-spillpoint` TXT record.
   - **Add** these, leaving the host blank for the A and AAAA records:
     - four A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     - four AAAA records: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
     - a CNAME, host `www`, answer `spillpoint.github.io`
3. **Wait until the DNS answers:** `dig +short spillpoint.io` shows the four 185.199… addresses, and `dig +short www.spillpoint.io` shows `spillpoint.github.io.`. Until step 4, spillpoint.io shows GitHub's "Site not found", and nothing links there yet.
4. **Set the domain on this repo.** Go to github.com/spillpoint/spillpoint/settings/pages, enter `spillpoint.io` under "Custom domain", and Save. Wait for "DNS check successful". From here the old address redirects, and spillpoint.io serves the page now on main, which works there.
   - If spillpoint.io still says "Site not found" after a few minutes, run the Pages workflow by hand: Actions → Pages → Run workflow, on main.
   - Leave the custom domain of `spillpoint/spillpoint.github.io`, the organization's own site, empty. A domain there would move every project to `spillpoint.io/spillpoint/`.
5. **Tick "Enforce HTTPS"** once GitHub offers it, when the certificate is ready. That's usually within an hour; GitHub allows up to 24.
6. **Check:**
   - https://spillpoint.io/ and https://spillpoint.io/fund/ show the pages.
   - https://spillpoint.github.io/spillpoint/ and https://spillpoint.github.io/spillpoint/fund/ land on them.
   - http://www.spillpoint.io/ lands on https://spillpoint.io/.

**The merge:**

7. **Merge this PR.** Pages deploys main, and the sign-up line and the READMEs' new links go live, linking to a domain that already works.

**After the merge:**

8. When the Pages run is green, check on both pages that "Get updates" and the footer's sign-up open your form in a new tab, and "★ Star on GitHub" opens the repository.
9. **Optional, in the other repo:** `spillpoint/spillpoint.github.io`'s `index.html` could send its meta refresh and canonical link straight to `https://spillpoint.io/`. That saves `spillpoint.github.io/` one hop, but it works without it.

**Never, after step 4: take the domain off.** Browsers keep the redirect for good, so taking the domain off strands them, as last time. If something breaks, fix the DNS or the setting in place.

**Why DNS before the domain, when GitHub's docs say the reverse:** they set the domain first so no one else can claim it while the DNS points at GitHub, and the verification in step 1 already does that. With the DNS first, the redirect never sends anyone to Porkbun's parking page.

## How to check it by behavior

- **The header and the footers:** run `pnpm preview` and open http://localhost:4173/.
  - At the right end of the title's line are "Get updates" and "★ Star on GitHub". The first opens your form in a new tab, the second the repository.
  - At the foot of the page are two lines: the version with "Fund waterfall", then "Using spillpoint? Leave your email to hear about releases. Optional, and your cap table never leaves your computer." The middle sentence opens your form in a new tab.
  - Click "Fund waterfall": the fund page has the same two header links, and its footer line ends "Optional, and your fund's numbers never leave your computer." "Exit waterfall" goes back.
  - At phone width the header links sit beside the wordmark, with the tagline under them. At 320px they move to their own line under the wordmark.
- **Both addresses:** `pnpm --filter @spillpoint/fund exec vitest run test/site.test.ts` builds the site and checks it from spillpoint.io and from the old address.
- **The links and privacy:** `pnpm --filter @spillpoint/dashboard exec vitest run test/links.test.tsx test/privacy.test.ts`, and the same in `@spillpoint/fund`.
- **After the switch:** step 6, then step 8.

## Assumptions added

None in `docs/ASSUMPTIONS.md`: nothing here is modeling. The page's own choices:

- **Base paths stay relative** (`./`), so one build works at both addresses.
- **The link is the middle sentence.** The line's other two sentences are plain text around it.
- **The line is word for word on both pages,** "your cap table" on the fund page too. Changed after your review (question 1).
- **`rel` is exactly `noopener`,** so the form's host sees the referring origin. Changed after your review (question 2).
- **`FORM_URL` lives in `apps/site/links.ts`,** a folder both pages share, so the fund page imports nothing from the main page's sources.
- **The sign-up is the footer's second line.**

## Open questions (answered: see below)

1. **The fund page's line says "your cap table never leaves your computer"**, your words. On the fund page, would "your fund's numbers" read better?
2. **`rel="noopener noreferrer"`** would keep even `https://spillpoint.io/` from the form's host. Do you want it, or is the origin fine?
3. **The root README's "Coming next"** still says 1.0 comes "at its own domain", and the domain now comes first. Reword it, or leave it until the 1.0 release step?

## After your review (2026-11-14): one more commit

**Your checks:** you built the site and served it both ways, at `/` with `/fund/` and at `/spillpoint/` with `/spillpoint/fund/`. All four pages rendered in headless Chromium with no console errors, no policy refusals and no request off their own address, and the site test passed. You agreed the account of the blank page and section 6's order.

**CI and permissions:** no change to `.github/workflows/` or `.claude/` in this commit.

### 1. Two links at the top of both pages

- **Beside the title,** at the right end of its line: "Get updates", to `FORM_URL`, and "★ Star on GitHub", to `REPO_URL` (https://github.com/spillpoint/spillpoint).
  - Both live in `apps/site/links.ts`, renamed from `signUp.ts`, since it now holds both addresses and the header's words.
  - Each is small, in the page's navy, and opens in a new tab.
  - The footer's sign-up sentence is as it was, apart from your answers below.
- **Plain links only:**
  - no GitHub button script or frame
  - no star count, since fetching one would be a request from the page
  - no badge image

  The ★ is a character, hidden from screen readers, so the link reads "Star on GitHub". The CSP doesn't change, and the page still sends nothing.
- **At phone width,** checked in Chrome on the built pages, both of them:
  - At 375px the two links sit beside the wordmark, one line each, with the tagline on its own line under them.
  - At 320px the links move together to their own line under the wordmark, right-aligned, and the tagline comes under them.
  - At both widths, no link overlaps the wordmark or the tagline, each link is on one line, and the header never runs off the screen.
  - The title's line is now one flex row. Each piece moves to the next line whole, so a link never breaks into the title. The controls stay on the line below, as they already were at the page's width.
- **Something I found, not from this commit:** on the main page, the payoff chart doesn't shrink when the window narrows.
  - Loaded at 1280px and narrowed to 375px, its card shrinks to 321px but the chart stays 960px wide. The page then scrolls sideways.
  - In Chrome's phone emulation the chart is also drawn at the browser pane's real width (987px) when the page loads.
  - The live site, main's build, does the same, and 10h doesn't touch the chart.
  - The fund page's chart is fine.

  It's below, as a question.

### 2. Your answers

1. **The fund page's line** now ends "Optional, and your fund's numbers never leave your computer." The main page and the README keep "your cap table". `SIGN_UP.fundAfter` holds the fund's words.
2. **The form's links, header and footer,** are `rel="noopener noreferrer"`, so the form's host isn't told which site sent the visitor. The GitHub link stays `rel="noopener"`, so spillpoint.io shows in the repository's traffic. Browsers send another site only the page's origin, which holds nothing of a cap table or a fund.
3. **The README's 1.0 line** now reads: "Coming next: **1.0,** the stability release: the same API as 0.7.0, with no breaking changes after it." The rest of the paragraph is unchanged.

### 3. Tests

- **`links.test.tsx`, on both pages** (renamed from `sign-up.test.tsx`):
  - the header has exactly the two links, "Get updates" to `FORM_URL` and "★ Star on GitHub" to `REPO_URL`, in the title's block
  - both open in a new tab, the form's with `noopener noreferrer`, GitHub's with `noopener`
  - the header has no image, SVG, frame or script, and the ★ is a hidden character
  - the footer's sign-up, in each page's own words, with `noopener noreferrer`
  - the page's links out are exactly the form (header), GitHub (header) and the form (footer)
- **The privacy tests** (both pages' and the site's) allow the two addresses, each matched whole and exactly. With two allowed addresses, setting the form's address aside as a prefix, as the first commit did, would also let through a longer address beginning with one of them, a page under the repository's say.
  - I checked the exact match fails when `https://github.com/spillpoint/spillpoint/issues` is planted in the main page.
  - Everything else in the privacy tests is unchanged.

CI's sequence passes locally: install, typecheck, build, the tests and the reference checks.

### Open question

1. **The payoff chart that doesn't shrink** (above): fix it as a step of its own after 10h? It's the main page only, from before 10h.
