import { closeHistory } from 'prosemirror-history'
import { schema, finalMention } from './reference-text.js'
import { skillCatalog } from './skill-text.js'
import { rankByName } from '@deepseek-ai/dsh-client-ui-primitives'

let menuId = 0

function triggerAt(state) {
  const { selection } = state
  if (!selection.$from.sameParent(selection.$to) || !selection.$from.parent.isTextblock) return
  // One character per inline position, including atoms and line breaks.
  const leafText = node => node.type === schema.nodes.hard_break ? '\n' : '\ufffc'
  const before = selection.$from.parent.textBetween(0, selection.$from.parentOffset, '', leafText)
  const selected = selection.$from.parent.textBetween(selection.$from.parentOffset, selection.$to.parentOffset, '', leafText)
  const match = /(?:^|\s)(@(?:"([^"\r\n\ufffc]*)|([^\s@"\ufffc]*)))$/u.exec(before + selected)
  if (!match) {
    const skill = /(?:^|\s)(\/([a-z0-9-]*))$/u.exec(before + selected)
    if (!skill) return
    const from = selection.to - skill[1].length
    if (!selection.empty && from !== selection.from) return
    const after = selection.$to.parent.textBetween(selection.$to.parentOffset, selection.$to.parent.content.size, '', leafText)
    const tail = selection.empty ? /^[a-z0-9-]*/u.exec(after)[0] : ''
    // Paths and punctuation are not whitespace-bounded skill gestures.
    if (selection.empty && after.slice(tail.length) && !/^\s/u.test(after.slice(tail.length))) return
    return { from, to: selection.to + tail.length, query: skill[2], kind: 'skill' }
  }
  const query = match[2] ?? match[3]
  const from = selection.to - match[1].length
  if (!selection.empty && from !== selection.from) return
  let to = selection.to
  if (selection.empty) {
    const after = selection.$to.parent.textBetween(selection.$to.parentOffset, selection.$to.parent.content.size, '', leafText)
    const tail = match[2] !== undefined ? /^[^"\r\n\ufffc]*(?:"|$)/u.exec(after)?.[0] : /^[^\s@"\ufffc]*/u.exec(after)?.[0]
    to += tail?.length ?? 0
  }
  return { from, to, query, kind: 'file' }
}

function validCandidates(value) {
  const seen = new Set()
  return value.filter(candidate => {
    if (!candidate || !['file', 'directory'].includes(candidate.kind) || typeof candidate.path !== 'string') return false
    try { finalMention(candidate) } catch { return false }
    const key = candidate.kind + ':' + candidate.path
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** One local menu for files and skills, independent of the host's Composer controller. */
export function createReferenceMenu(element, { getView, lookup, lookupSkills, disabled, translate, onCandidate, syncSelection, onRender }) {
  const document = element.ownerDocument
  const menu = document.createElement('div')
  menu.className = 'dsh-resend-reference-menu'
  menu.id = 'dsh-resend-reference-menu-' + ++menuId
  menu.hidden = true
  element.append(menu)
  let current, request, dismissed, results = [], active = 0, status, destroyed = false, drilled = false
  let t = translate

  function close() {
    request?.abort()
    request = undefined
    current = undefined
    menu.hidden = true
    onRender(undefined)
    const view = getView()
    view.dom.removeAttribute('aria-controls')
    view.dom.removeAttribute('aria-activedescendant')
    view.dom.setAttribute('aria-expanded', 'false')
  }

  function live() {
    return !destroyed && !disabled() && current && getView().state === current.state
  }

  function replaceQuery(query, initial = current) {
    syncSelection()
    if (current !== initial || !live()) return
    const { from, to } = current.trigger
    const text = /\s/u.test(query) ? '@"' + query : '@' + query
    const view = getView()
    view.dispatch(closeHistory(view.state.tr.insertText(text, from, to)).setMeta('referenceDrill', true).scrollIntoView())
    view.focus()
  }

  function choose(candidate, initial = current) {
    syncSelection()
    if (current !== initial || !live() || !results.includes(candidate)) return
    const view = getView(), { from, to } = current.trigger
    if (current.trigger.kind === 'skill') {
      close()
      const transaction = closeHistory(view.state.tr.insertText('/' + candidate.name, from, to))
      const end = from + candidate.name.length + 1
      const following = transaction.doc.textBetween(end, end + 1, '', () => '\n')
      if (!/^\s/u.test(following)) transaction.insertText(' ', end)
      view.dispatch(transaction.scrollIntoView())
      dismissed = view.state
      close()
      view.focus()
      return
    }
    const mention = finalMention(candidate)
    const node = schema.nodes.file_reference.create({ ...candidate, mention })
    onCandidate(candidate)
    close()
    // A separator closes directory/path syntax without taking any following prose.
    const transaction = closeHistory(view.state.tr.replaceWith(from, to, node))
    const following = transaction.doc.textBetween(from + 1, from + 2, '', () => '\n')
    if (!/^\s/u.test(following)) transaction.insertText(' ', from + 1)
    view.dispatch(transaction.scrollIntoView())
    dismissed = view.state
    close()
    view.focus()
  }

  function render() {
    const context = current
    menu.hidden = false
    const view = getView()
    const kind = current.trigger.kind
    view.dom.setAttribute('aria-expanded', 'true')
    const normalized = current.trigger.query.replaceAll('\\', '/')
    const slash = normalized.lastIndexOf('/')
    const crumbs = []
    if (kind === 'file' && drilled && slash >= 0) {
      const segments = normalized.slice(0, slash).split('/').filter(Boolean)
      const root = normalized.startsWith('/') ? '/' : ''
      crumbs.push({ label: t('row.fileRoot'), query: root })
      segments.forEach((label, index) => crumbs.push({ label, query: root + segments.slice(0, index + 1).join('/') + '/' }))
    }
    const listId = menu.id + '-list'
    const optionId = index => menu.id + '-option-' + index
    view.dom.setAttribute('aria-controls', listId)
    if (results[active]) view.dom.setAttribute('aria-activedescendant', optionId(active))
    else view.dom.removeAttribute('aria-activedescendant')
    onRender({ element: menu, kind, query: current.trigger.query, status, active, results, crumbs, listId, optionId,
      onPick: index => { if (current === context) choose(results[index], context) },
      onDrill: index => {
        if (current === context && results[index]?.kind === 'directory') replaceQuery(results[index].path.replace(/\/$/u, '') + '/', context)
      },
      onCrumb: index => { if (current === context && crumbs[index]) replaceQuery(crumbs[index].query, context) },
      onHover: index => {
        if (current !== context || !live() || active === index || !results[index]) return
        active = index; render()
      },
      onDismiss: (focus = true) => { if (current === context) { dismissed = view.state; close(); if (focus) view.focus() } },
    })
  }

  async function refresh(transaction) {
    const view = getView()
    if (destroyed || disabled() || view.composing || dismissed === view.state) { close(); return }
    if (current?.state === view.state) return
    close()
    if (transaction?.docChanged) drilled = transaction.getMeta('referenceDrill') === true
    const trigger = triggerAt(view.state)
    if (!trigger) return
    const state = view.state
    current = { trigger, state }
    results = []; active = 0; status = 'Loading'
    const controller = new document.defaultView.AbortController()
    request = controller
    render()
    try {
      const result = await (trigger.kind === 'skill' ? lookupSkills(controller.signal) : lookup(trigger.query, controller.signal))
      if (!live() || current.state !== state || request !== controller || controller.signal.aborted) return
      const values = trigger.kind === 'skill' ? skillCatalog(result) : result?.ok === true && Array.isArray(result.value) ? validCandidates(result.value) : undefined
      if (!values) status = result?.unavailable ? 'Unavailable' : 'Failed'
      else {
        results = trigger.kind === 'skill' ? rankByName(values, trigger.query) : values
        status = results.length ? 'Ready' : 'Empty'
      }
    } catch {
      if (!live() || current.state !== state || request !== controller || controller.signal.aborted) return
      status = 'Failed'
    }
    render()
  }

  return {
    refresh,
    refreshAfterRestoration(previous) {
      // Restoring atoms maps positions but keeps the user's open/closed intent.
      if (dismissed === previous) dismissed = getView().state
      return refresh()
    },
    composing() { close() },
    invalidate() { dismissed = getView().state; close() },
    setLabels(next) { t = next; if (current) render() },
    handleKey(event) {
      if (!current || menu.hidden) return false
      if (event.key === 'Escape' || event.key === 'Tab' && event.shiftKey) { dismissed = getView().state; close() }
      else if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        if (results.length) { active = (active + (event.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length; render() }
      } else if (['Enter', 'Tab'].includes(event.key) && !event.shiftKey) {
        if (event.key === 'Tab' && results[active]?.kind === 'directory') replaceQuery(results[active].path.replace(/\/$/u, '') + '/')
        else if (results[active]) choose(results[active])
      } else if (event.key === 'ArrowRight' && results[active]?.kind === 'directory') {
        replaceQuery(results[active].path.replace(/\/$/u, '') + '/')
      } else return false
      event.preventDefault()
      return true
    },
    close,
    destroy() { close(); destroyed = true; menu.remove() },
  }
}
