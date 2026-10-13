/** Durable tool observations; contents remain in the private snapshot store. */
import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import path from 'node:path'
import { digest } from './file-snapshots.js'
import { safePrivatePath } from './private-storage.js'

const ordered = value => Array.isArray(value) ? value.map(ordered)
  : value !== null && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value
const signature = (cwd, name, args) => digest(JSON.stringify([cwd, name, ordered(args)]))

export function createObservationStore(home, snapshots) {
  const target = (sessionId, callId) => safePrivatePath(home, `observations/${digest(JSON.stringify([sessionId, callId]))}.json`)
  return {
    async put(session, exec, observation) {
      const backend = observation.reason === undefined ? await snapshots.backend(session.header.cwd) : 'cas'
      const file = observation.reason === undefined
        ? { path: observation.path, before: await snapshots.put(observation.before, backend), after: await snapshots.put(observation.after, backend) }
        : { path: observation.path, reason: observation.reason }
      const destination = target(session.id, exec.callId)
      const staging = `${destination}.${randomUUID()}.pending`
      let handle
      try {
        await mkdir(path.dirname(destination), { recursive: true })
        safePrivatePath(home, path.relative(home, staging))
        handle = await open(staging, 'wx', 0o600)
        await handle.writeFile(JSON.stringify({ kind: 'file-observation', version: 1, sessionId: session.id,
          callId: exec.callId, signature: signature(session.header.cwd, exec.name, exec.arguments), files: [file] }))
        await handle.sync()
        await handle.close(); handle = undefined
        safePrivatePath(home, path.relative(home, destination))
        await rename(staging, destination)
      } finally {
        await handle?.close()
        await unlink(staging).catch(() => {})
      }
    },
    async get(session, callId, name, args) {
      let record
      try { record = JSON.parse(await readFile(target(session.id, callId), 'utf8')) }
      catch (error) { if (error.code === 'ENOENT') return; throw error }
      if (record.kind !== 'file-observation' || record.version !== 1 || record.sessionId !== session.id || record.callId !== callId ||
          record.signature !== signature(session.header.cwd, name, args) || !Array.isArray(record.files) || record.files.length !== 1 ||
          typeof record.files[0]?.path !== 'string' || (record.files[0].reason !== undefined && typeof record.files[0].reason !== 'string')) {
        throw new Error('invalid file observation')
      }
      const file = record.files[0]
      if (file.reason !== undefined) return { path: file.path, reason: file.reason }
      return { path: file.path, before: await snapshots.get(file.before), after: await snapshots.get(file.after) }
    },
  }
}
