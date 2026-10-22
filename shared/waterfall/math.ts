import type { Row } from '../series/model.ts';
export const waterfallTypes:[string,string][]=[['change','تغییر'],['absolute','مقدار مطلق'],['subtotal','جمع میانی؛ خودکار'],['total','جمع کل؛ خودکار']];
export const waterfallColors=['increase','decrease','absolute','total'];
export const waterfallColorLabel=(key:string):string=>({increase:'افزایش',decrease:'کاهش',absolute:'مقدار مطلق',total:'جمع میانی و کل'}[key]??key);
export interface WaterfallStep { name:string;type:string;value:number;before:number;after:number;from:number;to:number;color:string }
export function waterfallType(raw:unknown):string{
  const v=String(raw??'change').trim().toLowerCase().replace(/[\s\u200c_-]/g,'');
  if(['change','relative','delta','تغییر'].includes(v))return 'change';
  if(['absolute','start','initial','مقدارمطلق','شروع','اولیه'].includes(v))return 'absolute';
  if(['subtotal','جمعمیانی'].includes(v))return 'subtotal';
  if(['total','جمع','جمعکل','نهایی'].includes(v))return 'total';
  throw Error('نوع ردیف باید تغییر، مقدار مطلق، جمع میانی یا جمع کل باشد.');
}
export function validateWaterfallRows(input:unknown,number:(v:unknown)=>number):Row[]{
  if(!Array.isArray(input)||!input.length||input.length>100)throw Error('بین ۱ تا ۱۰۰ مرحله لازم است.');
  return input.map((raw,i)=>{
    if(!raw||typeof raw!=='object')throw Error(`ردیف ${i+1} معتبر نیست.`);
    const r=raw as Record<string,unknown>,x=String(r.x??r.name??r.label??r.step??'').trim(),group=waterfallType(r.group??r.type??r.measure),auto=group==='total'||group==='subtotal',rawValue=r.value??r.amount??r.delta,value=auto&&(rawValue===undefined||String(rawValue).trim()==='')?0:number(rawValue);
    if(!x||x.length>80)throw Error(`ردیف ${i+1}: نام مرحله بین ۱ تا ۸۰ حرف لازم است.`);
    if(!Number.isFinite(value)||Math.abs(value)>1e12)throw Error(`ردیف ${i+1}: مقدار عددی تا یک تریلیون لازم است.`);
    if(auto&&value!==0)throw Error(`ردیف ${i+1}: جمع خودکار است؛ مقدار را خالی یا صفر بگذارید.`);
    return {x,group,value};
  });
}
export function waterfallSteps(rows:Row[],base=0):WaterfallStep[]{
  let running=base;
  return rows.map(r=>{
    const before=running;
    if(r.group==='change')running+=r.value;else if(r.group==='absolute')running=r.value;
    const from=r.group==='change'?before:0,to=running;
    return {name:r.x,type:r.group,value:r.value,before,after:running,from,to,color:r.group==='change'?(r.value<0?'decrease':'increase'):r.group==='absolute'?'absolute':'total'};
  });
}
export function waterfallDomain(steps:WaterfallStep[]):{lo:number;hi:number;ticks:number[]}{
  const values=steps.flatMap(s=>[s.from,s.to]),min=Math.min(0,...values),max=Math.max(0,...values),span=max-min;
  if(span===0)return {lo:-1,hi:1,ticks:[-1,-.5,0,.5,1]};
  const raw=span/5,power=10**Math.floor(Math.log10(raw)),fraction=raw/power,step=([1,2,2.5,5,10].find(v=>v>=fraction)??10)*power;
  const lo=min===0?0:Math.floor((min-span*.08)/step)*step,hi=max===0?0:Math.ceil((max+span*.12)/step)*step;
  const ticks=Array.from({length:Math.round((hi-lo)/step)+1},(_,i)=>Number((lo+i*step).toPrecision(12)));
  return {lo,hi,ticks};
}
export function waterfallSamples(alternative=false):Row[]{
  const names=alternative?['بودجهٔ اولیه','توسعه','فروش','جمع نیم‌سال','هزینهٔ جدید','صرفه‌جویی','ماندهٔ نهایی']:['درآمد','مواد اولیه','دستمزد','سود ناخالص','فروش و بازاریابی','سایر درآمدها','مالیات','سود خالص'];
  const values=alternative?[800,-220,170,0,-110,65,0]:[1200,-420,-260,0,-150,85,-65,0];
  return names.map((x,i)=>({x,group:i===0?'absolute':i===3?'subtotal':i===names.length-1?'total':'change',value:values[i]}));
}
