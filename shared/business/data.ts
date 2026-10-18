import Papa from 'papaparse';
import { numberValue, validateRows } from '../series/model.ts';
import type { Row } from '../series/model.ts';
import type { BusinessKind } from './math.ts';
const normalize=(v:unknown):string=>String(v??'').trim().replace(/^\uFEFF/,'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c_-]/g,'').toLowerCase();
const names=['نام','عنوان','آیتم','name','item','label','x'];
const firstNames=['مقداراول','اول','قبل','بودجه','first','before','start','from','value1','value','budget'];
const secondNames=['مقداردوم','دوم','بعد','عملکرد','second','after','end','to','value2','actual'];
function columns(matrix:unknown[][]):{lines:unknown[][];name:number;first:number;second:number;header:boolean}{
  const lines=matrix.filter(row=>row.some(c=>String(c??'').trim()!=='')),header=(lines[0]??[]).map(normalize);
  const index=(aliases:string[]):number=>header.findIndex(h=>aliases.includes(h));let name=index(names),first=header.findIndex(h=>h.startsWith('مقداراول:')),second=header.findIndex(h=>h.startsWith('مقداردوم:'));
  if(first<0)first=index(firstNames);if(second<0)second=index(secondNames);
  const hasHeader=name>=0||first>=0||second>=0;
  if(name>=0&&(first<0||second<0)&&header.length===3){const others=header.map((_,i)=>i).filter(i=>i!==name);if(first<0&&second<0){[first,second]=others;}else if(first<0)first=others.find(i=>i!==second)!;else second=others.find(i=>i!==first)!;}
  if(hasHeader&&(name<0||first<0||second<0))throw Error('سه ستون نام، مقدار اول و مقدار دوم لازم است.');
  return {lines,name:hasHeader?name:0,first:hasHeader?first:1,second:hasHeader?second:2,header:hasHeader};
}
export function businessMatrix(matrix:unknown[][],kind:BusinessKind):Row[]{
  if(kind==='dumbbell'){
    const c=columns(matrix);return validateRows((c.header?c.lines.slice(1):c.lines).map(row=>({x:String(row[c.name]??''),group:'مقایسه',value:numberValue(row[c.first]),second:numberValue(row[c.second])})),kind);
  }
  const lines=matrix.filter(row=>row.some(c=>String(c??'').trim()!==''));if(!lines.length)throw Error('فایل داده خالی است.');
  const header=lines[0].map(normalize),xi=header.findIndex(h=>['دسته','بازار','منطقه','category','market','region','x'].includes(h)),gi=header.findIndex(h=>['زیرگروه','زیرمجموعه','گروه','برند','group','segment','series','brand'].includes(h)),vi=header.findIndex(h=>['مقدار','ارزش','فروش','value','amount','sales'].includes(h));
  if(xi>=0&&gi<0&&vi<0&&header.length>1){
    const cols=lines[0].map((name,i)=>({name:String(name??'').trim(),i})).filter(c=>c.i!==xi&&c.name);
    return validateRows(lines.slice(1).flatMap(row=>cols.map(c=>({x:String(row[xi]??''),group:c.name,value:String(row[c.i]??'').trim()===''?0:numberValue(row[c.i])}))),kind);
  }
  const hasHeader=xi>=0||gi>=0||vi>=0;if(hasHeader&&(xi<0||gi<0||vi<0))throw Error('ستون‌های دسته، زیرگروه و مقدار لازم‌اند.');
  return validateRows((hasHeader?lines.slice(1):lines).map(row=>({x:String(row[hasHeader?xi:0]??''),group:String(row[hasHeader?gi:1]??''),value:numberValue(row[hasHeader?vi:2])})),kind);
}
export function pairLabelsHint(source:string|unknown[][]):[string,string]|undefined{
  let matrix:unknown[][];
  if(Array.isArray(source))matrix=source;
  else if(/^[\s\uFEFF]*[\[{]/.test(source))return undefined;
  else matrix=Papa.parse<string[]>(source.trim(),{skipEmptyLines:'greedy'}).data;
  const c=columns(matrix);if(!c.header)return undefined;
  const one=String(c.lines[0][c.first]).trim().replace(/^مقدار\s*اول\s*:\s*/,''),two=String(c.lines[0][c.second]).trim().replace(/^مقدار\s*دوم\s*:\s*/,'');
  const generic=(value:string):boolean=>['مقداراول','مقداردوم','value1','value2','first','second','value','start','end','from','to'].includes(normalize(value));
  const exported=normalize(c.lines[0][c.first]).startsWith('مقداراول:');
  return exported||!generic(one)||!generic(two)?[one.slice(0,40),two.slice(0,40)]:undefined;
}
