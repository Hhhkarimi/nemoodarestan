import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, npm } from './run.mjs';
const catalog = JSON.parse(await readFile(resolve(root, 'catalog.json'), 'utf8'));
for (const chart of catalog) {
  const cwd = resolve(root, chart.directory);
  const pkg = JSON.parse(await readFile(resolve(cwd, 'package.json'), 'utf8'));
  if (pkg.scripts.test) await npm(['test'], cwd);
}
