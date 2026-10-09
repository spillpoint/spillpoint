// Reading a .zip in the browser, with no dependency (M6 plan, answer 11). An
// OCF export often comes as one. Only stored and deflated entries are read:
// the two methods macOS, Windows and the zip command use. Anything else, such
// as an encrypted entry, another compression method or a zip too large for
// the classic format, is refused by name. Inflating uses the browser's own
// DecompressionStream. Each entry's checksum is checked, so a damaged zip is
// refused rather than read wrong.

export interface ZipEntry {
  /** The entry's path in the zip, with "/" between folders, whichever system made it. */
  name: string;
  bytes: Uint8Array;
}

export class ZipError extends Error {
  override name = "ZipError";
}

/** Compression methods by number, for naming one this page doesn't read (the zip format's own list). */
const METHODS: Record<number, string> = {
  1: "Shrink", 2: "Reduce", 3: "Reduce", 4: "Reduce", 5: "Reduce", 6: "Implode", 9: "Deflate64", 10: "PKWARE DCL Implode",
  12: "bzip2", 14: "LZMA", 18: "IBM TERSE", 19: "IBM LZ77", 93: "Zstandard", 94: "MP3", 95: "xz", 96: "JPEG", 97: "WavPack", 98: "PPMd", 99: "AES encryption",
};

/** The most a zip may unzip to, or loose files add up to: 100 MB, far more than an OCF export would be. */
export const MOST_BYTES = 100_000_000;

const END = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

export async function readZip(data: Uint8Array): Promise<ZipEntry[]> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  // The end-of-directory record is the last 22 bytes, unless a comment of up to 64 KB follows it.
  let end = -1;
  for (let at = data.length - 22; at >= Math.max(0, data.length - 22 - 0xffff); at--) {
    if (view.getUint32(at, true) === END) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new ZipError("It isn't a zip file this page can read: it has no zip directory.");
  if (view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0) {
    throw new ZipError("It's a zip split across several files. Put it back into one zip first.");
  }
  const count = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true);
  const offset = view.getUint32(end + 16, true);
  if (count === 0xffff || size === 0xffffffff || offset === 0xffffffff) {
    throw new ZipError("It's a Zip64 file, the format for very large zips, which this page doesn't read.");
  }

  // The whole directory is read first, so the sizes it lists can be checked before anything is inflated.
  const listed: { name: string; flags: number; method: number; crc: number; compressed: number; length: number; local: number }[] = [];
  let at = offset;
  for (let i = 0; i < count; i++) {
    if (at + 46 > data.length || view.getUint32(at, true) !== CENTRAL) throw new ZipError("Its zip directory is damaged.");
    const nameLength = view.getUint16(at + 28, true);
    listed.push({
      // Windows writes "\" between folders in some zips; this page reads names with "/".
      name: new TextDecoder().decode(data.subarray(at + 46, at + 46 + nameLength)).replace(/\\/g, "/"),
      flags: view.getUint16(at + 8, true),
      method: view.getUint16(at + 10, true),
      crc: view.getUint32(at + 16, true),
      compressed: view.getUint32(at + 20, true),
      length: view.getUint32(at + 24, true),
      local: view.getUint32(at + 42, true),
    });
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  // An OCF export is a few files of JSON; a zip that unzips to far more isn't one, and could fill the browser's memory.
  if (listed.reduce((total, e) => total + e.length, 0) > MOST_BYTES) {
    throw new ZipError("It unzips to more than 100 MB, far more than an OCF export would be. Check it's the right file.");
  }

  const entries: ZipEntry[] = [];
  for (const { name, flags, method, crc, compressed, length, local } of listed) {
    if (name.endsWith("/")) continue;
    if (flags & 1) throw new ZipError(`${name} is encrypted in the zip. Unzip it with its password, then open the files.`);
    if (method !== 0 && method !== 8) {
      throw new ZipError(`${name} is compressed with ${METHODS[method] ?? `method ${method}`}, which this page doesn't read. Zips made by macOS, Windows or the zip command use methods it reads.`);
    }
    if (local + 30 > data.length || view.getUint32(local, true) !== LOCAL) throw new ZipError(`${name}'s place in the zip is damaged.`);
    // The local header repeats the name and has its own extra field; the sizes come from the directory, which a
    // streaming zip (macOS's, for one) fills in only there.
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const stored = data.subarray(start, start + compressed);
    if (stored.length !== compressed) throw new ZipError(`${name} is cut short in the zip.`);
    const bytes = method === 0 ? stored : await inflate(stored, name, length);
    if (bytes.length !== length || crc32(bytes) !== crc) throw new ZipError(`${name} is damaged in the zip: it doesn't match its checksum.`);
    entries.push({ name, bytes });
  }
  return entries;
}

/**
 * Deflate without a zlib wrapper, as zips store it, using the browser's DecompressionStream. It stops as soon as the
 * output passes the size the zip's directory lists, so a zip that lies about its sizes can't fill the browser's memory.
 */
async function inflate(bytes: Uint8Array, name: string, listedLength: number): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const reader = source.pipeThrough(new DecompressionStream("deflate-raw") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    let read: ReadableStreamReadResult<Uint8Array>;
    try {
      read = await reader.read();
    } catch {
      throw new ZipError("An entry in the zip is damaged: it doesn't inflate.");
    }
    if (read.done) break;
    chunks.push(read.value);
    total += read.value.length;
    if (total > listedLength) {
      await reader.cancel();
      throw new ZipError(`${name} is damaged in the zip: it inflates to more than its listed size.`);
    }
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

let table: Uint32Array | null = null;

/** The zip format's CRC-32. */
export function crc32(bytes: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of bytes) crc = table[(crc ^ b) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
