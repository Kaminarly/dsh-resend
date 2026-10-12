// Extract file paths from a GitHub "tree" page's embedded JSON payload.
const url = process.argv[2];
const needle = process.argv[3] || '';
fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (research-agent)' } })
  .then(r => { console.error('status ' + r.status); return r.text(); })
  .then(t => {
    const items = new Set();
    for (const m of t.matchAll(/"path":"([^"]+)"/g)) items.add(m[1]);
    for (const m of t.matchAll(/"name":"([^"]+)","path":"([^"]+)"/g)) items.add(m[2]);
    const list = [...items].filter(p => p.includes(needle)).sort();
    console.log('found=' + list.length);
    console.log(list.join('\n'));
  })
  .catch(e => { console.error('ERR ' + e.message); process.exit(2); });