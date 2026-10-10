import { useSyncExternalStore } from 'react'

export const PREFERENCE_FIELDS = Object.freeze([
  'inlineEditorBeneathMessage',
  'regenerateLastReply',
])
const DEFAULTS = Object.freeze({ inlineEditorBeneathMessage: true, regenerateLastReply: true })

/** The host's saved document is authoritative; no browser storage or optimistic values. */
export function createPreferences() {
  const listeners = new Set()
  let snapshot = Object.freeze({ ...DEFAULTS, ready: false, status: 'loading' })
  let connection
  let saving = false
  let saveError = false
  let retryWrite
  const publish = (next) => {
    if (Object.keys(next).every(key => next[key] === snapshot[key])) return
    snapshot = Object.freeze(next)
    for (const listener of [...listeners]) listener()
  }
  function sync() {
    const held = connection?.mirror.getSnapshot()
    const row = held?.view?.namespaces?.find(row => row.ns === 'dsh-resend')
    const known = connection?.form.getSnapshot().mode === 'host' && held?.error == null && row !== undefined && held.status === 'ready'
    const values = { ...DEFAULTS }
    for (const field of PREFERENCE_FIELDS) {
      if (typeof row?.value?.[field] === 'boolean') values[field] = row.value[field]
    }
    const loading = !held || held.status === 'loading' || held.status === 'idle' && held.error == null
    publish({ ...(known && !saving ? values : snapshot), ready: known,
      status: saving ? 'saving' : !known ? loading ? 'loading' : 'read-error' : saveError ? 'save-error' : 'ready' })
  }
  function connect(forms) {
    if (connection) throw new Error('preferences already connected')
    const current = { mirror: forms.describe(), form: forms.get('dsh-resend') }
    connection = current
    const unsubscribe = current.mirror.subscribe(sync)
    sync()
    // The provider refreshes this mirror on document-updated and connection/reset.
    void Promise.resolve(current.mirror.ensure()).catch(() => {
      if (connection === current) publish({ ...snapshot, ready: false, status: 'read-error' })
    })
    return () => {
      unsubscribe()
      if (connection !== current) return
      connection = undefined
      publish({ ...snapshot, ready: false, status: 'loading' })
    }
  }
  function set(field, value) {
    if (!PREFERENCE_FIELDS.includes(field)) throw new Error('unknown preference ' + field)
    if (typeof value !== 'boolean') throw new Error('preference ' + field + ' must be a boolean')
    if (saving || !snapshot.ready || !connection) return Promise.resolve(false)
    if (snapshot[field] === value) {
      saveError = false
      retryWrite = undefined
      sync()
      return Promise.resolve(true)
    }
    return save(field, value)
  }
  async function save(field, value) {
    const current = connection
    saving = true
    saveError = false
    retryWrite = { field, value }
    sync()
    let accepted = false
    try { accepted = await current.form.set(field, value) === true } catch {
      // A rejected wire call may still have committed. Always re-read below.
    }
    // Even a successful response can arrive after another page's newer write.
    // The native mirror folds write replies without a revision fence, so read
    // the current Host document before publishing any settlement.
    if (connection === current) {
      publish({ ...snapshot, ready: false, status: 'saving' })
      try { await current.mirror.load() } catch {
        saving = false
        saveError = true
        publish({ ...snapshot, ready: false, status: 'read-error' })
        return false
      }
    }
    saving = false
    if (connection !== current) return accepted
    saveError = !accepted
    if (accepted) retryWrite = undefined
    sync()
    return accepted
  }
  async function retry() {
    if (saving || !connection) return false
    if (snapshot.ready && saveError && retryWrite) return set(retryWrite.field, retryWrite.value)
    const current = connection
    publish({ ...snapshot, ready: false, status: 'loading' })
    try { await current.mirror.load() } catch {
      if (connection === current) publish({ ...snapshot, ready: false, status: 'read-error' })
      return false
    }
    if (connection === current) sync()
    return snapshot.ready
  }
  return Object.freeze({
    fields: PREFERENCE_FIELDS,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => snapshot,
    connect, set, retry,
  })
}
export function usePreferences(store) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
