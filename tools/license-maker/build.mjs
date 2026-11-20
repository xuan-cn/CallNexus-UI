import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@vue/compiler-dom';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('.', import.meta.url));
const source = await readFile(path.join(root, 'view.template'), 'utf8');
const css = (await readFile(path.join(root, 'style.css'), 'utf8')).replace(/\r\n?/g, '\n');
const bundle = await build({
  absWorkingDir: root,
  entryPoints: ['app.mjs'],
  bundle: true,
  write: false,
  target: ['chrome137', 'firefox129'],
  format: 'esm',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"', __VUE_OPTIONS_API__: 'false', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false' },
  plugins: [{
    name: 'compile-local-view',
    setup(plugin) {
      plugin.onResolve({ filter: /^virtual:license-view$/ }, () => ({ path: 'license-view', namespace: 'license-maker' }));
      plugin.onLoad({ filter: /.*/, namespace: 'license-maker' }, () => ({
        contents: compile(source, { mode: 'module' }).code,
        resolveDir: root
      }));
    }
  }]
});
const script = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const hash = value => createHash('sha256').update(value, 'utf8').digest('base64');
const csp = `default-src 'none'; script-src 'sha256-${hash(script)}'; style-src 'sha256-${hash(css)}'; connect-src 'none'; base-uri 'none'; form-action 'none'`;
const html = `\uFEFF<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>CallNexus 授权制作</title><style>${css}</style></head><body><div id="app"><p class="layout">授权工具加载中。如果此提示一直显示，请用最新版 Edge 或 Chrome 直接打开打包后的 HTML 文件。</p></div><script type="module">${script}</script></body></html>\n`;
const output = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'dist', 'callnexus-license-maker.html');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html);
console.log(`Offline license maker: ${output}`);
