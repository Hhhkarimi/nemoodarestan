import Papa from 'papaparse';
import type { Row,NetworkNode } from '../series/model.ts';
import { numberValue } from '../series/model.ts';
import { validateNetworkRows,validateNodes,graphTable } from './math.ts';
export interface NetworkInput { rows:Row[];nodes:NetworkNode[] }
const norm=(v:unknown):string=>String(v??'').trim().replace(/^\uFEFF/,'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c_/-]/g,'').toLowerCase();
export function networkMatrix(matrix:unknown[][]):NetworkInput{
  const lines=matrix.filter(r=>r.some(v=>String(v??'').trim()!==''));if(!lines.length)throw Error('فایل داده خالی است.');
  const head=lines[0].map(norm),find=(aliases:string[]):number=>head.findIndex(h=>aliases.map(norm).includes(h));
  const source=find(['مبدأ','مبدا','مبدأ / نام','نام','source','from','name','x']),target=find(['مقصد','target','to']),weight=find(['وزن','مقدار','value','weight','size']),type=find(['نوع','type']),group=find(['گروه','group']),hasHeader=source>=0;
  if(hasHeader&&target<0&&type<0)throw Error('ستون‌های مبدأ و مقصد لازم‌اند؛ ستون وزن اختیاری است.');
  const rows:unknown[]=[],nodes:unknown[]=[];
  for(const c of hasHeader?lines.slice(1):lines){
    const kind=type>=0?norm(c[type]):'link',id=String(c[hasHeader?source:0]??'').trim(),rawValue=c[hasHeader?weight:2];
    if(['node','گره'].includes(kind))nodes.push({id,group:group>=0?String(c[group]??'').trim()||'همه':'همه',size:String(rawValue??'').trim()===''?1:numberValue(rawValue)});
    else if(['link','edge','ارتباط','پیوند',''].includes(kind))rows.push({x:id,group:String(c[hasHeader?target:1]??'').trim(),value:String(rawValue??'').trim()===''?1:numberValue(rawValue)});
    else throw Error('نوع ردیف شبکه باید گره (node) یا ارتباط (link) باشد.');
  }
  const result={rows:validateNetworkRows(rows,numberValue),nodes:validateNodes(nodes)};graphTable(result.rows,result.nodes);return result;
}
export function networkText(text:string):NetworkInput{
  if(!text.trim())throw Error('متنی برای ورود داده وجود ندارد.');
  if(/^[\s\uFEFF]*[\[{]/.test(text)){
    const input:unknown=JSON.parse(text.replace(/^\uFEFF/,''));
    if(Array.isArray(input)){
      const keys=[...new Set(input.flatMap(r=>r&&typeof r==='object'?Object.keys(r):[]))];
      if(input.every(r=>r&&typeof r==='object'&&'x' in r&&'group' in r))return {rows:validateNetworkRows(input,numberValue),nodes:[]};
      return networkMatrix([keys,...input.map(r=>keys.map(k=>r?.[k]))]);
    }
    if(!input||typeof input!=='object')throw Error('JSON باید ارتباط‌ها یا شیئی با nodes و links باشد.');
    const p=input as Record<string,unknown>,nodes=validateNodes(p.nodes,numberValue),raw=p.links??p.rows??[];
    if(!Array.isArray(raw))throw Error('links باید آرایه باشد.');
    const rows=validateNetworkRows(raw,numberValue);graphTable(rows,nodes);return {rows,nodes};
  }
  const parsed=Papa.parse<string[]>(text.trim(),{skipEmptyLines:'greedy'});
  if(parsed.errors.some(e=>e.code!=='UndetectableDelimiter'))throw Error('ساختار CSV معتبر نیست.');
  return networkMatrix(parsed.data);
}
export function networkDataMatrix(rows:Row[],nodes:NetworkNode[]=[]):(string|number)[][]{
  return [['نوع','مبدأ / نام','مقصد','مقدار','گروه'],...nodes.map(n=>['node',n.id,'',n.size,n.group]),...rows.map(r=>['link',r.x,r.group,r.value,''])];
}
