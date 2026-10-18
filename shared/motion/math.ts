import {hierarchy as d3Hierarchy,pack} from 'd3-hierarchy';
import type {HierarchyCircularNode} from 'd3-hierarchy';
import {hierarchy,radialSamples,validateRadialRows} from '../radial/math.ts';
import type {TreeNode} from '../radial/math.ts';
import type {Row,Settings} from '../series/model.ts';
export type MotionKind='bar-chart-race'|'circle-packing';
export interface RaceTable {periods:string[];groups:string[];values:(number|null)[][];missing:number;max:number}
export interface RaceBar {group:string;value:number;rank:number;alpha:number}
export interface RaceFrame {bars:RaceBar[];from:string;to:string;fraction:number;position:number;max:number}
export function validateMotionRows(input:unknown,kind:MotionKind,numeric:(v:unknown)=>number):Row[]{
  if(kind==='circle-packing')return validateRadialRows(input,'sunburst',numeric);
  if(!Array.isArray(input)||!input.length||input.length>5000)throw Error('بین ۱ تا ۵۰۰۰ ردیف داده وارد کنید.');
  const rows=input.map((raw,i)=>{
    if(!raw||typeof raw!=='object')throw Error(`ردیف ${i+1} معتبر نیست.`);
    const r=raw as Record<string,unknown>,x=String(r.x??'').trim(),group=String(r.group??'').trim(),value=numeric(r.value);
    if(!x||x.length>80||!group||group.length>80)throw Error(`ردیف ${i+1}: دوره و نام گروه باید بین ۱ تا ۸۰ حرف باشد.`);
    if(!Number.isFinite(value)||value<0||value>1e12)throw Error(`ردیف ${i+1}: مقدار نامنفی و حداکثر یک تریلیون لازم است؛ مقدار خالی پذیرفته نیست.`);
    return {x,group,value};
  });
  const periods=new Set(rows.map(r=>r.x));
  if(periods.size<2||periods.size>120)throw Error('مسابقه به ۲ تا ۱۲۰ دوره نیاز دارد؛ ترتیب ورود، ترتیب زمان است.');
  if(new Set(rows.map(r=>r.group)).size>32)throw Error('حداکثر ۳۲ گروه پشتیبانی می‌شود.');
  if(!rows.some(r=>r.value>0))throw Error('حداقل یک مقدار مثبت وارد کنید.');
  return rows;
}
export function raceTable(rows:Row[],missingPolicy:string):RaceTable{
  const periods=[...new Set(rows.map(r=>r.x))],groups=[...new Set(rows.map(r=>r.group))],cells=new Map<string,number>();
  for(const row of rows){const key=JSON.stringify([row.x,row.group]);cells.set(key,(cells.get(key)??0)+row.value);}
  let missing=0;
  const previous=new Map<string,number>();
  const values=periods.map(period=>groups.map(group=>{
    const key=JSON.stringify([period,group]),value=cells.get(key);
    if(value!==undefined){previous.set(group,value);return value;}
    missing++;
    return missingPolicy==='zero'?0:missingPolicy==='carry'?(previous.get(group)??null):null;
  }));
  return {periods,groups,values,missing,max:Math.max(1,...values.flatMap(v=>v.filter((n):n is number=>n!==null)))};
}
// Self-contained: the exported HTML uses this same function, with no library dependency.
export function raceFrame(table:RaceTable,position:number,scale:string):RaceFrame{
  const p=Math.max(0,Math.min(table.periods.length-1,Number.isFinite(position)?position:0)),index=Math.floor(p),next=Math.min(index+1,table.periods.length-1),t=p-index;
  const ranks=(values:(number|null)[]):number[]=>{
    const sorted=values.map((value,i)=>({value,i})).filter(v=>v.value!==null).sort((a,b)=>b.value!-a.value!||a.i-b.i),result=values.map(()=>table.groups.length);
    sorted.forEach((v,rank)=>result[v.i]=rank);return result;
  };
  const a=table.values[index],b=table.values[next],ra=ranks(a),rb=ranks(b);
  const bars=table.groups.map((group,i)=>{
    const from=a[i],to=b[i],value=from===null?(to??0):to===null?from:from+(to-from)*t;
    return {group,value,rank:ra[i]+(rb[i]-ra[i])*t,alpha:from===null?(to===null?0:t):to===null?1-t:1};
  });
  return {bars,from:table.periods[index],to:table.periods[next],fraction:t,position:p,max:scale==='global'?table.max:Math.max(1,...bars.filter(b=>b.alpha>0).map(b=>b.value))};
}
export function packingLayout(rows:Row[],s:Pick<Settings,'packSort'|'packPadding'|'packLabels'|'fontSize'>,diameter:number):HierarchyCircularNode<TreeNode>{
  const tree=hierarchy(rows,s.packSort),root=d3Hierarchy(tree,n=>n.children.filter(c=>c.value>0)).sum(n=>n.children.length?0:n.value);
  const padding=s.packLabels==='groups'||s.packLabels==='both'?Math.max(s.packPadding,s.fontSize+6):s.packPadding;
  return pack<TreeNode>().size([diameter,diameter]).padding(padding)(root);
}
export function motionSamples(kind:MotionKind,alternative=false):Row[]{
  if(kind==='circle-packing')return radialSamples('sunburst',alternative);
  const names=alternative?['تهران','اصفهان','فارس','خراسان','آذربایجان','گیلان','کرمان','یزد']:['سرو','باران','آبان','مانا','آوا','نگین','سپهر','رها'];
  const periods=alternative?['۱۳۹۸','۱۳۹۹','۱۴۰۰','۱۴۰۱','۱۴۰۲','۱۴۰۳','۱۴۰۴']:['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان'];
  return periods.flatMap((x,i)=>names.map((group,j)=>({x,group,value:Math.round(80+j*6+i*(8+j%3*5)+55*Math.sin(i*.63+j*1.4))})));
}
