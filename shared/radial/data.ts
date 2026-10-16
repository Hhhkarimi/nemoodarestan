import { validateRows } from '../series/model.ts';
import type { Row } from '../series/model.ts';
const normalize=(v:unknown):string=>String(v??'').trim().replace(/\uFEFF/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c_-]/g,'').toLowerCase();
export function radialMatrix(matrix:unknown[][],kind:'sunburst'|'spiral-heatmap'):Row[]{
  const lines=matrix.filter(row=>row.some(c=>String(c??'').trim()!==''));if(!lines.length)throw Error('فایل داده خالی است.');
  const aliases=kind==='sunburst'?['مسیر','path','hierarchy']:['تاریخ','زمان','date','time','x'];
  const header=lines[0].map(normalize),xi=header.findIndex(c=>aliases.includes(c)),vi=header.findIndex(c=>['مقدار','value','amount','count'].includes(c));
  const hasHeader=xi>=0||vi>=0;
  if(hasHeader&&(xi<0||vi<0))throw Error(kind==='sunburst'?'ستون‌های مسیر و مقدار لازم‌اند.':'ستون‌های تاریخ و مقدار لازم‌اند.');
  return validateRows((hasHeader?lines.slice(1):lines).map(c=>{
    let x=c[hasHeader?xi:0];
    // Excel serial dates use UTC; text dates stay untouched for strict validation.
    if(kind==='spiral-heatmap'&&typeof x==='number'&&x>=1&&x<=109574){const date=new Date(Date.UTC(1899,11,30)+Math.round(x*86400000));x=date.toISOString().slice(0,x%1?16:10);}
    return {x:String(x??'').trim(),group:'',value:c[hasHeader?vi:1]};
  }),kind);
}
export function treeRows(value:unknown):Row[]{
  const rows:unknown[]=[],seen=new Set<object>();let count=0;
  function visit(raw:unknown,parent:string[],depth:number):void{
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||depth>8||++count>500)throw Error('ساختار درختی باید حداکثر ۸ سطح و ۵۰۰ شاخه داشته باشد.');
    if(seen.has(raw))throw Error('ساختار درختی چرخه دارد.');seen.add(raw);
    const node=raw as Record<string,unknown>,name=String(node.name??'').trim();
    if(!name||/[/>]/.test(name))throw Error('هر گره باید name داشته باشد؛ / و > جداکنندهٔ مسیر هستند.');
    const path=[...parent,name];
    if(Array.isArray(node.children)&&node.children.length){
      if(node.value!==undefined&&Number(node.value)!==0)throw Error('در JSON درختی، فقط برگ‌ها باید value داشته باشند؛ جمع شاخه‌ها خودکار است.');
      node.children.forEach(child=>visit(child,path,depth+1));
    }else rows.push({x:path.join('/'),group:path[0],value:node.value});
  }
  visit(value,[],1);return validateRows(rows,'sunburst');
}
