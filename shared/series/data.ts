import {multiMatrix} from '../multivariate/data.ts';
import Papa from 'papaparse';
import { numberValue, validateRows } from './model.ts';
import type { Kind, Row, Settings } from './model.ts';
import { radialMatrix, treeRows } from '../radial/data.ts';
import { comparisonMatrix } from '../comparison/data.ts';
import { businessMatrix } from '../business/data.ts';
import {motionMatrix} from '../motion/data.ts';
const normalize=(value:unknown):string=>String(value??'').trim().replace(/^\uFEFF/,'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c_-]/g,'').toLowerCase();
const aliases={group:['گروه','دسته','group','category','series','تیم'],x:['دوره','زمان','تاریخ','period','time','date','x'],value:['مقدار','مشاهده','value','amount','observation'],weight:['وزن','فراوانی','تعداد','weight','count','frequency']};
export function parseMatrix(matrix: unknown[][], kind: Kind): Row[] {
  if(kind==='waffle'||kind==='parallel-coordinates')return multiMatrix(matrix,kind);
  if(kind==='bar-chart-race'||kind==='circle-packing')return motionMatrix(matrix,kind);
  if(kind==='marimekko'||kind==='dumbbell')return businessMatrix(matrix,kind);
  if(kind==='bump'||kind==='beeswarm')return comparisonMatrix(matrix,kind);
  if(kind==='sunburst'||kind==='spiral-heatmap')return radialMatrix(matrix,kind);
  const lines=matrix.filter(row=>row.some(cell=>String(cell??'').trim()!==''));
  if(!lines.length)throw Error('فایل داده خالی است.');
  const header=lines[0].map(normalize);
  const index=(key:keyof typeof aliases):number=>header.findIndex(cell=>aliases[key].some(alias=>normalize(alias)===cell));
  const groupIndex=index('group'),valueIndex=index('value'),xIndex=index('x'),weightIndex=index('weight');
  if(kind==='streamgraph' && groupIndex<0 && xIndex>=0 && header.length>1){
    const columns=lines[0].map((name,index)=>({name:String(name??'').trim(),index})).filter(column=>column.index!==xIndex&&column.name);
    return validateRows(lines.slice(1).flatMap(cells=>columns.map(column=>({x:String(cells[xIndex]??'').trim(),group:column.name,value:String(cells[column.index]??'').trim()===''?0:numberValue(cells[column.index])}))),kind);
  }
  const hasHeader=groupIndex>=0;
  if(hasHeader&&(valueIndex<0||(kind==='streamgraph'&&xIndex<0)))throw Error(kind==='streamgraph'?'ستون‌های دوره، گروه و مقدار لازم‌اند.':'ستون‌های گروه و مقدار لازم‌اند؛ وزن اختیاری است.');
  const rows=(hasHeader?lines.slice(1):lines).map(cells=>{
    if(kind==='streamgraph')return {x:String(cells[hasHeader?xIndex:0]??'').trim(),group:String(cells[hasHeader?groupIndex:1]??'').trim(),value:numberValue(cells[hasHeader?valueIndex:2])};
    const weight=hasHeader?(weightIndex>=0?cells[weightIndex]:1):(cells[2]??1);
    return {group:String(cells[hasHeader?groupIndex:0]??'').trim(),x:String(cells[hasHeader?valueIndex:1]??'').trim(),value:numberValue(weight)};
  });
  return validateRows(rows,kind);
}
export function parseText(text: string, kind: Kind): Row[] {
  if(!text.trim())throw Error('متنی برای ورود داده وجود ندارد.');
  if(/^[\s\uFEFF]*[\[{]/.test(text)){
    const parsed:unknown=JSON.parse(text.replace(/^\uFEFF/,''));
    if((kind==='sunburst'||kind==='circle-packing')&&parsed&&typeof parsed==='object'&&!Array.isArray(parsed)&&'name' in parsed)return treeRows(parsed);
    const rows=Array.isArray(parsed)?parsed:(parsed&&typeof parsed==='object'&&'rows' in parsed?(parsed as {rows:unknown}).rows:undefined);
    if(!Array.isArray(rows))throw Error('JSON باید آرایه‌ای از ردیف‌ها باشد.');
    if(rows.every(row=>row&&typeof row==='object'&&'x' in row&&'group' in row&&'value' in row))return validateRows(rows,kind);
    const keys=[...new Set(rows.flatMap(row=>row&&typeof row==='object'?Object.keys(row):[]))];
    return parseMatrix([keys,...rows.map(row=>keys.map(key=>(row as Record<string,unknown>)?.[key]))],kind);
  }
  const parsed=Papa.parse<string[]>(text.trim(),{skipEmptyLines:'greedy'});
  if(parsed.errors.some(error=>error.code!=='UndetectableDelimiter'))throw Error('ساختار CSV معتبر نیست؛ نقل‌قول‌ها و جداکننده‌ها را بررسی کنید.');
  return parseMatrix(parsed.data,kind);
}
export function dataCSV(rows: Row[], kind: Kind,settings?:Partial<Settings>): string {
  if(kind==='waffle'||kind==='parallel-coordinates')return Papa.unparse(dataMatrix(rows,kind,settings));
  if(kind==='bar-chart-race'||kind==='circle-packing')return Papa.unparse(dataMatrix(rows,kind,settings));
  if(kind==='marimekko'||kind==='dumbbell')return Papa.unparse(dataMatrix(rows,kind,settings));
  if(kind==='bump'||kind==='beeswarm')return Papa.unparse(dataMatrix(rows,kind,settings));
  if(kind==='sunburst'||kind==='spiral-heatmap')return Papa.unparse(dataMatrix(rows,kind));
  return kind==='streamgraph'?Papa.unparse([['دوره','گروه','مقدار'],...rows.map(r=>[r.x,r.group,r.value])]):Papa.unparse([['گروه','مقدار','وزن'],...rows.map(r=>[r.group,r.x,r.value])]);
}
export function dataMatrix(rows:Row[],kind:Kind,settings?:Partial<Settings>):(string|number)[][]{
  if(kind==='waffle')return [['گروه','مقدار'],...rows.map(r=>[r.group,r.value])];
  if(kind==='parallel-coordinates')return [['نام','گروه','شاخص','مقدار'],...rows.map(r=>[r.x,r.group,r.axis!,r.value])];
  if(kind==='bar-chart-race')return [['دوره','گروه','مقدار'],...rows.map(r=>[r.x,r.group,r.value])];
  if(kind==='circle-packing')return [['مسیر','مقدار'],...rows.map(r=>[r.x,r.value])];
  if(kind==='marimekko')return [['دسته','زیرگروه','مقدار'],...rows.map(r=>[r.x,r.group,r.value])];
  if(kind==='dumbbell')return [['نام',`مقدار اول: ${settings?.firstLabel||'قبل'}`,`مقدار دوم: ${settings?.secondLabel||'بعد'}`],...rows.map(r=>[r.x,r.value,r.second!])];
  if(kind==='bump')return [['دوره','گروه',settings?.rankInput==='rank'?'رتبه':'مقدار'],...rows.map(r=>[r.x,r.group,r.value])];
  if(kind==='beeswarm')return [['نام','گروه','مقدار'],...rows.map(r=>[r.x,r.group,r.value])];
  if(kind==='sunburst'||kind==='spiral-heatmap')return [[kind==='sunburst'?'مسیر':'تاریخ','مقدار'],...rows.map(r=>[r.x,r.value])];
  return kind==='streamgraph'?[['دوره','گروه','مقدار'],...rows.map(r=>[r.x,r.group,r.value])]:[['گروه','مقدار','وزن'],...rows.map(r=>[r.group,r.x,r.value])];
}
