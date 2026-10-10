import { createElement, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { UIStyles } from './ui.js'

/** A transient dry run, displayed at its rewind point. It contains no file contents. */
export function FileRollbackPreview({ operations, point, t }) {
  const [result, setResult] = useState()
  const [busy, setBusy] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [scope, setScope] = useState('artifacts')
  const scopeName = useId()
  const running = useRef(false)
  const inherited = useSyncExternalStore(operations.subscribe, () => operations.rollbackOutcomeOf?.(point))
  async function run(phase) {
    if (running.current) return
    running.current = true
    setBusy(true)
    try {
      const answer = await operations.rollback({ ...point, scope, phase, ...(phase === 'preview' ? {} : { planId: result?.value?.planId }) })
      setResult(phase === 'cancel' && answer.ok ? undefined : answer)
      setCompleted(phase === 'execute' && answer.ok)
    } catch { setResult({ ok: false, error: { code: 'internal' } }) }
    finally { running.current = false; setBusy(false) }
  }
  const answer = result ?? inherited
  const finished = completed || (result === undefined && inherited !== undefined)
  const preview = answer?.ok === true ? answer.value : undefined
  const conversation = preview?.conversation ?? answer?.error?.conversation
  return createElement('section', { className: 'dsh-resend-rollback', 'aria-label': t('files.preview'), 'aria-busy': busy }, [
    createElement(UIStyles, { key: 'ui' }),
    createElement('fieldset', { key: 'scope', disabled: busy }, [
      createElement('legend', { key: 'label' }, t('rollback.scope')),
      createElement('div', { key: 'choices', className: 'dsh-resend-rollback-scopes' }, ['conversation', 'artifacts', 'both'].map((value) => createElement('label', { key: value, className: 'dsh-resend-rollback-scope' }, [
        createElement('input', { key: 'input', type: 'radio', name: scopeName, value, checked: scope === value, onChange: () => {
          setScope(value); setResult(undefined); setCompleted(false)
        } }), t(`rollback.scope.${value}`),
      ]))),
    ]),
    createElement(Button, { key: 'preview', type: 'button', variant: 'outline', size: 'sm', disabled: busy, onClick: () => { setCompleted(false); void run('preview') } }, t('files.preview')),
    conversation && createElement('p', { key: 'conversation' }, String(t(`rollback.conversation.${conversation.action}`)).replace('{count}', String(conversation.count))),
    preview && !conversation && createElement('p', { key: 'conversation-unchanged' }, t('rollback.conversation.notSelected')),
    answer?.ok === false && createElement('p', { key: 'error', role: 'alert' }, t(`files.error.${answer.error.code}`)),
    answer?.ok === false && answer.error.files && createElement('ul', { key: 'partial' }, answer.error.files.map((file) => createElement('li', { key: file.path },
      `${file.path} — ${t(`files.${file.action}`)}${file.reason === undefined ? '' : `：${t(`files.reason.${file.reason}`)}`}`))),
    preview && createElement('div', { key: 'plan', 'aria-live': 'polite' }, [
      preview.scope && createElement('p', { key: 'selected-scope' }, String(t('rollback.selectedScope')).replace('{scope}', t(`rollback.scope.${preview.scope}`))),
      createElement('p', { key: 'heading' }, t(finished ? (preview.scope === 'artifacts' || preview.scope === undefined ? 'files.completed' : 'rollback.completed') : 'files.heading')),
      preview.files.length === 0 && createElement('p', { key: 'empty' }, t(preview.scope === 'conversation' ? 'rollback.files.notSelected' : 'files.empty')),
      finished && !preview.files.some((file) => file.action === 'refuse') && createElement('p', { key: 'no-refusals' }, t('rollback.noRefusals')),
      createElement('ul', { key: 'files' }, preview.files.map((file, index) => createElement('li', { key: `${index}:${file.path}` },
        `${file.path} — ${t(`files.${finished && file.action === 'restore' ? 'restored' : file.action}`)}${file.reason === undefined ? '' : `：${t(`files.reason.${file.reason}`)}`}`))),
      !finished && createElement('div', { key: 'actions', className: 'dsh-resend-rollback-actions' }, [
        createElement(Button, { key: 'cancel', type: 'button', variant: 'ghost', size: 'sm', disabled: busy, onClick: () => { void run('cancel') } }, t('files.cancel')),
        createElement(Button, { key: 'execute', type: 'button', variant: 'primary', size: 'sm', disabled: busy, onClick: () => { void run('execute') } }, t(scope === 'artifacts' ? 'files.execute' : 'rollback.execute')),
      ]),
    ]),
  ])
}
