import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import './build.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))
const routes = new Map([
  ['/', ['index.html', 'text/html']], ['/demo.js', ['demo.js', 'text/javascript']],
  ['/fixtures.js', ['fixtures.js', 'text/javascript']],
  ['/dist/editor.bundle.js', ['dist/editor.bundle.js', 'text/javascript']],
])
export function startServer(port = Number(process.env.EDITOR_PROTOTYPE_PORT ?? 43131)) {
  return http.createServer(async (request, response) => {
    const route = routes.get(new URL(request.url, 'http://localhost').pathname)
    if (!route) { response.writeHead(404); response.end(); return }
    try {
      const content = await readFile(path.join(root, route[0]))
      response.setHeader('Content-Type', route[1] + '; charset=utf-8')
      response.end(content)
    } catch { response.writeHead(500); response.end('原型文件读取失败') }
  }).listen(port, '127.0.0.1')
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = startServer()
  server.on('listening', () => console.log('隔离原型：http://127.0.0.1:' + server.address().port))
}
