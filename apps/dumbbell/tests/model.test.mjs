import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,initial,parseProject,validateRows,colorFor,colorLabel} from '../../../shared/series/model.ts';
import {pairs,validateBusinessData} from '../../../shared/business/math.ts';
import {pairLabelsHint} from '../../../shared/business/data.ts';
import {dataCSV,dataMatrix,parseText,parseMatrix} from '../../../shared/series/data.ts';
const rows=data=>validateRows(data.map(([x,value,second])=>({x,group:'مقایسه',value,second})),'dumbbell');
test('paired data retains negative, zero, equal, increasing and decreasing endpoints and finite differences',()=>{
  const data=rows([['negative',-5,4],['zero',0,3],['equal',7,7],['up',10,15],['down',10,8]]),result=pairs(data,'input');
  assert.deepEqual(result.map(p=>p.change),[9,3,0,5,-2]);
  assert.deepEqual(result.map(p=>p.percent),[null,null,0,50,-20]);
  assert.deepEqual(pairs(data,'percent').map(p=>p.name),['up','equal','down','negative','zero']);
  assert.equal(pairs(data,'gap')[0].name,'negative');assert.equal(pairs(data,'first')[0].first,10);
});
test('reads reordered aliases, custom series headers, Persian numbers and JSON without swapping values',()=>{
  const data=parseMatrix([['after','name','before'],['۱۴','الف','۱۰']],'dumbbell');assert.equal(data[0].value,10);assert.equal(data[0].second,14);
  const csv='نام,۱۴۰۳,۱۴۰۴\nتهران,۲۵,۳۱';assert.deepEqual(pairLabelsHint(csv),['۱۴۰۳','۱۴۰۴']);assert.equal(parseText(csv,'dumbbell')[0].second,31);
  assert.deepEqual(parseText('[{"name":"الف","before":10,"after":14}]','dumbbell'),data);
  assert.deepEqual(parseText(JSON.stringify(data),'dumbbell'),data);
  const s={...defaults('dumbbell'),firstLabel:'بعد',secondLabel:'قبل'},exported=dataCSV(data,'dumbbell',s);
  assert.deepEqual(parseText(exported,'dumbbell'),data);assert.deepEqual(pairLabelsHint(exported),['بعد','قبل']);
  assert.deepEqual(parseMatrix(dataMatrix(data,'dumbbell',s),'dumbbell'),data);
});
test('missing endpoints, duplicate names, nonnumeric values and oversized tables fail before import',()=>{
  for(const value of ['',undefined,Infinity,'abc']){
    assert.throws(()=>rows([['a',value,2]]));assert.throws(()=>rows([['a',2,value]]));
  }
  assert.throws(()=>rows([['a',1,2],['a',3,4]]),/تکراری/);
  assert.throws(()=>rows(Array.from({length:101},(_,i)=>[String(i),1,2])),/۱۰۰/);
  assert.throws(()=>parseMatrix([['name','before'],['a',1]],'dumbbell'),/سه ستون/);
});
test('log scale rejects nonpositive endpoints and series labels must be distinct and nonblank',()=>{
  const s=defaults('dumbbell');for(const value of [0,-1])assert.throws(()=>validateBusinessData(rows([['a',2,value]]),'dumbbell',{...s,axisScale:'log'}),/مثبت/);
  assert.doesNotThrow(()=>validateBusinessData(rows([['a',2,3]]),'dumbbell',{...s,axisScale:'log'}));
  assert.throws(()=>validateBusinessData(rows([['a',2,3]]),'dumbbell',{...s,secondLabel:s.firstLabel}));
  assert.throws(()=>validateBusinessData(rows([['a',2,3]]),'dumbbell',{...s,firstLabel:' '}));
});
test('projects preserve both endpoint columns, font, sizes, custom labels and stable series colors',()=>{
  const p=initial('dumbbell');p.rows=rows([['a',0,5],['b',-2,-1]]);p.fonts=[{id:'uploaded-test',name:'test.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];
  Object.assign(p.settings,{fontFamily:'uploaded-test',firstLabel:'بودجه',secondLabel:'عملکرد',pointRadius:9,valueSize:16,legendSize:20,pairSort:'gap',connectorStyle:'arrow',changeLabel:'both'});p.colors.first='#123456';p.colors.second='#654321';
  assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),p.kind),p);assert.equal(colorLabel(p,'first'),'بودجه');assert.equal(colorFor(p,'second'),'#654321');
  p.settings.firstLabel='۱۴۰۳';assert.equal(colorFor(p,'first'),'#123456');
  assert.throws(()=>parseProject({...p,settings:{...p.settings,axisScale:'log'}},p.kind));
});
