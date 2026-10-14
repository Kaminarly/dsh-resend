/** Bounded, byte-aware rollback display. Never used to produce restore bytes. */
const MAX_BYTES = 3 * 1024 * 1024
const MAX_LINES = 10000
const MAX_LINE_POINTS = 20000
const MAX_CELLS = 2000000

function textVersion(bytes) {
  if (bytes === null) return { exists: false, bytes: 0, lines: 0, bom: false, eol: 'none', finalNewline: false, text: [] }
  const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  // Reject controls which are not useful text, including NUL and terminal escapes.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(raw)) throw new Error('non-text')
  const bom = raw.startsWith('\ufeff')
  const text = bom ? raw.slice(1) : raw
  const finalNewline = /(?:\r\n|\r|\n)$/.test(text)
  const lines = text === '' ? [] : text.split(/\r\n|\r|\n/)
  if (finalNewline) lines.pop()
  if (lines.length > MAX_LINES) throw new Error('too-many-lines')
  for (const line of lines) {
    let count = 0
    for (const point of line) { void point; if (++count > MAX_LINE_POINTS) throw new Error('line-too-long') }
  }
  const endings = new Set(text.match(/\r\n|\r|\n/g) ?? [])
  const eol = endings.size > 1 ? 'mixed' : endings.has('\r\n') ? 'crlf' : endings.has('\n') ? 'lf' : endings.has('\r') ? 'cr' : 'none'
  return { exists: true, bytes: bytes.length, lines: lines.length, bom, eol, finalNewline, text: lines }
}

/** Exact line diff with bounded LCS work, trimming shared prefix and suffix first. */
function diffLines(current, target) {
  let prefix = 0
  while (prefix < current.length && prefix < target.length && current[prefix] === target[prefix]) prefix++
  let suffix = 0
  while (suffix < current.length - prefix && suffix < target.length - prefix &&
      current[current.length - 1 - suffix] === target[target.length - 1 - suffix]) suffix++
  const a = current.slice(prefix, current.length - suffix)
  const b = target.slice(prefix, target.length - suffix)
  if (a.length * b.length > MAX_CELLS) throw new Error('computation-limited')
  const width = b.length + 1
  const table = new Uint16Array((a.length + 1) * width)
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    table[i * width + j] = a[i] === b[j] ? 1 + table[(i + 1) * width + j + 1]
      : Math.max(table[(i + 1) * width + j], table[i * width + j + 1])
  }
  const rows = []
  let oldLine = 0
  let newLine = 0
  const row = (kind, text) => rows.push({ kind, text,
    ...(kind === 'add' ? {} : { oldLine: ++oldLine }), ...(kind === 'delete' ? {} : { newLine: ++newLine }) })
  for (let i = 0; i < prefix; i++) row('context', current[i])
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { row('context', a[i++]); j++ }
    else if (i < a.length && (j === b.length || table[(i + 1) * width + j] >= table[i * width + j + 1])) row('delete', a[i++])
    else row('add', b[j++])
  }
  for (let k = current.length - suffix; k < current.length; k++) row('context', current[k])
  return rows
}

export function contentDiff(current, target) {
  const sizes = { current: current?.length ?? 0, target: target?.length ?? 0 }
  const action = target === null ? 'delete' : current === null ? 'create' : target.length === 0 ? 'empty' : 'restore'
  const unavailable = reason => ({ status: 'unavailable', reason, sizes, action })
  if (sizes.current + sizes.target > MAX_BYTES) return unavailable('too-large')
  try {
    const before = textVersion(current)
    const after = textVersion(target)
    const rows = diffLines(before.text, after.text)
    const { text: oldText, ...currentInfo } = before
    const { text: newText, ...targetInfo } = after
    void oldText; void newText
    return { status: 'ready', sizes, action, current: currentInfo, target: targetInfo, rows }
  } catch (error) {
    return unavailable(['too-many-lines', 'line-too-long', 'computation-limited'].includes(error.message) ? error.message : 'non-text')
  }
}
