import { numberValue,validateRows } from '../series/model.ts';
import type { Row } from '../series/model.ts';
import type { MultiKind } from './math.ts';
const norm=(value:unknown):string=>String(value??'').trim().replace(/^\uFEFF/,'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c_-]/g,'').toLowerCase();
export function multiMatrix(matrix:unknown[][],kind:MultiKind):Row[]{
  const lines=matrix.filter(r=>r.some(v=>String(v??'').trim()!==''));
  if(!lines.length)throw Error('فایل داده خالی است.');
  const header=lines[0].map(norm),index=(names:string[]):number=>header.findIndex(h=>names.map(norm).includes(h));
  const gi=index(['گروه','دسته','group','category','series']),ni=index(['نام','مورد','محصول','name','item','x']),vi=index(['مقدار','value','amount','تعداد','درصد']),ai=index(['شاخص','محور','axis','dimension','metric']);
  if(kind==='waffle'){
    const named=gi>=0?gi:ni,hasHeader=named>=0;
    if(hasHeader&&vi<0)throw Error('ستون‌های گروه و مقدار لازم‌اند.');
    return validateRows((hasHeader?lines.slice(1):lines).map(c=>({group:String(c[hasHeader?named:0]??'').trim(),value:numberValue(c[hasHeader?vi:1])})),kind);
  }
  if(ni<0)throw Error('ستون «نام» یا name لازم است. جدول گسترده: نام، گروه (اختیاری)، سپس ستون‌های شاخص‌ها.');
  if(ai>=0){
    if(vi<0)throw Error('در جدول طولی، ستون‌های نام، شاخص و مقدار لازم‌اند.');
    return validateRows(lines.slice(1).filter(c=>String(c[vi]??'').trim()!=='').map(c=>({x:String(c[ni]??'').trim(),group:gi>=0?String(c[gi]??'').trim():'همه',axis:String(c[ai]??'').trim(),value:numberValue(c[vi])})),kind);
  }
  const columns=lines[0].map((name,i)=>({name:String(name??'').trim(),i})).filter(c=>c.i!==ni&&c.i!==gi);
  if(columns.some(c=>!c.name)||new Set(columns.map(c=>norm(c.name))).size!==columns.length)throw Error('نام شاخص‌ها باید غیرخالی و یکتا باشد.');
  return validateRows(lines.slice(1).flatMap(c=>columns.filter(col=>String(c[col.i]??'').trim()!=='').map(col=>({x:String(c[ni]??'').trim(),group:gi>=0?String(c[gi]??'').trim():'همه',axis:col.name,value:numberValue(c[col.i])}))),kind);
}
