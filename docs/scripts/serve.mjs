// Local preview of dist/ that applies dist/_headers like Cloudflare does (path patterns with a
// trailing * only, which is all this site uses). `wrangler dev` can't run on the Pi: workerd's
// allocator needs a 48-bit address space. Usage: node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const DIST = 'dist';
const port = Number(process.argv[2] || 8787);
const TYPES = {
	'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
	'.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
	'.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain',
	'.wasm': 'application/wasm', '.pf_meta': 'application/octet-stream',
};

// [{ pattern: RegExp, headers: [[name, value]] }]
const rules = [];
let current = null;
for (const line of (await readFile(join(DIST, '_headers'), 'utf8')).split('\n')) {
	if (!line.trim() || line.trim().startsWith('#')) continue;
	if (!/^\s/.test(line)) {
		const re = '^' + line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
		rules.push((current = { pattern: new RegExp(re), headers: [] }));
	} else if (current) {
		const i = line.indexOf(':');
		current.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
	}
}

async function resolve(path) {
	const p = normalize(join(DIST, decodeURIComponent(path)));
	if (!p.startsWith(DIST)) return null;
	for (const c of [p, join(p, 'index.html'), p + '.html']) {
		try { if ((await stat(c)).isFile()) return c; } catch {}
	}
	return null;
}

createServer(async (req, res) => {
	const path = new URL(req.url, 'http://x').pathname;
	for (const r of rules) if (r.pattern.test(path)) for (const [k, v] of r.headers) res.setHeader(k, v);
	const file = (await resolve(path)) || join(DIST, '404.html');
	res.statusCode = file.endsWith('404.html') && !path.startsWith('/404') ? 404 : 200;
	res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
	res.end(await readFile(file));
}).listen(port, '127.0.0.1', () => console.log(`serving ${DIST} on http://127.0.0.1:${port}`));
