// The sign-up for release emails (10h) on the fund page: the main page's line, word for word, as one plain link to the
// outside form in the footer, opening in its own tab. The address is the one constant both pages read, FORM_URL.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FORM_URL, SIGN_UP } from "../../site/signUp.ts";
import { App } from "../src/App.tsx";

const LINE = "Using spillpoint? Leave your email to hear about releases. Optional, and your cap table never leaves your computer.";

describe("the sign-up", () => {
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
});
