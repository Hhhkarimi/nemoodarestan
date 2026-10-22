import type { Row,Settings } from '../series/model.ts';
export interface DateParts {year:number;month:number;day:number}
export interface CalendarCell {epoch:number;date:string;day:number;weekday:number;value:number|null;count:number}
export interface CalendarMonth {year:number;month:number;label:string;offset:number;weeks:number;cells:CalendarCell[]}
export interface CalendarTable {year:number;years:number[];months:CalendarMonth[];cells:CalendarCell[];yearCells:CalendarCell[];observed:CalendarCell[];outside:number}
const dayMS=86400000,partsCache=new Map<string,DateParts>(),formatters=new Map<string,Intl.DateTimeFormat>();
export const ascii=(input:unknown):string=>String(input??'').trim().replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
export const isoDate=(epoch:number):string=>new Date(epoch*dayMS).toISOString().slice(0,10);
export function dateParts(epoch:number,calendar:string):DateParts{
  if(calendar==='gregory'){const d=new Date(epoch*dayMS);return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()};}
  const key=String(epoch),cached=partsCache.get(key);if(cached)return cached;
  let formatter=formatters.get('parts');if(!formatter){formatter=new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn',{timeZone:'UTC',year:'numeric',month:'numeric',day:'numeric'});formatters.set('parts',formatter);}
  const values=formatter.formatToParts(new Date(epoch*dayMS)),get=(type:string):number=>Number(values.find(p=>p.type===type)?.value),parts={year:get('year'),month:get('month'),day:get('day')};
  if(!Number.isFinite(parts.year))throw Error('تقویم شمسی در این مرورگر پشتیبانی نمی‌شود.');
  if(partsCache.size>12000)partsCache.clear();partsCache.set(key,parts);return parts;
}
export function calendarDay(year:number,month:number,day:number,calendar:string):number{
  if(!Number.isInteger(year)||!Number.isInteger(month)||!Number.isInteger(day)||month<1||month>12||day<1||day>31)throw Error('تاریخ معتبر نیست.');
  if(calendar==='gregory'){
    const epoch=Math.floor(Date.UTC(year,month-1,day)/dayMS),p=dateParts(epoch,calendar);if(p.year!==year||p.month!==month||p.day!==day)throw Error('روز یا ماه معتبر نیست.');return epoch;
  }
  const target=year*372+month*31+day;
  let lo=Math.floor(Date.UTC(year+621,0,1)/dayMS),hi=Math.floor(Date.UTC(year+623,0,1)/dayMS);
  while(lo<hi){const mid=Math.floor((lo+hi)/2),p=dateParts(mid,'persian'),value=p.year*372+p.month*31+p.day;if(value<target)lo=mid+1;else hi=mid;}
  const p=dateParts(lo,'persian');if(p.year!==year||p.month!==month||p.day!==day)throw Error('روز یا ماه شمسی معتبر نیست؛ کبیسه بودن سال را بررسی کنید.');return lo;
}
export function canonicalCalendarDate(input:unknown):string{
  if(typeof input==='number'){
    if(!Number.isFinite(input)||input<1||input>110000||!Number.isInteger(input)||input===60)throw Error('شمارهٔ تاریخ Excel معتبر نیست؛ برای تاریخ شمسی از متن استفاده کنید.');
    return canonicalCalendarDate(isoDate(Math.floor(Date.UTC(1899,11,30)/dayMS)+input+(input<60?1:0)));
  }
  const match=/^(?:(j|g):)?(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/i.exec(ascii(input));
  if(!match)throw Error('تاریخ را با قالب YYYY-MM-DD یا YYYY/MM/DD وارد کنید؛ سال شمسی یا میلادی خودکار تشخیص داده می‌شود.');
  const [,prefix,ys,ms,ds]=match,y=Number(ys),m=Number(ms),d=Number(ds),calendar=prefix?.toLowerCase()==='j'||(!prefix&&y<1700)?'persian':'gregory';
  const epoch=calendarDay(y,m,d,calendar),date=isoDate(epoch);if(date<'1900-01-01'||date>'2200-12-31')throw Error('تاریخ باید در محدودهٔ میلادی ۱۹۰۰ تا ۲۲۰۰ یا معادل شمسی آن باشد.');return date;
}
export function validateCalendarRows(input:unknown,number:(v:unknown)=>number):Row[]{
  if(!Array.isArray(input)||!input.length||input.length>5000)throw Error('بین ۱ تا ۵۰۰۰ ردیف تاریخ و مقدار لازم است.');
  return input.map((raw,i)=>{
    if(!raw||typeof raw!=='object')throw Error(`ردیف ${i+1} معتبر نیست.`);
    const r=raw as Record<string,unknown>,x=canonicalCalendarDate(r.x??r.date??r.تاریخ),value=number(r.value??r.amount??r.مقدار);
    if(!Number.isFinite(value)||Math.abs(value)>1e12)throw Error(`ردیف ${i+1}: مقدار عددی تا یک تریلیون لازم است؛ مقدار خالی صفر نیست. برای نبود داده ردیف آن روز را حذف کنید.`);
    return {x,group:x,value};
  });
}
export function monthName(month:number,calendar:string):string{
  return (calendar==='persian'?['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند']:['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'])[month-1];
}
export function calendarYearLabel(year:number,digits='fa'):string{return new Intl.NumberFormat(digits==='fa'?'fa-IR':'en-US',{useGrouping:false}).format(year);}
export function calendarTable(rows:Row[],s:Settings):CalendarTable{
  const daily=new Map<string,number[]>(),years=[...new Set(rows.map(r=>dateParts(Math.floor(Date.parse(r.x+'T00:00:00Z')/dayMS),s.calendar).year))].sort((a,b)=>a-b);
  const requested=Number(s.calendarYear),year=years.includes(requested)?requested:years[0];
  for(const r of rows){const values=daily.get(r.x)??[];values.push(r.value);daily.set(r.x,values);}
  const allMonths=Array.from({length:12},(_,i)=>i+1).map(month=>{
    const start=calendarDay(year,month,1,s.calendar),end=month===12?calendarDay(year+1,1,1,s.calendar):calendarDay(year,month+1,1,s.calendar),offset=(new Date(start*dayMS).getUTCDay()-Number(s.calendarWeekStart)+7)%7;
    const cells=Array.from({length:end-start},(_,i)=>{
      const epoch=start+i,date=isoDate(epoch),values=daily.get(date)??[],value=values.length?(s.aggregation==='max'?Math.max(...values):values.reduce((sum,v)=>sum+v,0)/(s.aggregation==='mean'?values.length:1)):null;
      return {epoch,date,day:i+1,weekday:new Date(epoch*dayMS).getUTCDay(),value,count:values.length};
    });return {year,month,label:monthName(month,s.calendar),offset,weeks:Math.ceil((offset+cells.length)/7),cells};
  });
  const months=s.calendarView==='month'?allMonths.filter(m=>m.month===s.calendarMonth):allMonths,cells=months.flatMap(m=>m.cells),dates=new Set(cells.map(c=>c.date)),observed=cells.filter(c=>c.value!==null),outside=rows.filter(r=>!dates.has(r.x)).length;
  return {year,years,months,cells,yearCells:allMonths.flatMap(m=>m.cells),observed,outside};
}
export function calendarSamples(alternative=false):Row[]{
  const start=calendarDay(1404,1,1,'persian');
  return Array.from({length:365},(_,i)=>({x:isoDate(start+i),group:isoDate(start+i),value:alternative?Math.round(18+12*Math.sin(i*.085)+6*Math.cos(i*.7)):Math.max(0,Math.round(45+28*Math.sin(i*.15)+20*Math.cos(i*.04)+(i%7===2?25:0)))})).filter((_,i)=>i%29!==8&&i%37!==18).map((r,i)=>i%41===0?{...r,value:0}:r);
}
