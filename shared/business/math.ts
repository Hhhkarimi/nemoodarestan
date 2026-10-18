import type { Row, Settings } from '../series/model.ts';
export type BusinessKind='marimekko'|'dumbbell';
export interface MekkoCategory {name:string;total:number;values:number[]}
export interface MekkoTable {groups:string[];categories:MekkoCategory[];total:number;missing:number}
export interface MekkoCell {category:string;group:string;value:number;share:number;totalShare:number;start:number;size:number;low:number;high:number}
export interface Pair {name:string;first:number;second:number;change:number;percent:number|null}
type Numeric=(v:unknown)=>number;
export function validateBusinessRows(input:unknown,kind:BusinessKind,numeric:Numeric):Row[]{
  if(!Array.isArray(input)||!input.length)throw Error('حداقل یک ردیف داده وارد کنید.');
  if(input.length>(kind==='dumbbell'?100:5000))throw Error(kind==='dumbbell'?'حداکثر ۱۰۰ مقایسه پشتیبانی می‌شود.':'حداکثر ۵۰۰۰ ردیف داده مجاز است.');
  const seen=new Set<string>();
  const rows=input.map((raw,i)=>{
    if(!raw||typeof raw!=='object')throw Error(`ردیف ${i+1} معتبر نیست.`);
    const r=raw as Record<string,unknown>,x=String(r.x??'').trim(),group=kind==='dumbbell'?'مقایسه':String(r.group??'').trim(),value=numeric(r.value);
    if(!x||x.length>80||!group||group.length>80)throw Error(`ردیف ${i+1}: نام ${kind==='dumbbell'?'مقایسه':'دسته و زیرگروه'} باید بین ۱ تا ۸۰ حرف باشد.`);
    if(!Number.isFinite(value)||Math.abs(value)>1e12||(kind==='marimekko'&&value<0))throw Error(`ردیف ${i+1}: ${kind==='marimekko'?'مقدار نامنفی':'مقدار اول عددی'} با قدر مطلق حداکثر یک تریلیون لازم است.`);
    if(kind==='dumbbell'){
      const second=numeric(r.second);if(!Number.isFinite(second)||Math.abs(second)>1e12)throw Error(`ردیف ${i+1}: مقدار دوم خالی یا نامعتبر است.`);
      if(seen.has(x))throw Error(`نام «${x}» تکراری است؛ برای هر مقایسه یک نام یکتا انتخاب کنید.`);seen.add(x);return {x,group,value,second};
    }
    return {x,group,value};
  });
  if(kind==='marimekko'){
    if(new Set(rows.map(r=>r.x)).size>24||new Set(rows.map(r=>r.group)).size>24)throw Error('حداکثر ۲۴ دسته و ۲۴ زیرگروه پشتیبانی می‌شود.');
    mekkoTable(rows,{mekkoSort:'input',segmentSort:'input'});
  }
  return rows;
}
export function mekkoTable(rows:Row[],s:Pick<Settings,'mekkoSort'|'segmentSort'>):MekkoTable{
  let groups=[...new Set(rows.map(r=>r.group))];const names=[...new Set(rows.map(r=>r.x))],values=new Map<string,number>();
  for(const r of rows){const key=JSON.stringify([r.x,r.group]);values.set(key,(values.get(key)??0)+r.value);}
  const groupTotals=new Map(groups.map(group=>[group,rows.filter(r=>r.group===group).reduce((n,r)=>n+r.value,0)]));
  if(s.segmentSort==='total')groups.sort((a,b)=>groupTotals.get(b)!-groupTotals.get(a)!);if(s.segmentSort==='name')groups.sort((a,b)=>a.localeCompare(b,'fa'));
  const categories=names.map(name=>{const cells=groups.map(group=>values.get(JSON.stringify([name,group]))??0);return {name,total:cells.reduce((a,b)=>a+b,0),values:cells};});
  for(const c of categories)if(c.total<=0)throw Error(`مجموع دستهٔ «${c.name}» صفر است؛ برای تعیین اندازهٔ دسته، حداقل یک مقدار مثبت وارد کنید.`);
  if(s.mekkoSort==='total')categories.sort((a,b)=>b.total-a.total);if(s.mekkoSort==='name')categories.sort((a,b)=>a.name.localeCompare(b.name,'fa'));
  return {groups,categories,total:categories.reduce((n,c)=>n+c.total,0),missing:categories.length*groups.length-values.size};
}
export function mekkoCells(table:MekkoTable,length:number,gap:number):MekkoCell[]{
  const usable=length-gap*(table.categories.length-1);if(usable<=0)throw Error('فاصلهٔ دسته‌ها از فضای بوم بیشتر است؛ فاصله را کمتر یا بوم را بزرگ‌تر کنید.');
  let start=0;return table.categories.flatMap(category=>{const size=usable*category.total/table.total;let cumulative=0;
    const cells=table.groups.map((group,i)=>{const value=category.values[i],low=cumulative/category.total;cumulative+=value;return {category:category.name,group,value,share:value/category.total,totalShare:value/table.total,start,size,low,high:cumulative/category.total};});start+=size+gap;return cells;
  });
}
export function pairs(rows:Row[],sort:string):Pair[]{
  const values=rows.map(r=>({name:r.x,first:r.value,second:r.second!,change:r.second!-r.value,percent:r.value>0?(r.second!-r.value)/r.value*100:null}));
  if(sort==='name')values.sort((a,b)=>a.name.localeCompare(b.name,'fa'));
  else if(sort==='percent')values.sort((a,b)=>a.percent===null?(b.percent===null?0:1):b.percent===null?-1:b.percent-a.percent);
  else if(sort==='gap')values.sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));
  else if(sort==='first'||sort==='second'||sort==='change')values.sort((a,b)=>b[sort]-a[sort]);
  return values;
}
export function validateBusinessData(rows:Row[],kind:BusinessKind,s:Settings):void{
  if(kind==='marimekko')mekkoTable(rows,s);
  if(kind==='dumbbell'&&s.axisScale==='log'&&rows.some(r=>r.value<=0||r.second!<=0))throw Error('مقیاس لگاریتمی فقط مقدارهای مثبت را می‌پذیرد؛ برای صفر و مقدار منفی، مقیاس خطی را انتخاب کنید.');
  if(kind==='dumbbell'&&(!s.firstLabel.trim()||!s.secondLabel.trim()||s.firstLabel.trim()===s.secondLabel.trim()))throw Error('نام دو سری باید غیرخالی و متفاوت باشد.');
}
export function businessSamples(kind:BusinessKind,alternative=false):Row[]{
  if(kind==='marimekko'){
    const categories=alternative?['تولید','فروش','عملیات','توسعه']:['تهران','اصفهان','فارس','خراسان','آذربایجان'];
    const groups=alternative?['نیروی انسانی','مواد و تجهیزات','خدمات','سایر']:['برند سرو','برند باران','برند آبان','برند مانا'];
    const data=[[180,120,90,70],[110,80,95,45],[70,100,55,40],[100,50,65,55],[55,60,70,35]];
    return categories.flatMap((x,i)=>groups.map((group,j)=>({x,group,value:data[i][j]})));
  }
  const names=alternative?['تولید','بازاریابی','عملیات','منابع انسانی','فناوری','لجستیک']:['تهران','اصفهان','فارس','خراسان','آذربایجان','گیلان','کرمان'];
  const first=alternative?[95,54,72,45,64,38]:[120,85,72,94,58,64,43],second=alternative?[105,49,81,42,77,38]:[148,98,68,110,76,62,55];
  return names.map((x,i)=>({x,group:'مقایسه',value:first[i],second:second[i]}));
}
