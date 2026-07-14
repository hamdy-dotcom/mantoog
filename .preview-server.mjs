import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const ROOT = '/private/tmp/claude-501/-Users-mac-Documents-mantoog/2a597ac0-1d0d-443f-9bb1-2481d4033ba4/scratchpad/preview';
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml' };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p === '') p = '/index.html';
    const buf = await readFile(ROOT + p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(buf);
  } catch (e) {
    res.writeHead(404); res.end('not found: ' + e.message);
  }
}).listen(4599, () => console.log('3agall preview on http://localhost:4599'));
