// The site's links out (10h), on both pages: two small ones in the header, "Get updates" and "★ Star on GitHub", and the
// sign-up sentence in the footer, which the root README has too. Since 10l the main page has one more, to a new issue,
// shown only where an import is refused. Each is a plain link that opens in its own tab only if
// the visitor clicks it. The pages make no request for any of them: no form, frame or script of the form's, no GitHub
// button script, badge image or star count (fetching a count would be a request from the page), and their
// Content-Security-Policy is unchanged. Nothing from a cap table or a fund is in any link.
//
// The addresses live here and nowhere else in code. The root README has its own copy of FORM_URL, held to this one by a
// test (apps/dashboard/test/links.test.tsx).

/**
 * The release-email form, a Google Form of Jordan's. Its links, in the header and the footer, are rel="noopener
 * noreferrer": the form's host isn't told which site sent the visitor.
 */
export const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeox1r7zWW1dLCC9aTBAuRbSfourgSA4lulE5bpLWC0D2sDFA/viewform";

/**
 * spillpoint's repository, for the header's star link. Its link is rel="noopener" only, so GitHub sees the visit came
 * from spillpoint.io and the site shows in the repository's traffic. That's all the referrer carries: browsers send
 * another site only the page's origin, https://spillpoint.io/, which holds nothing of a cap table or a fund.
 */
export const REPO_URL = "https://github.com/spillpoint/spillpoint";

/**
 * The repository's new-issue page (10l), on the main page only, where an import is refused: somewhere to post the
 * summary to share and ask for help. A plain link like the star link, rel="noopener" and in a new tab. Its address is
 * the page alone, with no title, body or summary in it: the founder pastes the summary in, so the page sends nothing.
 * Written out whole, not built from REPO_URL, so the privacy tests can find it in the built scripts as it is here.
 */
export const ISSUE_URL = "https://github.com/spillpoint/spillpoint/issues/new";

/** The header's two links' words. The ★ before `star` is a character, not an image, and screen readers skip it. */
export const HEADER = {
  updates: "Get updates",
  star: "Star on GitHub",
} as const;

/**
 * The footer's line around the sign-up link: `after` on the main page and in the root README, `fundAfter` on the fund
 * page, whose data is a fund's numbers, not a cap table.
 */
export const SIGN_UP = {
  before: "Using spillpoint?",
  link: "Leave your email to hear about releases.",
  after: "Optional, and your cap table never leaves your computer.",
  fundAfter: "Optional, and your fund's numbers never leave your computer.",
} as const;
