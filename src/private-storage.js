/** Cross-process coordination for the plugin's private data, never work files. */
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, linkSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { hostService } from './host.js'
const digest = value => createHash('sha256').update(value).digest('hex')

export function privateHome() {
  return path.join(path.resolve(process.env.DSH_HOME?.trim() || path.join(homedir(), '.dsh')), 'plugins', 'dsh-resend')
}

/** Check every ancestor, including DSH_HOME; do not follow junctions or links. */
export function safePrivatePath(home, relative = '') {
  const target = path.resolve(home, relative)
  const inside = path.relative(home, target)
  if (inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) throw new Error('unsafe-storage')
  let current = path.parse(target).root
  for (const part of target.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part)
    try { if (lstatSync(current).isSymbolicLink()) throw new Error('unsafe-storage') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  return target
}

const alive = (pid) => {
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('invalid-coordination')
  try { process.kill(pid, 0); return true } catch (error) { if (error.code === 'ESRCH') return false; return true }
}
const pause = () => new Promise(resolve => setTimeout(resolve, 15))

export function createPrivateStorage(ctx, home = privateHome()) {
  const owner = `${process.pid}-${randomUUID()}`
  const active = new Map()
  const agents = new Map()
  let disposed = false
  const dir = () => {
    const target = safePrivatePath(home, 'coordination')
    mkdirSync(target, { recursive: true })
    safePrivatePath(home, 'coordination')
    return target
  }
  const publish = () => {
    if (disposed) return
    const target = path.join(dir(), `${owner}.json`)
    const staging = safePrivatePath(home, `coordination/${owner}.pending`)
    const sessions = Object.fromEntries([...agents].filter(([, status]) => status !== 'idle').map(([id]) => [id, 'generating']))
    for (const [id, entries] of active) sessions[id] = [...entries.values()][0]
    writeFileSync(staging, JSON.stringify({ pid: process.pid, sessions }), { flag: 'w', mode: 0o600 })
    renameSync(staging, safePrivatePath(home, `coordination/${owner}.json`))
  }
  const updateAgent = (agent, status = agent?.status) => {
    const id = agent?.session?.id ?? agent?.id
    if (typeof id !== 'string') return
    agents.set(id, status)
    publish()
  }
  // Status events are emitted synchronously by the host before its next step.
  ctx.on('agent/created', ({ agent }) => updateAgent(agent))
  ctx.on('agent/status', ({ agent, status }) => updateAgent(agent, status))
  ctx.on('agent/disposed', ({ agent }) => { agents.delete(agent.session?.id ?? agent.id); publish() })
  for (const agent of hostService(ctx, 'agents')?.list?.() ?? []) updateAgent(agent)
  ctx.effect(() => () => {
    disposed = true
    // Keep an active marker until in-flight operations settle, even on unload.
    if (active.size === 0) {
      try { unlinkSync(safePrivatePath(home, `coordination/${owner}.json`)) } catch {}
    }
  })

  async function exclusive(task, name = 'storage.lock') {
    const lock = path.join(dir(), name)
    const recovery = safePrivatePath(home, `coordination/${name}.recovery`)
    // Publish an already complete owner atomically; a crash cannot leave an
    // empty lock directory between mkdir and writing its owner any more.
    const candidate = safePrivatePath(home, `coordination/${name}.${randomUUID()}.pending`)
    writeFileSync(candidate, JSON.stringify({ pid: process.pid, owner }), { flag: 'wx', mode: 0o600 })
    const readOwner = () => {
      const legacy = lstatSync(lock).isDirectory()
      try {
        const saved = JSON.parse(readFileSync(safePrivatePath(home, `coordination/${name}${legacy ? '/owner.json' : ''}`), 'utf8'))
        if (!Number.isSafeInteger(saved?.pid) || saved.pid <= 0 || typeof saved?.owner !== 'string') throw new Error('invalid-coordination')
        return { saved, legacy }
      } catch (error) {
        if (error instanceof SyntaxError || error.code === 'ENOENT' || error.message === 'invalid-coordination') throw new Error('storage-recovery-required')
        throw error
      }
    }
    const started = Date.now()
    try {
      while (true) {
        safePrivatePath(home, `coordination/${name}`)
        if (existsSync(recovery)) {
          if (lstatSync(recovery).isDirectory()) throw new Error('storage-recovery-required')
          let saved
          try { saved = JSON.parse(readFileSync(recovery, 'utf8')) }
          catch (error) { if (error.code === 'ENOENT') continue; throw new Error('storage-recovery-required') }
          if (!Number.isSafeInteger(saved?.pid) || saved.pid <= 0 || !alive(saved.pid)) throw new Error('storage-recovery-required')
        }
        if (!existsSync(recovery)) {
          try { linkSync(candidate, lock); break }
          catch (error) {
            if (error.code !== 'EEXIST') throw error
            // A dead process cannot still be saving a snapshot. One recovery
            // owner prevents contenders from removing a newly acquired lock.
            try {
              linkSync(candidate, recovery)
              try {
                const { saved, legacy } = readOwner()
                if (!alive(saved.pid)) {
                  if (legacy) { unlinkSync(path.join(lock, 'owner.json')); rmdirSync(lock) }
                  else unlinkSync(lock)
                }
              } finally { unlinkSync(recovery) }
            } catch (error) { if (!(error instanceof SyntaxError) && !['ENOENT', 'EEXIST'].includes(error.code)) throw error }
          }
        }
        if (Date.now() - started > 10_000) throw new Error('storage-busy')
        await pause()
      }
      try { return await task() }
      finally { unlinkSync(safePrivatePath(home, `coordination/${name}`)) }
    } finally { try { unlinkSync(candidate) } catch (error) { if (error.code !== 'ENOENT') throw error } }
  }

  async function activity(sessionId, reason, task) {
      if (disposed) throw new Error('storage-disposed')
      const token = randomUUID()
      const entries = active.get(sessionId) ?? new Map()
      entries.set(token, reason); active.set(sessionId, entries); publish()
      try { return await task() }
      finally {
        entries.delete(token)
        if (entries.size === 0) active.delete(sessionId)
        const agent = hostService(ctx, 'agents')?.get(sessionId)
        if (agent) agents.set(sessionId, agent.status)
        if (!disposed) publish()
        else if (active.size === 0) { try { unlinkSync(safePrivatePath(home, `coordination/${owner}.json`)) } catch {} }
      }
  }
  return {
    home, exclusive, activity,
    // Publish before the barrier. Cleanup either observes and skips this
    // session, or finishes and invalidates it before the operation can read.
    // A long file restore never blocks cleanup of unrelated conversations.
    operation: (sessionId, reason, task) => activity(sessionId, reason, () => exclusive(async () => {
      await exclusive(() => {})
      return task()
    }, `session-${digest(sessionId)}.lock`)),
    busy(sessionId) {
      try {
        const local = hostService(ctx, 'agents')?.get(sessionId)
        if (local && local.status !== 'idle') return 'generating'
        for (const name of readdirSync(dir())) {
          if (!/^\d+-[a-f0-9-]+\.json$/.test(name)) continue
          let entry
          try { entry = JSON.parse(readFileSync(safePrivatePath(home, `coordination/${name}`), 'utf8')) }
          catch (error) { if (error.code === 'ENOENT') continue; throw error }
          if (alive(entry.pid) && entry.sessions[sessionId]) return entry.sessions[sessionId]
        }
      } catch { return 'coordination-unavailable' }
    },
    generation(sessionId) {
      try { return readFileSync(safePrivatePath(home, `generations/${digest(sessionId)}`), 'utf8') }
      catch (error) { if (error.code === 'ENOENT') return ''; throw error }
    },
    invalidate(sessionId) {
      const directory = safePrivatePath(home, 'generations')
      mkdirSync(directory, { recursive: true })
      const target = safePrivatePath(home, `generations/${digest(sessionId)}`)
      const staging = `${target}.${randomUUID()}.pending`
      writeFileSync(staging, randomUUID(), { flag: 'wx', mode: 0o600 })
      renameSync(staging, target)
    },
  }
}
