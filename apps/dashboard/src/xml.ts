// A small XML reader for the parts of an .xlsx (0.6.0, 06c; ASSUMPTIONS OX1), with no dependency. The page and Node
// both run it, and Node has no DOMParser, so it can't lean on the browser's.
//
// It reads what a spreadsheet's XML parts use: elements, attributes, text, CDATA sections, the five named entities
// and numeric character references. Comments and processing instructions are skipped. A DOCTYPE is refused: no
// .xlsx part has one, and refusing it means no entity a file defines is ever expanded. A name loses its namespace
// prefix ("x:c" is "c", "r:id" is "id"), since workbooks are written both with prefixes and without.

export interface XmlElement {
  /** Its name, without a namespace prefix. */
  name: string;
  /** Its attributes, by name without a prefix. */
  attrs: Record<string, string>;
  children: XmlElement[];
  /** The text directly inside it, entities decoded, in order. */
  text: string;
}

export class XmlError extends Error {
  override name = "XmlError";
}

const NAMED: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

function decode(raw: string): string {
  if (!raw.includes("&")) return raw;
  return raw.replace(/&([^;\s&]*);?/g, (whole, ref: string) => {
    if (!whole.endsWith(";")) throw new XmlError(`an "&" that starts no entity`);
    if (ref in NAMED) return NAMED[ref]!;
    const code = /^#x[0-9a-fA-F]+$/.test(ref) ? parseInt(ref.slice(2), 16) : /^#[0-9]+$/.test(ref) ? parseInt(ref.slice(1), 10) : NaN;
    if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) throw new XmlError(`an entity it doesn't know, &${ref};`);
    return String.fromCodePoint(code);
  });
}

const local = (name: string) => name.slice(name.indexOf(":") + 1);

/** A start tag at exactly lastIndex: its name, its attributes, and "/" when it closes itself. */
const START_TAG = /<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;

/** The bytes of one part as text: UTF-8, or UTF-16 when it starts with that encoding's byte-order mark. */
export function xmlText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  return new TextDecoder("utf-8").decode(bytes);
}

/** The document's root element. */
export function parseXml(source: string): XmlElement {
  const stack: XmlElement[] = [];
  let root: XmlElement | null = null;
  let at = source.charCodeAt(0) === 0xfeff ? 1 : 0;
  const addText = (text: string) => {
    if (stack.length > 0) stack[stack.length - 1]!.text += text;
    else if (text.trim() !== "") throw new XmlError("text outside the root element");
  };
  while (at < source.length) {
    const open = source.indexOf("<", at);
    if (open < 0) {
      addText(decode(source.slice(at)));
      break;
    }
    if (open > at) addText(decode(source.slice(at, open)));
    if (source.startsWith("<?", open)) {
      const end = source.indexOf("?>", open + 2);
      if (end < 0) throw new XmlError("a processing instruction that never ends");
      at = end + 2;
    } else if (source.startsWith("<!--", open)) {
      const end = source.indexOf("-->", open + 4);
      if (end < 0) throw new XmlError("a comment that never ends");
      at = end + 3;
    } else if (source.startsWith("<![CDATA[", open)) {
      const end = source.indexOf("]]>", open + 9);
      if (end < 0) throw new XmlError("a CDATA section that never ends");
      addText(source.slice(open + 9, end));
      at = end + 3;
    } else if (source.startsWith("<!", open)) {
      throw new XmlError("a DOCTYPE or other declaration, which no workbook part has");
    } else if (source.startsWith("</", open)) {
      const end = source.indexOf(">", open + 2);
      if (end < 0) throw new XmlError("an end tag that never closes");
      const name = local(source.slice(open + 2, end).trim());
      const top = stack.pop();
      if (!top || top.name !== name) throw new XmlError(`an end tag </${name}> that doesn't match its start`);
      at = end + 1;
    } else {
      START_TAG.lastIndex = open;
      const tag = START_TAG.exec(source);
      if (!tag) throw new XmlError("a start tag it can't read");
      const element: XmlElement = { name: local(tag[1]!), attrs: {}, children: [], text: "" };
      for (const a of tag[2]!.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) element.attrs[local(a[1]!)] = decode(a[2] ?? a[3] ?? "");
      if (stack.length > 0) stack[stack.length - 1]!.children.push(element);
      else if (root) throw new XmlError("a second root element");
      else root = element;
      if (tag[3] !== "/") stack.push(element);
      at = open + tag[0].length;
    }
  }
  if (stack.length > 0) throw new XmlError(`<${stack[stack.length - 1]!.name}> never closes`);
  if (!root) throw new XmlError("no root element");
  return root;
}

/** Its child elements of one name; none when there's no element. */
export function childrenNamed(element: XmlElement | undefined, name: string): XmlElement[] {
  return element?.children.filter((c) => c.name === name) ?? [];
}

/** Its first child element of one name, if any. */
export function child(element: XmlElement | undefined, name: string): XmlElement | undefined {
  return element?.children.find((c) => c.name === name);
}
