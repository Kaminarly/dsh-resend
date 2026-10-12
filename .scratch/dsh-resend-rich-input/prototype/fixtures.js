// Representative history only; no real Session or user draft is read.
export const historyText = '请先阅读 @资料/中文说明.md 和 @"资料/中文 说明.md"，然后比较 @a/same.md 与 @b/same.md。\n目录 @src/ 与 @"有 空格/" 后面的正文必须保留。\n外部文件 @"D:/Other Project/说明.md"；使用 /code-review 和 /tdd。\n未知内容 @未知内容、hello@example.com、/missing 及未闭合 @"待选择 目录/ 原样保留。'

export const candidates = [
  { path: '资料/中文说明.md', kind: 'file' },
  { path: '资料/中文 说明.md', kind: 'file' },
  { path: 'a/same.md', kind: 'file' },
  { path: 'b/same.md', kind: 'file' },
  { path: 'src', kind: 'directory' },
  { path: '有 空格', kind: 'directory' },
  { path: 'D:/Other Project/说明.md', kind: 'file' },
]
