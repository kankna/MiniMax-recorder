/**
 * 本地模拟 GitHub Pages 的子路径部署：所有资源挂在 /MiniMax-recorder/ 下。
 * 用法：node scripts/serve-subpath.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '../dist');
const BASE = '/MiniMax-recorder';
const PORT = Number(process.argv[2] || 4178);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function tryFile(p) {
  try {
    const s = await stat(p);
    if (s.isFile()) return p;
  } catch {
    /* 继续 */
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (!pathname.startsWith(BASE)) {
    res.writeHead(302, { Location: BASE + '/' });
    res.end();
    return;
  }
  pathname = pathname.slice(BASE.length) || '/';

  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let file = await tryFile(join(DIST, safe));

  if (!file && !extname(safe)) {
    file = await tryFile(join(DIST, 'index.html'));
  }
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 ' + pathname);
    return;
  }

  const body = await readFile(file);
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
    'Service-Worker-Allowed': BASE,
  });
  res.end(body);
});

server.listen(PORT, () => {
  console.log(`serving dist at http://localhost:${PORT}${BASE}/`);
});
