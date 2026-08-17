/**
 * A minimal, STORE-only ZIP writer — browser-safe, dependency-free.
 *
 * The site is a STATIC EXPORT: there is no server, no route, no endpoint that
 * could assemble a download. So a "download this trace" control has exactly one
 * honest implementation — fetch the already-published files and build the
 * archive IN THE BROWSER. That leaves two options: add a compression library to
 * the client bundle, or write the ~100 lines of container format that ZIP
 * actually is. This is the second.
 *
 * STORE (method 0, no compression) on purpose:
 *
 *  - it removes the only hard part. Deflate needs a compressor; STORE needs a
 *    CRC-32 and a handful of little-endian records, all of which are testable
 *    against a real `unzip`.
 *  - the payload is JSONL and HTML that a browser has ALREADY transferred over
 *    a gzip/brotli-compressed HTTP response. Compressing it again would save
 *    disk on the reader's machine and nothing on the wire.
 *  - it keeps the archive byte-for-byte reproducible: no compressor version,
 *    no level, no heuristics. Two exports of the same trace are the same file,
 *    which is what makes an exported trace citable.
 *
 * Deliberately NOT supported: zip64 (a trace is KB, and >4 GB throws rather
 * than silently truncating), directory entries (extractors create parents from
 * member names), encryption, comments, and the data-descriptor form (sizes are
 * known up front because everything is already in memory).
 *
 * Nothing node-only, ever — same rule as `runlog-format.ts`. Uint8Array and
 * TextEncoder only, so the run-trace UI can import it.
 */

/** One member of the archive. `name` is its path inside the ZIP. */
export interface ZipEntry {
  /** Forward-slash relative path, e.g. `spill/0274e42afbd072b6.txt`. */
  name: string
  /** Text is UTF-8 encoded; bytes are stored verbatim. */
  data: string | Uint8Array
}

export interface ZipOptions {
  /**
   * Timestamp stamped on every member. Defaults to the DOS epoch
   * (1980-01-01T00:00:00) so an export is REPRODUCIBLE by default — two
   * exports of the same immutable trace are then the same bytes, and a test
   * can compare archives directly. The UI passes the real time, because a
   * reader's file manager showing 1980 is worse than a non-reproducible zip
   * they never diff.
   */
  modifiedAt?: Date
}

/** CRC-32 of the empty string — the identity the table is built to reproduce. */
export const CRC32_OF_EMPTY = 0

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    // The standard reflected polynomial 0xEDB88320 (IEEE 802.3), which is what
    // ZIP, gzip and `cksum -o3` all use.
    for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

/**
 * CRC-32 (IEEE) of a byte string, as an UNSIGNED 32-bit number.
 *
 * The `>>> 0` at the end is not decoration: JS bitwise ops yield signed int32,
 * and a digest with the top bit set would come back negative and be written as
 * a wrong (or throwing) little-endian word.
 */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const encoder = new TextEncoder()

function toBytes(data: string | Uint8Array): Uint8Array {
  return typeof data === 'string' ? encoder.encode(data) : data
}

/**
 * MS-DOS date/time pair, the only timestamp the base ZIP record can hold:
 * 2-second resolution, years from 1980. Values before 1980 clamp to the epoch
 * rather than wrapping into a nonsense year.
 */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = date.getFullYear()
  if (year < 1980) return { time: 0, date: (1 << 5) | 1 } // 1980-01-01
  return {
    time:
      (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

/**
 * A member name that cannot escape the directory it is extracted into.
 *
 * A ZIP is a file the READER opens on their own machine; `../../.ssh/config`
 * as a member name is the classic zip-slip. Every name this writer emits is
 * derived from a published trace path, but "derived from trusted data" is a
 * property that decays — checking here makes it structural.
 */
function assertSafeName(name: string): void {
  if (name === '' || name.length > 512) {
    throw new Error(`zip: unusable entry name (${name.length} chars)`)
  }
  if (name.startsWith('/') || /^[a-z]:/i.test(name) || name.includes('\\')) {
    throw new Error(`zip: entry name must be relative and slash-separated — got "${name}"`)
  }
  if (name.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')) {
    throw new Error(`zip: entry name must not contain empty or "." / ".." segments — got "${name}"`)
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error('zip: entry name contains control characters')
  }
}

const MAX_UINT32 = 0xffffffff
const MAX_UINT16 = 0xffff

class ByteWriter {
  private chunks: Uint8Array[] = []
  length = 0

  bytes(value: Uint8Array): void {
    this.chunks.push(value)
    this.length += value.length
  }

  u16(value: number): void {
    this.bytes(new Uint8Array([value & 0xff, (value >>> 8) & 0xff]))
  }

  u32(value: number): void {
    this.bytes(
      new Uint8Array([
        value & 0xff,
        (value >>> 8) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 24) & 0xff,
      ])
    )
  }

  concat(): Uint8Array {
    const out = new Uint8Array(this.length)
    let offset = 0
    for (const chunk of this.chunks) {
      out.set(chunk, offset)
      offset += chunk.length
    }
    return out
  }
}

const LOCAL_HEADER_SIG = 0x04034b50
const CENTRAL_HEADER_SIG = 0x02014b50
const EOCD_SIG = 0x06054b50
/** Version 2.0 — what STORE + UTF-8 names needs, and what every tool reads. */
const VERSION = 20
/** General-purpose bit 11: member names (and comments) are UTF-8. */
const FLAG_UTF8 = 0x0800
const METHOD_STORE = 0

/**
 * Build a ZIP archive from in-memory entries.
 *
 * Throws rather than producing a subtly-wrong archive: an empty archive, a
 * duplicate or unsafe name, or anything a non-zip64 record cannot express.
 */
export function createZip(
  entries: readonly ZipEntry[],
  options: ZipOptions = {}
): Uint8Array<ArrayBuffer> {
  if (entries.length === 0) throw new Error('zip: an archive needs at least one entry')
  if (entries.length > MAX_UINT16) {
    throw new Error(`zip: ${entries.length} entries exceeds the ${MAX_UINT16} a non-zip64 archive can hold`)
  }

  const seen = new Set<string>()
  for (const entry of entries) {
    assertSafeName(entry.name)
    if (seen.has(entry.name)) throw new Error(`zip: duplicate entry name "${entry.name}"`)
    seen.add(entry.name)
  }

  const { time, date } = dosDateTime(options.modifiedAt ?? new Date(1980, 0, 1))

  const local = new ByteWriter()
  const central = new ByteWriter()

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const data = toBytes(entry.data)
    if (data.length > MAX_UINT32) {
      throw new Error(`zip: "${entry.name}" is ${data.length} bytes — too large for a non-zip64 archive`)
    }
    const crc = crc32(data)
    const offset = local.length
    if (offset > MAX_UINT32) throw new Error('zip: archive exceeds the non-zip64 4 GB limit')

    // ---- local file header ----
    local.u32(LOCAL_HEADER_SIG)
    local.u16(VERSION)
    local.u16(FLAG_UTF8)
    local.u16(METHOD_STORE)
    local.u16(time)
    local.u16(date)
    local.u32(crc)
    local.u32(data.length) // compressed size == uncompressed size, by STORE
    local.u32(data.length)
    local.u16(name.length)
    local.u16(0) // no extra field
    local.bytes(name)
    local.bytes(data)

    // ---- central directory header ----
    central.u32(CENTRAL_HEADER_SIG)
    central.u16(VERSION) // version made by
    central.u16(VERSION) // version needed to extract
    central.u16(FLAG_UTF8)
    central.u16(METHOD_STORE)
    central.u16(time)
    central.u16(date)
    central.u32(crc)
    central.u32(data.length)
    central.u32(data.length)
    central.u16(name.length)
    central.u16(0) // extra
    central.u16(0) // comment
    central.u16(0) // disk number start
    central.u16(0) // internal attributes
    central.u32(0) // external attributes — 0 lets the extractor pick the mode
    central.u32(offset)
    central.bytes(name)
  }

  const eocd = new ByteWriter()
  eocd.u32(EOCD_SIG)
  eocd.u16(0) // this disk
  eocd.u16(0) // disk with the central directory
  eocd.u16(entries.length)
  eocd.u16(entries.length)
  eocd.u32(central.length)
  eocd.u32(local.length) // central directory offset
  eocd.u16(0) // no archive comment

  const out = new Uint8Array(local.length + central.length + eocd.length)
  out.set(local.concat(), 0)
  out.set(central.concat(), local.length)
  out.set(eocd.concat(), local.length + central.length)
  return out
}
