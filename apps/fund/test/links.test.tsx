// The fund page's links out (10h), the main page's: "Get updates" and "★ Star on GitHub" in the header beside the title,
// and the sign-up line in the footer, with a fund's numbers where the main page has a cap table. Each is a plain link,
// opening in its own tab. The addresses are the constants both pages read, in apps/site/links.ts.

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FORM_URL, HEADER, REPO_URL, SIGN_UP } from "../../site/links.ts";
import { App } from "../src/App.tsx";

const LINE = "Using spillpoint? Leave your email to hear about releases. Optional, and your fund's numbers never leave your computer.";

describe("the header's links", () => {
  it("are beside the title: Get updates, to the form, and ★ Star on GitHub, to the repository", () => {
    render(<App />);
    const header = screen.getByRole("banner");
    const links = within(header).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Get updates", FORM_URL],
      ["★ Star on GitHub", REPO_URL],
    ]);
    // Read aloud without the star.
    expect(within(header).getByRole("link", { name: HEADER.updates })).toBe(links[0]);
    expect(within(header).getByRole("link", { name: HEADER.star })).toBe(links[1]);
    expect(links[0]!.closest(".masthead__title")!.querySelector(".wordmark")!.textContent).toBe("spillpoint");
  });

  it("open in a new tab: the form's with rel=noopener noreferrer, GitHub's with rel=noopener", () => {
    render(<App />);
    const header = screen.getByRole("banner");
    const updates = within(header).getByRole("link", { name: HEADER.updates });
    const star = within(header).getByRole("link", { name: HEADER.star });
    expect([updates.getAttribute("target"), updates.getAttribute("rel")]).toEqual(["_blank", "noopener noreferrer"]);
    expect([star.getAttribute("target"), star.getAttribute("rel")]).toEqual(["_blank", "noopener"]);
  });

  it("are plain links: no image, frame or script in the header, and the star is a character", () => {
    render(<App />);
    const header = screen.getByRole("banner");
    expect(header.querySelectorAll("img, svg, iframe, script, object, embed").length).toBe(0);
    expect(within(header).getByRole("link", { name: HEADER.star }).querySelector("[aria-hidden=true]")!.textContent).toBe("★");
  });
});

describe("the sign-up", () => {
  it("is a plain link in the footer to the form, opening in a new tab with rel=noopener noreferrer, in the fund's words", () => {
    expect(`${SIGN_UP.before} ${SIGN_UP.link} ${SIGN_UP.fundAfter}`).toBe(LINE);
    render(<App />);
    const footer = screen.getByRole("contentinfo");
    const link = within(footer).getByRole("link", { name: SIGN_UP.link });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe(FORM_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.parentElement!.textContent).toBe(LINE);
  });
});

describe("the page's links out", () => {
  it("are those three and no more, and nothing on the page takes an email", () => {
    render(<App />);
    const out = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")!).filter((href) => /^[a-z]+:/i.test(href));
    expect(out).toEqual([FORM_URL, REPO_URL, FORM_URL]);
    expect(document.querySelectorAll("input[type=email], iframe, embed, object").length).toBe(0);
  });
});
