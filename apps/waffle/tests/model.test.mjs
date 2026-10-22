import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,parseProject,validateRows} from '../../../shared/series/model.ts';
import {waffleParts} from '../../../shared/multivariate/math.ts';
import {dataCSV,parseText} from '../../../shared/series/data.ts';
test('waffle largest remainders allocate exactly N cells with less than one cell error and stable ties',()=>{
  for(const count of [10,37,100,201,999,1000])for(let groups=2;groups<=24;groups++){
    const rows=Array.from({length:groups},(_,i)=>({x:String(i),group:String(i),value:(i*19+groups*7)%41}));
    const parts=waffleParts(rows,count);assert.equal(parts.reduce((sum,p)=>sum+p.count,0),count);
    let start=0;for(const part of parts){assert.equal(part.start,start);start+=part.count;assert.ok(Math.abs(part.count-part.share*count)<1+1e-9);assert.ok(Number.isInteger(part.count)&&part.count>=0);}
  }
  assert.deepEqual(waffleParts(['a','b','c'].map(group=>({group,value:1})),100).map(p=>p.count),[34,33,33]);
});
test('waffle aggregates duplicates and keeps zero and tiny categories in exact source data',()=>{
  const rows=validateRows([{group:'الف',value:25},{group:'الف',value:25},{group:'ب',value:49.99},{group:'کوچک',value:.01},{group:'صفر',value:0}],'waffle');
  const parts=waffleParts(rows,100);assert.equal(parts[0].value,50);assert.ok(Math.abs(parts[2].share-.0001)<1e-12);assert.equal(parts[2].count,0);assert.equal(parts[3].count,0);
  for(const value of [-1,'',Infinity])assert.throws(()=>validateRows([{group:'الف',value}],'waffle'));assert.throws(()=>validateRows([{group:'الف',value:0}],'waffle'));
});
test('waffle imports Persian digits, two-column JSON, and round trips CSV and project with fonts and sizes',()=>{
  const rows=parseText('گروه,مقدار\nالف,۳۷\nب,۶۳','waffle');assert.equal(rows[0].value,37);assert.deepEqual(parseText(dataCSV(rows,'waffle'),'waffle'),rows);
  assert.deepEqual(parseText('[{"category":"الف","value":37},{"category":"ب","value":63}]','waffle'),rows);
  const p=initial('waffle');p.rows=rows;p.fonts=[{id:'uploaded-test',name:'font.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];Object.assign(p.settings,{fontFamily:'uploaded-test',titleSize:35,fontSize:19,legendSize:17,valueSize:16,waffleCells:200,waffleColumns:20,waffleGap:7,waffleShape:'circle',waffleFill:'column',direction:'rtl'});p.colors.الف='#123456';assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),p.kind),p);
  p.settings.waffleShape='bad';p.settings.waffleCells=99999;const clean=parseProject(p,p.kind);assert.equal(clean.settings.waffleShape,'square');assert.equal(clean.settings.waffleCells,1000);
});
