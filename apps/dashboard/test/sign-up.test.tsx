// The sign-up for release emails (10h): one plain link to an outside form, in the footer, opening in its own tab, and
// the same line in the root README. The address is one constant, FORM_URL; the README's copy is held to it here.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FORM_URL, SIGN_UP } from "../../site/signUp.ts";
import { App } from "../src/App.tsx";

const LINE = "Using spillpoint? Leave your email to hear about releases. Optional, and your cap table never leaves your computer.";

describe("the sign-up", () => {
  it("is the line you asked for, word for word, around an https address", () => {
    expect(`${SIGN_UP.before} ${SIGN_UP.link} ${SIGN_UP.after}`).toBe(LINE);
    expect(new URL(FORM_URL).protocol).toBe("https:");
  });

  it("is a plain link in the footer to the form, opening in a new tab with rel=noopener", () => {
    render(<App />);
    const footer = screen.getByRole("contentinfo");
    const link = screen.getByRole("link", { name: SIGN_UP.link });
    expect(footer.contains(link)).toBe(true);
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe(FORM_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener");
    expect(link.parentElement!.textContent).toBe(LINE);
  });

  it("is the page's only link out, and nothing on the page takes an email", () => {
    render(<App />);
    const out = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")!).filter((href) => /^[a-z]+:/i.test(href));
    expect(out).toEqual([FORM_URL]);
    expect(document.querySelectorAll("input[type=email], iframe, embed, object").length).toBe(0);
  });

  it("is in the root README, the same line linking to the same address", () => {
    const readme = readFileSync(resolve(import.meta.dirname, "../../../README.md"), "utf8");
    // So a FORM_URL changed without the README, or the README without FORM_URL, fails here.
    expect(readme).toContain(`${SIGN_UP.before} [${SIGN_UP.link}](${FORM_URL}) ${SIGN_UP.after}`);
  });
});
