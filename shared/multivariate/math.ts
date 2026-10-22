import type { Row, Settings } from '../series/model.ts';

export type MultiKind = 'waffle' | 'parallel-coordinates';
export interface WafflePart { name:string; value:number; share:number; count:number; start:number }
export interface ParallelItem { name:string; group:string; values:Map<string,number> }
export interface AxisState { order:string[]; inverted:string[]; filters:Record<string,[number,number]> }
export interface ParallelTable { axes:string[]; items:ParallelItem[]; domains:Map<string,[number,number]>; state:AxisState; visible:ParallelItem[]; missing:number }

export function validateMultiRows(input:unknown,kind:MultiKind,number:(value:unknown)=>number):Row[]{
  if(!Array.isArray(input)||!input.length)throw Error('حداقل یک ردیف داده لازم است.');
  if(input.length>2400)throw Error('حداکثر ۲۴۰۰ ردیف داده مجاز است.');
  const rows=input.map((raw,index)=>{
    if(!raw||typeof raw!=='object')throw Error(`ردیف ${index+1} معتبر نیست.`);
    const r=raw as Record<string,unknown>,group=String(r.group??r.x??'').trim(),x=kind==='waffle'?group:String(r.x??'').trim(),axis=String(r.axis??'').trim(),value=number(r.value);
    if(!group||group.length>80||!x||x.length>80)throw Error(`ردیف ${index+1}: نام و گروه باید بین ۱ تا ۸۰ حرف باشند.`);
    if(!Number.isFinite(value)||Math.abs(value)>1e12||(kind==='waffle'&&value<0))throw Error(`ردیف ${index+1}: ${kind==='waffle'?'مقدار نامنفی':'مقدار عددی'} تا یک تریلیون لازم است؛ مقدار خالی صفر نیست.`);
    if(kind==='parallel-coordinates'&&(!axis||axis.length>80))throw Error(`ردیف ${index+1}: نام شاخص بین ۱ تا ۸۰ حرف لازم است.`);
    return {x,group,value,...(kind==='parallel-coordinates'?{axis}:{})};
  });
  if(new Set(rows.map(r=>r.group)).size>24)throw Error('حداکثر ۲۴ گروه رنگی مجاز است.');
  if(kind==='waffle'){
    if(!rows.some(r=>r.value>0))throw Error('حداقل یک مقدار مثبت لازم است.');
  }else{
    const axes=new Set(rows.map(r=>r.axis)),items=new Map<string,string>(),seen=new Map<string,Set<string>>();
    if(axes.size<2||axes.size>12)throw Error('بین ۲ تا ۱۲ شاخص متفاوت لازم است.');
    for(const r of rows){
      if(items.has(r.x)&&items.get(r.x)!==r.group)throw Error(`«${r.x}» باید در همهٔ شاخص‌ها یک گروه یکسان داشته باشد.`);
      items.set(r.x,r.group);
      const keys=seen.get(r.x)??new Set<string>();
      if(keys.has(r.axis!))throw Error(`مقدار تکراری برای «${r.x} / ${r.axis}»؛ برای هر مورد و شاخص یک مقدار وارد کنید.`);
      keys.add(r.axis!);seen.set(r.x,keys);
    }
    if(items.size>200)throw Error('حداکثر ۲۰۰ مورد برای مقایسه مجاز است.');
  }
  return rows;
}

// Largest remainders preserve the requested cell count, with stable input-order ties.
export function waffleParts(rows:Row[],cells:number,sort='input'):WafflePart[]{
  const totals=new Map<string,number>();
  for(const r of rows)totals.set(r.group,(totals.get(r.group)??0)+r.value);
  let entries=[...totals];
  if(sort==='value')entries.sort((a,b)=>b[1]-a[1]);
  if(sort==='name')entries.sort((a,b)=>a[0].localeCompare(b[0],'fa'));
  const total=entries.reduce((sum,[,v])=>sum+v,0),n=Math.max(10,Math.min(1000,Math.round(cells)));
  if(!Number.isFinite(total)||total<=0)throw Error('مجموع مقدارها باید مثبت و متناهی باشد.');
  const parts=entries.map(([name,value])=>({name,value,share:value/total,count:Math.floor(value/total*n),start:0}));
  const remaining=n-parts.reduce((sum,p)=>sum+p.count,0);
  const indices=parts.map((p,i)=>({i,remainder:p.share*n-p.count})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
  for(let i=0;i<remaining;i++)parts[indices[i].i].count++;
  let start=0;for(const p of parts){p.start=start;start+=p.count;}
  return parts;
}

export function axisState(settings:Pick<Settings,'parallelOrder'|'parallelInverted'|'parallelFilters'>,axes:string[]):AxisState{
  const read=(value:string):unknown=>{try{return JSON.parse(value);}catch{return undefined;}};
  const order=read(settings.parallelOrder),inverted=read(settings.parallelInverted),filters=read(settings.parallelFilters);
  const ordered=Array.isArray(order)?[...new Set(order.filter((v):v is string=>typeof v==='string'&&axes.includes(v)))]:[];
  const state:AxisState={order:[...ordered,...axes.filter(a=>!ordered.includes(a))],inverted:Array.isArray(inverted)?[...new Set(inverted.filter((v):v is string=>typeof v==='string'&&axes.includes(v)))]:[],filters:{}};
  if(filters&&typeof filters==='object'&&!Array.isArray(filters))for(const [key,range] of Object.entries(filters)){
    if(axes.includes(key)&&!['__proto__','constructor','prototype'].includes(key)&&Array.isArray(range)&&range.length===2&&range.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e12)&&range[0]<=range[1])state.filters[key]=[range[0],range[1]];
  }
  return state;
}

export function parallelTable(rows:Row[],settings:Settings):ParallelTable{
  const axes=[...new Set(rows.map(r=>r.axis!))],state=axisState(settings,axes),byName=new Map<string,ParallelItem>();
  for(const r of rows){const item=byName.get(r.x)??{name:r.x,group:r.group,values:new Map<string,number>()};item.values.set(r.axis!,r.value);byName.set(r.x,item);}
  const items=[...byName.values()],domains=new Map<string,[number,number]>();
  if(settings.axisScale==='log'&&rows.some(r=>r.value<=0))throw Error('مقیاس لگاریتمی فقط مقدارهای مثبت را می‌پذیرد.');
  for(const axis of axes){
    const values=settings.parallelScale==='shared'?rows.map(r=>r.value):rows.filter(r=>r.axis===axis).map(r=>r.value);
    let lo=Math.min(...values),hi=Math.max(...values);
    if(settings.includeZero&&settings.axisScale!=='log'){lo=Math.min(0,lo);hi=Math.max(0,hi);}
    // Constant axes intentionally map to the middle, without manufacturing a range.
    domains.set(axis,[lo,hi]);
  }
  const missing=items.reduce((sum,item)=>sum+axes.length-item.values.size,0);
  const visible=items.filter(item=>(settings.parallelMissing!=='exclude'||item.values.size===axes.length)&&Object.entries(state.filters).every(([axis,[lo,hi]])=>{const value=item.values.get(axis);return value!==undefined&&value>=lo&&value<=hi;}));
  return {axes:state.order,items,domains,state,visible,missing};
}

export function axisPosition(value:number,domain:[number,number],log=false,inverted=false):number{
  const [lo,hi]=domain,transform=(v:number):number=>log?Math.log10(v):v;
  const t=lo===hi?.5:(transform(value)-transform(lo))/(transform(hi)-transform(lo));
  return inverted?1-t:t;
}

export function multiSamples(kind:MultiKind,alternative=false):Row[]{
  if(kind==='waffle')return (alternative?[['انجام‌شده',68],['در حال انجام',23],['شروع‌نشده',9]]:[['حمل‌ونقل',32],['خوراک',27],['مسکن',24],['آموزش',11],['سایر',6]]).map(([name,value])=>({x:String(name),group:String(name),value:Number(value)}));
  const axes=alternative?['پوشش خدمات (%)','سرعت پاسخ (دقیقه)','رضایت (%)','هزینه (هزار تومان)']:['قیمت (میلیون تومان)','کیفیت (از ۱۰۰)','فروش (عدد)','رضایت (%)','مصرف انرژی (وات)'];
  const names=alternative?['شعبهٔ شمال','شعبهٔ جنوب','شعبهٔ شرق','شعبهٔ غرب','شعبهٔ مرکز','شعبهٔ ساحل']:['آوا','باران','چکاد','دریا','راستا','سپهر','شایا','فرات','کارن','مانا','نوین','هامون'];
  return names.flatMap((x,i)=>axes.map((axis,j)=>({x,axis,group:(alternative?['شهری','منطقه‌ای']:['اقتصادی','میان‌رده','حرفه‌ای'])[i% (alternative?2:3)],value:alternative?Math.round([65+(i*7)%33,8+(i*11)%35,70+(i*9)%28,180+(i*43)%160][j]):Math.round([12+i*3.8,58+(i*13)%39,80+(i*137)%850,65+(i*7)%32,40+(i*29)%140][j])})));
}
