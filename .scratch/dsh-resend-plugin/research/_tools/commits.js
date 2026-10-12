// List commits touching a path in a repo, printing date + sha + first line of message.
const fs = require('fs');
const REPO = process.argv[2];
const P = process.argv[3];
const OUT = process.argv[4];
const MAXPAGES = Number(process.argv[5] || 2);

async function j(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'research-agent', 'Accept': 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
}

(async () => {
  const lines = [];
  for (let page = 1; page <= MAXPAGES; page++) {
    const c = await j(`https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(P)}&per_page=100&page=${page}`);
    if (!c.length) break;
    for (const e of c) {
      lines.push(`${e.commit.author.date} ${e.sha.slice(0, 10)} ${e.commit.message.split('\n')[0]}`);
    }
    if (c.length < 100) break;
  }
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.log('commits=' + lines.length + ' -> ' + OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(2); });