import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,defaults,parseProject,validateRows} from '../../../shared/series/model.ts';
import {raceTable,raceFrame} from '../../../shared/motion/math.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
import {raceHTML} from '../../../shared/motion/export.ts';
import {raceView} from '../../../shared/motion/chart.ts';
const rows=data=>validateRows(data.map(([x,group,value])=>({x,group,value})),'bar-chart-race');
test('aggregates repeated cells, keeps input period order, and distinguishes zero, missing and carry',()=>{
  const data=rows([['دوم','الف',10],['دوم','الف',5],['دوم','ب',0],['اول','الف',20],['آخر','ب',9]]),table=raceTable(data,'hide');
  assert.deepEqual(table.periods,['دوم','اول','آخر']);assert.deepEqual(table.values,[[15,0],[20,null],[null,9]]);assert.equal(table.missing,2);
  assert.deepEqual(raceTable(data,'zero').values,[[15,0],[20,0],[0,9]]);
  assert.deepEqual(raceTable(data,'carry').values,[[15,0],[20,0],[20,9]]);
  assert.equal(raceTable(rows([['a','x',2],['b','y',4]]),'carry').values[0][1],null);
});
test('interpolates values and ranks, uses stable ties and a fixed or current domain, preserving exact endpoints',()=>{
  const table=raceTable(rows([['a','x',10],['a','y',30],['b','x',40],['b','y',20]]),'hide');
  assert.deepEqual(raceFrame(table,0,'global').bars.map(b=>[b.value,b.rank]),[[10,1],[30,0]]);
  const frame=raceFrame(table,.5,'global');assert.deepEqual(frame.bars.map(b=>[b.value,b.rank,b.alpha]),[[25,.5,1],[25,.5,1]]);assert.equal(frame.max,40);
  assert.equal(raceFrame(table,.5,'period').max,25);assert.equal(raceFrame(table,999,'global').position,1);assert.equal(raceFrame(table,NaN,'global').position,0);
  assert.deepEqual(raceFrame(raceTable(rows([['a','x',4],['a','y',4],['b','x',5]]),'zero'),0,'global').bars.map(b=>b.rank),[0,1]);
});
test('missing series fade at their observed value instead of inventing zero; zero remains visible',()=>{
  const table=raceTable(rows([['a','x',8],['a','z',0],['b','y',6],['b','z',0]]),'hide'),half=raceFrame(table,.5,'global');
  assert.deepEqual(half.bars.map(b=>[b.value,b.alpha]),[[8,.5],[0,1],[6,.5]]);
  assert.equal(raceFrame(table,0,'global').bars[2].alpha,0);
});
test('imports Persian long and wide data and JSON; blank wide cells stay absent and empty periods fail',()=>{
  const data=parseMatrix([['دوره','سرو','باران'],['اول','۱۰',''],['دوم','۲۰','۰']],'bar-chart-race');assert.equal(data.length,3);
  assert.deepEqual(parseText(dataCSV(data,'bar-chart-race'),'bar-chart-race'),data);assert.deepEqual(parseText(JSON.stringify(data),'bar-chart-race'),data);
  assert.equal(parseText('[{"period":"a","brand":"x","sales":2},{"period":"b","brand":"x","sales":3}]','bar-chart-race').length,2);
  assert.throws(()=>parseMatrix([['دوره','الف'],['اول',2],['خالی',''],['بعد',3]],'bar-chart-race'),/هیچ مقداری/);
  for(const value of [-1,'',Infinity])assert.throws(()=>rows([['a','x',value],['b','x',2]]));assert.throws(()=>rows([['a','x',2]]));
});
test('project preserves fonts, colors, logos, speed, frame and sizes; rejects unsafe image URLs',()=>{
  const p=initial('bar-chart-race');p.fonts=[{id:'uploaded-test',name:'font.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];p.logos[p.rows[0].group]='data:image/png;base64,AA==';p.colors[p.rows[0].group]='#123456';
  Object.assign(p.settings,{fontFamily:'uploaded-test',racePosition:2.5,raceDuration:2,raceTimeSize:44,valueSize:17,raceTopN:5,raceMissing:'carry',raceLoop:true});assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),p.kind),p);
  p.logos.bad='https://example.com/logo.png';assert.equal(parseProject(p,p.kind).logos.bad,undefined);p.logos.svg='data:image/svg+xml;base64,AA==';assert.equal(parseProject(p,p.kind).logos.svg,undefined);
  p.settings.racePosition=119;assert.equal(parseProject(p,p.kind).settings.racePosition,7);assert.throws(()=>parseProject(p,'circle-packing'));
});
test('standalone HTML embeds the same self-contained calculation and painter, safely escaping user labels',()=>{
  const p=initial('bar-chart-race');p.rows[0].group='</script><script>alert(1)</script>';p.settings.title='<عنوان>';const view=raceView(p,132,600),html=raceHTML('<svg></svg>',p,view);
  assert.match(html,/requestAnimationFrame/);assert.ok(html.includes('\\u003c/script'));assert.ok(!html.includes('<title><عنوان>'));
  const code=html.match(/const frame=([\s\S]*?),paint=/)[1],compute=new Function('return ('+code+')')();
  assert.deepEqual(compute(raceTable(p.rows,'hide'),1.5,'global'),raceFrame(raceTable(p.rows,'hide'),1.5,'global'));
});
