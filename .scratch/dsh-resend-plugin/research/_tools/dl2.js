// Download files from an arbitrary GitHub repo/ref into a local mirror.
const fs = require('fs');
const path = require('path');
const REPO = process.argv[2];
const REF = process.argv[3];
const LIST = process.argv[4];
const DEST = process.argv[5];
const BASE = `https://raw.githubusercontent.com/${REPO}/${REF}/`;

const paths = fs.readFileSync(LIST, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

async function one(p) {
  const out = path.join(DEST, p);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const r = await fetch(BASE + p, { headers: { 'User-Agent': 'research-agent' } });
  if (!r.ok) return p + ' -> HTTP ' + r.status;
  fs.writeFileSync(out, await r.text(), 'utf8');
  return null;
}

(async () => {
  const results = await Promise.all(paths.map(p => one(p).catch(e => p + ' -> ' + e.message)));
  const bad = results.filter(Boolean);
  console.log('downloaded=' + (paths.length - bad.length) + ' failed=' + bad.length);
  bad.forEach(b => console.log('  FAIL ' + b));
})();