/** Minimal ConfigForms boundary for UI tests; persistence is tested with the installed host. */
export function memoryConfigForms(initial = {}) {
  let value = initial
  const listeners = new Set()
  let snapshot = { status: 'ready', error: null, view: { writable: true, namespaces: [{ ns: 'dsh-resend', value }] } }
  const mirror = {
    getSnapshot: () => snapshot,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    ensure: async () => {}, load: async () => {},
  }
  return {
    describe: () => mirror,
    get: () => ({
      getSnapshot: () => ({ mode: 'host' }),
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
