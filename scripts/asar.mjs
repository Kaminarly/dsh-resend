/**
 * Built-in `app.asar` reader — no dependency, per spec §12.
 *
 * Layout, verified against real archives on disk:
 *
 *   u32LE @0  = 4                 pickle size header
 *   u32LE @4  = header payload    file data base = 8 + this value
 *   u32LE @8  = payload - 4
 *   u32LE @12 = header JSON byte length
 *   JSON header @16, file data @ 8 + u32LE@4  (= align4(16 + headerSize))
 *
 * NOTE — spec discrepancy worth recording: §12 states file data begins at
 * `17 + headerSize`. Measured against real archives the base is `8 + u32LE@4`,
 * which equals `align4(16 + headerSize)`; `17 + headerSize` lands short by the
 * pickle alignment padding (3 bytes in the archive measured), which would make
 * every entry read start mid-record. The verified formula is used here.
 */
import { closeSync, existsSync, openSync, readFileSync, readSync } from 'node:fs'
import path from 'node:path'

/**
 * Open an asar archive for random reads.
 * @param archivePath - absolute path of the `.asar` file.
 * @returns readers over the archive, plus `close()`.
 */
export function openAsar(archivePath) {
  const fd = openSync(archivePath, 'r')
  const head = Buffer.alloc(16)
  readSync(fd, head, 0, 16, 0)
  const payloadSize = head.readUInt32LE(4)
  const headerSize = head.readUInt32LE(12)
  const headerBuffer = Buffer.alloc(headerSize)
  readSync(fd, headerBuffer, 0, headerSize, 16)
  const header = JSON.parse(headerBuffer.toString('utf8'))
  const dataBase = 8 + payloadSize

  const entryOf = (relativePath) => {
    let node = header
    for (const part of relativePath.split('/')) {
      node = node?.files?.[part]
      if (node === undefined) return undefined
    }
    return node
  }

  return {
    header,
    dataBase,
    /** Whether a file or directory entry exists at `relativePath`. */
    exists(relativePath) {
      return entryOf(relativePath) !== undefined
    },
    /** Read one file entry, or `undefined` when it is absent or a directory. */
    readFile(relativePath) {
      const entry = entryOf(relativePath)
      if (entry === undefined || entry.files !== undefined) return undefined
      // `unpacked` entries live beside the archive, not inside it.
      if (entry.unpacked) {
        const unpacked = path.join(`${archivePath}.unpacked`, ...relativePath.split('/'))
        return existsSync(unpacked) ? readFileSync(unpacked) : undefined
      }
      const buffer = Buffer.alloc(Number(entry.size))
      readSync(fd, buffer, 0, buffer.length, dataBase + Number(entry.offset))
      return buffer
    },
    close() {
      closeSync(fd)
    },
  }
}