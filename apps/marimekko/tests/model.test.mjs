import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,initial,parseProject,validateRows} from '../../../shared/series/model.ts';
import {mekkoCells,mekkoTable} from '../../../shared/business/math.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
const rows=data=>validateRows(data.map(([x,group,value])=>({x,group,value})),'marimekko');
const s=defaults('marimekko');

test('aggregates duplicate cells, fills missing combinations, and preserves category and segment order',()=>{
  const data=rows([['ب','الف',10],['ب','الف',20],['ب','ب',10],['الف','ب',60]]),table=mekkoTable(data,s);
  assert.equal(table.total,100);assert.equal(table.missing,1);
  assert.deepEqual(table.categories.map(c=>[c.name,c.total,c.values]),[['ب',40,[30,10]],['الف',60,[0,60]]]);
  assert.deepEqual(mekkoTable(data,{...s,mekkoSort:'total',segmentSort:'total'}).groups,['ب','الف']);
  assert.equal(mekkoTable(data,{...s,mekkoSort:'total'}).categories[0].name,'الف');
});
test('category widths and cell areas encode absolute values even with gaps',()=>{
  const table=mekkoTable(rows([['a','one',10],['a','two',30],['b','one',60]]),s);
  for(const gap of [0,4,14]){
    const cells=mekkoCells(table,600,gap),a=cells[0],b=cells[2];
    assert.ok(Math.abs(a.size/b.size-40/60)<1e-12);
    assert.ok(Math.abs(a.size*a.share/(b.size*b.share)-10/60)<1e-12);
    assert.ok(Math.abs(b.start+b.size-600)<1e-9);
    assert.equal(a.share,.25);assert.equal(a.totalShare,.1);
    assert.ok(cells.every(c=>c.low>=0&&c.high<=1&&c.start>=0&&c.start+c.size<=600+1e-9));
  }
  assert.throws(()=>mekkoCells(table,10,14));
});
test('wide, long, Persian-number CSV, and canonical JSON all retain the data',()=>{
  const data=parseMatrix([['دسته','سرو','باران'],['تهران','۳۰',''],['فارس','۱۰','۶۰']],'marimekko');
  assert.deepEqual(data.map(r=>r.value),[30,0,10,60]);
  assert.deepEqual(parseText(dataCSV(data,'marimekko'),'marimekko'),data);
  assert.deepEqual(parseText(JSON.stringify(data),'marimekko'),data);
  assert.equal(parseText('[{"category":"a","segment":"b","value":"۲٫۵"}]','marimekko')[0].value,2.5);
});
test('rejects negative, blank, zero-total categories and excessive categories without hiding them',()=>{
  for(const value of [-1,'',Infinity,NaN])assert.throws(()=>rows([['a','b',value]]));
  assert.throws(()=>rows([['a','b',10],['zero','b',0]]),/صفر/);
  assert.throws(()=>rows(Array.from({length:25},(_,i)=>[String(i),'b',1])),/۲۴/);
  assert.throws(()=>parseMatrix([['دسته','برند۱','برند۲'],['صفر','','']],'marimekko'),/صفر/);
});
test('projects preserve custom font, individual colors, sizes, orientation, percentage basis and sorting',()=>{
  const p=initial('marimekko');p.fonts=[{id:'uploaded-test',name:'test.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];
  Object.assign(p.settings,{fontFamily:'uploaded-test',fontSize:18,valueSize:15,titleSize:38,mekkoOrientation:'horizontal',mekkoPercent:'total',mekkoSort:'total',segmentSort:'name',mekkoGap:9});p.colors[p.rows[0].group]='#123456';
  assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),p.kind),p);
  p.settings.mekkoOrientation='constructor';assert.equal(parseProject(p,p.kind).settings.mekkoOrientation,'vertical');
  assert.throws(()=>parseProject(p,'dumbbell'));
});
