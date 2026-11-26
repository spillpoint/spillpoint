// "Copy a summary to share" (05a2, built in 06g): what an import read, or why it didn't, as counts and codes only, so
// a founder can send it without sending the cap table (O15). The summary opens in full first, in a box you can read;
// "Copy" copies exactly that text to this computer's clipboard. Nothing is sent anywhere.
//
// Where an import is refused (10l), a line beside it says the summary is safe to post and links to a new issue on
// GitHub, from the template for an export that won't open: a plain link out, in a new tab. The founder pastes the
// summary in; the link's address names the template and nothing else.

import { useState } from "react";

import { ISSUE_URL } from "../../site/links.ts";

import { SHARE_HELP } from "./firstVisit.ts";

/** That the summary is safe to post, and where: shown where an import was refused, open or closed. */
function ShareHelp() {
  return (
    <p className="share__help">
      {SHARE_HELP.before}{" "}
      <a href={ISSUE_URL} target="_blank" rel="noopener">
        {SHARE_HELP.link}
      </a>
      {SHARE_HELP.after}
    </p>
  );
}

export function ShareSummary({ lines, refused = false }: { lines: string[]; refused?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const text = lines.join("\n");
  if (!open) {
    return (
      <>
        {refused && <ShareHelp />}
        <button type="button" className="file-button" onClick={() => setOpen(true)}>
          Copy a summary to share
        </button>
      </>
    );
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  };
  return (
    <>
      {refused && <ShareHelp />}
      <div className="share" role="group" aria-label="The summary to share">
        <p className="field__hint">
          Counts and codes only: no name, amount or date from the file. Read it first. Copy puts it on this computer's clipboard; nothing is sent.
        </p>
        <pre className="share__text" tabIndex={0}>
          {text}
        </pre>
        <div className="import__actions">
          <button type="button" className="file-button file-button--primary" onClick={() => void copy()}>
            Copy
          </button>
          <button type="button" className="file-button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        {copied === "yes" && <p role="status">Copied.</p>}
        {copied === "no" && <p role="status">This browser wouldn't copy it. Select the text above and copy it yourself.</p>}
      </div>
    </>
  );
}
