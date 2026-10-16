import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stack,stackOffsetWiggle,stackOrderInsideOut} from 'd3-shape';
import {initial,parseProject,validateRows} from '../../../shared/series/model.ts';
import {streamTable} from '../../../shared/series/math.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
test('aggregates duplicate period/group rows, preserves input order, and fills missing combinations',()=>{
 const rows=validateRows([{x:'بهمن',group:'الف',value:3},{x:'دی',group:'ب',value:5},{x:'بهمن',group:'الف',value:2}],'streamgraph');
 const table=streamTable(rows);assert.deepEqual(table.periods,['بهمن','دی']);assert.deepEqual(table.values,[[5,0],[0,5]]);assert.equal(table.missing,2);
 const stacked=stack().keys([0,1]).value((r,k)=>r[k]).offset(stackOffsetWiggle).order(stackOrderInsideOut)(table.values);
 for(const layer of stacked)layer.forEach((p,i)=>{assert.ok(p.every(Number.isFinite));assert.equal(p[1]-p[0],table.values[i][layer.key]);});
});
test('normalization gives 100 percent while an all-zero period stays finite',()=>{
 const rows=[{x:'۱',group:'الف',value:3},{x:'۱',group:'ب',value:1},{x:'۲',group:'الف',value:0}];
 assert.deepEqual(streamTable(rows,true).values,[[75,25],[0,0]]);
});
test('reads Persian CSV, wide Excel matrices, JSON aliases, and round trips quoted labels',()=>{
 const p=initial('streamgraph');p.rows[0].group='گروه، "اول"';assert.deepEqual(parseText(dataCSV(p.rows,p.kind),p.kind),p.rows);
 assert.deepEqual(parseMatrix([['دوره','فروش','هزینه'],['مهر','۱۲٫۵','۲'],['آبان','۱۵','']],'streamgraph').map(r=>r.value),[12.5,2,15,0]);
 assert.equal(parseText('[{"period":"مهر","series":"الف","value":2},{"period":"آبان","series":"الف","value":3}]','streamgraph').length,2);
});
test('rejects negative, infinite, blank and one-period datasets before replacing the draft',()=>{
 for(const value of [-1,Infinity,''])assert.throws(()=>validateRows([{x:'a',group:'g',value},{x:'b',group:'g',value:1}],'streamgraph'));
 assert.throws(()=>validateRows([{x:'a',group:'g',value:1}],'streamgraph'));
 assert.throws(()=>parseProject(initial('ridgeline'),'streamgraph'));
});
test('project round trip keeps uploaded fonts and resets invalid palettes and dimensions',()=>{
 const p=initial('streamgraph');p.fonts=[{id:'uploaded-test',name:'custom.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];p.settings.fontFamily='uploaded-test';
 const restored=parseProject(JSON.parse(JSON.stringify(p)),p.kind);assert.equal(restored.settings.fontFamily,'uploaded-test');assert.deepEqual(restored.fonts,p.fonts);
 p.settings.width=Infinity;p.settings.palette='constructor';assert.equal(parseProject(p,p.kind).settings.width,1200);assert.equal(parseProject(p,p.kind).settings.palette,'ocean');
});
