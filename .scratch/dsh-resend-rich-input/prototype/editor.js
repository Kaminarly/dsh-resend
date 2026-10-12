import { Fragment, Slice } from 'prosemirror-model'
import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { history, undo, redo, closeHistory } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { schema, createDocument, exportText, finalMention, drillMention } from './text.js'

export function createEditor(element, { text = '', candidates = [], onChange = () => {}, onReceive = () => {} } = {}) {
  let view
  const receive = () => onReceive(exportText(view.state.doc))
  const lineBreak = (state, dispatch) => {
    dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView())
    return true
  }
  const state = EditorState.create({
    doc: createDocument(text, candidates),
    plugins: [history(), keymap({ 'Mod-z': undo, 'Mod-Shift-z': redo, 'Mod-y': redo,
      'Shift-Enter': lineBreak, Enter: () => { receive(); return true } }), keymap(baseKeymap)],
  })
  function syncClipboardSelection(view) {
    // Native arrow-key selection can reach copy/cut before selectionchange.
    // Synchronize using public DOM-position APIs before the clipboard handler.
    const selection = view.dom.ownerDocument.getSelection()
    if (!selection || selection.isCollapsed || !view.dom.contains(selection.anchorNode) || !view.dom.contains(selection.focusNode)) return false
    const anchor = view.posAtDOM(selection.anchorNode, selection.anchorOffset)
    const head = view.posAtDOM(selection.focusNode, selection.focusOffset)
    if (anchor !== view.state.selection.anchor || head !== view.state.selection.head) {
      view.dispatch(view.state.tr.setSelection(TextSelection.between(view.state.doc.resolve(anchor), view.state.doc.resolve(head))))
    }
    return false
  }
  view = new EditorView(element, {
    state,
    attributes: { role: 'textbox', 'aria-label': '独立临时编辑器', 'aria-multiline': 'true' },
    handleDOMEvents: { copy: syncClipboardSelection, cut: syncClipboardSelection },
    dispatchTransaction(transaction) {
      view.updateState(view.state.apply(transaction))
      onChange(exportText(view.state.doc), view.state.doc.toJSON())
    },
    handleKeyDown(_view, event) {
      // Let the browser confirm composition; this event must never send text.
      return event.isComposing || event.keyCode === 229 || view.composing
    },
    clipboardTextSerializer: slice => exportText(slice.content),
    handlePaste(_view, event) {
      const clipboard = event.clipboardData
      if (!clipboard || !Array.from(clipboard.types).includes('text/plain')) return false
      const content = createDocument(clipboard.getData('text/plain'), candidates).firstChild.content
      view.dispatch(closeHistory(view.state.tr.replaceSelection(new Slice(content, 0, 0))).scrollIntoView())
      return true
    },
    nodeViews: {
      file_reference(node, _view, getPos) {
        const dom = document.createElement('span')
        dom.className = 'file-reference'
        dom.contentEditable = 'false'
        dom.title = node.attrs.path
        dom.dataset.path = node.attrs.path
        const label = document.createElement('span')
        label.textContent = node.attrs.path
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.textContent = '×'
        remove.setAttribute('aria-label', '删除引用 ' + node.attrs.path)
        remove.addEventListener('mousedown', event => event.preventDefault())
        remove.addEventListener('click', () => {
          const position = getPos()
          if (typeof position !== 'number') return
          view.dispatch(closeHistory(view.state.tr.delete(position, position + node.nodeSize)).scrollIntoView())
          view.focus()
        })
        dom.append(label, remove)
        return { dom, stopEvent: event => remove.contains(event.target), ignoreMutation: mutation => mutation.type !== 'selection' }
      },
    },
  })

  function insertionRange() {
    const { from, to, $from, empty } = view.state.selection
    if (!empty) return { from, to }
    // Atoms count as one editor position, not the length of their printed path.
    const before = $from.parent.textBetween(0, $from.parentOffset, '', () => '\uFFFC')
    const match = /(?:^|\s)(@"[^"\n\r]*|@[^\s"]*)$/u.exec(before)
    return { from: match ? from - match[1].length : from, to }
  }

  function insertCandidate(candidate, drill) {
    const mention = drill ? drillMention(candidate) : finalMention(candidate)
    const { from, to } = insertionRange()
    const content = drill ? schema.text(mention) : Fragment.fromArray([
      schema.nodes.file_reference.create({ ...candidate, mention }), schema.text(' '),
    ])
    view.dispatch(closeHistory(view.state.tr.replaceWith(from, to, content)).scrollIntoView())
    view.focus()
  }

  onChange(exportText(view.state.doc), view.state.doc.toJSON())
  return {
    view, getText: () => exportText(view.state.doc), receive,
    undo: () => undo(view.state, view.dispatch), redo: () => redo(view.state, view.dispatch),
    selectEnd() { view.dispatch(view.state.tr.setSelection(TextSelection.atEnd(view.state.doc))); view.focus() },
    insertReference: candidate => insertCandidate(candidate, false),
    drillDirectory: candidate => insertCandidate(candidate, true),
    destroy: () => view.destroy(),
  }
}
