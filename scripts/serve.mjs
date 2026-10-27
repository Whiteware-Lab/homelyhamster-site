import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, sep, extname} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT || 8765);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // Mirror the actual GitHub project URL during local QA.
    if (pathname.startsWith('/homelyhamster-site/')) pathname = pathname.slice('/homelyhamster-site'.length);
    let file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + sep) && file !== root) throw Error('path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    if (/(?:^|[\\/])\./.test(file.slice(root.length))) throw Error('hidden');
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => process.stdout.write(`Local: http://127.0.0.1:${port}/homelyhamster-site/\n`));
