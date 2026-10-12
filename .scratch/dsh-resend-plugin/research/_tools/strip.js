const fs = require('fs');
const h = fs.readFileSync(process.argv[2], 'utf8')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ');
fs.writeFileSync(process.argv[3], h, 'utf8');
console.log('text bytes=' + h.length);