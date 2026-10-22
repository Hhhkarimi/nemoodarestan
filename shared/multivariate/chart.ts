import type { Project } from '../series/model.ts';
import type { ChartResult } from '../series/chart.ts';
import { colorFor,format } from '../series/model.ts';
import { family } from '../series/fonts.ts';
import { axisPosition,parallelTable,waffleParts } from './math.ts';

const ns='http://www.w3.org/2000/svg';
type Attributes=Record<string,string|number>;
function node<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Attributes={},value?:string):SVGElementTagNameMap[K]{
  const el=document.createElementNS(ns,tag);for(const [key,v] of Object.entries(attrs))el.setAttribute(key,String(v));if(value!==undefined)el.textContent=value;return el;
}
const trim=(value:string,max:number):string=>value.length>max?value.slice(0,Math.max(1,max-1))+'…':value;

export function renderMulti(project:Project,select?:(group:string)=>void):ChartResult{
  const s=project.settings,w=s.width,h=s.height,waffle=project.kind==='waffle';
  const svg=node('svg',{xmlns:ns,viewBox:`0 0 ${w} ${h}`,width:w,height:h,role:'img','aria-label':s.title||'نمودار'});
  svg.style.fontFamily=family(project);svg.append(node('title',{},s.title),node('desc',{},s.subtitle),node('rect',{'data-background':'true',width:w,height:h,fill:s.background}));
  const text=(x:number,y:number,value:string,size=s.fontSize,attrs:Attributes={}):SVGTextElement=>node('text',{x,y,fill:s.textColor,'font-size':size,'font-family':family(project),'text-anchor':'middle',direction:'rtl','unicode-bidi':'plaintext',...attrs},value);
  const title=(el:SVGElement,value:string):void=>{el.append(node('title',{},value));};
  const interactive=(el:SVGElement,group:string,label:string):void=>{
    el.setAttribute('data-group',group);el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',label);el.style.cursor='pointer';title(el,label);
    el.addEventListener('click',()=>select?.(group));el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select?.(group);}});
  };
  svg.append(text(w/2,48,s.title,s.titleSize,{'font-weight':700}),text(w/2,80,s.subtitle,s.subtitleSize,{opacity:.75}));
  const names=[...new Set(project.rows.map(r=>r.group))];
  const columns=Math.min(names.length,Math.max(1,Math.floor((w-80)/(waffle?270:190)))),legendRows=s.showLegend?Math.ceil(names.length/columns):0;
  const legendRowHeight=waffle?Math.max(s.legendSize+12,s.showValues?s.valueSize+12:0)+ (s.showValues?s.valueSize+13:0):s.legendSize+22;
  const legendTop=h-38-legendRows*legendRowHeight,bottom=legendTop-(waffle?55:80),top=waffle?125:155,height=bottom-top;
  if(height<110)throw Error('ارتفاع بوم برای نمودار و راهنمای رنگ کم است؛ ارتفاع را بیشتر یا راهنمای رنگ را خاموش کنید.');
  let summaries:ChartResult['summaries'],note:string;
  if(waffle){
    const parts=waffleParts(project.rows,s.waffleCells,s.waffleSort),cells=parts.reduce((sum,p)=>sum+p.count,0),cols=Math.min(cells,Math.round(s.waffleColumns)),rows=Math.ceil(cells/cols);
    const pitch=Math.min((w-100)/cols,height/rows),gap=Math.min(s.waffleGap,pitch*.65),size=pitch-gap,left=(w-cols*pitch)/2,yt=top+(height-rows*pitch)/2;
    if(size<3)throw Error('خانه‌ها در این ابعاد بسیار کوچک‌اند؛ تعداد ستون‌ها یا اندازهٔ بوم را تغییر دهید.');
    // Column fill traverses only actual cells, including a partial final row.
    const positions=Array.from({length:cells},(_,i)=>({col:i%cols,row:Math.floor(i/cols)}));
    if(s.waffleFill==='column')positions.sort((a,b)=>a.col-b.col||a.row-b.row);
    for(const part of parts){
      const group=node('g',{opacity:s.opacity,'data-waffle-count':part.count,'data-value':part.value});
      const description=`${part.name}؛ ${format(project,part.value)} ${s.unit}؛ سهم واقعی ${format(project,part.share*100)}٪؛ ${format(project,part.count)} خانه از ${format(project,cells)}`;
      interactive(group,part.name,description);
      for(let i=part.start;i<part.start+part.count;i++){
        const p=positions[i],col=s.direction==='rtl'?cols-1-p.col:p.col,x=left+col*pitch+gap/2,y=yt+p.row*pitch+gap/2;
        group.append(s.waffleShape==='circle'?node('circle',{cx:x+size/2,cy:y+size/2,r:size/2,fill:colorFor(project,part.name),stroke:s.background,'stroke-width':s.strokeWidth}):node('rect',{x,y,width:size,height:size,rx:Math.min(2,size*.08),fill:colorFor(project,part.name),stroke:s.background,'stroke-width':s.strokeWidth}));
      }
      svg.append(group);
    }
    const cellPercent=new Intl.NumberFormat(s.digits==='fa'?'fa-IR':'en-US',{maximumFractionDigits:3}).format(100/cells);
    svg.append(text(w/2,bottom+30,`هر خانه ≈ ${cellPercent}٪ از کل`,s.fontSize,{opacity:.8}));
    if(s.showLegend)parts.forEach((part,i)=>{
      const x=40+(i%columns+.5)*(w-80)/columns,y=legendTop+Math.floor(i/columns)*legendRowHeight;
      const group=node('g',{opacity:s.opacity}),available=(w-80)/columns-40;
      group.append(node('rect',{x:x+available/2+7,y:y-s.legendSize+2,width:12,height:12,rx:2,fill:colorFor(project,part.name)}));
      group.append(text(x,y,s.showLabels?trim(part.name,Math.floor(available/(s.legendSize*.65))):format(project,i+1),s.legendSize,{'font-weight':600}));
      if(s.showValues)group.append(text(x,y+s.valueSize+13,`${format(project,part.share*100)}٪ · ${format(project,part.value)} ${s.unit}`,s.valueSize));
      interactive(group,part.name,`${part.name}؛ ${format(project,part.value)} ${s.unit}؛ ${format(project,part.share*100)}٪ واقعی؛ ${format(project,part.count)} خانه`);svg.append(group);
    });
    const rounded=parts.some(p=>Math.abs(p.count-cells*p.share)>1e-7),omitted=parts.filter(p=>p.value>0&&p.count===0).length;
    summaries=[{label:'دسته',value:format(project,parts.length)},{label:'خانه',value:format(project,cells)},{label:`مجموع · ${s.unit}`,value:format(project,parts.reduce((sum,p)=>sum+p.value,0))}];
    note=`هر خانه سهم یکسانی از کل دارد. ${rounded?'تعداد خانه‌ها با روش بزرگ‌ترین باقیمانده گرد شده؛ درصدهای راهنما از مقدار واقعی داده محاسبه شده‌اند. ':''}${omitted?`${format(project,omitted)} دستهٔ کوچک خانه‌ای نگرفته‌اند؛ تعداد خانه را بیشتر کنید یا جزئیات راهنما را بخوانید.`:''}`;
  }else{
    const table=parallelTable(project.rows,s),labelSpace=s.showLabels&&s.endLabels!=='none'?Math.min(175,w*.19):65,left=labelSpace,right=w-labelSpace,width=right-left,dx=width/(table.axes.length-1);
    if(dx<45)throw Error('محورها در این عرض جا نمی‌شوند؛ عرض بوم را بیشتر کنید.');
    const xx=(i:number):number=>s.direction==='rtl'?right-dx*i:left+dx*i;
    const yy=(value:number,axis:string):number=>bottom-axisPosition(value,table.domains.get(axis)!,s.axisScale==='log',table.state.inverted.includes(axis))*height;
    for(const [i,axis] of table.axes.entries()){
      const x=xx(i),domain=table.domains.get(axis)!,inverted=table.state.inverted.includes(axis),ticks=domain[0]===domain[1]?[.5]:[0,.25,.5,.75,1];
      if(s.showAxes)svg.append(node('line',{x1:x,x2:x,y1:top,y2:bottom,stroke:s.textColor,'stroke-opacity':.3}));
      const label=text(x,top-34,trim(axis,Math.max(5,Math.floor(dx/(s.fontSize*.55)))),s.fontSize,{'font-weight':600});title(label,axis+(inverted?'؛ جهت معکوس':''));if(s.showLabels)svg.append(label);
      for(const t of ticks){
        const value=domain[0]===domain[1]?domain[0]:s.axisScale==='log'?10**(Math.log10(domain[0])+t*(Math.log10(domain[1])-Math.log10(domain[0]))):domain[0]+t*(domain[1]-domain[0]),y=yy(value,axis);
        if(s.showGrid)svg.append(node('line',{x1:Math.max(left,x-dx*.4),x2:Math.min(right,x+dx*.4),y1:y,y2:y,stroke:s.textColor,'stroke-opacity':.1}));
        // Keep endpoint names outside the chart and numeric ticks on its inner side.
        const insideLeft=x===right;
        if(s.showAxes)svg.append(text(x+(insideLeft?-9:9),y+4,format(project,value),s.valueSize,{'text-anchor':insideLeft?'end':'start',direction:'ltr',opacity:.7,'paint-order':'stroke',stroke:s.background,'stroke-width':3}));
      }
      const range=table.state.filters[axis];
      if(range){
        const lo=Math.max(domain[0],range[0]),hi=Math.min(domain[1],range[1]);
        if(lo<=hi)svg.append(node('line',{x1:x,x2:x,y1:yy(lo,axis),y2:yy(hi,axis),stroke:s.textColor,'stroke-width':9,'stroke-opacity':.15,'data-axis-range':axis}));
        svg.append(text(x,bottom+27,'فیلتر فعال',s.valueSize,{opacity:.75}));
      }
      if(inverted)svg.append(text(x,top-13,'↓',s.valueSize,{opacity:.7}));
    }
    // Render only matching items; the full-data axis domains stay fixed during filtering.
    const labels:{name:string;group:string;x:number;y:number;start:boolean}[]=[];
    for(const item of table.visible){
      const group=node('g',{opacity:s.opacity,'data-item':item.name}),color=colorFor(project,item.group);let d='',previous=false;
      table.axes.forEach((axis,i)=>{
        const value=item.values.get(axis);if(value===undefined){previous=false;return;}
        const x=xx(i),y=yy(value,axis);d+=`${previous?'L':'M'}${x},${y}`;previous=true;
        const isolated=(i===0||!item.values.has(table.axes[i-1]))&&(i===table.axes.length-1||!item.values.has(table.axes[i+1]));
        if(s.showPoints||isolated)group.append(node('circle',{cx:x,cy:y,r:s.pointRadius,fill:color,stroke:s.background,'stroke-width':s.strokeWidth}));
        if(s.showLabels&&s.endLabels!=='none'&&(i===table.axes.length-1||(s.endLabels==='both'&&i===0)))labels.push({name:item.name,group:item.group,x,y,start:i===0});
      });
      const path=node('path',{d,fill:'none',stroke:color,'stroke-width':s.lineWidth,'stroke-linejoin':'round'});group.prepend(path);
      // A wider transparent stroke makes thin paths usable with a pointer.
      group.append(node('path',{d,fill:'none',stroke:'transparent','stroke-width':Math.max(10,s.lineWidth),'pointer-events':'stroke'}));
      const description=`${item.name}؛ ${item.group}؛ `+table.axes.map(axis=>`${axis}: ${item.values.has(axis)?format(project,item.values.get(axis)!):'بدون داده'}`).join('؛ ');
      interactive(group,item.group,description);svg.append(group);
    }
    let shown=0;
    for(const start of [true,false]){
      let last=-Infinity;
      for(const label of labels.filter(l=>l.start===start).sort((a,b)=>a.y-b.y)){
        if(label.y-last<s.fontSize+5)continue;last=label.y;shown++;
        const isLeft=label.x===left,x=label.x+(isLeft?-12:12),el=text(x,label.y+4,trim(label.name,Math.floor((labelSpace-24)/(s.fontSize*.65))),s.fontSize,{'text-anchor':isLeft?'end':'start',fill:colorFor(project,label.group)});title(el,label.name);svg.append(el);
      }
    }
    if(!table.visible.length)svg.append(text(w/2,(top+bottom)/2,'هیچ موردی با فیلترهای فعلی مطابقت ندارد.',s.fontSize,{'paint-order':'stroke',stroke:s.background,'stroke-width':6}));
    svg.append(text(w/2,bottom+53,s.parallelScale==='shared'?`دامنهٔ عددی مشترک${s.unit?' · '+s.unit:''}`:'هر محور دامنهٔ مستقل دارد؛ واحد در نام شاخص',s.fontSize,{opacity:.75}));
    if(s.showLegend)names.forEach((name,i)=>{
      const x=40+(i%columns+.5)*(w-80)/columns,y=legendTop+Math.floor(i/columns)*legendRowHeight,group=node('g',{opacity:s.opacity});
      group.append(node('line',{x1:x+55,x2:x+78,y1:y-4,y2:y-4,stroke:colorFor(project,name),'stroke-width':s.lineWidth}),text(x,y,trim(name,Math.floor(((w-80)/columns-55)/(s.legendSize*.65))),s.legendSize));interactive(group,name,name);svg.append(group);
    });
    summaries=[{label:'مورد نمایان / کل',value:`${format(project,table.visible.length)} / ${format(project,table.items.length)}`},{label:'شاخص',value:format(project,table.axes.length)},{label:'مقدار غایب',value:format(project,table.missing)}];
    note=`هر مسیر یک مورد و رنگ آن گروه را نشان می‌دهد. ${s.parallelScale==='independent'?'محورها مستقل مقیاس‌بندی شده‌اند؛ ارتفاع یکسان در دو محور به معنای مقدار یکسان نیست. ':''}${table.missing?'دادهٔ غایب '+(s.parallelMissing==='exclude'?'کل مورد را پنهان می‌کند. ':'مسیر را قطع می‌کند و با صفر جایگزین نمی‌شود. '):''}${labels.length>shown?'نام‌های متراکم پنهان شده‌اند؛ جزئیات کامل با انتخاب مسیر در دسترس است. ':''}${Object.keys(table.state.filters).length?'فیلترها بر مقدار اصلی اعمال می‌شوند؛ دامنهٔ محورها ثابت می‌ماند.':''}`;
  }
  return {svg,summaries,note};
}
