/**
 * Minimal ConfigForms boundary for UI tests; persistence is tested with the installed host.
 * `formMode` is the legacy 0.2.0-rc.2 persistence mode the form's snapshot carries
 * ('host' | 'memory'); omitted, the snapshot has no `mode` field at all — the
 * 0.2.1-rc.2 shape, where memory persistence is gone and every form tracks the Host.
 */
export function memoryConfigForms(initial = {}, formMode) {
  let value = initial
  const listeners = new Set()
  let snapshot = { status: 'ready', error: null, view: { writable: true, namespaces: [{ ns: 'dsh-resend', value }] } }
  const mirror = {
    getSnapshot: () => snapshot,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    ensure: async () => {}, load: async () => {},
  }
  const formSnapshot = formMode === undefined ? {} : { mode: formMode }
  return {
    describe: () => mirror,
    get: () => ({
      getSnapshot: () => formSnapshot,
      async set(field, next) {
        value = { ...value, [field]: next }
        snapshot = { ...snapshot, view: { ...snapshot.view, namespaces: [{ ns: 'dsh-resend', value }] } }
        listeners.forEach(fn => fn())
        return true
      },
    }),
  }
}

export function readyPreferences(face, initial) {
  const preferences = face.createPreferences()
  preferences.connect(memoryConfigForms(initial))
  return preferences
}
