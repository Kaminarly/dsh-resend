// Fetch the recursive git tree for a path in microsoft/vscode and write path list.
const fs = require('fs');
const OUT = process.argv[2];
const SUB = process.argv[3] || 'src/vs/workbench/contrib/chat';

async function j(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'research-agent', 'Accept': 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
}

(async () => {
  const t = await j('https://api.github.com/repos/microsoft/vscode/git/trees/main:' + SUB + '?recursive=1');
  const fixed = t.tree.filter(e => e.type === 'blob').map(e => SUB.replace(/\/$/, '') + '/' + e.path);
  fs.writeFileSync(OUT, fixed.join('\n'), 'utf8');
  console.log('truncated=' + t.truncated + ' files=' + fixed.length + ' sha=' + sha);
})().catch(e => { console.error('ERR', e.message); process.exit(2); });