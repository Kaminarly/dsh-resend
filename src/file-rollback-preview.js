import { createElement, useState } from 'react'

/** A transient dry run, displayed at its rewind point. It contains no file contents. */
export function FileRollbackPreview({ operations, point, t }) {
  const [result, setResult] = useState()
  const [busy, setBusy] = useState(false)
  const [completed, setCompleted] = useState(false)
  async function run(phase) {
    if (busy) return
    setBusy(true)
    try {
      const answer = await operations.rollback({ ...point, phase, ...(phase === 'preview' ? {} : { planId: result?.value?.planId }) })
      setResult(phase === 'cancel' && answer.ok ? undefined : answer)
      setCompleted(phase === 'execute' && answer.ok)
    } catch { setResult({ ok: false, error: { code: 'internal' } }) }
    finally { setBusy(false) }
  }
  const preview = result?.ok === true ? result.value : undefined
  return createElement('section', { 'aria-label': t('files.preview'), 'aria-busy': busy }, [
    createElement('button', { key: 'preview', type: 'button', disabled: busy, onClick: () => { setCompleted(false); void run('preview') } }, t('files.preview')),
    result?.ok === false && createElement('p', { key: 'error', role: 'alert' }, t(`files.error.${result.error.code}`)),
    result?.ok === false && result.error.files && createElement('ul', { key: 'partial' }, result.error.files.map((file) => createElement('li', { key: file.path },
      `${file.path} — ${t(`files.${file.action}`)}${file.reason === undefined ? '' : `：${t(`files.reason.${file.reason}`)}`}`))),
    preview && createElement('div', { key: 'plan', 'aria-live': 'polite' }, [
      createElement('p', { key: 'heading' }, t(completed ? 'files.completed' : 'files.heading')),
      preview.files.length === 0 && createElement('p', { key: 'empty' }, t('files.empty')),
      createElement('ul', { key: 'files' }, preview.files.map((file, index) => createElement('li', { key: `${index}:${file.path}` },
        `${file.path} — ${t(`files.${completed && file.action === 'restore' ? 'restored' : file.action}`)}${file.reason === undefined ? '' : `：${t(`files.reason.${file.reason}`)}`}`))),
      !completed && createElement('button', { key: 'execute', type: 'button', disabled: busy || !preview.files.some((file) => file.action === 'restore'), onClick: () => { void run('execute') } }, t('files.execute')),
      !completed && createElement('button', { key: 'cancel', type: 'button', disabled: busy, onClick: () => { void run('cancel') } }, t('files.cancel')),
    ]),
  ])
}
