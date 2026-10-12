// Fetch PR/issue metadata for a list of numbers in a repo.
const fs = require('fs');
const REPO = process.argv[2];
const NUMS = process.argv[3].split(',').map(s => s.trim()).filter(Boolean);
const OUT = process.argv[4];

async function j(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'research-agent', 'Accept': 'application/vnd.github+json' } });
  if (!r.ok) return { error: 'HTTP ' + r.status };
  return r.json();
}

(async () => {
  const out = [];
  for (const n of NUMS) {
    const d = await j(`https://api.github.com/repos/${REPO}/issues/${n}`);
    if (d.error) { out.push({ n, error: d.error }); continue; }
    out.push({
      n: Number(n),
      title: d.title,
      url: d.html_url,
      state: d.state,
      created: d.created_at,
      closed: d.closed_at,
      isPR: !!d.pull_request,
      labels: (d.labels || []).map(l => (typeof l === 'string' ? l : l.name)),
      user: d.user && d.user.login,
      body: (d.body || '').slice(0, 4000)
    });
    await new Promise(r => setTimeout(r, 200));
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('fetched=' + out.length);
})().catch(e => { console.error('ERR', e.message); process.exit(2); });