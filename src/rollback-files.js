/** Work-file safety lives behind read/restore, including the final write checks. */
import { randomUUID } from 'node:crypto'
import { lstat, open, rename, unlink } from 'node:fs/promises'
import path from 'node:path'

export const sameContents = (a, b) => a === null || b === null ? a === b : a.equals(b)
const sameFile = (a, b) => a === null || b === null ? a === b : a.dev === b.dev && a.ino === b.ino && a.birthtimeMs === b.birthtimeMs

/** Reject metadata, escapes, links and junctions in every ancestor. */
export async function fileTarget(cwd, name) {
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd) || typeof name !== 'string' || name === '') throw new Error('unsafe-path')
  const absolute = path.resolve(cwd, name)
  const relative = path.relative(cwd, absolute)
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) ||
      relative.split(path.sep).some(part => part.toLowerCase() === '.git')) throw new Error('unsafe-path')
  let current = path.parse(absolute).root
  for (const part of absolute.slice(current.length).split(path.sep)) {
    current = path.join(current, part)
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error('unsafe-path') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  return absolute
}

async function inspect(cwd, name) {
  const absolute = await fileTarget(cwd, name)
  let handle
  try {
    const entry = await lstat(absolute)
    if (!entry.isFile() || entry.nlink !== 1) throw new Error('unsafe-path')
    handle = await open(absolute, 'r')
    const stat = await handle.stat()
    if (!stat.isFile() || stat.nlink !== 1 || !sameFile(entry, stat)) throw new Error('unsafe-path')
    const bytes = await handle.readFile()
    const current = await lstat(await fileTarget(cwd, name))
    if (!sameFile(stat, current) || current.nlink !== 1) throw new Error('content-diverged')
    return { absolute, bytes, stat }
  } catch (error) {
    if (error.code === 'ENOENT') return { absolute, bytes: null, stat: null }
    throw error
  } finally { await handle?.close() }
}

export async function contents(cwd, name) { return (await inspect(cwd, name)).bytes }

/** Stage and flush bytes before replacement: a failed write never truncates the target. */
export async function restoreFile(cwd, file, idle) {
  const initial = await inspect(cwd, file.path)
  if (!sameContents(initial.bytes, file.after)) throw new Error('content-diverged')
  let staging
  let handle
  let committed = false
  try {
    if (file.before !== null) {
      staging = `${initial.absolute}.dsh-resend-${randomUUID()}.pending`
      await fileTarget(cwd, path.relative(cwd, staging))
      handle = await open(staging, 'wx', initial.stat === null ? 0o600 : initial.stat.mode & 0o777)
      await handle.writeFile(file.before)
      if (initial.stat !== null) await handle.chmod(initial.stat.mode & 0o777)
      await handle.sync()
      await handle.close(); handle = undefined
    }
    const current = await inspect(cwd, file.path)
    if (!sameContents(current.bytes, file.after) || !sameFile(current.stat, initial.stat)) throw new Error('content-diverged')
    if (!idle()) throw new Error('agent-busy')
    if (file.before === null) await unlink(current.absolute)
    else { await rename(staging, current.absolute); staging = undefined }
    committed = true
    if (!sameContents(await contents(cwd, file.path), file.before)) throw new Error('content-diverged')
  } catch (error) {
    // The caller must report a committed change even if verification failed.
    error.restored = committed
    throw error
  } finally {
    await handle?.close()
    if (staging !== undefined) await unlink(staging).catch(() => {})
  }
}
