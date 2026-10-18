import { numberValue, validateRows } from '../series/model.ts';
import type { Row } from '../series/model.ts';
import type { ComparisonKind } from './math.ts';
import Papa from 'papaparse';
const normalize=(v:unknown):string=>String(v??'').trim().replace(/^\uFEFF/,'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c_-]/g,'').toLowerCase();
const aliases={x:['دوره','زمان','تاریخ','period','date','time','x'],group:['گروه','نامگروه','برند','تیم','group','series','category'],name:['نام','برچسب','مشاهده','name','label','id'],value:['مقدار','امتیاز','رتبه','قیمت','حقوق','value','score','rank','amount']};
export function rankInputHint(source:string|unknown[][]):'rank'|'value'|undefined{
  let headers:unknown[]=[];
  if(Array.isArray(source))headers=source.find(row=>row.some(c=>String(c??'').trim()))??[];
  else if(/^[\s\uFEFF]*[\[{]/.test(source)){
    const json:unknown=JSON.parse(source.replace(/^\uFEFF/,''));const rows=Array.isArray(json)?json:json&&typeof json==='object'&&'rows' in json?(json as {rows:unknown}).rows:undefined;
    if(Array.isArray(rows)&&rows[0]&&typeof rows[0]==='object')headers=Object.keys(rows[0]);
  }else headers=Papa.parse<string[]>(source.trim(),{skipEmptyLines:'greedy'}).data[0]??[];
  const normalized=headers.map(normalize);if(normalized.some(h=>['رتبه','rank'].includes(h)))return 'rank';
  if(normalized.some(h=>['مقدار','امتیاز','value','score','amount'].includes(h)))return 'value';return undefined;
}
export function comparisonMatrix(matrix:unknown[][],kind:ComparisonKind):Row[]{
  const lines=matrix.filter(row=>row.some(c=>String(c??'').trim()!==''));if(!lines.length)throw Error('فایل داده خالی است.');
  const header=lines[0].map(normalize),index=(key:keyof typeof aliases):number=>header.findIndex(c=>aliases[key].map(normalize).includes(c));
  const xi=index('x'),ni=index('name'),gi=index('group')>=0?index('group'):kind==='bump'?ni:-1,vi=index('value');
  if(kind==='bump'&&xi>=0&&gi<0&&vi<0&&lines[0].length>1){
    const columns=lines[0].map((name,i)=>({name:String(name??'').trim(),i})).filter(c=>c.i!==xi&&c.name);
    for(const cells of lines.slice(1))if(!columns.some(c=>String(cells[c.i]??'').trim()!==''))throw Error(`دورهٔ «${String(cells[xi]??'')}» هیچ مقداری ندارد؛ دست‌کم یک مشاهده برای این دوره وارد کنید.`);
    return validateRows(lines.slice(1).flatMap(cells=>columns.filter(c=>String(cells[c.i]??'').trim()!=='').map(c=>({x:String(cells[xi]??''),group:c.name,value:numberValue(cells[c.i])}))),kind);
  }
  const hasHeader=vi>=0||xi>=0||gi>=0||ni>=0;
  if(hasHeader&&(vi<0||(kind==='bump'&&(xi<0||gi<0))))throw Error(kind==='bump'?'ستون‌های دوره، گروه و مقدار (یا رتبه) لازم‌اند.':'ستون مقدار الزامی است؛ نام و گروه اختیاری‌اند.');
  return validateRows((hasHeader?lines.slice(1):lines).map((cells,i)=>{
    if(kind==='bump')return {x:String(cells[hasHeader?xi:0]??''),group:String(cells[hasHeader?gi:1]??''),value:numberValue(cells[hasHeader?vi:2])};
    return hasHeader?{x:String(ni>=0?cells[ni]??'':''),group:String(gi>=0?cells[gi]??'':''),value:numberValue(cells[vi])}:cells.length>=3?{x:String(cells[0]??''),group:String(cells[1]??''),value:numberValue(cells[2])}:cells.length===2?{x:String(cells[0]??''),group:'همه',value:numberValue(cells[1])}:{x:`مشاهدهٔ ${i+1}`,group:'همه',value:numberValue(cells[0])};
  }),kind);
}
