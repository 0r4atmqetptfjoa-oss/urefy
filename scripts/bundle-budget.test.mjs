import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { measureStartupBundle, startupEntries } from './bundle-budget.mjs';

test('counts transitive imports once and excludes optional dynamic chunks', () => {
  const manifest = {
    'index.html': { file: 'main.js', imports: ['first', 'second'], dynamicImports: ['optional'], css: ['app.css'] },
    first: { file: 'first.js', imports: ['shared'], css: ['app.css'] },
    second: { file: 'second.js', imports: ['shared'] },
    shared: { file: 'shared.js' },
    optional: { file: 'optional.js' },
  };
  const result = measureStartupBundle(manifest, (file) => Buffer.from(file));
  assert.equal(result.javascript.length, 4);
  assert.equal(result.css.length, 1);
  assert.equal(result.javascript.some((asset) => asset.file === 'optional.js'), false);
  assert.equal(result.javascriptGzipBytes, ['main.js', 'first.js', 'second.js', 'shared.js'].reduce((total, file) => total + gzipSync(Buffer.from(file)).length, 0));
});

test('handles cyclic chunk imports without double counting', () => {
  const manifest = { 'index.html': { file: 'main.js', imports: ['shared'] }, shared: { file: 'shared.js', imports: ['index.html'] } };
  assert.equal(measureStartupBundle(manifest, (file) => Buffer.from(file)).javascript.length, 2);
});

test('fails closed when the manifest or a referenced asset is incomplete', () => {
  assert.throws(() => measureStartupBundle({}, () => Buffer.alloc(0)), /Missing build manifest entry/);
  assert.throws(() => measureStartupBundle({ 'index.html': { file: 'missing.js' } }, () => { throw new Error('Missing asset'); }), /Missing asset/);
});

test('resolves hashed bootstrap chunks and counts all required roots once', () => {
  const manifest = {
    'index.html': { file: 'main.js', imports: ['shared'], dynamicImports: ['_app-hash.js', 'brand', 'mobile', '_layout-hash.js'] },
    '_app-hash.js': { file: 'app.js', name: 'app', imports: ['shared'], dynamicImports: ['optional'] },
    brand: { file: 'brand.js', name: 'brand' },
    mobile: { file: 'mobile.js', name: 'mobile-performance' },
    '_layout-hash.js': { file: 'layout.js', name: 'workspace-layout', imports: ['shared'] },
    shared: { file: 'shared.js' },
    optional: { file: 'optional.js' },
  };
  const result = measureStartupBundle(manifest, file => Buffer.from(file), startupEntries(manifest));
  assert.deepEqual(result.javascript.map(asset => asset.file).sort(), ['app.js', 'brand.js', 'layout.js', 'main.js', 'mobile.js', 'shared.js']);
  delete manifest['_app-hash.js'];
  assert.throws(() => startupEntries(manifest), /Missing required bootstrap module: app/);
});