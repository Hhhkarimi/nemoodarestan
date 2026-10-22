import type { Row } from '../series/model.ts';
import { numberValue } from '../series/model.ts';
import { validateCalendarRows } from './math.ts';
const norm=(v:unknown):string=>String(v??'').trim().replace(/^\uFEFF/,'').replace(/[\s\u200c_-]/g,'').toLowerCase();
export function calendarMatrix(matrix:unknown[][]):Row[]{
  const lines=matrix.filter(r=>r.some(v=>String(v??'').trim()!==''));if(!lines.length)throw Error('فایل داده خالی است.');
  const h=lines[0].map(norm),di=h.findIndex(v=>['تاریخ','روز','date','day','x'].includes(v)),vi=h.findIndex(v=>['مقدار','value','amount','count','تعداد'].includes(v)),header=di>=0;
  if(header&&vi<0)throw Error('ستون مقدار یا value لازم است.');
  return validateCalendarRows((header?lines.slice(1):lines).map(c=>({x:c[header?di:0],value:c[header?vi:1]})),numberValue);
}
