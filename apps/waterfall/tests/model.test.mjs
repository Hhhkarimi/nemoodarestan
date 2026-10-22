import {test} from 'node:test';import assert from 'node:assert/strict';
import {initial,defaults,parseProject,validateRows,colorFor} from '../../../shared/series/model.ts';
import {waterfallSteps,waterfallDomain} from '../../../shared/waterfall/math.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
const kind='waterfall';
test('waterfall handles increases, decreases, zero crossing, intermediate sums and absolute resets without double counting',()=>{
  const rows=validateRows([{x:'start',group:'absolute',value:100},{x:'up',group:'change',value:40},{x:'sum',group:'subtotal',value:0},{x:'down',group:'change',value:-200},{x:'total',group:'total',value:0},{x:'reset',group:'absolute',value:-10},{x:'zero',group:'change',value:10}],kind),steps=waterfallSteps(rows,999);
  assert.deepEqual(steps.map(s=>s.after),[100,140,140,-60,-60,-10,0]);assert.deepEqual(steps.map(s=>[s.from,s.to]),[[0,100],[100,140],[0,140],[140,-60],[0,-60],[0,-10],[-10,0]]);assert.equal(steps[3].color,'decrease');assert.equal(waterfallSteps([{x:'a',group:'change',value:4}],6)[0].after,10);
});
test('CSV, reordered Persian headers, JSON aliases and automatic blank totals round trip in original order',()=>{
  const rows=parseText('نام,نوع,مقدار\nدرآمد,مقدار مطلق,۱۰۰\nهزینه,تغییر,-۳۰\nجمع,جمع میانی,\nسایر,تغییر,۱۰\nجمع,جمع کل,',kind);assert.deepEqual(waterfallSteps(rows).map(s=>s.after),[100,70,70,80,80]);assert.deepEqual(parseText(dataCSV(rows,kind),kind),rows);
  assert.deepEqual(parseText('[{"name":"x","type":"absolute","value":10},{"name":"y","type":"total"}]',kind),[{x:'x',group:'absolute',value:10},{x:'y',group:'total',value:0}]);assert.equal(parseMatrix([['مقدار','نام'],['۱۲','یک']],kind)[0].value,12);
});
test('blank changes, unknown types, supplied nonzero automatic totals and excessive rows are rejected',()=>{
  for(const value of ['',NaN,Infinity])assert.throws(()=>validateRows([{x:'a',group:'change',value}],kind));assert.throws(()=>validateRows([{x:'a',group:'total',value:3}],kind),/خودکار/);assert.throws(()=>validateRows([{x:'a',group:'bad',value:0}],kind));assert.throws(()=>validateRows(Array.from({length:101},()=>({x:'a',group:'change',value:1})),kind));
});
test('projects retain fonts, semantic colors, orientation, balance labels, base and sizes',()=>{
  const p=initial(kind);Object.assign(p.settings,{waterfallBase:-200,waterfallOrientation:'horizontal',waterfallValue:'balance',waterfallLabels:'slanted',waterfallGap:.4,titleSize:34,fontSize:18,valueSize:16});p.fonts=[{id:'uploaded-test',name:'font.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];p.settings.fontFamily='uploaded-test';p.colors.decrease='#cc1122';assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),kind),p);assert.equal(colorFor(p,'decrease'),'#cc1122');assert.notEqual(colorFor(p,'increase'),colorFor(p,'total'));
  p.settings.waterfallOrientation='bad';assert.equal(parseProject(p,kind).settings.waterfallOrientation,'vertical');assert.throws(()=>parseProject(p,'network'));
});
test('axis ticks cover every endpoint and zero with finite readable intervals, including a zero-only chart',()=>{
  for(const values of [[0],[100,20,-170],[1e-8,-3e-8],[-1e12,1e12]]){
    const steps=waterfallSteps(values.map((value,i)=>({x:String(i),group:'change',value}))),domain=waterfallDomain(steps);
    assert.ok(domain.hi>domain.lo);for(const s of steps)assert.ok(s.from>=domain.lo&&s.to>=domain.lo&&s.from<=domain.hi&&s.to<=domain.hi);assert.ok(domain.lo<=0&&domain.hi>=0);assert.ok(domain.ticks.every(Number.isFinite));assert.ok(domain.ticks.length<20);
  }
  assert.deepEqual(parseText('[{"label":"sum","measure":"total"}]',kind),[{x:'sum',group:'total',value:0}]);
});
