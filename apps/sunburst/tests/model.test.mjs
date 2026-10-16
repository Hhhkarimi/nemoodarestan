import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,parseProject,validateRows} from '../../../shared/series/model.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
import {hierarchy,flatten,tau} from '../../../shared/radial/math.ts';
test('leaf paths aggregate duplicates and preserve proportional, nested angular intervals',()=>{
 const rows=validateRows([{x:'الف/یک',value:3},{x:'الف/دو',value:1},{x:'ب/یک',value:4},{x:'الف/یک',value:2}],'sunburst');
 const tree=hierarchy(rows,'input');assert.equal(tree.value,10);assert.deepEqual(tree.children.map(n=>n.value),[6,4]);
 assert.ok(Math.abs(tree.children[0].end/tau-.6)<1e-12);
 for(const parent of [tree,...flatten(tree)].filter(n=>n.children.length)){assert.equal(parent.children[0].start,parent.start);assert.equal(parent.children.at(-1).end,parent.end);assert.equal(parent.value,parent.children.reduce((v,n)=>v+n.value,0));}
});
test('parent totals cannot double count descendants; invalid or excessively deep paths are rejected',()=>{
 assert.throws(()=>validateRows([{x:'الف',value:10},{x:'الف/یک',value:10}],'sunburst'),/فقط مقدار برگ/);
 for(const x of ['الف//ب','الف/','/الف',Array(10).fill('a').join('/')])assert.throws(()=>validateRows([{x,value:1}],'sunburst'));
 for(const value of [-1,Infinity,NaN,''])assert.throws(()=>validateRows([{x:'الف',value}],'sunburst'));
 assert.throws(()=>validateRows([{x:'الف',value:0}],'sunburst'));
 assert.equal(validateRows([{x:'الف > ب',value:'۳٫۵'}],'sunburst')[0].x,'الف/ب');
});
test('reads nested JSON, Persian/English path tables and CSV without losing labels',()=>{
 const rows=parseText('{"name":"فروش","children":[{"name":"داخلی","children":[{"name":"الف","value":5}]},{"name":"خارجی","value":7}]}','sunburst');
 assert.equal(hierarchy(rows,'input').value,12);assert.equal(rows[0].x,'فروش/داخلی/الف');
 assert.throws(()=>parseText('{"name":"a","value":8,"children":[{"name":"b","value":8}]}','sunburst'));
 assert.equal(parseMatrix([['path','value'],['الف/ب','۱۲']],'sunburst')[0].value,12);
 assert.deepEqual(parseText(dataCSV(rows,'sunburst'),'sunburst'),rows);
});
test('project stores font, colors, hierarchy focus and settings, while rejecting another chart kind',()=>{
 const p=initial('sunburst');p.settings.focusPath='داخلی';p.fonts=[{id:'uploaded-test',name:'custom.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];p.settings.fontFamily='uploaded-test';p.colors['داخلی']='#123456';
 assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),p.kind),p);
 assert.throws(()=>parseProject(initial('spiral-heatmap'),'sunburst'));
});
