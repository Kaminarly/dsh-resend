// Download a list of microsoft/vscode paths (main branch) into a local mirror.
const fs = require('fs');
const path = require('path');
const LIST = process.argv[2];       // file containing repo-relative paths, one per line
const DEST = process.argv[3];       // destination root
const BASE = 'https://raw.githubusercontent.com/microsoft/vscode/main/';

const paths = fs.readFileSync(LIST, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

async function one(p) {
  const out = path.join(DEST, p);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const r = await fetch(BASE + p, { headers: { 'User-Agent': 'research-agent' } });
  if (!r.ok) return p + ' -> HTTP ' + r.status;
  const t = await r.text();
  fs.writeFileSync(out, t, 'utf8');
  return null;
}

(async () => {
  const results = await Promise.all(paths.map(p => one(p).catch(e => p + ' -> ' + e.message)));
  const bad = results.filter(Boolean);
  console.log('downloaded=' + (paths.length - bad.length) + ' failed=' + bad.length);
  bad.forEach(b => console.log('  FAIL ' + b));
})();