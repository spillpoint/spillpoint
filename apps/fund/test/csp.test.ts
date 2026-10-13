// @vitest-environment node
//
// The fund page's Content-Security-Policy is the main page's, word for word (notes/plan-fund-page.md), so the two
// can't drift: what the main page refuses, the fund page refuses. This reads the dashboard's config; it changes nothing
// there.

import { expect, it } from "vitest";

import { CONTENT_SECURITY_POLICY as MAIN_PAGE } from "../../dashboard/vite.config.ts";
import { CONTENT_SECURITY_POLICY } from "../vite.config.ts";

it("has the main page's policy exactly", () => {
  expect(CONTENT_SECURITY_POLICY).toBe(MAIN_PAGE);
});
