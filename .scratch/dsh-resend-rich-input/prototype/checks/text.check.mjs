import assert from 'node:assert/strict'
import test from 'node:test'
import { createDocument, exportText, finalMention, drillMention } from '../text.js'
import { candidates, historyText } from '../fixtures.js'

test('代表性历史文本保留路径、正文、顺序和未知内容', () => {
  const doc = createDocument(historyText, candidates)
  assert.equal(exportText(doc), historyText)
  const paths = []
  doc.descendants(node => { if (node.type.name === 'file_reference') paths.push(node.attrs.path) })
  assert.deepEqual(paths, ['资料/中文说明.md', '资料/中文 说明.md', 'a/same.md', 'b/same.md', 'src', '有 空格', 'D:/Other Project/说明.md'])
})

test('目录下钻保留开放引号，最终引用闭合且不吞入正文', () => {
  const directory = { path: '有 空格', kind: 'directory' }
  assert.equal(drillMention(directory), '@"有 空格/')
  assert.equal(finalMention(directory), '@"有 空格/"')
  const open = '请读 @"有 空格/ 后面的正文'
  assert.equal(exportText(createDocument(open, candidates)), open)
  const closed = '请读 @"有 空格/" 后面的正文'
  assert.equal(exportText(createDocument(closed, candidates)), closed)
})

test('换行、未知引用、邮箱、路径前缀和不合法引号原样保留', () => {
  for (const text of ['', '甲\r\n乙\n丙\r丁\n', '@a/same.md.backup', 'hello@a/same.md', '@"a/same.md" 后文', '@"a/same.md', '@未知文件.md /missing', '@"bad"name.md']) {
    assert.equal(exportText(createDocument(text, candidates)), text)
  }
  assert.throws(() => finalMention({ path: 'bad"name.md', kind: 'file' }))
  assert.throws(() => finalMention({ path: 'bad\nname.md', kind: 'file' }))
})
