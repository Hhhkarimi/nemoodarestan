import type { Row, Settings } from '../series/model.ts';
export interface TreeNode { name:string; path:string; group:string; value:number; depth:number; children:TreeNode[]; start:number; end:number }
export interface HeatCell { index:number; date:string; value:number|null; count:number }
export const tau=2*Math.PI;
const digits=(s:string):string=>s.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
export function pathParts(input:string):string[]{
  const parts=input.replace(/>/g,'/').split('/').map(s=>s.trim());
  if(!parts.length||parts.length>8||parts.some(p=>!p||p.length>80))throw Error('مسیر باید ۱ تا ۸ بخشِ نام‌دار داشته باشد؛ جداکننده / است و هر نام حداکثر ۸۰ حرف دارد.');
  return parts;
}
export function canonicalDate(input:unknown):string{
  const s=digits(String(input??'').trim()).replace(/\//g,'-');
  const match=/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):?(\d{2})?(?::(\d{2})(?:\.\d+)?)?Z?)?$/.exec(s);
  if(!match)throw Error('تاریخ را به میلادی با قالب YYYY-MM-DD یا YYYY-MM-DDTHH:mm وارد کنید. نمایش شمسی از طراحی قابل انتخاب است.');
  const [,ys,ms,ds,hs='0',mins='0',secs='0']=match,[y,m,d,h,minute,second]=[ys,ms,ds,hs,mins,secs].map(Number);
  const date=new Date(Date.UTC(y,m-1,d,h,minute,second));
  if(y<1900||y>2200||date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d||h>23||minute>59||second>59)throw Error('تاریخ یا ساعت معتبر نیست؛ سال میلادی باید بین ۱۹۰۰ تا ۲۲۰۰ باشد.');
  return match[4]!==undefined?date.toISOString().slice(0,16):date.toISOString().slice(0,10);
}
export function validateRadialRows(input:unknown,kind:'sunburst'|'spiral-heatmap',numeric:(v:unknown)=>number):Row[]{
  if(!Array.isArray(input)||!input.length)throw Error('حداقل یک ردیف داده وارد کنید.');
  if(input.length>5000)throw Error('حداکثر ۵۰۰۰ ردیف داده مجاز است.');
  const rows=input.map((raw,i)=>{
    if(!raw||typeof raw!=='object')throw Error(`ردیف ${i+1} معتبر نیست.`);
    const r=raw as Record<string,unknown>,value=numeric(r.value);
    if(!Number.isFinite(value)||Math.abs(value)>1e12||(kind==='sunburst'&&value<0))throw Error(`ردیف ${i+1}: ${kind==='sunburst'?'مقدار نامنفی':'مقدار عددی'} تا یک تریلیون لازم است. برای خانهٔ بدون داده، ردیف آن زمان را حذف کنید.`);
    if(kind==='sunburst'){const parts=pathParts(String(r.x??''));return {x:parts.join('/'),group:parts[0],value};}
    const x=canonicalDate(r.x);return {x,group:x,value};
  });
  if(kind==='sunburst'){
    const tree=hierarchy(rows,'input');if(tree.value<=0)throw Error('حداقل یک مقدار بزرگ‌تر از صفر لازم است.');
    if(flatten(tree).length>500)throw Error('حداکثر ۵۰۰ شاخه و زیرشاخه پشتیبانی می‌شود.');
    if(tree.children.length>24)throw Error('حداکثر ۲۴ شاخهٔ اصلی پشتیبانی می‌شود.');
  }
  return rows;
}
export function hierarchy(rows:Row[],sort:string):TreeNode{
  const root:TreeNode={name:'همه',path:'',group:'',value:0,depth:0,children:[],start:0,end:tau};
  const nodes=new Map<string,TreeNode>([['',root]]),leaves=new Map<string,number>();
  for(const row of rows){
    const parts=pathParts(row.x);let parent=root;
    parts.forEach((name,index)=>{const path=parts.slice(0,index+1).join('/');let child=nodes.get(path);if(!child){child={name,path,group:parts[0],value:0,depth:index+1,children:[],start:0,end:0};nodes.set(path,child);parent.children.push(child);}parent=child;});
    leaves.set(parent.path,(leaves.get(parent.path)??0)+row.value);
  }
  const sum=(node:TreeNode):number=>{
    const own=leaves.get(node.path)??0;
    if(node.children.length&&own>0)throw Error(`«${node.path}» هم مقدار دارد و هم زیرشاخه. فقط مقدار برگ‌ها را وارد کنید؛ جمع شاخه‌ها خودکار است.`);
    node.value=node.children.length?node.children.reduce((n,c)=>n+sum(c),0):own;
    if(sort==='value')node.children.sort((a,b)=>b.value-a.value);
    if(sort==='name')node.children.sort((a,b)=>a.name.localeCompare(b.name,'fa'));
    return node.value;
  };sum(root);
  const partition=(node:TreeNode):void=>{let angle=node.start;node.children.forEach((child,i)=>{child.start=angle;child.end=i===node.children.length-1?node.end:angle+(node.end-node.start)*child.value/(node.value||1);angle=child.end;partition(child);});};partition(root);return root;
}
export function flatten(node:TreeNode):TreeNode[]{return node.children.flatMap(c=>[c,...flatten(c)]);}
function bucketIndex(date:string,unit:string):number{
  const d=new Date(date.length===10?date+'T00:00:00Z':date+':00Z');
  return unit==='month'?d.getUTCFullYear()*12+d.getUTCMonth():Math.floor(d.getTime()/(unit==='hour'?3600000:86400000));
}
function bucketDate(index:number,unit:string):string{
  const date=unit==='month'?new Date(Date.UTC(Math.floor(index/12),index%12,1)):new Date(index*(unit==='hour'?3600000:86400000));
  return date.toISOString().slice(0,unit==='hour'?16:10);
}
export function heatTable(rows:Row[],unit:string,aggregation:string):HeatCell[]{
  const buckets=new Map<number,number[]>();
  for(const row of rows){const index=bucketIndex(row.x,unit);const values=buckets.get(index)??[];values.push(row.value);buckets.set(index,values);}
  const indices=[...buckets.keys()],first=Math.min(...indices),last=Math.max(...indices);
  if(last-first>=5000)throw Error('بازه بیش از ۵۰۰۰ خانه دارد؛ واحد زمان را بزرگ‌تر یا محدودهٔ داده را کوچک‌تر کنید.');
  return Array.from({length:last-first+1},(_,index)=>{const values=buckets.get(first+index)??[];return {index,date:bucketDate(first+index,unit),value:values.length?(aggregation==='max'?Math.max(...values):values.reduce((a,b)=>a+b,0)/(aggregation==='mean'?values.length:1)):null,count:values.length};});
}
export function heatDomain(cells:HeatCell[],settings:Pick<Settings,'autoDomain'|'domainMin'|'domainMax'>):[number,number]{
  if(!settings.autoDomain){if(settings.domainMin>=settings.domainMax)throw Error('کمینهٔ رنگ باید از بیشینه کوچک‌تر باشد.');return [settings.domainMin,settings.domainMax];}
  const values=cells.flatMap(c=>c.value===null?[]:[c.value]);return [Math.min(...values),Math.max(...values)];
}
export const heatPalettes:Record<string,string[]>={teal:['#edf4df','#81baa4','#12675e'],amber:['#fff0cf','#e7a852','#93442b'],purple:['#f2edf6','#b8a0cb','#68447f'],diverging:['#317ba1','#f7f5e8','#ba4e43']};
export function heatColor(value:number,domain:[number,number],settings:Pick<Settings,'heatPalette'|'reverseColors'|'lowColor'|'highColor'>):string{
  const colors=settings.heatPalette==='custom'?[settings.lowColor,settings.highColor]:(heatPalettes[settings.heatPalette]??heatPalettes.teal);
  let t=domain[0]===domain[1] ? .5 : Math.max(0,Math.min(1,(value-domain[0])/(domain[1]-domain[0])));if(settings.reverseColors)t=1-t;
  const scaled=t*(colors.length-1),i=Math.min(colors.length-2,Math.floor(scaled)),f=scaled-i;
  const channels=(c:string):number[]=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
  const a=channels(colors[i]),b=channels(colors[i+1]);return '#'+a.map((v,j)=>Math.round(v+(b[j]-v)*f).toString(16).padStart(2,'0')).join('');
}
export interface SpiralGeometry { path:string; x:number; y:number; angle:number; thickness:number }
export function spiralCell(index:number,total:number,slots:number,radius:number,hole:number,gap:number,rotation:number,clockwise:boolean):SpiralGeometry{
  const pitch=(radius-hole)/(total/slots+1),thickness=pitch-Math.min(gap,pitch*.65),sign=clockwise?1:-1;
  const start=tau*index/slots+.012,end=tau*(index+1)/slots-.012;
  const point=(a:number,side:number):[number,number]=>{const r=hole+pitch*a/tau+side*thickness,theta=sign*a+rotation*Math.PI/180-Math.PI/2;return [Math.cos(theta)*r,Math.sin(theta)*r];};
  const steps=Math.max(3,Math.ceil((end-start)*14)),points:Array<[number,number]>=[];
  for(let i=0;i<=steps;i++)points.push(point(start+(end-start)*i/steps,1));
  for(let i=steps;i>=0;i--)points.push(point(start+(end-start)*i/steps,0));
  const mid=(start+end)/2,[x,y]=point(mid,.5);
  return {path:points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('')+'Z',x,y,angle:sign*mid+rotation*Math.PI/180-Math.PI/2,thickness};
}
export function radialSamples(kind:'sunburst'|'spiral-heatmap',alternative=false):Row[]{
  if(kind==='sunburst'){
    const paths=alternative?['عملیات/تولید/مواد','عملیات/تولید/نیروی کار','عملیات/تولید/انرژی','عملیات/لجستیک/حمل','عملیات/لجستیک/انبار','بازاریابی/دیجیتال/تبلیغات','بازاریابی/دیجیتال/محتوا','بازاریابی/رویدادها','منابع انسانی/آموزش','منابع انسانی/استخدام']:['داخلی/دیجیتال/نرم‌افزار','داخلی/دیجیتال/اشتراک','داخلی/آموزش/دوره','داخلی/آموزش/کتاب','صادرات/آسیا/خدمات','صادرات/آسیا/محصول','صادرات/اروپا/خدمات','صادرات/اروپا/محصول','خدمات/سازمانی/مشاوره','خدمات/سازمانی/پشتیبانی','خدمات/فردی/آموزش','خدمات/فردی/مشاوره'];
    return paths.map((x,i)=>({x,group:x.split('/')[0],value:[180,120,95,70,110,65,85,55,90,65,75,45][i]}));
  }
  const start=Date.UTC(2025,2,21);
  return Array.from({length:alternative?168:240},(_,i)=>({x:new Date(start+i*86400000).toISOString().slice(0,10),value:Math.round(45+26*Math.sin(i*tau/(alternative?7:30))+13*Math.cos(i*.13)+i*.08),group:''})).filter((_,i)=>i!==48&&i!==49&&i!==123).map(r=>({...r,group:r.x}));
}
