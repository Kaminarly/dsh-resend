import { candidates, historyText } from './fixtures.js'

const face = window.__prototypeRegistrations.get('dsh-rich-input-feasibility').factory(specifier => {
  throw new Error('宿主模块表不存在此模块：' + specifier)
})
const calls = []
let editor
function open(text) {
  editor?.destroy()
  editor = face.createEditor(document.querySelector('#editor'), {
    text, candidates,
    onChange(text, state) {
      document.querySelector('#text').textContent = text
      document.querySelector('#state').textContent = JSON.stringify(state, null, 2)
    },
    onReceive(text) {
      calls.push({ text })
      document.querySelector('#received').textContent = text
      document.querySelector('#status').textContent = '接收替身已收到文本；接收次数：' + calls.length
    },
  })
}
open(historyText)
for (const [id, action] of Object.entries({ restore: () => open(historyText), blank: () => open(''), undo: () => editor.undo(), redo: () => editor.redo(), receive: () => editor.receive() })) {
  const button = document.getElementById(id)
  button.addEventListener('mousedown', event => event.preventDefault())
  button.addEventListener('click', action)
}
for (const [label, action] of [
  ['选择 a/same.md', () => editor.insertReference(candidates[2])],
  ['选择 b/same.md', () => editor.insertReference(candidates[3])],
  ['下钻 有 空格/', () => editor.drillDirectory(candidates[5])],
  ['选定 有 空格/', () => editor.insertReference(candidates[5])],
]) {
  const button = document.createElement('button')
  button.textContent = label
  button.addEventListener('mousedown', event => event.preventDefault())
  button.addEventListener('click', action)
  document.querySelector('#candidates').append(button)
}
// A diagnostic handle for isolated browser checks, not a production plugin API.
window.editorFixture = { get editor() { return editor }, calls, open, historyText, candidates }
