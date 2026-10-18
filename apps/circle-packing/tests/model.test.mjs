import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,defaults,parseProject,validateRows} from '../../../shared/series/model.ts';
import {packingLayout} from '../../../shared/motion/math.ts';
import {dataCSV,parseText} from '../../../shared/series/data.ts';
const rows=data=>validateRows(data.map(([x,value])=>({x,value})),'circle-packing');
test('leaf areas encode value ratios; siblings never overlap and every child stays inside its parent',()=>{
  const root=packingLayout(rows([['بازار/الف',10],['بازار/ب',40],['دیگر/ج',20],['دیگر/د',30]]),defaults('circle-packing'),600);
  const leaves=root.leaves();assert.equal(root.value,100);assert.ok(Math.abs(leaves.find(n=>n.data.name==='ب').r**2/leaves.find(n=>n.data.name==='الف').r**2-4)<1e-9);
  for(const n of root.descendants()){
    assert.ok([n.x,n.y,n.r].every(Number.isFinite));
    if(n.parent)assert.ok(Math.hypot(n.x-n.parent.x,n.y-n.parent.y)+n.r<=n.parent.r+1e-7);
    for(let i=0;i<(n.children?.length??0);i++)for(let j=i+1;j<n.children.length;j++){const a=n.children[i],b=n.children[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r-1e-7);}
  }
});
test('aggregates repeated leaf paths, omits zero bubbles while retaining input data, and never double-counts parents',()=>{
  const data=rows([['الف/یک',10],['الف/یک',5],['الف/صفر',0],['ب/دو',20]]),root=packingLayout(data,defaults('circle-packing'),400);
  assert.equal(root.value,35);assert.equal(root.leaves().length,2);assert.equal(data.length,4);
  assert.throws(()=>rows([['الف',10],['الف/یک',3]]),/هم مقدار/);assert.throws(()=>rows([['صفر',0]]));assert.throws(()=>rows([['منفی',-2]]));
});
test('reads nested JSON and Persian path tables and round trips CSV and canonical JSON',()=>{
  const data=parseText('مسیر,مقدار\nبازار/سرو,۳۰\nبازار/باران,۷۰','circle-packing');assert.equal(data[0].value,30);
  assert.deepEqual(parseText(dataCSV(data,'circle-packing'),'circle-packing'),data);assert.deepEqual(parseText(JSON.stringify(data),'circle-packing'),data);
  const tree=parseText('{"name":"ریشه","children":[{"name":"یک","value":4},{"name":"دو","value":6}]}','circle-packing');assert.equal(packingLayout(tree,defaults('circle-packing'),400).value,10);
});
test('font, colors, label sizes, focus and packing settings survive a project round trip',()=>{
  const p=initial('circle-packing');p.fonts=[{id:'uploaded-test',name:'font.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];Object.assign(p.settings,{fontFamily:'uploaded-test',focusPath:'داخلی',titleSize:36,fontSize:17,valueSize:14,packSort:'name',packPadding:9,packLabels:'both',showContainers:false});p.colors.داخلی='#123456';assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),p.kind),p);
  p.settings.packLabels='constructor';assert.equal(parseProject(p,p.kind).settings.packLabels,'leaves');assert.throws(()=>parseProject(p,'sunburst'));
});
