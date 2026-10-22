import Papa from 'papaparse';
import type { Row } from '../series/model.ts';
import { numberValue } from '../series/model.ts';
import { validateTernaryRows } from './math.ts';
interface TernaryInput {rows:Row[];labels?:[string,string,string]}
const norm=(v:unknown):string=>String(v??'').trim().replace(/^\uFEFF/,'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c_-]/g,'').toLowerCase();
export function ternaryMatrix(matrix:unknown[][]):TernaryInput{
  const lines=matrix.filter(r=>r.some(v=>String(v??'').trim()!==''));if(!lines.length)throw Error('فایل داده خالی است.');
  const h=lines[0].map(norm),find=(aliases:string[]):number=>h.findIndex(v=>aliases.map(norm).includes(v)),ni=find(['نام','مشاهده','name','label','x']),gi=find(['گروه','group','category']),si=find(['اندازه','size','weight','وزن']);
  const indices=['a','b','c'].map(key=>h.findIndex(v=>v===key||v.startsWith(key+':')));
  let components=indices,labels:[string,string,string]|undefined;
  if(indices.some(i=>i<0)){
    const other=h.map((_,i)=>i).filter(i=>i!==ni&&i!==gi&&i!==si);if(other.length!==3)throw Error('سه ستون A، B و C یا سه ستون با نام اختصاصی مؤلفه‌ها لازم است.');components=other;
    if(ni<0)throw Error('ستون نام یا name لازم است.');labels=other.map(i=>String(lines[0][i]).trim()) as [string,string,string];
  }else if(components.every(i=>String(lines[0][i]).includes(':')))labels=components.map(i=>String(lines[0][i]).slice(String(lines[0][i]).indexOf(':')+1).trim()) as [string,string,string];
  if(labels&&(labels.some(v=>!v||v.length>40)||new Set(labels).size!==3))throw Error('نام سه مؤلفه باید یکتا و بین ۱ تا ۴۰ حرف باشد.');
  const rows=validateTernaryRows(lines.slice(1).map((r,i)=>({x:ni<0?`مشاهدهٔ ${i+1}`:r[ni],group:gi<0?'همه':r[gi],value:r[components[0]],second:r[components[1]],third:r[components[2]],size:si<0?1:r[si]})),numberValue);return {rows,labels};
}
export function ternaryText(text:string):TernaryInput{
  if(!text.trim())throw Error('متنی برای ورود داده وجود ندارد.');
  if(/^[\s\uFEFF]*[\[{]/.test(text)){
    const parsed:unknown=JSON.parse(text.replace(/^\uFEFF/,'')),rows=Array.isArray(parsed)?parsed:parsed&&typeof parsed==='object'&&'rows' in parsed?(parsed as {rows:unknown}).rows:undefined;
    if(!Array.isArray(rows))throw Error('JSON باید آرایه‌ای از مشاهده‌ها باشد.');
    if(rows.every(r=>r&&typeof r==='object'&&(('a' in r||'A' in r||'value' in r))))return {rows:validateTernaryRows(rows,numberValue)};
    const keys=[...new Set(rows.flatMap(r=>r&&typeof r==='object'?Object.keys(r):[]))];return ternaryMatrix([keys,...rows.map(r=>keys.map(k=>(r as Record<string,unknown>)?.[k]))]);
  }
  const parsed=Papa.parse<string[]>(text.trim(),{skipEmptyLines:'greedy'});if(parsed.errors.some(e=>e.code!=='UndetectableDelimiter'))throw Error('ساختار CSV معتبر نیست.');return ternaryMatrix(parsed.data);
}
