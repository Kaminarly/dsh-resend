import { Slice } from 'prosemirror-model'
import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { history, undo, redo, closeHistory } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { schema, createDocument, exportText, referenceTokens } from './reference-text.js'
import { createReferenceMenu } from './reference-menu.js'
import { skillTokens, skillName, skillCatalog } from './skill-text.js'

/** One independent editor; the saved EditorState retains selection and undo on reopen. */
export function createTemporaryEditor(element, options) {
  let view, menu, destroyed = false, frozen = options.disabled === true, request, skillRequest
  let candidates = options.draft?.candidates ?? []
  let availableSkills = new Map()
  let label = options.label, removeLabel = options.removeLabel
  const changed = () => options.onChange({ state: view.state, text: exportText(view.state.doc), candidates })
  function previewSkillAt(position, event) {
    if (frozen || destroyed || event.detail > 1 || event.button !== 0) return false
    const selection = element.ownerDocument.getSelection()
    if (selection && !selection.isCollapsed) return false
    const resolved = view.state.doc.resolve(position ?? view.state.selection.head)
    if (!resolved.parent.isTextblock) return false
    const before = resolved.parent.textBetween(0, resolved.parentOffset, '', () => '\ufffc')
    const after = resolved.parent.textBetween(resolved.parentOffset, resolved.parent.content.size, '', () => '\ufffc')
    const text = before + after
    for (const match of text.matchAll(/(?:^|\s)\/([a-z0-9]+(?:-[a-z0-9]+)*)(?=\s|$)/gu)) {
      const start = match.index + match[0].length - match[1].length - 1
      const end = start + match[1].length + 1
      if (resolved.parentOffset < start || resolved.parentOffset > end) continue
      const name = match[1]
      if (!availableSkills.has(name)) return false
      void preview('skill', name)
      return true
    }
    return false
  }
  const lineBreak = (state, dispatch) => {
    if (!frozen) dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView())
    return true
  }
  const plugins = [history(), keymap({ 'Mod-z': undo, 'Mod-Shift-z': redo, 'Mod-y': redo,
    'Shift-Enter': lineBreak }), keymap(baseKeymap)]
  const state = options.draft?.state?.reconfigure({ plugins }) ?? EditorState.create({
    doc: createDocument(options.text, candidates), plugins,
  })
  function syncClipboardSelection(view, includeCaret = false) {
    const selection = view.dom.ownerDocument.getSelection()
    if (!selection || !includeCaret && selection.isCollapsed || !view.dom.contains(selection.anchorNode) || !view.dom.contains(selection.focusNode)) return false
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
      click: (_view, event) => {
        const reference = event.target?.closest?.('[data-path]')
        if (reference) return false
        return previewSkillAt(view.state.selection.head, event)
      },
      // Skip editor keymaps during IME confirmation without preventing browser composition.
      keydown: (_view, event) => event.isComposing || event.keyCode === 229 || view.composing,
      compositionstart: () => { menu?.composing(); return false },
      compositionend: () => { queueMicrotask(() => { if (!destroyed) void menu?.refresh() }); return false },
    },
    dispatchTransaction(transaction) {
      if (destroyed || frozen && transaction.docChanged) return
      if (transaction.docChanged || transaction.selectionSet) request?.abort()
      if (transaction.docChanged) skillRequest?.abort()
      const previous = view.state
      view.updateState(view.state.apply(transaction))
      changed()
      if (transaction.getMeta('restoreReferences')) void menu?.refreshAfterRestoration(previous)
      else void menu?.refresh()
      if (transaction.docChanged) void checkSkills()
    },
    handleKeyDown(_view, event) {
      if (!frozen && menu?.handleKey(event)) return true
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
        dom.addEventListener('click', event => {
          if (frozen || destroyed || event.detail > 1 || event.target === remove || remove.contains(event.target)) return
          const selection = element.ownerDocument.getSelection()
          const selectedInsideChip = selection && !selection.isCollapsed && dom.contains(selection.anchorNode) && dom.contains(selection.focusNode)
          if (selection && !selection.isCollapsed && !selectedInsideChip) return
          void preview('file', node.attrs.path)
        })
        return { dom, stopEvent: event => remove.contains(event.target), ignoreMutation: mutation => mutation.type !== 'selection' }
      },
    },
  })

  async function preview(kind, value) {
    if (frozen || destroyed) return
    const callback = kind === 'file' ? options.openFile : options.openSkill
    if (typeof callback !== 'function') {
      options.onPreviewNotice?.({ status: 'Unavailable', kind, value })
      return
    }
    try {
      const result = await callback(value)
      if (result === false) options.onPreviewNotice?.({ status: 'Unavailable', kind, value })
      else options.onPreviewNotice?.(undefined)
    } catch {
      options.onPreviewNotice?.({ status: 'Failed', kind, value })
    }
  }

  menu = createReferenceMenu(element, { getView: () => view, lookup: options.lookup, lookupSkills: options.lookupSkills,
    disabled: () => frozen, translate: options.translate,
    syncSelection: () => syncClipboardSelection(view, true),
    onCandidate: candidate => { candidates = [...candidates, candidate] },
  })

  async function checkSkills() {
    skillRequest?.abort()
    if (destroyed || frozen) return
    availableSkills = new Map()
    const tokens = skillTokens(exportText(view.state.doc))
    const invalid = tokens.filter(name => !skillName.test(name))
    const names = tokens.filter(name => skillName.test(name))
    if (!names.length) { options.onSkillNotice?.(invalid.length ? { status: 'Invalid', names: invalid } : undefined); return }
    const controller = new element.ownerDocument.defaultView.AbortController()
    skillRequest = controller
    options.onSkillNotice?.({ status: 'Checking', names: [] })
    let result
    try { result = await options.lookupSkills(controller.signal) } catch { result = undefined }
    if (destroyed || frozen || controller.signal.aborted || skillRequest !== controller) return
    const catalog = skillCatalog(result)
    if (!catalog) {
      availableSkills = new Map()
      options.onSkillNotice?.({ status: result?.unavailable ? 'Unavailable' : 'Failed', names: [] })
      return
    }
    availableSkills = new Map(catalog.map(skill => [skill.name, skill]))
    const missing = names.filter(name => !catalog.some(skill => skill.name === name))
    const notices = []
    if (missing.length) notices.push({ status: 'Missing', names: missing })
    if (invalid.length) notices.push({ status: 'Invalid', names: invalid })
    options.onSkillNotice?.(notices.length ? notices : undefined)
  }

  async function restoreReferences() {
    request?.abort()
    if (destroyed || frozen) return
    const text = exportText(view.state.doc)
    const paths = [...new Set(referenceTokens(text).map(token => token.path))]
    if (!paths.length) { options.onNotice(false); return }
    const controller = new element.ownerDocument.defaultView.AbortController()
    request = controller
    const initial = view.state
    // A trailing slash asks the host to list children. Query the directory itself instead.
    const results = await Promise.allSettled(paths.map(path => options.lookup(path.replace(/\/$/u, ''), controller.signal)))
    if (destroyed || frozen || controller.signal.aborted || request !== controller || view.state !== initial) return
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
    if (transaction.docChanged) view.dispatch(transaction.setMeta('addToHistory', false).setMeta('restoreReferences', true))
    else changed()
    options.onNotice(unavailable)
  }

  if (!options.draft?.state) view.dispatch(view.state.tr.setSelection(TextSelection.atEnd(view.state.doc)))
  menu.invalidate()
  view.focus()
  changed()
  void restoreReferences()
  void checkSkills()
  return {
    getText: () => exportText(view.state.doc),
    invalidateQueries() { request?.abort(); skillRequest?.abort(); availableSkills = new Map(); menu.invalidate(); void checkSkills() },
    setLabels(nextLabel, nextRemoveLabel, translate) {
      label = nextLabel
      removeLabel = nextRemoveLabel
      menu.setLabels(translate)
      view.setProps({ attributes: { role: 'textbox', 'aria-label': label, 'aria-multiline': 'true', 'aria-disabled': String(frozen) } })
      view.dom.querySelectorAll('.dsh-resend-file-reference').forEach(chip => {
        chip.querySelector('button').setAttribute('aria-label', removeLabel + ' ' + chip.dataset.path)
      })
    },
    setDisabled(disabled) {
      frozen = disabled
      if (disabled) { request?.abort(); skillRequest?.abort(); menu.close() }
      else void checkSkills()
      view.setProps({ editable: () => !frozen,
        attributes: { role: 'textbox', 'aria-label': label, 'aria-multiline': 'true', 'aria-disabled': String(frozen) } })
      view.dom.querySelectorAll('.dsh-resend-file-reference button').forEach(button => { button.disabled = frozen })
    },
    destroy() { destroyed = true; request?.abort(); skillRequest?.abort(); menu.destroy(); view.destroy() },
  }
}
