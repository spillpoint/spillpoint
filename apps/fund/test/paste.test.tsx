// Pasting cash flows from a spreadsheet (plan step 6, f01k): the reader's rules, each with the rows it reads and the
// rows it can't with why; and the paste box on the Cash flows tab, which adds nothing until "Add them".

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../src/App.tsx";
import { pasteSummary, readPaste } from "../src/paste.ts";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));

/** Case 9's five cash flows as a US spreadsheet copies them: a header, month/day/year, $ and commas, CRLF. */
const CASE_9 = [
  "Date\tType\tKind\tAmount",
  "1/1/2021\tCall\tInvestment\t$6,000,000.00",
  "1/1/2022\tCall\tInvestment\t$4,000,000.00",
  "1/1/2023\tDistribution\t\t$3,000,000.00",
  "7/1/2023\tCall\tFee\t$500,000.00",
  "7/1/2024\tDistribution\t\t$9,000,000.00",
  "",
].join("\r\n");

/** The rows read, as [date, type, kind, amount]. */
const rowsOf = (text: string, order?: "month-first" | "day-first") => readPaste(text, order).rows.map((r) => [r.date, r.type, r.kind, r.amount.toString()]);
const unreadOf = (text: string) => readPaste(text).unread;

describe("the reader", () => {
  it("reads case 9 as a spreadsheet copies it: the header skipped, month first, $ and commas dropped", () => {
    const read = readPaste(CASE_9);
    expect(read.rows.map((r) => [r.line, r.date, r.type, r.kind, r.amount.toString()])).toEqual([
      [2, "2021-01-01", "call", "investment", "6000000"],
      [3, "2022-01-01", "call", "investment", "4000000"],
      [4, "2023-01-01", "distribution", "investment", "3000000"],
      [5, "2023-07-01", "call", "fee", "500000"],
      [6, "2024-07-01", "distribution", "investment", "9000000"],
    ]);
    expect(read.unread).toEqual([]);
    // 7/1/2023 could be either, and nothing in the paste settles it: the page asks, month first until changed.
    expect([read.ambiguous, read.order]).toEqual(["7/1/2023", "month-first"]);
    expect(pasteSummary(read, 0)).toBe("5 cash flows: 3 calls, $10,500,000 called; 2 distributions, $12,000,000 distributed; they'll be the table's first.");
    expect(pasteSummary(read, 5)).toMatch(/; adds them to the 5 here\.$/);
  });

  it("reads dates as YYYY-MM-DD, with slashes and a four- or two-digit year, or with a month's name", () => {
    const dates = ["2021-01-15", "2021/01/15", "2021/1/15", "1/15/2021", "1/15/21", "15-Jan-2021", "Jan 15, 2021", "15 Jan 2021", "January 15 2021", "15-Jan-21", "jan. 15, 2021"];
    expect(rowsOf(dates.map((d) => `${d}\tCall\tInvestment\t100`).join("\n")).map((r) => r[0])).toEqual(Array(dates.length).fill("2021-01-15"));
    expect(rowsOf("Sept 3, 2022\tCall\tFee\t5")[0]![0]).toBe("2022-09-03");
  });

  it("says which way it read dates that could be either, and why: a typo in a US paste is seen, not silent", () => {
    // 13/1/2023 is a typo for 1/13/2023, but it settles day first: the other two become 3 Apr and 6 Jul.
    const typo = readPaste("3/4/2021\tCall\tInvestment\t1\n6/7/2022\tCall\tFee\t2\n13/1/2023\tDistribution\t\t3");
    expect(typo.rows.map((r) => r.date)).toEqual(["2021-04-03", "2022-07-06", "2023-01-13"]);
    expect(typo.orderNote).toBe("Dates read day first, as 13/1/2023 in row 3 can only be read that way.");
    // Fixed, it settles month first, and says so.
    const fixed = readPaste("Date\tType\tKind\tAmount\n1/15/2021\tCall\tInvestment\t1\n6/7/2022\tCall\tFee\t2");
    expect(fixed.orderNote).toBe("Dates read month first, as 1/15/2021 in row 2 can only be read that way.");
    // Nothing settles it: the page asks, and the line says the answer is what's read.
    expect(readPaste("6/7/2022\tCall\tFee\t2").orderNote).toBe("Dates read month first, as chosen above.");
    expect(readPaste("6/7/2022\tCall\tFee\t2", "day-first").orderNote).toBe("Dates read day first, as chosen above.");
    // No date could be either: no line.
    expect([readPaste("1/15/2021\tCall\tFee\t2").orderNote, readPaste("3/3/2021\tCall\tFee\t2").orderNote, readPaste(CASE_9.replace(/7\/1\//g, "7/13/")).orderNote]).toEqual([null, null, null]);
  });

  it("lets a date with a number above 12 settle which comes first, and refuses a row that disagrees", () => {
    // 15/01/2021 can only be day first: so is 03/04/2021, and 01/15/2021 can't be read that way.
    const text = ["15/01/2021\tCall\tInvestment\t1", "03/04/2021\tCall\tInvestment\t2", "01/15/2021\tCall\tInvestment\t3"].join("\n");
    const read = readPaste(text);
    expect([read.order, read.ambiguous]).toEqual(["day-first", null]);
    expect(read.rows.map((r) => r.date)).toEqual(["2021-01-15", "2021-04-03"]);
    expect(read.unread).toEqual(["Row 3: '01/15/2021' isn't day/month/year, as this paste's dates are"]);
    // And month first the other way round.
    expect(readPaste("01/15/2021\tCall\tInvestment\t1\n15/01/2021\tCall\tInvestment\t1").unread).toEqual(["Row 2: '15/01/2021' isn't month/day/year, as this paste's dates are"]);
  });

  it("asks once when no date settles it, and reads every date the way chosen", () => {
    const text = "03/04/2021\tCall\tInvestment\t1\n05/06/2022\tDistribution\t\t2";
    expect(readPaste(text).ambiguous).toBe("03/04/2021");
    expect(rowsOf(text).map((r) => r[0])).toEqual(["2021-03-04", "2022-05-06"]);
    expect(rowsOf(text, "day-first").map((r) => r[0])).toEqual(["2021-04-03", "2022-06-05"]);
    // A date the same either way needs no question.
    expect(readPaste("03/03/2021\tCall\tInvestment\t1").ambiguous).toBeNull();
  });

  it("says why for each row it can't read, one reason a row, in the order of the columns", () => {
    const text = [
      "Date\tType\tKind\tAmount ($)",
      "Q3 2021\tCall\tInvestment\t100",
      "2/30/2021\tCall\tInvestment\t100",
      "\tCall\tInvestment\t100",
      "2021-01-01\tTransfer\t\t100",
      "2021-01-01\t\t\t100",
      "2021-01-01\tCall\tCarry\t100",
      "2021-01-01\tCall\tFee",
      "2021-01-01\tCall\tFee\tlots",
      "2021-01-01\tCall\tFee\t0",
      "2021-01-01\tCall\tFee\t1,5M",
    ].join("\n");
    expect(unreadOf(text)).toEqual([
      "Row 2: 'Q3 2021' isn't a date",
      "Row 3: '2/30/2021' isn't a date",
      "Row 4: has no date",
      "Row 5: 'Transfer' isn't a type: Call or Distribution",
      "Row 6: has no type",
      "Row 7: 'Carry' isn't a kind: Investment, Fee or Expense",
      "Row 8: has no amount; the columns are date, type, kind and amount",
      "Row 9: 'lots' isn't an amount",
      "Row 10: '0' isn't an amount more than zero",
      "Row 11: '1,5M' isn't an amount",
    ]);
  });

  it("refuses a negative amount, however a spreadsheet writes it, and says why", () => {
    // An accounting format's zero, "$ -", is a zero, not a negative.
    expect(unreadOf("2021-01-01\tCall\tFee\t$ -\n2021-01-01\tCall\tFee\t-")).toEqual(["Row 1: '$ -' isn't an amount more than zero", "Row 2: '-' isn't an amount more than zero"]);
    const negatives = ["-500,000", "-$500,000", "$-500,000", "(500,000)", "$(500,000)"];
    expect(unreadOf(negatives.map((a) => `2021-01-01\tDistribution\t\t${a}`).join("\n"))).toEqual(
      negatives.map((a, i) => `Row ${i + 1}: '${a}' is negative. Write amounts as positive; the type says which way the money goes`),
    );
  });

  it("reads every type and kind in any case, a call with no kind as an investment, and ignores a distribution's kind", () => {
    const text = [
      "2021-01-01\tCall\tInvestment\t1",
      "2021-01-01\tcapital call\tMANAGEMENT FEE\t2",
      "2021-01-01\tContribution\tfund expense\t3",
      "2021-01-01\tDrawdown\t\t4",
      "2021-01-01\tCall\t\t5",
      "2022-01-01\tDISTRIBUTION\tanything\t6",
    ].join("\n");
    const read = readPaste(text);
    expect(read.rows.map((r) => [r.type, r.kind])).toEqual([
      ["call", "investment"],
      ["call", "fee"],
      ["call", "expense"],
      ["call", "investment"],
      ["call", "investment"],
      ["distribution", "investment"],
    ]);
    expect(read.noKind).toBe(2);
  });

  it("reads amounts as the cells take them, digits kept exactly; skips blank lines; ignores cells past the fourth", () => {
    const text = ["2021-01-01\tCall\tFee\t8M", "", "2021-01-01\tCall\tFee\t50k", "2021-01-01\tCall\tFee\t$1,234.567\ta note", "  \t \t\t"].join("\n");
    expect(rowsOf(text).map((r) => r[3])).toEqual(["8000000", "50000", "1234.567"]);
    // A first row that names none of the columns isn't a header: it's a row, and says why it can't be read.
    expect(unreadOf("When\tWhat\t\tHow much\n2021-01-01\tCall\tFee\t1")).toEqual(["Row 1: 'When' isn't a date"]);
  });
});

/** The page on the Cash flows tab. */
function flows(id?: string) {
  render(<App />);
  if (id) fireEvent.change(screen.getByLabelText("Start from"), { target: { value: id } });
  fireEvent.click(screen.getByRole("tab", { name: "Cash flows" }));
}
const pasteBox = () => screen.getByRole("region", { name: "Paste rows from a spreadsheet" });
function paste(text: string) {
  fireEvent.click(screen.getByRole("button", { name: "Paste rows from a spreadsheet" }));
  fireEvent.change(within(pasteBox()).getByLabelText("The rows, pasted"), { target: { value: text } });
}
const dates = () => screen.getAllByLabelText(/^Row \d+'s date$/).map((d) => (d as HTMLInputElement).value);
const preview = () => within(pasteBox()).getByRole("status");

describe("the paste box", () => {
  it("adds case 9 pasted into a blank fund, which with its terms gives $659,342.47 and $1,199,178.08", () => {
    flows("blank");
    fireEvent.change(screen.getByLabelText("As of"), { target: { value: "2025-07-01" } });
    paste(CASE_9);
    expect(within(pasteBox()).getByRole("radio", { name: "Month first: 7/1/2023 is 1 Jul 2023" })).toHaveProperty("checked", true);
    expect(within(preview()).getByText(/^Dates read/).textContent).toBe("Dates read month first, as chosen above.");
    expect(preview().querySelector(".paste__summary")!.textContent).toBe(
      "5 cash flows: 3 calls, $10,500,000 called; 2 distributions, $12,000,000 distributed; they'll be the table's first.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Add them" }));
    expect(screen.queryByRole("region", { name: "Paste rows from a spreadsheet" })).toBeNull();
    // The blank fund's empty row gives way; the rows go in as pasted.
    expect(dates()).toEqual(["2021-01-01", "2022-01-01", "2023-01-01", "2023-07-01", "2024-07-01"]);
    expect((screen.getByLabelText("Row 4's amount") as HTMLInputElement).value).toBe("$500,000");
    fireEvent.click(screen.getByRole("tab", { name: "Terms" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "A preferred return" }));
    fireEvent.click(screen.getByRole("radio", { name: "Full" }));
    fireEvent.click(screen.getByRole("tab", { name: "Payouts" }));
    const xs = within(screen.getByRole("region", { name: "Breakpoints" }))
      .getAllByRole("button")
      .map((b) => b.querySelector(".breakpoints__value")!.firstChild!.textContent!.trim());
    expect(xs).toEqual(["$659,342.47", "$1,199,178.08"]);
    expect(caseFile("fund-09-interim-pref", "expected.json").breakpoints.map((b: { x: string }) => b.x)).toEqual(["659342.47", "1199178.08"]);
  });

  it("lists a 'Q3 2021' row as unreadable, adds nothing until Add them, and Cancel leaves the table as it was", () => {
    flows("fund-17-lps-three");
    const before = dates();
    paste("Date\tType\tKind\tAmount\nQ3 2021\tDistribution\t\t$1,000,000\n9/30/2025\tDistribution\t\t$2,000,000");
    expect(preview().textContent).toBe(
      "1 cash flow: no calls; 1 distribution, $2,000,000 distributed; adds them to the 5 here.1 row it can't read, which won't be added:Row 2: 'Q3 2021' isn't a date.",
    );
    expect(dates()).toEqual(before);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("region", { name: "Paste rows from a spreadsheet" })).toBeNull();
    expect(dates()).toEqual(before);
    paste("Date\tType\tKind\tAmount\nQ3 2021\tDistribution\t\t$1,000,000\n9/30/2025\tDistribution\t\t$2,000,000");
    fireEvent.click(screen.getByRole("button", { name: "Add them" }));
    expect(dates()).toEqual([...before, "2025-09-30"]);
  });

  it("asks once which comes first when the only dates are 03/04/2021 and 05/06/2022, month first selected", () => {
    flows("fund-17-lps-three");
    paste("03/04/2021\tCall\tFee\t100\n05/06/2022\tCall\tFee\t200");
    const question = within(pasteBox()).getByRole("group", { name: "Which comes first in this paste's dates?" });
    expect(within(question).getAllByRole("radio").map((r) => [r.parentElement!.textContent!.trim(), (r as HTMLInputElement).checked])).toEqual([
      ["Month first: 03/04/2021 is 4 Mar 2021", true],
      ["Day first: 03/04/2021 is 3 Apr 2021", false],
    ]);
    fireEvent.click(within(question).getByRole("radio", { name: /^Day first/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add them" }));
    expect(dates().slice(5)).toEqual(["2021-04-03", "2022-06-05"]);
  });

  it("refuses '(500,000)' with its reason, and counts the calls read with no kind", () => {
    flows("fund-17-lps-three");
    // The refused row has no kind either; it isn't counted, since it isn't read.
    paste("2024-06-01\tCall\t\t(500,000)\n2022-02-01\tCall\t\t100,000");
    expect(preview().textContent).toBe(
      "1 cash flow: 1 call, $100,000 called; no distributions; adds them to the 5 here.1 call had no kind: read as an investment.1 row it can't read, which won't be added:Row 1: '(500,000)' is negative. Write amounts as positive; the type says which way the money goes.",
    );
  });

  it("sends more than one cell pasted into a table cell to the paste box, and adds after the rows there, unsorted", () => {
    flows("fund-17-lps-three");
    const cell = screen.getByLabelText("Row 2's amount") as HTMLInputElement;
    // One cell, with the line break a spreadsheet adds, goes into the cell as usual.
    fireEvent.paste(cell, { clipboardData: { getData: () => "495000\r\n" } });
    expect(screen.queryByRole("region", { name: "Paste rows from a spreadsheet" })).toBeNull();
    fireEvent.paste(cell, { clipboardData: { getData: () => "2025-01-01\tDistribution\t\t1000\r\n2024-12-01\tDistribution\t\t2000\r\n" } });
    // A text box keeps line breaks as "\n"; the reader takes either.
    expect(within(pasteBox()).getByLabelText("The rows, pasted")).toHaveProperty("value", "2025-01-01\tDistribution\t\t1000\n2024-12-01\tDistribution\t\t2000\n");
    expect(cell.value).toBe("$495,000");
    fireEvent.click(screen.getByRole("button", { name: "Add them" }));
    expect(dates().slice(5)).toEqual(["2025-01-01", "2024-12-01"]);
  });
});
