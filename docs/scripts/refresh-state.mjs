// The SHA bookkeeping for scripts/refresh.sh: which watched paths changed since the last deploy.
// A state file is JSON { "<key>": "<sha>" }; refresh.sh writes the current SHAs as lines of
// "<key> <sha>" (key = owner/repo:path).
//   node scripts/refresh-state.mjs changed <last.json> <current.txt>   prints the changed keys
//   node scripts/refresh-state.mjs save <current.txt> <last.json>      saves current as the last state
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** "<key> <sha>" lines → { key: sha }. Throws on a malformed line. */
export function parseCurrent(text) {
	const out = {};
	for (const line of text.split('\n')) {
		if (!line.trim()) continue;
		const m = line.trim().match(/^(\S+)\s+([0-9a-f]{7,40})$/);
		if (!m) throw new Error(`bad line: ${line}`);
		out[m[1]] = m[2];
	}
	return out;
}

/** Keys that are new, gone or have another SHA, sorted. */
export function changedKeys(last, current) {
	const keys = new Set([...Object.keys(last), ...Object.keys(current)]);
	return [...keys].filter((k) => last[k] !== current[k]).sort();
}

function readLast(path) {
	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch (e) {
		if (e.code === 'ENOENT') return {};
		throw e;
	}
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const [cmd, a, b] = process.argv.slice(2);
	if (cmd === 'changed' && a && b) {
		for (const k of changedKeys(readLast(a), parseCurrent(readFileSync(b, 'utf8')))) console.log(k);
	} else if (cmd === 'save' && a && b) {
		mkdirSync(dirname(b), { recursive: true });
		writeFileSync(b, JSON.stringify(parseCurrent(readFileSync(a, 'utf8')), null, 2) + '\n');
	} else {
		console.error('usage: refresh-state.mjs changed <last.json> <current.txt> | save <current.txt> <last.json>');
		process.exit(2);
	}
}
