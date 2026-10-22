import {test} from 'node:test';import assert from 'node:assert/strict';
import {initial,defaults,parseProject,validateRows} from '../../../shared/series/model.ts';
import {ternaryPoints,ternaryPosition,ternaryOrders,validateTernarySettings} from '../../../shared/ternary/math.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
import {ternaryText} from '../../../shared/ternary/data.ts';
const kind='ternary';
test('barycentric geometry maps exact vertices and centroid, stays inside triangle, and preserves scaling and all permutations',()=>{
  const h=100*Math.sqrt(3)/2;assert.deepEqual(ternaryPosition(100,0,0,100),{x:50,y:0});assert.deepEqual(ternaryPosition(0,100,0,100),{x:0,y:h});assert.deepEqual(ternaryPosition(0,0,100,100),{x:100,y:h});
  const center=ternaryPosition(1,1,1,100);assert.ok(Math.abs(center.x-50)<1e-9);assert.ok(Math.abs(center.y-h*2/3)<1e-9);
  for(const order of ternaryOrders)for(let a=0;a<=10;a++)for(let b=0;b<=10;b++){const c=21-a-b,p=ternaryPosition(a,b,c,100,order);assert.ok(p.y>=-1e-9&&p.y<=h+1e-9);assert.ok(p.x>=50-p.y/Math.sqrt(3)-1e-9&&p.x<=50+p.y/Math.sqrt(3)+1e-9);const scaled=ternaryPosition(a*100,b*100,c*100,100,order);assert.ok(Math.hypot(p.x-scaled.x,p.y-scaled.y)<1e-9);}
  assert.deepEqual(ternaryPosition(100,0,0,100,'bac'),{x:0,y:h});
});
test('normalization preserves raw values, allows zero components and rejects zero sums, negatives, missing and duplicate names',()=>{
  const rows=validateRows([{name:'a',a:3,b:6,c:1,size:0},{name:'b',a:0,b:100,c:0}],kind),points=ternaryPoints(rows,true);assert.equal(points[0].a,.3);assert.equal(points[0].sum,10);assert.equal(rows[0].value,3);assert.equal(rows[0].size,0);assert.throws(()=>ternaryPoints(rows,false),/۱۰۰/);
  for(const values of [[0,0,0],[-1,20,81],['',20,80],[NaN,0,1]])assert.throws(()=>validateRows([{x:'x',group:'g',value:values[0],second:values[1],third:values[2]}],kind));assert.throws(()=>validateRows([{x:'x',a:1,b:2,c:3},{x:'x',a:3,b:2,c:1}],kind));
  const p=initial(kind);validateTernarySettings(p.rows,{...p.settings,ternaryNormalize:false});assert.throws(()=>validateTernarySettings(p.rows,{...p.settings,ternaryA:'',ternaryB:'B',ternaryC:'C'}));
});
test('Persian CSV, optional size/group, custom component names, JSON and exported CSV round trip',()=>{
  const input=ternaryText('نام,گروه,آموزش,پژوهش,سایر,اندازه\nالف,یک,۳۰,۵۰,۲۰,۰\nب,دو,۱۰,۴۰,۵۰,');assert.deepEqual(input.labels,['آموزش','پژوهش','سایر']);assert.equal(input.rows[0].size,0);assert.equal(input.rows[1].size,1);
  const settings={...defaults(kind),ternaryA:'آموزش',ternaryB:'پژوهش',ternaryC:'سایر'};assert.deepEqual(parseText(dataCSV(input.rows,kind,settings),kind),input.rows);assert.deepEqual(ternaryText(dataCSV(input.rows,kind,settings)).labels,input.labels);
  assert.equal(parseMatrix([['A','B','C'],[1,2,3]],kind)[0].group,'همه');assert.equal(parseText('[{"name":"p","a":1,"b":2,"c":3}]',kind)[0].third,3);
});
test('projects preserve fonts, group and axis colors, sizes, raw rows and vertex order',()=>{
  const p=initial(kind);p.fonts=[{id:'uploaded-test',name:'font.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];Object.assign(p.settings,{fontFamily:'uploaded-test',ternaryOrder:'cab',ternarySizeMode:'value',ternaryA:'اول',ternaryB:'دوم',ternaryC:'سوم',ternaryAColor:'#123456',ternaryBColor:'#abcdef',ternaryGridStep:25,ternaryLabels:'all',titleSize:36,fontSize:18,valueSize:15,pointRadius:10});p.colors.اقتصادی='#887766';assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),kind),p);
  p.settings.ternaryOrder='bad';p.settings.ternaryGridStep=17;p.settings.ternaryAColor='red';const clean=parseProject(p,kind);assert.equal(clean.settings.ternaryOrder,'abc');assert.equal(clean.settings.ternaryGridStep,20);assert.equal(clean.settings.ternaryAColor,defaults(kind).ternaryAColor);
});
