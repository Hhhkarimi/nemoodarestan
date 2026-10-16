import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,parseProject,validateRows} from '../../../shared/series/model.ts';
import {autoBandwidth,distributions,gaussianDensity} from '../../../shared/series/math.ts';
import {dataCSV,parseText} from '../../../shared/series/data.ts';
test('weighted Gaussian density integrates to one and retains the expected weighted statistics',()=>{
 const rows=validateRows([{group:'الف',x:'0',value:1},{group:'الف',x:'2',value:3}],'ridgeline');
 const {groups}=distributions(rows,.5,1000),group=groups[0];let integral=0;
 for(let i=1;i<group.points.length;i++){const a=group.points[i-1],b=group.points[i];integral+=(b[0]-a[0])*(a[1]+b[1])/2;}
 assert.ok(Math.abs(integral-1)<.0001);assert.equal(group.mean,1.5);assert.equal(group.median,2);
 assert.ok(gaussianDensity([{x:0,weight:1}],0,1)>gaussianDensity([{x:0,weight:1}],2,1));
});
test('constant groups, single observations and large finite values produce stable finite curves',()=>{
 for(const x of ['7','1000000000000']){const {domain,groups}=distributions([{group:'g',x,value:1}],.000001);assert.ok(domain[1]>domain[0]);assert.ok(groups[0].points.every(p=>p.every(Number.isFinite)));}
 assert.ok(Number.isFinite(autoBandwidth([{x:4,weight:1},{x:4,weight:1}])));
});
test('accepts Persian observations and optional weights and round trips the complete CSV',()=>{
 const rows=parseText('گروه,مقدار\nالف,۱۲٫۵\nب,-۲','ridgeline');assert.deepEqual(rows,[{group:'الف',x:'12.5',value:1},{group:'ب',x:'-2',value:1}]);
 const p=initial('ridgeline');assert.deepEqual(parseText(dataCSV(p.rows,p.kind),p.kind),p.rows);
 assert.deepEqual(parseText('[{"group":"الف","value":10,"weight":2}]','ridgeline'),[{group:'الف',x:'10',value:2}]);
});
test('rejects invalid observations and nonpositive weights while allowing negative measurements',()=>{
 for(const value of [0,-1,Infinity])assert.throws(()=>validateRows([{group:'g',x:'3',value}],'ridgeline'));
 assert.throws(()=>validateRows([{group:'g',x:'ناعدد',value:1}],'ridgeline'));
 assert.equal(validateRows([{group:'g',x:'-3',value:1}],'ridgeline')[0].x,'-3');
});
test('keeps fonts and weights in project files and rejects remote font URLs',()=>{
 const p=initial('ridgeline');p.rows[0].value=3;p.fonts=[{id:'uploaded-real',name:'sample.ttf',dataUrl:'data:font/ttf;base64,AA==',format:'truetype'}];p.settings.fontFamily='uploaded-real';
 const q=parseProject(JSON.parse(JSON.stringify(p)),p.kind);assert.equal(q.rows[0].value,3);assert.equal(q.fonts[0].dataUrl,p.fonts[0].dataUrl);
 p.fonts[0].dataUrl='https://example.com/font.ttf';assert.equal(parseProject(p,p.kind).fonts.length,0);assert.equal(parseProject(p,p.kind).settings.fontFamily,'Vazirmatn');
});
