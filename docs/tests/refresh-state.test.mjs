// node --test: scripts/refresh-state.mjs, the SHA comparison behind scripts/refresh.sh.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changedKeys, parseCurrent } from '../scripts/refresh-state.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/refresh-state.mjs', import.meta.url));
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

test('parseCurrent reads "<key> <sha>" lines and rejects anything else', () => {
	assert.deepEqual(parseCurrent(`o/r:docs ${A}\n\no/c:theme ${B}\n`), { 'o/r:docs': A, 'o/c:theme': B });
	assert.throws(() => parseCurrent('o/r:docs\n'), /bad line/);
	assert.throws(() => parseCurrent('o/r:docs null\n'), /bad line/);
});

test('changedKeys: new, gone and changed keys; nothing when equal', () => {
	assert.deepEqual(changedKeys({}, { x: A }), ['x']);
	assert.deepEqual(changedKeys({ x: A }, { x: A }), []);
	assert.deepEqual(changedKeys({ x: A, y: A }, { x: B, z: A }), ['x', 'y', 'z']);
});

test('CLI: first run changes everything, save, then nothing changed', () => {
	const dir = mkdtempSync(join(tmpdir(), 'somaari-docs-refresh-'));
	try {
		const last = join(dir, 'state', 'last-shas.json');
		const current = join(dir, 'current.txt');
		writeFileSync(current, `o/r:docs ${A}\no/c:theme ${B}\n`);
		const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
		assert.equal(run('changed', last, current).stdout, 'o/c:theme\no/r:docs\n');
		assert.equal(run('save', current, last).status, 0);
		assert.deepEqual(JSON.parse(readFileSync(last, 'utf8')), { 'o/r:docs': A, 'o/c:theme': B });
		assert.equal(run('changed', last, current).stdout, '');
		writeFileSync(current, `o/r:docs ${B}\no/c:theme ${B}\n`);
		assert.equal(run('changed', last, current).stdout, 'o/r:docs\n');
		assert.equal(run('bogus').status, 2);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
