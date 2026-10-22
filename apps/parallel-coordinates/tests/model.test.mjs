import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,defaults,parseProject,validateRows} from '../../../shared/series/model.ts';
import {parallelTable,axisPosition,axisState} from '../../../shared/multivariate/math.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
const kind='parallel-coordinates';
test('parallel coordinates accept wide Persian data, distinguish missing and zero, and round trip long CSV/JSON',()=>{
  const rows=parseMatrix([['نام','گروه','قیمت','کیفیت','فروش'],['الف','یک','۱۰','۰',''],['ب','دو','۲۰','۸۰','۳۰']],kind);
  const table=parallelTable(rows,defaults(kind));assert.equal(rows.length,5);assert.equal(table.missing,1);assert.equal(table.items[0].values.get('کیفیت'),0);assert.equal(table.items[0].values.has('فروش'),false);
  assert.deepEqual(parseText(dataCSV(rows,kind),kind),rows);assert.deepEqual(parseText(JSON.stringify(rows),kind),rows);
  assert.equal(parseText('[{"name":"a","A":-3,"B":0},{"name":"b","A":2,"B":4}]',kind)[0].value,-3);
});
test('independent/shared domains, inversion, logarithms and constants map correctly without invented values',()=>{
  const rows=parseText('نام,A,B,C\na,-10,20,7\nb,10,40,7',kind),settings=defaults(kind),t=parallelTable(rows,settings);
  assert.deepEqual(t.domains.get('A'),[-10,10]);assert.deepEqual(t.domains.get('B'),[20,40]);assert.equal(axisPosition(7,t.domains.get('C')),.5);assert.equal(axisPosition(-10,t.domains.get('A')),0);assert.equal(axisPosition(-10,t.domains.get('A'),false,true),1);
  assert.equal(axisPosition(10,[1,100],true),.5);assert.throws(()=>parallelTable(rows,{...settings,axisScale:'log'}),/مثبت/);
  const shared=parallelTable(rows,{...settings,parallelScale:'shared'});assert.deepEqual(shared.domains.get('C'),[-10,40]);
  assert.deepEqual(parallelTable(rows,{...settings,includeZero:true}).domains.get('C'),[0,7]);
});
test('AND filters use source values and fixed full-data domains; missing observations never pass a numeric filter',()=>{
  const rows=parseText('نام,A,B\na,0,10\nb,5,\nc,10,30',kind),s={...defaults(kind),parallelOrder:'["B","A"]',parallelInverted:'["A"]',parallelFilters:'{"A":[0,8],"B":[0,20]}'};
  const t=parallelTable(rows,s);assert.deepEqual(t.axes,['B','A']);assert.deepEqual(t.visible.map(x=>x.name),['a']);assert.deepEqual(t.domains.get('A'),[0,10]);
  assert.deepEqual(parallelTable(rows,{...s,parallelFilters:'{}',parallelMissing:'exclude'}).visible.map(x=>x.name),['a','c']);
  assert.equal(parallelTable(rows,{...s,parallelFilters:'{"A":[200,300]}'}).visible.length,0);
});
test('rejects conflicting groups, duplicate observations, invalid values and insufficient axes',()=>{
  const base=[{x:'a',group:'g',axis:'A',value:1},{x:'a',group:'g',axis:'B',value:2}];
  assert.throws(()=>validateRows([...base,base[0]],kind),/تکراری/);assert.throws(()=>validateRows([base[0],{...base[1],group:'other'}],kind),/یکسان/);assert.throws(()=>validateRows([base[0]],kind),/۱۲/);
  for(const value of ['',Infinity,NaN])assert.throws(()=>validateRows([base[0],{...base[1],value}],kind));
  assert.throws(()=>parseMatrix([['نام','A','A'],['a',1,2]],kind),/یکتا/);
});
test('projects preserve axis controls, filters, fonts, colors and sizes; invalid axis metadata is sanitized',()=>{
  const p=initial(kind);const axes=[...new Set(p.rows.map(r=>r.axis))];Object.assign(p.settings,{parallelOrder:JSON.stringify([...axes].reverse()),parallelInverted:JSON.stringify([axes[0]]),parallelFilters:JSON.stringify({[axes[0]]:[20,40]}),titleSize:36,fontSize:18,valueSize:15,lineWidth:4.5});p.colors.اقتصادی='#123456';p.fonts=[{id:'uploaded-test',name:'font.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];p.settings.fontFamily='uploaded-test';assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),kind),p);
  const state=axisState({...p.settings,parallelOrder:'["bad","bad"]',parallelInverted:'["unknown"]',parallelFilters:'{"bad":[1,2],"__proto__":[1,2]}'},axes);assert.deepEqual(state.order,axes);assert.deepEqual(state.inverted,[]);assert.deepEqual(state.filters,{});
});
