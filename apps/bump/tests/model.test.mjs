import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,initial,parseProject,validateRows} from '../../../shared/series/model.ts';
import {rankTable,labelPositions} from '../../../shared/comparison/math.ts';
import {rankInputHint} from '../../../shared/comparison/data.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
const rows=(values)=>validateRows(values.map(([x,group,value])=>({x,group,value})),'bump');
test('ranks values per period with competition, dense, and average ties and input period order',()=>{
 const data=rows([['بهمن','الف',10],['بهمن','ب',10],['بهمن','ج',4],['دی','الف',2],['دی','ب',7],['دی','ج',3]]),s=defaults('bump');
 for(const [tieMethod,ranks] of [['competition',[1,1,3]],['dense',[1,1,2]],['average',[1.5,1.5,3]]]){
  const result=rankTable(data,{...s,tieMethod});assert.deepEqual(result.periods,['بهمن','دی']);assert.deepEqual(result.series.map(g=>g.points[0].rank),ranks);assert.equal(result.ties,2);
 }
 assert.deepEqual(rankTable(data,{...s,rankDirection:'lower'}).series.map(g=>g.points[0].rank),[2,2,1]);
});
test('preserves fractional manual ranks and missing periods instead of inventing zero values',()=>{
 const data=rows([['اول','الف',1.5],['دوم','ب',4],['سوم','الف',2]]),result=rankTable(data,{...defaults('bump'),rankInput:'rank'});
 assert.equal(result.series[0].points[0].rank,1.5);assert.equal(result.series[0].points[1],null);assert.equal(result.missing,3);assert.equal(result.maxRank,4);
 assert.throws(()=>rankTable(rows([['اول','الف',0],['دوم','الف',1]]),{...defaults('bump'),rankInput:'rank'}));
 assert.throws(()=>rankTable(rows([['اول','الف',.5],['دوم','الف',1]]),{...defaults('bump'),rankInput:'rank'}));
 assert.equal(rankTable(rows([['اول','الف',-10],['دوم','الف',-1]]),defaults('bump')).maxRank,1);
});
test('duplicate group/period rows, blank values, and invalid period counts fail before import',()=>{
 assert.throws(()=>rows([['a','g',1],['a','g',2],['b','g',3]]),/بیش از یک/);
 assert.throws(()=>rows([['a','g',1]]));for(const value of ['',Infinity,NaN])assert.throws(()=>rows([['a','g',value],['b','g',2]]));
});
test('reads Persian/English long and wide tables, infers rank headers, and round trips CSV and JSON',()=>{
 const data=parseMatrix([['دوره','الف','ب'],['اول','۲',''],['دوم','۳','۴']],'bump');assert.equal(data.length,3);assert.equal(rankTable(data,defaults('bump')).missing,1);
 assert.throws(()=>parseMatrix([['دوره','الف','ب'],['اول','۲',''],['دوم','',''],['سوم','۳','۴']],'bump'),/هیچ مقداری/);
 assert.equal(parseText('[{"period":"a","group":"g","rank":1},{"period":"b","group":"g","rank":2}]','bump')[0].value,1);
 assert.equal(parseMatrix([['دوره','نام','رتبه'],['اول','تیم الف',1],['دوم','تیم الف',2]],'bump')[0].group,'تیم الف');
 assert.equal(rankInputHint('دوره,گروه,رتبه\na,g,1'),'rank');assert.equal(rankInputHint([['period','group','score']]),'value');assert.equal(rankInputHint('[{"period":"a","group":"g","rank":1}]'),'rank');
 assert.deepEqual(parseText(dataCSV(data,'bump'),'bump'),data);
});
test('end labels never collide or leave plot bounds and report insufficient height',()=>{
 const labels=labelPositions([{key:'a',y:20},{key:'b',y:21},{key:'c',y:100}],10,100,20),ys=[...labels.values()];assert.ok(ys.every(y=>y>=10&&y<=100));assert.ok(ys[1]-ys[0]>=20&&ys[2]-ys[1]>=20);
 assert.throws(()=>labelPositions([{key:'a',y:5},{key:'b',y:6}],0,10,20));
});
test('project preserves uploaded font, colors, sizes and ranking settings, accepting older defaults safely',()=>{
 const p=initial('bump');p.fonts=[{id:'uploaded-test',name:'myfont.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];p.settings.fontFamily='uploaded-test';p.settings.titleSize=42;p.settings.pointRadius=9;p.settings.tieMethod='average';p.colors[p.rows[0].group]='#123456';
 assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),p.kind),p);p.settings.tieMethod='constructor';assert.equal(parseProject(p,p.kind).settings.tieMethod,'competition');assert.throws(()=>parseProject(p,'beeswarm'));
});
