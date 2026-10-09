/**
 * Writing a minimal but faithful `app.asar`, so the packed half of the
 * host-contract gate can be tested on any machine.
 *
 * The container is what Electron produces: a pickle header, the nested JSON
 * index, then the file payloads, with entry offsets relative to the data base.
 * The reader under test is `scripts/asar.mjs`; its own cross-check against a real
 * Electron archive lives in `test/asar-reader.test.mjs`, because a reader and a
 * writer that share one author's understanding of the format can agree with each
 * other and still be wrong.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Write an archive at `target`.
 * @param target - absolute path of the `.asar` file to create.
 * @param files - app-relative path to text.
 * @returns `{ dataBase, headerSize }` — what the header claims, for assertions
 *   about the container itself.
 */
export function writeAsar(target, files) {
  const index = { files: {} }
  const payloads = []
  let offset = 0

  for (const [name, contents] of Object.entries(files)) {
    const body = Buffer.from(contents, 'utf8')
    const segments = name.split('/')
    const leaf = segments.pop()
    let node = index
    for (const segment of segments) {
      node.files[segment] ??= { files: {} }
      node = node.files[segment]
    }
    node.files[leaf] = { size: body.length, offset: String(offset) }
    payloads.push(body)
    offset += body.length
  }

  const json = Buffer.from(JSON.stringify(index), 'utf8')
  // The pickle pads the header JSON to a 4-byte boundary; the data base is
  // 8 + payloadSize, which is exactly align4(16 + json.length).
  const padding = (4 - (json.length % 4)) % 4
  const payloadSize = 8 + json.length + padding
  const header = Buffer.alloc(8 + payloadSize)

  header.writeUInt32LE(4, 0)
  header.writeUInt32LE(payloadSize, 4)
  header.writeUInt32LE(payloadSize - 4, 8)
  header.writeUInt32LE(json.length, 12)
  json.copy(header, 16)

  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, Buffer.concat([header, ...payloads]))
  return { dataBase: 8 + payloadSize, headerSize: json.length }
}
