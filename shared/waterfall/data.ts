import type { Row } from '../series/model.ts';
import { numberValue } from '../series/model.ts';
import { validateWaterfallRows } from './math.ts';
const norm=(v:unknown):string=>String(v??'').trim().replace(/^\uFEFF/,'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c_-]/g,'').toLowerCase();
export function waterfallMatrix(matrix:unknown[][]):Row[]{
  const lines=matrix.filter(r=>r.some(v=>String(v??'').trim()!==''));if(!lines.length)throw Error('فایل داده خالی است.');
  const head=lines[0].map(norm),find=(aliases:string[]):number=>head.findIndex(h=>aliases.map(norm).includes(h));
  const name=find(['نام','مرحله','name','label','step','x']),value=find(['مقدار','value','amount','delta']),type=find(['نوع','type','measure','group']),hasHeader=name>=0;
  if(hasHeader&&value<0)throw Error('ستون‌های نام و مقدار لازم‌اند؛ ستون نوع اختیاری است.');
  return validateWaterfallRows((hasHeader?lines.slice(1):lines).map(c=>({x:String(c[hasHeader?name:0]??'').trim(),group:hasHeader&&type>=0?c[type]:hasHeader?'change':c[2]??'change',value:c[hasHeader?value:1]})),numberValue);
}
