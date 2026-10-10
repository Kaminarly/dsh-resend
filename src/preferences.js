import { useSyncExternalStore } from 'react'

/**
 * The editable preferences. Replaced-message hiding is a fixed policy.
 *
 * A client-side store, no persistence: "槽位缺失时用默认值" — when the host has
 * no `settings.general.item` slot the feature simply operates on the defaults,
 * because the store is what every chat surface reads, and the settings row is
 * the only writer. A set is IMMEDIATE: the snapshot is replaced (never mutated)
 * and the listeners fire in the same call, so every subscribing surface
 * re-renders in the very pass the toggle is clicked — there is no second pass
 * in which the UI still shows the old behaviour.
 */

/** The editable preference fields, in the row's display order. */
export const PREFERENCE_FIELDS = Object.freeze([
  'inlineEditorBeneathMessage',
  'regenerateLastReply',
])

/** The defaults for the remaining preferences: both on. */
const DEFAULTS = Object.freeze({
  inlineEditorBeneathMessage: true,
  regenerateLastReply: true,
})

/**
 * One preferences store.
 *
 * The snapshot is frozen and replaced wholesale on every set, so a surface that
 * caches it by identity is never stale, and a surface that re-reads it in the
 * same render pass sees the new value. `set` validates its field and value
 * loudly — a settings row that wrote a preference the feature does not know
 * would break every subscriber, so the failure is a throw, not a no-op.
 */
export function createPreferences() {
  let listeners = new Set()
  let snapshot = DEFAULTS

  function subscribe(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function getSnapshot() {
    return snapshot
  }

  function set(field, value) {
    if (!PREFERENCE_FIELDS.includes(field)) throw new Error('unknown preference ' + field)
    if (typeof value !== 'boolean') throw new Error('preference ' + field + ' must be a boolean')
    if (snapshot[field] === value) return
    snapshot = Object.freeze({ ...snapshot, [field]: value })
    for (const listener of [...listeners]) listener()
  }

  return Object.freeze({
    fields: PREFERENCE_FIELDS,
    subscribe,
    getSnapshot,
    set,
  })
}

/**
 * Subscribe a component to a preferences store: the current snapshot, and a
 * re-render in the same pass a toggle flips it. Every surface that reads a
 * preference goes through this one hook — the store's own subscribe/getSnapshot
 * pair, nowhere re-typed by a caller.
 */
export function usePreferences(store) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
