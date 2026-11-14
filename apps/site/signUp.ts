// The sign-up for release emails (10h), on both pages and in the root README. It is a plain link to a form kept
// somewhere else, which opens in its own tab only if the visitor clicks it. The pages make no request for it: no form,
// frame or script of the form's is on them, and their Content-Security-Policy is unchanged. What a visitor types into
// the form goes to the form, never to the pages, and nothing from a cap table or a fund is in the link.
//
// The address lives here and nowhere else in code. The root README has its own copy, held to this one by a test
// (apps/dashboard/test/sign-up.test.tsx).

/** The release-email form, a Google Form of Jordan's. */
export const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeox1r7zWW1dLCC9aTBAuRbSfourgSA4lulE5bpLWC0D2sDFA/viewform";

/** The line around the link, word for word on both pages and in the root README. */
export const SIGN_UP = {
  before: "Using spillpoint?",
  link: "Leave your email to hear about releases.",
  after: "Optional, and your cap table never leaves your computer.",
} as const;
