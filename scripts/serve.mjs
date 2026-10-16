import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { root } from './run.mjs';
const directory = resolve(root, 'dist');
const port = Number(process.env.PORT || 4317);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain' };
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(directory, `.${path}`);
    if (file !== directory && !file.startsWith(directory + sep)) { res.writeHead(403); res.end(); return; }
    if (path === '/' || /^\/studio\/[^/]+\/?$/.test(path)) file = resolve(directory, 'index.html');
    else if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('یافت نشد'); }
}).listen(port, '127.0.0.1', () => console.log(`نمودارستان: http://127.0.0.1:${port}`));
