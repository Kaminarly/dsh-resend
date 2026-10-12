// Keep only an explicit allow-list of files under a mirror root; delete everything else.
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2];
const KEEP = new Set(fs.readFileSync(process.argv[3], 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean));

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); if (!fs.readdirSync(p).length) fs.rmdirSync(p); }
    else {
      const rel = path.relative(ROOT, p).split(path.sep).join('/');
      if (!KEEP.has(rel)) fs.unlinkSync(p);
    }
  }
}
walk(ROOT);
let n = 0;
(function count(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); e.isDirectory() ? count(p) : n++; } })(ROOT);
console.log('kept=' + n);