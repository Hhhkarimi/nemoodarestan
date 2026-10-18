import type { Row, Settings } from '../series/model.ts';
export type ComparisonKind='bump'|'beeswarm';
export interface RankPoint { period:string; group:string; value:number; rank:number }
export interface RankTable { periods:string[]; groups:string[]; series:{name:string;points:(RankPoint|null)[]}[]; maxRank:number; missing:number; ties:number }
type RankOptions=Pick<Settings,'rankInput'|'rankDirection'|'tieMethod'>;
export function validateComparisonRows(input:unknown,kind:ComparisonKind,numeric:(v:unknown)=>number):Row[]{
  if(!Array.isArray(input)||!input.length)throw Error('حداقل یک ردیف داده وارد کنید.');
  const limit=kind==='beeswarm'?2000:5000;if(input.length>limit)throw Error(`حداکثر ${kind==='beeswarm'?'۲۰۰۰':'۵۰۰۰'} ردیف داده مجاز است.`);
  const seen=new Set<string>();
  const rows=input.map((raw,i)=>{
    if(!raw||typeof raw!=='object')throw Error(`ردیف ${i+1} معتبر نیست.`);
    const r=raw as Record<string,unknown>,value=numeric(r.value),x=String(r.x??'').trim()||(kind==='beeswarm'?`مشاهدهٔ ${i+1}`:''),group=String(r.group??'').trim()||(kind==='beeswarm'?'همه':'');
    if(!x||x.length>80||!group||group.length>80)throw Error(`ردیف ${i+1}: ${kind==='bump'?'دوره و نام گروه':'نام و گروه'} باید بین ۱ تا ۸۰ حرف باشد.`);
    if(!Number.isFinite(value)||Math.abs(value)>1e12)throw Error(`ردیف ${i+1}: مقدار عددی معتبر با قدر مطلق حداکثر یک تریلیون لازم است.`);
    if(kind==='bump'){const key=JSON.stringify([x,group]);if(seen.has(key))throw Error(`برای «${group}» در «${x}» بیش از یک مقدار وجود دارد؛ هر گروه در هر دوره باید یک ردیف داشته باشد.`);seen.add(key);}
    return {x,group,value};
  });
  if(new Set(rows.map(r=>r.group)).size>24)throw Error('حداکثر ۲۴ گروه پشتیبانی می‌شود.');
  if(kind==='bump'){
    const periods=new Set(rows.map(r=>r.x));if(periods.size<2||periods.size>120)throw Error('برای تغییر رتبه، بین ۲ تا ۱۲۰ دورهٔ متفاوت لازم است.');
  }
  return rows;
}
export function rankTable(rows:Row[],s:RankOptions):RankTable{
  const periods=[...new Set(rows.map(r=>r.x))],groups=[...new Set(rows.map(r=>r.group))],lookup=new Map<string,RankPoint>();let ties=0,maxRank=1;
  for(const period of periods){
    const values=rows.filter(r=>r.x===period).sort((a,b)=>(s.rankDirection==='lower'?a.value-b.value:b.value-a.value));
    if(s.rankInput==='rank'&&values.some(r=>r.value<1))throw Error('در حالت «رتبهٔ آماده»، همهٔ رتبه‌ها باید یک یا بزرگ‌تر باشند. برای امتیاز، حالت «محاسبه از مقدار» را انتخاب کنید.');
    let dense=0;
    for(let i=0;i<values.length;){
      let end=i+1;while(end<values.length&&values[end].value===values[i].value)end++;
      dense++;if(end-i>1)ties+=end-i;
      const rank=s.rankInput==='rank'?values[i].value:s.tieMethod==='dense'?dense:s.tieMethod==='average'?(i+1+end)/2:i+1;
      for(let j=i;j<end;j++){const r=values[j];lookup.set(JSON.stringify([r.group,period]),{period,group:r.group,value:r.value,rank});maxRank=Math.max(maxRank,rank);}
      i=end;
    }
  }
  return {periods,groups,series:groups.map(name=>({name,points:periods.map(period=>lookup.get(JSON.stringify([name,period]))??null)})),maxRank,missing:periods.length*groups.length-rows.length,ties};
}
export function validateComparisonData(rows:Row[],kind:ComparisonKind,s:Settings):void{
  if(kind==='bump')rankTable(rows,s);
  if(kind==='beeswarm'&&s.axisScale==='log'&&rows.some(r=>r.value<=0))throw Error('مقیاس لگاریتمی فقط مقدارهای مثبت را می‌پذیرد؛ برای صفر و مقدار منفی، مقیاس خطی را انتخاب کنید.');
}
export function median(values:number[]):number{const sorted=[...values].sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;}
export function labelPositions(values:{key:string;y:number}[],top:number,bottom:number,gap:number):Map<string,number>{
  if((values.length-1)*gap>bottom-top)throw Error('نام گروه‌ها در ارتفاع فعلی جا نمی‌شوند؛ ارتفاع بوم را بیشتر یا اندازهٔ برچسب‌ها را کوچک‌تر کنید.');
  const sorted=[...values].sort((a,b)=>a.y-b.y),ys:number[]=[];
  sorted.forEach((v,i)=>ys.push(Math.max(top,v.y,i?ys[i-1]+gap:top)));
  for(let i=ys.length-1;i>=0;i--)ys[i]=Math.min(ys[i],i===ys.length-1?bottom:ys[i+1]-gap);
  return new Map(sorted.map((v,i)=>[v.key,ys[i]]));
}
export interface SwarmPoint { index:number; x:number; y:number }
export interface SwarmLayout { points:SwarmPoint[]; fits:boolean; extent:number }
export function packSwarm(values:{index:number;x:number}[],radius:number,padding:number,halfHeight=Infinity):SwarmLayout{
  const distance=radius*2+padding+1e-6,points:SwarmPoint[]=[],active:SwarmPoint[]=[];let extent=0;
  // Merge forbidden vertical intervals; the nearest free boundary preserves the exact x value.
  for(const value of [...values].sort((a,b)=>a.x-b.x||a.index-b.index)){
    while(active.length&&value.x-active[0].x>=distance)active.shift();
    const intervals=active.map(p=>{const dy=Math.sqrt(Math.max(0,distance**2-(value.x-p.x)**2));return [p.y-dy,p.y+dy];}).sort((a,b)=>a[0]-b[0]);
    const merged:number[][]=[];
    for(const range of intervals){const last=merged.at(-1);if(last&&range[0]<=last[1]+1e-9)last[1]=Math.max(last[1],range[1]);else merged.push([...range]);}
    const forbidden=merged.find(([low,high])=>low<0&&high>0);
    const y=forbidden?(Math.abs(forbidden[0])<Math.abs(forbidden[1])?forbidden[0]:Math.abs(forbidden[0])>Math.abs(forbidden[1])?forbidden[1]:value.index%2?forbidden[0]:forbidden[1]):0;
    extent=Math.max(extent,Math.abs(y)+radius);if(extent>halfHeight)return {points,fits:false,extent};
    const point={...value,y};points.push(point);active.push(point);
  }
  return {points,fits:true,extent};
}
export interface SwarmResult { points:SwarmPoint[]; radius:number }
export function fitSwarm(values:{index:number;x:number}[],radius:number,padding:number,halfHeight:number,auto:boolean):SwarmResult{
  let layout=packSwarm(values,radius,padding,halfHeight);if(layout.fits)return {points:layout.points,radius};
  if(auto){
    let low=1,high=radius;layout=packSwarm(values,low,padding,halfHeight);
    if(layout.fits){let best=layout;for(let i=0;i<8;i++){const mid=(low+high)/2,result=packSwarm(values,mid,padding,halfHeight);if(result.fits){low=mid;best=result;}else high=mid;}return {points:best.points,radius:low};}
  }
  throw Error('نقطه‌ها در ارتفاع بوم جا نمی‌شوند. ارتفاع را بیشتر کنید، فاصله یا اندازهٔ نقطه‌ها را کم کنید، یا حالت چیدمان را «همه در یک ردیف» بگذارید. هیچ نقطه‌ای حذف نشده است.');
}
export function comparisonSamples(kind:ComparisonKind,alternative=false):Row[]{
  if(kind==='bump'){
    const periods=alternative?['۱۴۰۰','۱۴۰۱','۱۴۰۲','۱۴۰۳','۱۴۰۴']:['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور'];
    const groups=alternative?['تیم آبی','تیم سبز','تیم نارنجی','تیم بنفش','تیم طلایی']:['برند سپید','برند سرو','برند باران','برند آبان','برند مانا'];
    const values=[[92,74,81,65,58],[85,91,72,63,77],[74,88,83,71,93],[80,74,94,86,69],[87,79,75,96,84],[94,83,88,78,91]];
    return periods.flatMap((x,i)=>groups.map((group,j)=>({x,group,value:values[i][j]})));
  }
  const groups=alternative?['فروش','توسعه','عملیات','پشتیبانی']:['اقتصادی','میان‌رده','حرفه‌ای'];let seed=71;
  const random=():number=>{seed=(seed*1664525+1013904223)>>>0;return (seed+1)/4294967297;};
  const fa=new Intl.NumberFormat('fa-IR');
  return groups.flatMap((group,g)=>Array.from({length:alternative?42:55},(_,i)=>{const z=Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());return {x:`${alternative?'شغل':'محصول'} ${fa.format(g*(alternative?42:55)+i+1)}`,group,value:Math.max(1,Math.round((alternative?32+g*14:18+g*28)+z*(alternative?8:9)+(i%19===0?24:0)))};}));
}
