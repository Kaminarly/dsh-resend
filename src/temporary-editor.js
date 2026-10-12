import { Slice } from 'prosemirror-model'
import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { history, undo, redo, closeHistory } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { schema, createDocument, exportText, referenceTokens } from './reference-text.js'

/** One independent editor; the saved EditorState retains selection and undo on reopen. */
export function createTemporaryEditor(element, options) {
  let view, destroyed = false, frozen = options.disabled === true, request
  let candidates = options.draft?.candidates ?? []
  let label = options.label, removeLabel = options.removeLabel
  const changed = () => options.onChange({ state: view.state, text: exportText(view.state.doc), candidates })
  const lineBreak = (state, dispatch) => {
    if (!frozen) dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView())
    return true
  }
  const plugins = [history(), keymap({ 'Mod-z': undo, 'Mod-Shift-z': redo, 'Mod-y': redo,
    'Shift-Enter': lineBreak }), keymap(baseKeymap)]
  const state = options.draft?.state?.reconfigure({ plugins }) ?? EditorState.create({
    doc: createDocument(options.text, candidates), plugins,
  })
  function syncClipboardSelection(view) {
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
    editable: () => !frozen,
    attributes: { role: 'textbox', 'aria-label': options.label, 'aria-multiline': 'true', 'aria-disabled': String(frozen) },
    handleDOMEvents: {
      copy: syncClipboardSelection, cut: syncClipboardSelection,
      // Skip editor keymaps during IME confirmation without preventing browser composition.
      keydown: (_view, event) => event.isComposing || event.keyCode === 229 || view.composing,
    },
    dispatchTransaction(transaction) {
      if (destroyed || frozen && transaction.docChanged) return
      view.updateState(view.state.apply(transaction))
      changed()
    },
    handleKeyDown(_view, event) {
      if (event.key === 'Escape' || event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        if (!frozen) options.onKeyDown(event)
        return true
      }
      return frozen
    },
    clipboardTextSerializer: slice => exportText(slice.content),
    handlePaste(_view, event) {
      if (frozen) return true
      const clipboard = event.clipboardData
      if (!clipboard || !Array.from(clipboard.types).includes('text/plain')) return false
      syncClipboardSelection(view)
      const content = createDocument(clipboard.getData('text/plain'), candidates).firstChild.content
      view.dispatch(closeHistory(view.state.tr.replaceSelection(new Slice(content, 0, 0))).scrollIntoView())
      void restoreReferences()
      return true
    },
    nodeViews: {
      file_reference(node, _view, getPos) {
        const dom = element.ownerDocument.createElement('span')
        dom.className = 'dsh-resend-file-reference'
        dom.contentEditable = 'false'
        dom.title = node.attrs.path
        dom.dataset.path = node.attrs.path
        dom.dataset.mention = node.attrs.mention
        const label = element.ownerDocument.createElement('span')
        label.textContent = node.attrs.path
        const remove = element.ownerDocument.createElement('button')
        remove.type = 'button'
        remove.textContent = '×'
        remove.disabled = frozen
        remove.setAttribute('aria-label', removeLabel + ' ' + node.attrs.path)
        remove.addEventListener('mousedown', event => event.preventDefault())
        remove.addEventListener('click', () => {
          if (frozen || destroyed) return
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

  async function restoreReferences() {
    request?.abort()
    if (destroyed || frozen) return
    const text = exportText(view.state.doc)
    const paths = [...new Set(referenceTokens(text).map(token => token.path))]
    if (!paths.length) { options.onNotice(false); return }
    const controller = new element.ownerDocument.defaultView.AbortController()
    request = controller
    const initial = view.state.doc
    // A trailing slash asks the host to list children. Query the directory itself instead.
    const results = await Promise.allSettled(paths.map(path => options.lookup(path.replace(/\/$/u, ''), controller.signal)))
    if (destroyed || frozen || controller.signal.aborted || request !== controller || view.state.doc !== initial) return
    let unavailable = false
    const confirmed = []
    for (const result of results) {
      if (result.status !== 'fulfilled' || result.value?.ok !== true || !Array.isArray(result.value.value)) { unavailable = true; continue }
      for (const candidate of result.value.value) {
        if (candidate && typeof candidate.path === 'string' && ['file', 'directory'].includes(candidate.kind) &&
          paths.includes(candidate.kind === 'directory' ? candidate.path.replace(/\/$/u, '') + '/' : candidate.path) &&
          !/[\u0000-\u001f\u007f-\u009f"]/u.test(candidate.path)) confirmed.push(candidate)
      }
    }
    candidates = [...candidates, ...confirmed]
    const restored = createDocument(text, candidates)
    // Replace only confirmed text spans, in reverse order; mapping preserves the caret.
    const replacements = []
    let oldPosition = 1
    restored.firstChild.forEach(node => {
      if (node.type === schema.nodes.file_reference) replacements.push({ position: oldPosition, node })
      oldPosition += node.type === schema.nodes.file_reference ? node.attrs.mention.length : node.type === schema.nodes.hard_break ? node.attrs.eol.length : node.nodeSize
    })
    const transaction = view.state.tr
    for (const { position, node } of replacements.reverse()) {
      // Existing atoms already occupy one position. Map textual offsets back to the document.
      let offset = 0, from, to
      view.state.doc.firstChild.forEach((oldNode, pos) => {
        const length = oldNode.type === schema.nodes.file_reference ? oldNode.attrs.mention.length : oldNode.type === schema.nodes.hard_break ? oldNode.attrs.eol.length : oldNode.nodeSize
        if (position - 1 >= offset && position - 1 < offset + length && oldNode.isText) {
          from = pos + 1 + position - 1 - offset
          to = from + node.attrs.mention.length
        }
        offset += length
      })
      if (from !== undefined) transaction.replaceWith(from, to, node)
    }
    if (transaction.docChanged) view.dispatch(transaction.setMeta('addToHistory', false))
    else changed()
    options.onNotice(unavailable)
  }

  if (!options.draft?.state) view.dispatch(view.state.tr.setSelection(TextSelection.atEnd(view.state.doc)))
  view.focus()
  changed()
  void restoreReferences()
  return {
    getText: () => exportText(view.state.doc),
    setLabels(nextLabel, nextRemoveLabel) {
      label = nextLabel
      removeLabel = nextRemoveLabel
      view.setProps({ attributes: { role: 'textbox', 'aria-label': label, 'aria-multiline': 'true', 'aria-disabled': String(frozen) } })
      view.dom.querySelectorAll('.dsh-resend-file-reference').forEach(chip => {
        chip.querySelector('button').setAttribute('aria-label', removeLabel + ' ' + chip.dataset.path)
      })
    },
    setDisabled(disabled) {
      frozen = disabled
      if (disabled) request?.abort()
      view.setProps({ editable: () => !frozen,
        attributes: { role: 'textbox', 'aria-label': label, 'aria-multiline': 'true', 'aria-disabled': String(frozen) } })
      view.dom.querySelectorAll('.dsh-resend-file-reference button').forEach(button => { button.disabled = frozen })
    },
    destroy() { destroyed = true; request?.abort(); view.destroy() },
  }
}
