import {test} from 'node:test';import assert from 'node:assert/strict';
import {initial,defaults,parseProject,validateRows} from '../../../shared/series/model.ts';
import {graphTable,networkLayout,neighbors,validateNodes} from '../../../shared/network/math.ts';
import {networkText,networkMatrix} from '../../../shared/network/data.ts';
import {dataCSV} from '../../../shared/series/data.ts';
const kind='network';
test('network merges parallel and reciprocal links according to direction, retaining loops and isolated nodes',()=>{
  const rows=validateRows([{x:'a',group:'b',value:3},{x:'a',group:'b',value:2},{x:'b',group:'a',value:7},{x:'a',group:'a',value:1}],kind),nodes=[{id:'alone',group:'x',size:0}];
  const graph=graphTable(rows,nodes);assert.equal(graph.links.length,2);assert.equal(graph.links.find(l=>l.source!==l.target).value,12);assert.equal(graph.nodes.find(n=>n.id==='alone').degree,0);assert.equal(graph.nodes.find(n=>n.id==='a').strength,13);assert.deepEqual([...neighbors(graph,'a')].sort(),['a','b']);assert.equal(graphTable(rows,nodes,true).links.length,3);
});
test('layout is deterministic, finite and bounded; pinned coordinates survive resize and unrelated settings',()=>{
  const p=initial(kind),graph=graphTable(p.rows,[...p.nodes.map((n,i)=>i===0?{...n,x:.2,y:.7}:n),{id:'منفرد',group:'جدا',size:1}]),layout=networkLayout(graph,p.settings,1000,500),again=networkLayout(graph,p.settings,1000,500);
  assert.deepEqual(layout,again);for(const n of layout.nodes){assert.ok([n.px,n.py,n.r].every(Number.isFinite));assert.ok(n.px>=n.r&&n.px<=1000-n.r);assert.ok(n.py>=n.r&&n.py<=500-n.r);}
  const pin=layout.nodes[0];assert.ok(Math.abs((pin.px-pin.r)/(1000-2*pin.r)-.2)<1e-9);const small=networkLayout(graph,p.settings,500,300).nodes[0];assert.ok(Math.abs((small.py-small.r)/(300-2*small.r)-.7)<1e-9);
});
test('Persian CSV and nodes/links JSON preserve metadata, zero sizes, weights and isolated nodes',()=>{
  const p=initial(kind),csv=dataCSV(p.rows,kind,p.settings,p.nodes),restored=networkText(csv);assert.deepEqual(restored.rows,p.rows);assert.deepEqual(restored.nodes,p.nodes);
  const imported=networkText('{"nodes":[{"id":"تنها","group":"جدا","size":0}],"links":[{"source":"الف","target":"ب","weight":"۳"}]}');assert.equal(imported.rows[0].value,3);assert.equal(graphTable(imported.rows,imported.nodes).nodes.length,3);
  const matrix=networkMatrix([['مبدأ','مقصد'],['الف','ب']]);assert.equal(matrix.rows[0].value,1);const alone=networkText('نوع,مبدأ / نام,مقصد,مقدار,گروه\nnode,الف,,۰,جدا');assert.equal(alone.rows.length,0);assert.equal(alone.nodes[0].size,0);
});
test('network projects retain font, colors, node groups, sizes, pinning and focused neighbors',()=>{
  const p=initial(kind);p.nodes[0]={...p.nodes[0],x:.12,y:.78,size:44};p.settings.networkFocus=p.nodes[0].id;p.settings.networkDirected=true;p.settings.networkSize='value';p.fonts=[{id:'uploaded-test',name:'custom.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];Object.assign(p.settings,{fontFamily:'uploaded-test',titleSize:36,fontSize:18,valueSize:15});p.colors.پژوهش='#123456';assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),kind),p);
  p.settings.networkSize='bad';p.settings.networkFocus='missing';const clean=parseProject(p,kind);assert.equal(clean.settings.networkSize,'degree');assert.equal(clean.settings.networkFocus,'');
});
test('invalid weights, duplicate node ids, too many total nodes and invalid empty graphs are rejected',()=>{
  for(const value of [0,-1,'',Infinity])assert.throws(()=>validateRows([{x:'a',group:'b',value}],kind));assert.throws(()=>validateNodes([{id:'a',group:'g',size:1},{id:'a',group:'g',size:2}]));assert.throws(()=>graphTable([],[]));
  const nodes=Array.from({length:100},(_,i)=>({id:String(i),group:'g',size:1}));assert.throws(()=>graphTable([{x:'new',group:'0',value:1}],nodes));assert.equal(validateNodes([{id:'x',group:'g',size:0,x:99,y:-3}])[0].x,1);
});
