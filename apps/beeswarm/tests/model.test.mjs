import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,initial,parseProject,validateRows} from '../../../shared/series/model.ts';
import {fitSwarm,median,packSwarm,validateComparisonData} from '../../../shared/comparison/math.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
function noOverlaps(points,radius,padding){for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)>=radius*2+padding-1e-7);}
test('deterministic packing preserves each x and observation, while avoiding overlap even for ties',()=>{
 const values=Array.from({length:180},(_,i)=>({index:i,x:Math.round(Math.sin(i*.8)*70+100)})),packed=packSwarm(values,4,1);
 assert.equal(packed.fits,true);assert.equal(packed.points.length,values.length);assert.deepEqual(packed,packSwarm(values,4,1));noOverlaps(packed.points,4,1);
 for(const p of packed.points)assert.equal(p.x,values[p.index].x);
 const ties=packSwarm(Array.from({length:40},(_,index)=>({index,x:0})),3,0);noOverlaps(ties.points,3,0);assert.ok(ties.points.some(p=>p.y<0)&&ties.points.some(p=>p.y>0));
});
test('automatic radius fits available height without dropping observations, and impossible layouts fail clearly',()=>{
 const values=Array.from({length:20},(_,index)=>({index,x:0}));const result=fitSwarm(values,7,0,45,true);
 assert.ok(result.radius<7);assert.equal(result.points.length,20);assert.ok(result.points.every(p=>Math.abs(p.y)+result.radius<=45));noOverlaps(result.points,result.radius,0);
 assert.throws(()=>fitSwarm(values,7,0,45,false),/جا نمی‌شوند/);assert.throws(()=>fitSwarm(values,7,5,1,true),/حذف نشده/);
});
test('accepts zero and negative observations and optional names/groups, preserving duplicates as separate points',()=>{
 const data=parseMatrix([['مقدار'],['۰'],['-۲'],['-۲']],'beeswarm');assert.equal(data.length,3);assert.equal(data[0].group,'همه');assert.deepEqual(data.map(r=>r.value),[0,-2,-2]);assert.equal(new Set(data.map(r=>r.x)).size,3);
 assert.equal(median(data.map(r=>r.value)),-2);assert.equal(median([2,4]),3);
 assert.throws(()=>validateComparisonData(data,'beeswarm',{...defaults('beeswarm'),axisScale:'log'}));
 for(const value of ['',Infinity,NaN])assert.throws(()=>validateRows([{x:'a',group:'g',value}],'beeswarm'));
 assert.throws(()=>validateRows(Array.from({length:2001},(_,i)=>({x:String(i),group:'g',value:i})),'beeswarm'));
});
test('CSV/JSON aliases round trip names containing punctuation without aggregation',()=>{
 const data=parseText('[{"name":"محصول، یک","category":"الف","value":12},{"name":"محصول دوم","category":"الف","value":12}]','beeswarm');assert.equal(data[0].x,'محصول، یک');assert.deepEqual(parseText(dataCSV(data,'beeswarm'),'beeswarm'),data);
 const unnamed=parseText('[{"value":3},{"value":4}]','beeswarm');assert.equal(unnamed[1].x,'مشاهدهٔ 2');
});
test('project retains font, sizes, point settings and colors; invalid enums and fonts reset safely',()=>{
 const p=initial('beeswarm');p.fonts=[{id:'uploaded-test',name:'custom.ttf',dataUrl:'data:font/ttf;base64,AA==',format:'truetype'}];p.settings.fontFamily='uploaded-test';p.settings.fontSize=19;p.settings.valueSize=14;p.settings.swarmLayout='combined';p.settings.pointRadius=8;p.colors[p.rows[0].group]='#abcdef';
 assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),p.kind),p);p.settings.swarmLayout='constructor';p.settings.pointRadius=999;const restored=parseProject(p,p.kind);assert.equal(restored.settings.swarmLayout,'grouped');assert.equal(restored.settings.pointRadius,14);
});
