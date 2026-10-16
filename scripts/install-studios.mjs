import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, npm } from './run.mjs';
const catalog = JSON.parse(await readFile(resolve(root, 'catalog.json'), 'utf8'));
for (const chart of catalog) {
  console.log(`\nInstalling ${chart.id}`);
  await npm(['ci', '--no-audit', '--no-fund'], resolve(root, chart.directory));
}
