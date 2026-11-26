// What a first visit needs said on the page (10l), so nobody has to explain it. A founder trying the page on a call took
// "Start from" as the first step, picked "A blank cap table" before opening her export, and found nothing saying which
// file to bring or that it stays on her computer. Here are the words that settle both, held word for word by
// test/first-visit.test.tsx.
//
// Carta is named by its report alone (CLAUDE.md, rule 11): nothing of its menus or its site.

/**
 * The line beside "Open a cap table export": what it opens, and that it's never uploaded. The OCX report is a workbook,
 * hence "an Excel file"; the page doesn't read other spreadsheets.
 */
export const EXPORT_LINE = "Opens Carta's OCX report (an Excel file) or an OCF export. The file is read in this browser and never uploaded.";

/**
 * Beside "Copy a summary to share" when an import is refused: that the summary is safe to post (O15's rule: counts and
 * codes, never a name, an amount or a date), and where to post it. `link` is the link to a new issue on GitHub.
 */
export const SHARE_HELP = {
  before: "“Copy a summary to share” holds no names, amounts or dates, so it's safe to post. To ask for help with this file, copy it and paste it into",
  link: "a new issue on GitHub",
  after: ".",
} as const;
