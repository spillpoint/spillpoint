// Opening an OCF export, clicked through in a simulated browser (M6, 04f): the report shows before the cap table is
// used (answer 9), each term OCF leaves open is asked, and the cap table then opens as a saved file would.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { FULL_SEARCH_TIMEOUT } from "./analysis.ts";
import { exitOf, payoutsAtBreakpoints } from "./payouts.ts";

const cases = resolve(import.meta.dirname, "../../../cases");
const caseFile = (path: string) => readFileSync(resolve(cases, path));
const packageOf = (name: string) => readdirSync(resolve(cases, name, "package")).map((f) => new File([caseFile(`${name}/package/${f}`)], f, { type: "application/json" }));
const zip = (name: string) => new File([readFileSync(resolve(import.meta.dirname, "fixtures", name))], name, { type: "application/zip" });
const upload = (files: File[]) => fireEvent.change(screen.getByLabelText(/Open an OCF export/), { target: { files } });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const review = () => screen.findByRole("region", { name: /^Importing / });

let downloads: Blob[];
beforeEach(() => {
  downloads = [];
  let made: Blob | null = null;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => ((made = blob), "blob:saved") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => void downloads.push(made!));
});
afterEach(() => vi.restoreAllMocks());

describe("Quillfern Labs, from a zip", () => {
  it.each(["quillfern-macos.zip", "quillfern-zip.zip", "quillfern-windows.zip"])(
    "%s: shows the report first, then pays as edge case 25 does, to the cent",
    async (name) => {
      render(<App />);
      upload([zip(name)]);
      const panel = await review();
      expect(within(panel).getByRole("heading", { level: 2 }).textContent).toBe("Importing Quillfern Labs, Inc.");
      // Nothing is used yet: the payouts aren't on the page until you say so.
      expect(screen.queryByRole("tab", { name: "Payouts" })).toBeNull();
      // The line for shares issued at another price, in Jordan's words (04a review).
      expect(
        within(panel).getByText(
          "Angel S's 260,416 Seed Preferred were issued at $0.96 but carry Seed Preferred's $1.20 preference. " +
            "If they should be a separate series with a lower preference (as a SAFE's shares often are), set that up in the editor.",
        ),
      ).toBeTruthy();
      expect(within(panel).getByText("Employee F holds nothing on December 31, 2025, so they're left out.")).toBeTruthy();

      click("Use this cap table");
      expect(await screen.findByText(`Imported Quillfern Labs, Inc. from ${name}. It isn't saved yet: Save keeps it as a spillpoint file.`)).toBeTruthy();
      // Not saved yet: leaving the page asks first.
      const leaving = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(leaving);
      expect(leaving.defaultPrevented).toBe(true);
      click("Save");
      const saved = await downloads[0]!.text();
      const edge25 = JSON.parse(caseFile("edge-25-ocf-ledger/inputs.json").toString()).exit;
      expect(payoutsAtBreakpoints({ ...exitOf(saved), range: edge25.range })).toEqual(payoutsAtBreakpoints({ ...edge25, exit_values: [] }));
    },
  );
});

describe("the terms OCF leaves open", () => {
  it("asks whether Millrace's Series B participates, and uses the answer", async () => {
    render(<App />);
    upload(packageOf("ocf-11-millrace"));
    const panel = await review();
    const question = within(panel).getByRole("group", { name: "Does Series B Preferred participate?" });
    click("Use this cap table");
    expect(screen.getByRole("alert").textContent).toBe("Answer each question above first: every one changes who gets what.");
    fireEvent.click(within(question).getByLabelText(/Participating, without a cap/));
    click("Use this cap table");
    expect(await screen.findByText(/^Imported Millrace Robotics, Inc\. from 8 files\./)).toBeTruthy();
    click("Save");
    const seriesB = JSON.parse(await downloads[0]!.text()).cap_table.securities.find((s: { id: string }) => s.id === "series_b");
    expect(seriesB).toMatchObject({ participation: "participating", cap_multiple: null });
  });

  /** Larkspur with a third SAFE whose cap's kind OCF leaves open, answered, and the rest as case 27 fills them. */
  async function larkspurWithASafeAsked(kind: "Pre-money" | "Post-money") {
    render(<App />);
    const fixture = new File([caseFile("ocf-04-to-fill/fixtures/safe-cap-without-timing.ocf.json")], "safe-cap-without-timing.ocf.json");
    upload([...packageOf("ocf-01-larkspur"), fixture]);
    const panel = await review();
    // Jordan's wording (04g).
    expect(within(panel).getByText("The cap on Investor N's note is read as pre-money, the only kind spillpoint models for a note. OCF doesn't say which.")).toBeTruthy();
    // Jordan's wording (04a2 review).
    fireEvent.click(within(within(panel).getByRole("group", { name: "Is this SAFE's cap pre-money or post-money?" })).getByLabelText(kind));
    fireEvent.click(within(within(panel).getByRole("group", { name: "Does Seed Preferred participate?" })).getByLabelText(/^Non-participating/));
    fireEvent.change(within(panel).getByLabelText("Investor N's note's repayment multiple at a sale"), { target: { value: "1.5" } });
    fireEvent.change(within(panel).getByLabelText("When is the sale?"), { target: { value: "2026-06-30" } });
    click("Use this cap table");
  }

  // A sale with three SAFEs beside a note: about 17s on CI's 2-core machine with 05c2's solver (#72), so it has the full
  // search's timeout until 05c4's speed work.
  it("asks whether a SAFE's cap is pre-money or post-money: post-money, the engine uses the table, SAFEs beside a note (05c2)", async () => {
    await larkspurWithASafeAsked("Post-money");
    expect(await screen.findByText(/^Imported Larkspur Instruments, Inc\. from 9 files\./)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  }, FULL_SEARCH_TIMEOUT);

  it("pre-money, says plainly why the engine can't use the table at a sale, and offers a round to convert the SAFEs (05b3b)", async () => {
    await larkspurWithASafeAsked("Pre-money");
    expect(screen.getByRole("alert").textContent).toBe(
      "This cap table can't be used at a sale yet: spillpoint can't yet work out a sale while a pre-money SAFE is outstanding beside preferred stock.",
    );
    expect(screen.getByRole("region", { name: /^Importing Larkspur/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Use it to add a round" })).toBeTruthy();
  });

  it("offers a round only for the sale's limits on SAFEs and notes, not for any other refusal (05b3b)", async () => {
    render(<App />);
    upload(packageOf("ocf-10-edge-13a"));
    const panel = await review();
    // A sale before the note was issued: refused, but not for the note being outstanding at a sale.
    fireEvent.change(within(panel).getByLabelText("When is the sale?"), { target: { value: "2000-01-01" } });
    click("Use this cap table");
    expect(screen.getByRole("alert").textContent).toMatch(/^This cap table can't be used yet\. /);
    expect(screen.queryByRole("button", { name: "Use it to add a round" })).toBeNull();
  });
});

describe("a note whose cap counts other SAFEs and notes (O9; 05c2)", () => {
  it("is read when none is outstanding beside it, and the report says so", async () => {
    render(<App />);
    const fixture = new File([caseFile("ocf-13-note-base/fixtures/note-alone-counts-other-convertibles.ocf.json")], "note-alone-counts-other-convertibles.ocf.json");
    upload([...packageOf("ocf-12-ledger"), fixture]);
    const panel = await review();
    expect(within(panel).getByText("Fund U's note counts other SAFEs and notes in the shares its cap divides by. None is outstanding beside it, so that changes nothing.")).toBeTruthy();
  });

  it("is refused beside Larkspur's SAFEs and note, by name", async () => {
    render(<App />);
    const fixture = new File([caseFile("ocf-03-refused/fixtures/note-base-counts-other-convertibles.ocf.json")], "note-base-counts-other-convertibles.ocf.json");
    upload([...packageOf("ocf-01-larkspur"), fixture]);
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /^Couldn't import it: it uses something spillpoint doesn't model yet, and it refuses rather than leave it out\. .*other converting securities/,
    );
  });
});

describe("what it won't import", () => {
  it("says why, in the engine's words, and leaves the cap table you had", async () => {
    render(<App />);
    const fixture = new File([caseFile("ocf-03-refused/fixtures/conversion-ratio-loose.ocf.json")], "conversion-ratio-loose.ocf.json");
    upload([...packageOf("ocf-01-larkspur"), fixture]);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "Couldn't import it: its files disagree with each other or with OCF, so there's no one cap table to build. " +
        "Class cls-r-loose's conversion ratio (1.04 for 1) doesn't agree with its issue price ÷ conversion price ($1.5 ÷ $1.5), even allowing for how the numbers are written.",
    );
    expect(screen.getByRole("tab", { name: "Payouts" })).toBeTruthy();
  });

  it("goes back to the cap table you had on Cancel", async () => {
    render(<App />);
    upload([zip("quillfern-zip.zip")]);
    await review();
    click("Cancel");
    expect(screen.queryByRole("region", { name: /^Importing / })).toBeNull();
    expect(screen.getByRole("tab", { name: "Payouts" })).toBeTruthy();
  });
});
