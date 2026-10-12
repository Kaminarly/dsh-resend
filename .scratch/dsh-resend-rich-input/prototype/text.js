import { Schema } from 'prosemirror-model'

export const schema = new Schema({ nodes: {
  doc: { content: 'paragraph' },
  paragraph: { content: 'inline*', toDOM: () => ['p', 0] },
  text: { group: 'inline' },
  hard_break: { inline: true, group: 'inline', selectable: false,
    attrs: { eol: { default: '\n' } }, toDOM: () => ['br'] },
  file_reference: {
    inline: true, group: 'inline', atom: true,
    attrs: { path: {}, kind: {}, mention: {} },
    toDOM: node => ['span', { 'data-file-reference': node.attrs.mention, contenteditable: 'false' }, node.attrs.path],
  },
} })

// A completed reference is closed. Open quotes belong only to drill/search text.
export function finalMention({ path, kind }) {
  const value = kind === 'directory' ? path.replace(/\/$/u, '') + '/' : path
  if (!value || /[\u0000-\u001f\u007f-\u009f"]/u.test(value)) throw new Error('该路径无法安全表示为引用')
  return /\s/u.test(value) ? `@"${value}"` : `@${value}`
}

export function drillMention(candidate) {
  if (candidate.kind !== 'directory') throw new Error('只有目录可以继续下钻')
  return finalMention(candidate).replace(/"$/u, '')
}

function appendText(nodes, text) {
  for (const part of text.split(/(\r\n|\r|\n)/u)) {
    if (!part) continue
    nodes.push(/^[\r\n]+$/u.test(part) ? schema.nodes.hard_break.create({ eol: part }) : schema.text(part))
  }
}

// Historical text has no saved chip metadata. Only independently known paths
// are restored; ambiguous or unknown tokens stay editable text, byte for byte.
export function createDocument(text, candidates = []) {
  const known = new Map()
  for (const candidate of candidates) {
    const mention = finalMention(candidate)
    known.set(mention, candidate)
    const path = candidate.kind === 'directory' ? candidate.path.replace(/\/$/u, '') + '/' : candidate.path
    known.set(`@"${path}"`, candidate)
  }
  const nodes = []
  let offset = 0
  const token = /(?:^|\s)(@"[^"\r\n]*"|@[^\s"]+)/gu
  for (const match of text.matchAll(token)) {
    const start = match.index + match[0].length - match[1].length
    const possible = [...known.keys()].filter(mention => match[1].startsWith(mention))
      .sort((a, b) => b.length - a.length)
    const mention = possible.find(value => {
      const suffix = text.slice(start + value.length)
      return !suffix || /^[\s，。；、！？,;!?)]/u.test(suffix)
    })
    if (!mention) continue
    appendText(nodes, text.slice(offset, start))
    nodes.push(schema.nodes.file_reference.create({ ...known.get(mention), mention }))
    offset = start + mention.length
  }
  appendText(nodes, text.slice(offset))
  return schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, nodes))
}

export function exportText(node) {
  return node.textBetween(0, node.content.size ?? node.size, '', leaf => leaf.type.name === 'file_reference' ? leaf.attrs.mention : leaf.attrs.eol ?? '')
}
