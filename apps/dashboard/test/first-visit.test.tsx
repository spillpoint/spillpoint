// A first visit that works without anyone explaining it (10l). Opening an export is a start of its own, at the top,
// beside "Start from" with "or" between them, not a step after choosing a blank table. A line with it says what it
// opens and that the file never leaves the browser. Where an import is refused, a line says the summary to share is
// safe to post, with a plain link to a new issue from the template for an export that won't open. The words are checked
// here word for word, and so is what the template says.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OcxWorkbook } from "spillpoint";

import { FORM_URL, ISSUE_URL, REPO_URL } from "../../site/links.ts";
import { App } from "../src/App.tsx";
import { EXPORT_LINE, SHARE_HELP } from "../src/firstVisit.ts";
import { applyOcxChange } from "../../../packages/engine/test/support/ocx.ts";
import type { OcxFixture } from "../../../packages/engine/test/support/ocx.ts";
import { xlsxOf } from "./workbooks.ts";

const LINE = "Opens Carta's OCX report (an Excel file) or an OCF export. The file is read in this browser and never uploaded.";
const HELP = "“Copy a summary to share” holds no names, amounts or dates, so it's safe to post. To ask for help with this file, copy it and paste it into a new issue on GitHub.";

const repo = resolve(import.meta.dirname, "../../..");
const cases = resolve(repo, "cases");
/** The issue template the page's link opens (Jordan's answer 3). */
const TEMPLATE = "export-wont-open.yml";
const read = <T,>(path: string): T => JSON.parse(readFileSync(resolve(cases, path), "utf8")) as T;
const workbookOf = (name: string) => read<OcxWorkbook>(`${name}/workbook.json`);
const fixtureWorkbook = (dir: string, name: string) => {
  const f = read<OcxFixture>(`${dir}/fixtures/${name}`);
  return applyOcxChange(workbookOf(f.base) as never, f.change) as unknown as OcxWorkbook;
};
const xlsx = (book: OcxWorkbook, name: string) => new File([xlsxOf(book) as Uint8Array<ArrayBuffer>], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
const caseFile = (path: string) => readFileSync(resolve(cases, path));
const packageOf = (name: string) => readdirSync(resolve(cases, name, "package")).map((f) => new File([caseFile(`${name}/package/${f}`)], f, { type: "application/json" }));
const zip = (name: string) => new File([readFileSync(resolve(import.meta.dirname, "fixtures", name))], name, { type: "application/zip" });
const exportPicker = () => screen.getByLabelText(/^Open a cap table export:/) as HTMLInputElement;
const upload = (files: File[]) => fireEvent.change(exportPicker(), { target: { files } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const review = () => screen.findByRole("region", { name: /^Importing / });
const group = (name: string | RegExp) => screen.getByRole("group", { name });
const choose = (question: string | RegExp, choice: string | RegExp) => fireEvent.click(within(group(question)).getByRole("radio", { name: choice }));
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
/** The help line's paragraph, found by its link. */
const help = () => screen.getByRole("link", { name: SHARE_HELP.link }).closest("p")!;

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } });
});
afterEach(() => vi.restoreAllMocks());

describe("opening an export, as a way to start", () => {
  it("is the first thing under the title, in the Start group, and then “or” and “Start from”", () => {
    render(<App />);
    const header = screen.getByRole("banner");
    const start = within(header).getByRole("group", { name: "Start" });
    const button = within(start).getByRole("button", { name: "Open a cap table export" });
    const select = within(start).getByLabelText("Start from");
    // In the page's order: the export's button, its line, "or", then the picker. Nothing to choose comes before it.
    expect(header.querySelectorAll("button, select")[0]).toBe(button);
    expect(start.textContent).toBe(`Open a cap table export${LINE}orStart from ${select.textContent}`);
    expect(within(start).getByText("or").tagName).toBe("SPAN");
    // It's the page's main action, drawn as one.
    expect(button.className).toContain("file-button--primary");
    // Save and "Open a saved file", the page's own file, are apart from it (Jordan's answer 2).
    const files = header.querySelector(".masthead__files")!;
    expect([...files.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Save", "Open a saved file"]);
    expect(start.contains(files)).toBe(false);
  });

  it("opens the export picker straight away, from the example the page starts on: no blank table first", () => {
    render(<App />);
    const opened: HTMLInputElement[] = [];
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
      opened.push(this);
    });
    const confirm = vi.spyOn(window, "confirm");
    expect((screen.getByLabelText("Start from") as HTMLSelectElement).value).toBe("millrace");
    click("Open a cap table export");
    expect(opened).toEqual([exportPicker()]);
    // Nothing's been changed yet, so nothing is asked.
    expect(confirm).not.toHaveBeenCalled();
  });

  it("isn't “Open a saved file”, which opens only a file saved here", () => {
    render(<App />);
    const opened: HTMLInputElement[] = [];
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
      opened.push(this);
    });
    click("Open a saved file");
    expect(opened.map((input) => [input.getAttribute("aria-label"), input.accept])).toEqual([["Open a saved cap table", ".json,application/json"]]);
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
  });

  it("reads an export chosen from the page as it first opens", async () => {
    render(<App />);
    upload([zip("quillfern-zip.zip")]);
    const panel = await review();
    expect(within(panel).getByRole("heading", { level: 2 }).textContent).toBe("Importing Quillfern Labs, Inc.");
  });
});

describe("the line with it", () => {
  it("is the line you asked for, word for word", () => {
    expect(EXPORT_LINE).toBe(LINE);
  });

  it("is on the page under the button, visible, and read out with the button", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: "Open a cap table export" });
    const line = screen.getByText(LINE);
    expect(line.tagName).toBe("P");
    expect(line.className).not.toContain("visually-hidden");
    expect(line.closest(".start__export")).toBe(button.closest(".start__export"));
    expect(button.getAttribute("aria-describedby")).toBe(line.id);
    expect(screen.getByRole("button", { name: "Open a cap table export", description: LINE })).toBe(button);
  });

  it("names Carta's report and nothing more of Carta's (rule 11)", () => {
    // Carta once, as the report's owner; no address, menu or path through Carta's site.
    expect([...EXPORT_LINE.matchAll(/Carta\S*/g)].map((m) => m[0])).toEqual(["Carta's"]);
    expect(EXPORT_LINE).toContain("Carta's OCX report");
    expect(EXPORT_LINE).not.toMatch(/carta\.com|menu|settings|→|>/i);
  });
});

describe("a refused import", () => {
  /** The help line, word for word, with its link: a plain link out to a new issue, in a new tab. */
  const expectHelp = () => {
    const p = help();
    expect(p.textContent).toBe(HELP);
    const link = within(p).getByRole("link", { name: SHARE_HELP.link });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe(ISSUE_URL);
    expect([link.getAttribute("target"), link.getAttribute("rel")]).toEqual(["_blank", "noopener"]);
    // Just before what it's about: the button, or the summary once it's open.
    const next = p.nextElementSibling!;
    expect(next.textContent === "Copy a summary to share" || next.getAttribute("aria-label") === "The summary to share", next.outerHTML).toBe(true);
  };

  it("says the summary is safe to post, and links to a new issue: a workbook refused as it's read", async () => {
    render(<App />);
    upload([xlsx(fixtureWorkbook("ocx-03-refused", "currency.json"), "alder-gate.xlsx")]);
    expect((await screen.findByRole("alert")).textContent).toMatch(/^Couldn't import it/);
    expectHelp();
    // Still there with the summary open, above it.
    click("Copy a summary to share");
    expectHelp();
    expect(help().compareDocumentPosition(group("The summary to share")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says it for an OCF export refused as it's read", async () => {
    render(<App />);
    upload([...packageOf("ocf-01-larkspur"), new File([caseFile("ocf-03-refused/fixtures/conversion-ratio-loose.ocf.json")], "conversion-ratio-loose.ocf.json")]);
    expect((await screen.findByRole("alert")).textContent).toMatch(/^Couldn't import it/);
    expectHelp();
  });

  it("says it when the engine refuses at Use, and not before", async () => {
    render(<App />);
    upload([xlsx(workbookOf("ocx-02-ferncliff-preferred"), "ferncliff.xlsx")]);
    await review();
    // The review offers the summary from the start; the help comes only once something is refused.
    expect(screen.getByRole("button", { name: "Copy a summary to share" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: SHARE_HELP.link })).toBeNull();
    click("Conversion price = issue price");
    type("Series Seed Preferred's liquidation preference, as a multiple of its issue price", "1");
    choose("Does Series Seed Preferred participate?", "Participating, with a cap");
    type("Series Seed Preferred's participation cap, as a multiple of its issue price", "0.37");
    choose("Which series is paid first at a sale?", /^All pari passu/);
    click("Use this cap table");
    expect((await screen.findByRole("alert")).textContent).toMatch(/^This cap table can't be used yet\./);
    expectHelp();
  });

  it("isn't said where nothing is refused: a message with no summary, or the page as it opens", async () => {
    render(<App />);
    expect(screen.queryByText(SHARE_HELP.before, { exact: false })).toBeNull();
    upload([xlsx(workbookOf("ocx-01-alder-gate"), "a.xlsx"), new File(["{}"], "Manifest.ocf.json", { type: "application/json" })]);
    expect((await screen.findByRole("alert")).textContent).toBe("Open an OCX workbook on its own: one .xlsx, with no other files.");
    expect(screen.queryByRole("link", { name: SHARE_HELP.link })).toBeNull();
  });

  it("links to a new issue from the template for an export that won't open, and names nothing else in its address", async () => {
    expect(ISSUE_URL).toBe(`${REPO_URL}/issues/new?template=${TEMPLATE}`);
    const url = new URL(ISSUE_URL);
    expect([url.protocol, url.hash, [...url.searchParams.keys()]]).toEqual(["https:", "", ["template"]]);
    // The template it names is in the repository, where GitHub looks for it.
    expect(existsSync(resolve(repo, ".github/ISSUE_TEMPLATE", url.searchParams.get("template")!))).toBe(true);
    // With the help shown, the page's links out are the three it always has and this one.
    render(<App />);
    upload([xlsx(fixtureWorkbook("ocx-03-refused", "currency.json"), "alder-gate.xlsx")]);
    await screen.findByRole("alert");
    const out = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")!).filter((href) => /^[a-z]+:/i.test(href));
    expect(out).toEqual([FORM_URL, REPO_URL, ISSUE_URL, FORM_URL]);
  });
});

describe("the issue template for an export that won't open", () => {
  const text = readFileSync(resolve(repo, ".github/ISSUE_TEMPLATE", TEMPLATE), "utf8");
  /** Each of the form's fields, by its type, id and whether it's required. */
  const fields = text
    .split("\n  - type: ")
    .slice(1)
    .map((block) => ({ type: block.split("\n")[0], id: /\n {4}id: (\S+)/.exec(block)?.[1], required: /\n {6}required: true/.test(block) }));

  it("says plainly, first, that the issue is public, and not to attach the export or paste anything from it", () => {
    expect(fields[0]!.type).toBe("markdown");
    expect(text).toContain(
      "**This issue is public: anyone can read it.** Don't attach your export, and don't paste anything from it: no names, amounts, dates, tab names or file names.",
    );
    // And where the summary comes from, by the button's own words.
    expect(text).toContain("click **Copy a summary to share**, read it, then click **Copy**");
  });

  it("asks for the pasted summary and which tool made the file, both required, and nothing else", () => {
    expect(fields).toEqual([
      { type: "markdown", id: undefined, required: false },
      { type: "textarea", id: "summary", required: true },
      { type: "input", id: "tool", required: true },
    ]);
    expect(text).toContain("label: The page's summary");
    expect(text).toContain("label: Which tool made the file?");
  });
});
