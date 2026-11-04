import { afterEach, describe, expect, it } from 'vitest';
import { build } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gunzipSync, brotliDecompressSync } from 'node:zlib';
import createCompression from './compression';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => {
      if (!path.resolve(root).startsWith(path.join(process.cwd(), '.compression-test-'))) throw new Error('Unexpected test directory');
      return fs.rm(root, { recursive: true, force: true });
    })
  );
});
async function fixture(source: string) {
  const root = await fs.mkdtemp(path.join(process.cwd(), '.compression-test-'));
  roots.push(root);
  await fs.writeFile(path.join(root, 'entry.js'), source);
  return root;
}
describe('build output compression', () => {
  it('compresses gzip and brotli in the configured output directory', async () => {
    const root = await fixture(`export const text = ${JSON.stringify('test '.repeat(1000))};`);
    await build({
      configFile: false,
      root,
      logLevel: 'silent',
      plugins: createCompression({ VITE_BUILD_COMPRESS: 'gzip,brotli' }),
      build: { outDir: 'output', minify: false, lib: { entry: path.join(root, 'entry.js'), formats: ['es'], fileName: () => 'entry.js' } }
    });
    const original = await fs.readFile(path.join(root, 'output/entry.js'));
    expect(gunzipSync(await fs.readFile(path.join(root, 'output/entry.js.gz')))).toEqual(original);
    expect(brotliDecompressSync(await fs.readFile(path.join(root, 'output/entry.js.br')))).toEqual(original);
  });
  it('does not mask the original build failure when no output directory exists', async () => {
    const root = await fixture("import './missing-module.js';");
    await expect(
      build({
        configFile: false,
        root,
        logLevel: 'silent',
        plugins: createCompression({ VITE_BUILD_COMPRESS: 'gzip' }),
        build: { rollupOptions: { input: path.join(root, 'entry.js') } }
      })
    ).rejects.toThrow(/missing-module/);
    await expect(fs.stat(path.join(root, 'dist'))).rejects.toThrow();
  });
});
