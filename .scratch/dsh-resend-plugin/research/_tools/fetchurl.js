// Download a URL's text body to a local file.
const fs = require('fs');
const url = process.argv[2];
const out = process.argv[3];
fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (research-agent)' } })
  .then(r => { console.error('status ' + r.status); return r.text(); })
  .then(t => { fs.writeFileSync(out, t, 'utf8'); console.log('bytes=' + t.length + ' -> ' + out); })
  .catch(e => { console.error('ERR ' + e.message); process.exit(2); });