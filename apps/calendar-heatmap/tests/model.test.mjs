import {test} from 'node:test';import assert from 'node:assert/strict';
import {initial,defaults,parseProject,validateRows} from '../../../shared/series/model.ts';
import {calendarDay,canonicalCalendarDate,dateParts,calendarTable,isoDate} from '../../../shared/calendar/math.ts';
import {heatDomain} from '../../../shared/radial/math.ts';
import {dataCSV,parseText,parseMatrix} from '../../../shared/series/data.ts';
const kind='calendar-heatmap';
test('Persian/Gregorian dates round trip, respect leap days and UTC boundaries, and import Excel dates',()=>{
  assert.equal(canonicalCalendarDate('۱۴۰۴/۰۱/۰۱'),'2025-03-21');assert.equal(canonicalCalendarDate('۱۴۰۳/۱۲/۳۰'),'2025-03-20');assert.throws(()=>canonicalCalendarDate('۱۴۰۴/۱۲/۳۰'));
  assert.equal(canonicalCalendarDate('2024-02-29'),'2024-02-29');assert.throws(()=>canonicalCalendarDate('2025-02-29'));assert.throws(()=>canonicalCalendarDate('1404-13-01'));assert.throws(()=>canonicalCalendarDate('2025-01-01T12:00'));
  assert.equal(canonicalCalendarDate(1),'1900-01-01');assert.equal(canonicalCalendarDate(59),'1900-02-28');assert.throws(()=>canonicalCalendarDate(60));assert.equal(canonicalCalendarDate(61),'1900-03-01');assert.equal(canonicalCalendarDate(45737),'2025-03-21');
  for(const year of [1399,1400,1403,1404,1405])for(let month=1;month<=12;month++){const epoch=calendarDay(year,month,1,'persian');assert.deepEqual(dateParts(epoch,'persian'),{year,month,day:1});assert.equal(canonicalCalendarDate(`${year}/${month}/1`),isoDate(epoch));}
});
test('calendar uses real month lengths and weekday offsets for each calendar and week start',()=>{
  const p=initial(kind),s={...p.settings,calendar:'persian',calendarYear:'1404',calendarWeekStart:'6'},table=calendarTable(p.rows,s);
  assert.equal(table.cells.length,365);assert.equal(table.months[0].offset,6);assert.equal(table.months[0].cells.length,31);assert.equal(table.months[11].cells.length,29);
  const leap=calendarTable(validateRows([{x:'1403/1/1',value:1}],kind),{...s,calendarYear:'1403'});assert.equal(leap.cells.length,366);assert.equal(leap.months[11].cells.length,30);
  const greg=calendarTable(validateRows([{x:'2024-01-01',value:1}],kind),{...s,calendar:'gregory',calendarYear:'2024',calendarWeekStart:'1'});assert.equal(greg.months[0].offset,0);assert.equal(greg.cells.length,366);assert.equal(greg.months[1].cells.length,29);
  for(const m of table.months){assert.ok(m.offset>=0&&m.offset<7);assert.ok(m.weeks<=6);for(const c of m.cells)assert.equal(dateParts(c.epoch,'persian').month,m.month);}
});
test('duplicate dates aggregate by chosen method; zero, negative values and missing days remain distinct',()=>{
  const rows=validateRows([{x:'1404/1/1',value:0},{x:'1404/1/2',value:-5},{x:'1404/1/2',value:15},{x:'1404/2/1',value:100}],kind),s={...defaults(kind),calendarView:'month',calendarMonth:1,aggregation:'sum'},t=calendarTable(rows,s);
  assert.equal(t.cells[0].value,0);assert.equal(t.cells[1].value,10);assert.equal(t.cells[1].count,2);assert.equal(t.cells[2].value,null);assert.equal(t.outside,1);assert.equal(calendarTable(rows,{...s,aggregation:'mean'}).cells[1].value,5);assert.equal(calendarTable(rows,{...s,aggregation:'max'}).cells[1].value,15);
  const domain=heatDomain(t.yearCells.map((c,index)=>({...c,index})),s);assert.deepEqual(domain,[0,100]);assert.deepEqual(heatDomain(calendarTable(rows,{...s,calendarMonth:2}).yearCells.map((c,index)=>({...c,index})),s),domain);
  assert.equal(calendarTable(rows,{...s,calendarMonth:12}).observed.length,0);
});
test('Persian dates, reordered CSV/Excel columns, JSON and project preserve data, fonts, colors and calendar settings',()=>{
  const rows=parseMatrix([['مقدار','تاریخ'],['۰','۱۴۰۴/۱/۱'],['۱۵','2025-03-22']],kind);assert.equal(rows[0].value,0);assert.deepEqual(parseText(dataCSV(rows,kind),kind),rows);assert.deepEqual(parseText('[{"date":"1404/1/1","value":0},{"date":"1404/1/2","value":15}]',kind),rows);
  const p=initial(kind);p.rows=rows;p.fonts=[{id:'uploaded-test',name:'font.woff2',dataUrl:'data:font/woff2;base64,AA==',format:'woff2'}];Object.assign(p.settings,{fontFamily:'uploaded-test',calendarView:'month',calendarYear:'1404',calendarMonth:2,calendarWeekStart:'1',calendarWeekend:true,calendarCellText:'value',heatPalette:'custom',lowColor:'#123456',highColor:'#abcdef',missingColor:'#eeeeee',valueSize:18,titleSize:34,fontSize:17});assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p)),kind),p);
  p.settings.calendarMonth=99;p.settings.calendarWeekStart='bad';p.settings.calendarView='bad';const clean=parseProject(p,kind);assert.equal(clean.settings.calendarMonth,12);assert.equal(clean.settings.calendarWeekStart,'6');assert.equal(clean.settings.calendarView,'year');
  for(const value of ['',Infinity,NaN])assert.throws(()=>validateRows([{x:'1404/1/1',value}],kind));
});
