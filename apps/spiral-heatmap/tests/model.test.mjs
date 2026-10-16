import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,parseProject,validateRows} from '../../../shared/series/model.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
import {canonicalDate,heatTable,heatDomain,heatColor,spiralCell} from '../../../shared/radial/math.ts';
const rows=(pairs)=>validateRows(pairs.map(([x,value])=>({x,value})),'spiral-heatmap');
test('strict date normalization supports Persian digits, leap days and UTC hours',()=>{
 assert.equal(canonicalDate('۲۰۲۴/۲/۲۹'),'2024-02-29');assert.equal(canonicalDate('2025-3-21 08:30'),'2025-03-21T08:30');
 for(const date of ['2025-02-29','2024-02-30','2025-13-01','2025-01-01T24:00','1404-01-01','bad'])assert.throws(()=>canonicalDate(date));
});
test('chronological bins preserve gaps and zero, aggregating duplicate timestamps explicitly',()=>{
 const input=rows([['2024-03-02',0],['2024-02-28',4],['2024-02-28',8]]),table=heatTable(input,'day','mean');
 assert.deepEqual(table.map(c=>c.date),['2024-02-28','2024-02-29','2024-03-01','2024-03-02']);assert.deepEqual(table.map(c=>c.value),[6,null,null,0]);assert.equal(table[0].count,2);
 assert.equal(heatTable(input,'day','sum')[0].value,12);assert.equal(heatTable(input,'day','max')[0].value,8);
 const monthly=heatTable(rows([['2024-12-28',2],['2025-02-02',7]]),'month','sum');assert.deepEqual(monthly.map(c=>c.value),[2,null,7]);assert.equal(monthly[1].date,'2025-01-01');
 const hourly=heatTable(rows([['2025-01-01T23:15',2],['2025-01-02T01:59',6]]),'hour','mean');assert.deepEqual(hourly.map(c=>c.value),[2,null,6]);
 assert.throws(()=>heatTable(rows([['2000-01-01',1],['2025-01-01',2]]),'day','mean'),/۵۰۰۰/);
});
test('color domain handles negatives, constants, manual clipping and reversed ramps',()=>{
 const p=initial('spiral-heatmap'),s=p.settings,cells=heatTable(rows([['2025-01-01',-5],['2025-01-03',5]]),'day','mean');
 assert.deepEqual(heatDomain(cells,s),[-5,5]);assert.match(heatColor(5,[5,5],s),/^#[0-9a-f]{6}$/);
 assert.equal(heatColor(-20,[-5,5],s),heatColor(-5,[-5,5],s));assert.equal(heatColor(-5,[-5,5],{...s,reverseColors:true}),heatColor(5,[-5,5],s));
 assert.throws(()=>heatDomain(cells,{autoDomain:false,domainMin:10,domainMax:0}));
});
test('spiral tiles remain finite, inside the radius and separated across adjacent turns',()=>{
 for(const slots of [3,7,30,366])for(const index of [0,slots-1,slots,999]){
  const g=spiralCell(index,1000,slots,250,40,2,45,true);assert.ok(Number.isFinite(g.x)&&g.thickness>0);assert.doesNotMatch(g.path,/NaN|Infinity/);
  const coords=[...g.path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);assert.ok(coords.every(([x,y])=>Math.hypot(x,y)<=250.002));
  if(index+slots<1000){const next=spiralCell(index+slots,1000,slots,250,40,2,45,true);assert.ok(Math.hypot(next.x,next.y)-Math.hypot(g.x,g.y)>g.thickness);}
 }
 const dense=spiralCell(100,5000,3,70,30,8,0,true),next=spiralCell(103,5000,3,70,30,8,0,true);assert.ok(Math.hypot(next.x,next.y)-Math.hypot(dense.x,dense.y)>dense.thickness);
});
test('CSV/JSON/Excel dates and project with custom fonts round trip',()=>{
 const p=initial('spiral-heatmap');assert.deepEqual(parseText(dataCSV(p.rows,p.kind),p.kind),p.rows);
 assert.equal(parseText('[{"date":"2025-03-21","value":-3}]',p.kind)[0].value,-3);assert.equal(parseMatrix([['تاریخ','مقدار'],[45737,2]],p.kind)[0].x,'2025-03-21');
 p.fonts=[{id:'uploaded-test',name:'custom.ttf',dataUrl:'data:font/ttf;base64,AA==',format:'truetype'}];p.settings.fontFamily='uploaded-test';p.settings.slotsPerTurn=7;p.settings.heatPalette='custom';
 assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),p.kind),p);
});
