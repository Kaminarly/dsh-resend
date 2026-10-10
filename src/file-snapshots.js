/** Immutable contents: private Git blobs for repositories, SHA-256 blobs otherwise. */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

function git(args, cwd, input) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, GIT_CONFIG_COUNT: '0', GIT_TERMINAL_PROMPT: '0' }
    for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_COMMON_DIR', 'GIT_NAMESPACE']) delete env[key]
    const child = spawn('git', args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      env })
    const output = []
    const errors = []
    const timeout = setTimeout(() => child.kill('SIGKILL'), 30_000)
    child.stdout.on('data', (bytes) => output.push(bytes))
    child.stderr.on('data', (bytes) => errors.push(bytes))
    child.on('error', (error) => { clearTimeout(timeout); reject(error) })
    child.on('close', (code) => { clearTimeout(timeout); resolve({ code, output: Buffer.concat(output), error: Buffer.concat(errors).toString('utf8') }) })
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}

export const digest = (value) => createHash('sha256').update(value).digest('hex')

export function createSnapshotStore(home) {
  const gitDir = path.join(home, 'objects.git')
  let initialized
  const checked = async (args, cwd, input) => {
    const result = await git(args, cwd, input)
    if (result.code !== 0) throw new Error(result.error || `git exited ${result.code}`)
    return result.output
  }
  return {
    async backend(cwd) {
      try {
        const result = await git(['rev-parse', '--is-inside-work-tree'], cwd)
        if (result.code === 0 && result.output.toString('utf8').trim() === 'true') {
          initialized ??= mkdir(home, { recursive: true }).then(() => checked(['init', '--bare', '--quiet', gitDir], home))
          await initialized
          return 'git'
        }
        if (result.code !== 0 && !result.error.includes('not a git repository')) throw new Error(result.error)
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      return 'cas'
    },
    async put(bytes, backend) {
      if (bytes === null) return null
      if (backend === 'git') {
        const oid = (await checked([`--git-dir=${gitDir}`, 'hash-object', '-w', '--stdin'], home, bytes)).toString('utf8').trim()
        return `git:${oid}`
      }
      const oid = digest(bytes)
      const directory = path.join(home, 'objects')
      await mkdir(directory, { recursive: true })
      await writeFile(path.join(directory, oid), bytes, { flag: 'wx', mode: 0o600 }).catch((error) => { if (error.code !== 'EEXIST') throw error })
      return `cas:${oid}`
    },
    async get(ref) {
      if (ref === null) return null
      if (/^git:[a-f0-9]{40,64}$/.test(ref)) return checked([`--git-dir=${gitDir}`, 'cat-file', 'blob', ref.slice(4)], home)
      if (/^cas:[a-f0-9]{64}$/.test(ref)) {
        const bytes = await readFile(path.join(home, 'objects', ref.slice(4)))
        if (digest(bytes) !== ref.slice(4)) throw new Error('snapshot content does not match its address')
        return bytes
      }
      throw new Error('invalid private content reference')
    },
  }
}
