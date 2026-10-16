import { readFile, cp, mkdir, access, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, npm } from './run.mjs';
const catalog = JSON.parse(await readFile(resolve(root, 'catalog.json'), 'utf8'));
for (const chart of catalog) {
  console.log(`\nBuilding ${chart.id}`);
  const source = resolve(root, chart.directory);
  await npm(['run', 'build', ...(chart.buildArgs.length ? ['--', ...chart.buildArgs] : [])], source);
  await access(resolve(source, 'dist/index.html'));
  const destination = resolve(root, 'dist/studios', chart.id);
  await mkdir(destination, { recursive: true });
  await cp(resolve(source, 'dist'), destination, { recursive: true });
  if ((await readdir(destination)).length < 2) throw new Error(`Incomplete build: ${chart.id}`);
}
console.log('\nAll studios included in dist/studios.');
