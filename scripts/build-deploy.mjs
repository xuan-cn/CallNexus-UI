import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const result = spawnSync(process.execPath, [vite, 'build', '--mode', 'production', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_APP_RSA_PUBLIC_KEY: '__CNX_FRONTEND_RSA_PUBLIC_KEY__',
    VITE_APP_RSA_PRIVATE_KEY: '__CNX_FRONTEND_RSA_PRIVATE_KEY__'
  }
});
if (result.error) console.error(result.error.message);
if (result.status !== 0) process.exit(result.status ?? 1);

const args = process.argv.slice(2);
let outputDir = 'dist';
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--outDir' && args[index + 1]) outputDir = args[++index];
  else if (args[index].startsWith('--outDir=')) outputDir = args[index].slice('--outDir='.length);
}
let placeholders = 0;
function prepareFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) prepareFiles(file);
    else if (entry.isFile() && file.endsWith('.js')) {
      const matches = fs.readFileSync(file, 'utf8').match(/__CNX_FRONTEND_RSA_(?:PUBLIC|PRIVATE)_KEY__/g) || [];
      placeholders += matches.length;
      // These sidecars were compressed before server-side key injection.
      if (matches.length) for (const suffix of ['.gz', '.br']) {
        if (fs.existsSync(file + suffix)) fs.unlinkSync(file + suffix);
      }
    }
  }
}
prepareFiles(path.resolve(root, outputDir));
if (placeholders !== 2) throw new Error(`Expected two frontend RSA placeholders, got ${placeholders}`);
console.log('部署前端已准备：请上传完整 dist 并成功执行 configure.py render 后再发布。');
