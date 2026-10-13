import { createElement as h, Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MenuSurface, ReferenceIconRegular, IconChevronRightOutlineRegular, useAnchoredMaxHeight } from '@deepseek-ai/dsh-client-ui-primitives'

/** Match Desktop's Trigger menu while retaining the temporary editor's own state. */
export function ReferenceMenuView({ menu, t }) {
  const { kind, status, active, results, crumbs, listId, optionId } = menu
  const surface = useRef(null), viewport = useRef(null)
  const [overflow, setOverflow] = useState(false)
  const maxHeight = useAnchoredMaxHeight(surface, 400, menu, 84)
  const updateOverflow = () => {
    const node = viewport.current
    setOverflow(!!node && node.scrollTop + node.clientHeight < node.scrollHeight - 1)
  }
  useLayoutEffect(() => {
    surface.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' })
    updateOverflow()
  }, [menu, maxHeight])
  const dismiss = useRef(menu.onDismiss)
  dismiss.current = menu.onDismiss
  useEffect(() => {
    const document = menu.element.ownerDocument
    const outside = event => {
      if (!menu.element.closest('.dsh-resend-editor-surface')?.contains(event.target)) dismiss.current(false)
    }
    document.addEventListener('pointerdown', outside, true)
    return () => document.removeEventListener('pointerdown', outside, true)
  }, [menu.element])
  const pointer = action => event => { event.preventDefault(); event.stopPropagation(); action() }
  const pickEvents = action => ({ onMouseDown: pointer(action), onClick: pointer(action) })
  const list = []
  list.push(h('div', { key: 'title', role: 'presentation', className: kind === 'skill' ? 'dsh-resend-menu-title' : 'dsh-resend-menu-section-title' }, t(kind === 'skill' ? 'row.skillGroup' : 'row.fileGroup')))
  if (status === 'Loading') list.push(h('div', { key: 'loading', role: 'status', 'aria-label': t('row.' + kind + status) },
    [32, 48].map(width => h('div', { key: width, className: 'dsh-resend-menu-skeleton-row' },
      h('span', { className: 'dsh-resend-menu-skeleton', style: { width: width + '%' } })))))
  else if (status !== 'Ready') list.push(h('div', { key: 'status', className: 'dsh-resend-menu-status', role: 'status', 'aria-label': t('row.' + kind + status) }, [
    h('span', { key: 'text' }, t('row.' + kind + status)),
    h('button', { key: 'close', type: 'button', ...pickEvents(menu.onDismiss) }, t('row.' + kind + 'Close')),
  ]))
  results.forEach((candidate, index) => {
    const directory = candidate.kind === 'directory'
    const path = kind === 'file' ? candidate.path.replaceAll('\\', '/').replace(/\/$/u, '') : ''
    const slash = path.lastIndexOf('/')
    const name = kind === 'skill' ? candidate.name : path.slice(slash + 1) + (directory ? '/' : '')
    const description = kind === 'skill'
      ? ((candidate.modelInvocable === false || candidate.invocation?.modelInvocable === false) ? t('row.skillUserOnly') + ' · ' : '') + (candidate.description ?? '')
      : crumbs.length === 0 && slash >= 0 ? path.slice(0, slash) : ''
    const label = t(kind === 'skill' ? 'row.skillSelect' : directory ? 'row.fileSelectDirectory' : 'row.fileSelect') + ' ' + (kind === 'skill' ? '/' + candidate.name : candidate.path)
    list.push(h('button', { key: optionId(index), id: optionId(index), type: 'button', role: 'option',
      className: 'dsh-resend-menu-item', 'aria-label': label, 'aria-selected': index === active,
      title: kind === 'file' ? candidate.path : '/' + candidate.name,
      ...pickEvents(() => menu.onPick(index)), onMouseMove: () => menu.onHover(index),
    }, [
      kind === 'file' && h('span', { key: 'icon', className: 'dsh-resend-menu-icon', 'aria-hidden': true }, h(ReferenceIconRegular, { kind: directory ? 'folder' : 'file', size: 14 })),
      h('span', { key: 'name', className: 'dsh-resend-menu-name' }, name),
      description && h('span', { key: 'description', className: 'dsh-resend-menu-description' }, description),
      directory && h('span', { key: 'trailing', className: 'dsh-resend-menu-trailing' }, [
        h('span', { key: 'hint', className: 'dsh-resend-menu-drill-hint', 'aria-hidden': true }, t('row.fileDrill')),
        h('kbd', { key: 'key', className: 'dsh-resend-menu-drill-key', 'aria-hidden': true }, 'Tab'),
        h('span', { key: 'drill', role: 'button', 'aria-label': t('row.fileDrill') + ' ' + candidate.path,
          className: 'dsh-resend-menu-drill', ...pickEvents(() => menu.onDrill(index)) }, h(IconChevronRightOutlineRegular, { size: 12 })),
      ]),
    ]))
  })
  return createPortal(h(MenuSurface, { ref: surface, className: 'dsh-resend-menu-surface', style: { maxHeight },
    'data-trigger-menu': '', 'data-overflow-below': overflow || undefined,
  }, [
    crumbs.length > 0 && h('nav', { key: 'crumbs', className: 'dsh-resend-menu-crumbs', 'aria-label': t('row.fileNavigation') },
      crumbs.map((crumb, index) => h(Fragment, { key: index },
        index > 0 && h('span', { className: 'dsh-resend-menu-crumb-separator', 'aria-hidden': true }, h(IconChevronRightOutlineRegular, { size: 12 })),
        h('button', { type: 'button', className: 'dsh-resend-menu-crumb', disabled: index === crumbs.length - 1,
          'aria-current': index === crumbs.length - 1 ? 'location' : undefined,
          'aria-label': index === crumbs.length - 2 ? t('row.fileParent') : crumb.label,
          ...pickEvents(() => menu.onCrumb(index)),
        }, crumb.label)))),
    h('div', { key: 'list', ref: viewport, id: listId, className: 'dsh-resend-menu-viewport', role: 'listbox',
      'aria-label': t('row.' + kind + 'Candidates'), 'aria-activedescendant': results[active] ? optionId(active) : undefined,
      onScroll: updateOverflow,
    }, list),
  ]), menu.element)
}
