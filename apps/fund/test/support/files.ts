// Opening a file through the page, for the tests that open one (f03d): the page reads the file without blocking, so how
// long it takes depends on the machine. The helper waits for the status line under the masthead to change, with no
// timer of its own, so a loaded machine is slower but doesn't fail; the test's own timeout is the only limit.

import { fireEvent, screen } from "@testing-library/react";

/** The status line under the masthead: what the page opened, saved or couldn't. */
export const status = () => document.querySelector(".file-status")?.textContent;

/**
 * The file opened through "Open a saved fund", once the status line has changed: "Opened …" or "Couldn't open …". Each
 * test renders its own page, so the line before is none, or a save's, and always changes when a file is read.
 */
export async function openFile(text: string, name = "inputs.json"): Promise<void> {
  const before = status();
  const changed = new Promise<void>((resolve) => {
    const watch = new MutationObserver(() => {
      if (status() === before) return;
      watch.disconnect();
      resolve();
    });
    watch.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  fireEvent.change(screen.getByLabelText("Open a saved fund"), { target: { files: [new File([text], name, { type: "application/json" })] } });
  await changed;
}
