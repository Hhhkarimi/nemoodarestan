import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const catalog=JSON.parse(await readFile(new URL('../catalog.json',import.meta.url),'utf8'));
test('every registered chart has unique safe routes and a complete local source',async()=>{
  assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length);
  assert.ok(catalog.length>=4);
  for(const chart of catalog){
    assert.match(chart.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(chart.directory,`apps/${chart.id}`);
    assert.equal(chart.entry,`/studios/${chart.id}/index.html`);
    assert.ok(chart.title&&chart.description&&chart.categoryLabel);
    assert.ok(chart.formats.includes('SVG')&&chart.formats.includes('PNG'));
    assert.match(chart.sourceCommit,/^[a-f0-9]{40}$/);
    await access(new URL(`../${chart.directory}/package-lock.json`,import.meta.url));
    await access(new URL(`../public${chart.preview}`,import.meta.url));
  }
});
test('Vercel serves the studio shell without intercepting nested editor assets',async()=>{
  const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
  assert.equal(config.outputDirectory,'dist');
  assert.equal(config.installCommand,'npm ci && npm run install:studios');
  assert.deepEqual(config.rewrites,[{source:'/studio/:id',destination:'/index.html'}]);
  assert.equal(config.cleanUrls,false);
});
