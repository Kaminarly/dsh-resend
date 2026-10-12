import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { digest, createSnapshotStore } from '../src/file-snapshots.js'
import { createPrivateStorage } from '../src/private-storage.js'
import { createStorageCleanup } from '../src/storage-cleanup.js'

const faults = vi.hoisted(() => ({ paths: new Set() }))
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, unlinkSync(target) {
    if (faults.paths.has(path.normalize(target))) throw new Error('simulated deletion failure')
    return actual.unlinkSync(target)
  } }
})
const cleanups = []
afterEach(async () => { faults.paths.clear(); for (const task of cleanups.splice(0).reverse()) await task() })
const marker = id => ({ seq: 0, type: 'user/message', data: { id }, surfaceOp: { op: 'replace' } })

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'resend-cleanup-'))
  cleanups.push(() => rm(directory, { recursive: true, force: true }))
  const home = path.join(directory, 'plugins', 'dsh-resend')
  const sessions = new Map()
  const listeners = new Map()
  const disposers = []
  const agents = new Map()
  const ctx = { on(name, listener) { listeners.set(name, listener) }, effect(task) { disposers.push(task()) },
    get(name) { return name === 'agents' ? { get: id => agents.get(id), list: () => [...agents.values()] }
      : name === 'sessionQuery' ? query : undefined }, root: {} }
  const query = { async listSessions() { return [...sessions.values()].map(session => ({ header: session.header })) },
    async readSession(id) { const session = sessions.get(id); if (session.bad) throw new Error('bad log'); return { events: session.log } } }
  const storage = createPrivateStorage(ctx, home)
  const cleanup = createStorageCleanup(ctx, storage)
  cleanups.push(async () => { for (const dispose of disposers.reverse()) await dispose?.() })
  async function put(relative, value) {
    const target = path.join(home, relative)
    await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, value)
    return target
  }
  async function object(text, backend = 'cas') {
    return createSnapshotStore(home).put(Buffer.from(text), backend)
  }
  async function record(sessionId, refs = [], options = {}) {
    const id = `dsh-resend-edit-${options.id ?? sessionId}`
    const filename = digest(JSON.stringify([sessionId, id])) + '.json'
    const files = refs.map((ref, index) => ({ path: `file-${index}.txt`, before: ref, after: ref }))
    if (!options.orphan) sessions.set(sessionId, { header: { id: sessionId, cwd: `D:/projects/${sessionId}` },
      log: [marker(id), { seq: 1, type: 'session/title', data: { title: `会话 ${sessionId}` } }] })
    await put(`records/${filename}`, options.corrupt ? '{bad' : JSON.stringify(options.modern ? { sessionId, carrierId: id, files } : files))
    if (options.outcome) await put(`outcomes/${filename}`, JSON.stringify({ completed: true }))
    return filename
  }
  async function preview(mode, sessionIds) {
    const result = await cleanup({ phase: 'preview', mode, sessionIds })
    expect(result.ok, JSON.stringify(result)).toBe(true)
    return result.value
  }
  const execute = async (mode, plan) => {
    const result = await cleanup({ phase: 'execute', mode, planId: plan.planId })
    expect(result.ok, JSON.stringify(result)).toBe(true)
    return result.value
  }
  return { home, directory, storage, cleanup, sessions, query, agents, ctx, listeners, put, object, record, preview, execute }
}

it('finds cold legacy conversations and empty manifests, with titles and project paths', async () => {
  const f = await fixture()
  await f.record('cold', [await f.object('contents')])
  await f.record('empty', [], { modern: true })
  const result = await f.cleanup({ phase: 'list', mode: 'sessions' })
  expect(result.value.sessions).toEqual(expect.arrayContaining([
    expect.objectContaining({ sessionId: 'cold', title: '会话 cold', projectPath: 'D:/projects/cold', records: 1, noSnapshots: false }),
    expect.objectContaining({ sessionId: 'empty', records: 1, noSnapshots: true }),
  ]))
  const plan = await f.preview('sessions', ['empty'])
  expect(plan.itemCount).toBe(1)
  expect((await f.execute('sessions', plan)).results[0].status).toBe('cleaned')
  expect((await f.cleanup({ phase: 'list', mode: 'sessions' })).value.sessions.map(s => s.sessionId)).toEqual(['cold'])
})

it('preserves shared contents and completion state of unselected conversations; combined estimates deduplicate contents', async () => {
  const f = await fixture()
  const shared = await f.object('shared')
  const unique = await f.object('unique')
  const first = await f.record('a', [shared, unique], { outcome: true })
  const second = await f.record('b', [shared], { outcome: true })
  const combined = await f.preview('sessions', ['a', 'b'])
  expect(combined.categories.find(c => c.kind === 'objects').count).toBe(2)
  const one = await f.preview('sessions', ['a'])
  expect(one.categories.find(c => c.kind === 'objects').count).toBe(1)
  const before = await readFile(path.join(f.home, 'outcomes', second))
  const result = await f.execute('sessions', one)
  expect(result.releasedBytes).toBe(one.estimatedBytes)
  await expect(readFile(path.join(f.home, 'records', first))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(path.join(f.home, 'objects', shared.slice(4)), 'utf8')).toBe('shared')
  expect(await readFile(path.join(f.home, 'outcomes', second))).toEqual(before)
})

it('only collects previewed residue and orphan data, retaining recognized history and unrelated files', async () => {
  const f = await fixture()
  const kept = await f.object('keep')
  await f.record('kept', [kept], { outcome: true })
  const orphan = await f.record('lost', [await f.object('orphan')], { orphan: true, outcome: true })
  await f.put(`records/${digest('temporary')}.json.00000000-0000-0000-0000-000000000000.pending`, 'staging')
  await f.put('unknown-file', 'not ours to clean')
  await mkdir(path.join(f.directory, 'plugins', 'another-plugin'), { recursive: true })
  const other = path.join(f.directory, 'plugins', 'another-plugin', 'keep')
  await writeFile(other, 'other plugin')
  const plan = await f.preview('residue')
  expect(plan.categories.map(c => c.count)).toEqual([1, 1, 1, 1])
  const later = await f.object('created after preview')
  const result = await f.execute('residue', plan)
  expect(result.releasedBytes).toBe(plan.estimatedBytes)
  await expect(readFile(path.join(f.home, 'records', orphan))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(path.join(f.home, 'objects', kept.slice(4)), 'utf8')).toBe('keep')
  expect(await readFile(path.join(f.home, 'objects', later.slice(4)), 'utf8')).toBe('created after preview')
  expect(await readFile(other, 'utf8')).toBe('other plugin')
  expect(await readFile(path.join(f.home, 'unknown-file'), 'utf8')).toBe('not ours to clean')
})

it('refuses corpus failures and all-log failures instead of declaring everything orphaned', async () => {
  const f = await fixture()
  await f.record('a', [await f.object('safe')])
  f.query.listSessions = async () => { throw new Error('listing failed') }
  expect(await f.cleanup({ phase: 'preview', mode: 'residue' })).toEqual({ ok: false, error: { code: 'scan-failed' } })
  f.query.listSessions = async () => [{ header: { id: 'a' } }]
  f.sessions.get('a').bad = true
  expect(await f.cleanup({ phase: 'preview', mode: 'residue' })).toEqual({ ok: false, error: { code: 'scan-failed' } })
  expect(await readdir(path.join(f.home, 'records'))).toHaveLength(1)
})

it('preserves all content objects when a retained manifest has unreadable dependencies', async () => {
  const f = await fixture()
  await f.record('bad', [], { corrupt: true })
  const object = await f.object('may be referenced')
  const plan = await f.preview('residue')
  expect(plan.protectedObjects).toBe(true)
  expect(plan.itemCount).toBe(0)
  await f.execute('residue', plan)
  expect(await readFile(path.join(f.home, 'objects', object.slice(4)), 'utf8')).toBe('may be referenced')
})

it('skips a generating conversation and protects its shared object while cleaning others', async () => {
  const f = await fixture()
  const ref = await f.object('shared')
  const a = await f.record('a', [ref])
  const b = await f.record('b', [ref])
  const plan = await f.preview('sessions', ['a', 'b'])
  f.agents.set('a', { status: 'running' })
  const result = await f.execute('sessions', plan)
  expect(result.results).toEqual(expect.arrayContaining([
    expect.objectContaining({ sessionId: 'a', status: 'skipped', reason: 'generating' }),
    expect.objectContaining({ sessionId: 'b', status: 'cleaned' }),
  ]))
  expect(await readFile(path.join(f.home, 'records', a))).toBeTruthy()
  await expect(readFile(path.join(f.home, 'records', b))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(path.join(f.home, 'objects', ref.slice(4)), 'utf8')).toBe('shared')
})

it('does not clear a selected conversation whose manifest changed or grew after preview', async () => {
  const f = await fixture()
  const filename = await f.record('a', [await f.object('before')])
  const plan = await f.preview('sessions', ['a'])
  await f.put(`records/${filename}`, '[]')
  const result = await f.execute('sessions', plan)
  expect(result.results[0]).toMatchObject({ status: 'skipped', reason: 'preview-stale' })
  expect(result.releasedBytes).toBe(0)
  expect(await readFile(path.join(f.home, 'records', filename), 'utf8')).toBe('[]')
})

it('does not erase a completion or shared contents if its manifest cannot be deleted, and reports partial failure', async () => {
  const f = await fixture()
  const ref = await f.object('protect after failed unlink')
  const a = await f.record('a', [ref], { outcome: true })
  await f.record('b', [], { outcome: true })
  const plan = await f.preview('sessions', ['a', 'b'])
  faults.paths.add(path.normalize(path.join(f.home, 'records', a)))
  const result = await f.execute('sessions', plan)
  expect(result.failures).toEqual([{ item: `records/${a}`, reason: 'delete-failed' }])
  expect(result.results).toEqual(expect.arrayContaining([
    expect.objectContaining({ sessionId: 'a', status: 'failed' }), expect.objectContaining({ sessionId: 'b', status: 'cleaned' }),
  ]))
  expect(result.releasedBytes).toBeGreaterThan(0)
  expect(result.releasedBytes).toBeLessThan(plan.estimatedBytes)
  expect(await readFile(path.join(f.home, 'objects', ref.slice(4)), 'utf8')).toBe('protect after failed unlink')
  expect(await readFile(path.join(f.home, 'outcomes', a))).toBeTruthy()
  faults.paths.clear()
  expect((await f.execute('sessions', await f.preview('sessions', ['a']))).failures).toEqual([])
})

it('reports a content deletion failure against the selected conversation and leaves residue retryable', async () => {
  const f = await fixture()
  const ref = await f.object('content fails to delete')
  await f.record('a', [ref], { outcome: true })
  const plan = await f.preview('sessions', ['a'])
  faults.paths.add(path.normalize(path.join(f.home, 'objects', ref.slice(4))))
  const result = await f.execute('sessions', plan)
  expect(result.results[0].status).toBe('failed')
  expect(result.failures).toHaveLength(1)
  expect(result.releasedBytes).toBeLessThan(plan.estimatedBytes)
  faults.paths.clear()
  const retry = await f.preview('residue')
  expect(retry.categories.find(category => category.kind === 'objects').count).toBe(1)
  expect((await f.execute('residue', retry)).failures).toEqual([])
})

it('skips sessions safely when other-window coordination cannot be read', async () => {
  const f = await fixture()
  const record = await f.record('a', [])
  const plan = await f.preview('sessions', ['a'])
  await f.put('coordination/12345-00000000-0000-0000-0000-000000000000.json', '{broken')
  const result = await f.execute('sessions', plan)
  expect(result.results[0]).toMatchObject({ status: 'skipped', reason: 'coordination-unavailable' })
  expect(result.releasedBytes).toBe(0)
  expect(await readFile(path.join(f.home, 'records', record))).toBeTruthy()
})

it('collects unreferenced private Git loose objects while retaining shared Git contents', async () => {
  const f = await fixture()
  const cwd = path.join(f.directory, 'workspace')
  await mkdir(cwd)
  execFileSync('git', ['init', '-q', cwd])
  const snapshots = createSnapshotStore(f.home)
  expect(await snapshots.backend(cwd)).toBe('git')
  const kept = await snapshots.put(Buffer.from('shared git'), 'git')
  const unused = await snapshots.put(Buffer.from('unused git'), 'git')
  await f.record('a', [kept])
  const plan = await f.preview('residue')
  expect(plan.categories.find(c => c.kind === 'objects').count).toBe(1)
  expect((await f.execute('residue', plan)).releasedBytes).toBe(plan.estimatedBytes)
  expect((await snapshots.get(kept)).toString()).toBe('shared git')
  await expect(snapshots.get(unused)).rejects.toThrow()
  expect(execFileSync('git', ['status', '--porcelain'], { cwd }).toString()).toBe('')
})

it('refuses linked storage directories and linked files without modifying their external targets', async () => {
  const f = await fixture()
  const external = path.join(f.directory, 'external')
  await mkdir(external)
  await writeFile(path.join(external, digest('protected')), 'outside')
  await mkdir(f.home, { recursive: true })
  await symlink(external, path.join(f.home, 'objects'), process.platform === 'win32' ? 'junction' : 'dir')
  expect(await f.cleanup({ mode: 'residue', phase: 'preview' })).toEqual({ ok: false, error: { code: 'unsafe-storage' } })
  expect(await readFile(path.join(external, digest('protected')), 'utf8')).toBe('outside')
})

it('retains files that become linked after preview and does not accept arbitrary paths', async () => {
  const f = await fixture()
  const object = await f.object('original')
  const plan = await f.preview('residue')
  const external = path.join(f.directory, 'external')
  await mkdir(external)
  await writeFile(path.join(external, object.slice(4)), 'external target')
  await rm(path.join(f.home, 'objects'), { recursive: true })
  await symlink(external, path.join(f.home, 'objects'), process.platform === 'win32' ? 'junction' : 'dir')
  expect(await f.cleanup({ mode: 'residue', phase: 'execute', planId: plan.planId })).toEqual({ ok: false, error: { code: 'unsafe-storage' } })
  expect(await readFile(path.join(external, object.slice(4)), 'utf8')).toBe('external target')
  expect(await f.cleanup({ mode: 'sessions', phase: 'preview', sessionIds: ['../../external'] })).toEqual({ ok: false, error: { code: 'unsafe-storage' } })
})

it('cancels previews and requires the matching entry before executing', async () => {
  const f = await fixture()
  await f.record('a', [])
  const plan = await f.preview('sessions', ['a'])
  expect(await f.cleanup({ mode: 'residue', phase: 'execute', planId: plan.planId })).toEqual({ ok: false, error: { code: 'plan-not-found' } })
  expect(await f.cleanup({ mode: 'sessions', phase: 'cancel', planId: plan.planId })).toEqual({ ok: true, value: { phase: 'cancel' } })
  expect(await f.cleanup({ mode: 'sessions', phase: 'execute', planId: plan.planId })).toEqual({ ok: false, error: { code: 'plan-not-found' } })
})

async function childStorage(f, kind) {
  const script = `import { createPrivateStorage } from ${JSON.stringify(new URL('../src/private-storage.js', import.meta.url).href)};
    const ctx = { on() {}, effect() {}, get() { return { get() {}, list() { return [] } } } };
    const store = createPrivateStorage(ctx, ${JSON.stringify(f.home)});
    const task = () => { setInterval(() => {}, 1000); process.stdout.write('READY\\n'); return new Promise(() => {}) };
    if (${JSON.stringify(kind)} === 'lock') await store.exclusive(task);
    else if (${JSON.stringify(kind)} === 'operation') await store.operation('a', 'rolling-back', task);
    else await store.activity('a', ${JSON.stringify(kind)}, task);`
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  cleanups.push(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, 'exit').catch(() => {}) } })
  await new Promise((resolve, reject) => {
    child.stdout.once('data', data => data.toString().includes('READY') ? resolve() : reject(new Error('child not ready')))
    child.stderr.once('data', data => reject(new Error(data.toString())))
    child.once('error', reject)
  })
  return child
}

it.each(['editing', 'rolling-back', 'generating', 'operation'])('detects %s activity from a separate process, skipping only that conversation', async kind => {
  const f = await fixture()
  await f.record('a', [])
  await f.record('b', [])
  const plan = await f.preview('sessions', ['a', 'b'])
  const child = await childStorage(f, kind)
  const result = await f.execute('sessions', plan)
  expect(result.results).toEqual(expect.arrayContaining([
    expect.objectContaining({ sessionId: 'a', status: 'skipped', reason: kind === 'operation' ? 'rolling-back' : kind }),
    expect.objectContaining({ sessionId: 'b', status: 'cleaned' }),
  ]))
  child.kill(); await once(child, 'exit')
})

it('recovers the private write lock after its owning process terminates and preserves all live data', async () => {
  const f = await fixture()
  const ref = await f.object('retained')
  await f.record('a', [ref])
  const child = await childStorage(f, 'lock')
  const task = f.preview('residue')
  child.kill(); await once(child, 'exit')
  const plan = await task
  expect(plan.itemCount).toBe(0)
  expect(await readFile(path.join(f.home, 'objects', ref.slice(4)), 'utf8')).toBe('retained')
})

it.each(['storage.lock', 'storage.lock.recovery'])('refuses ownerless legacy %s without deleting it or entering the task', async name => {
  const f = await fixture()
  const target = path.join(f.home, 'coordination', name)
  await mkdir(target, { recursive: true })
  let entered = false
  await expect(f.storage.exclusive(() => { entered = true })).rejects.toThrow('storage-recovery-required')
  expect(entered).toBe(false)
  expect(await readdir(target)).toEqual([])
  expect((await readdir(path.dirname(target))).filter(entry => entry.endsWith('.pending'))).toEqual([])
})

it('publishes a complete private lock owner and removes the lock after failure', async () => {
  const f = await fixture()
  await expect(f.storage.exclusive(async () => {
    const owner = JSON.parse(await readFile(path.join(f.home, 'coordination', 'storage.lock'), 'utf8'))
    expect(owner).toMatchObject({ pid: process.pid, owner: expect.any(String) })
    throw new Error('task failed')
  })).rejects.toThrow('task failed')
  expect((await readdir(path.join(f.home, 'coordination'))).filter(name => name.endsWith('.lock') || name.endsWith('.pending'))).toEqual([])
})
