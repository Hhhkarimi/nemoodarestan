import { arc, curveBumpX, curveLinear, curveStep, line } from 'd3-shape';
import type { Project } from '../series/model.ts';
import type { ChartResult } from '../series/chart.ts';
import { colorFor, format } from '../series/model.ts';
import { family } from '../series/fonts.ts';
import { fitSwarm, labelPositions, median, rankTable, validateComparisonData } from './math.ts';
import type { RankPoint } from './math.ts';
const ns='http://www.w3.org/2000/svg';
type Attributes=Record<string,string|number>;
function node<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Attributes={},text?:string):SVGElementTagNameMap[K]{
  const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;
}
const trim=(s:string,n:number):string=>s.length>n?s.slice(0,n-1)+'…':s;
export function renderComparison(project:Project,select?:(group:string)=>void):ChartResult{
  const s=project.settings,w=s.width,h=s.height;validateComparisonData(project.rows,project.kind==='bump'?'bump':'beeswarm',s);
  const svg=node('svg',{xmlns:ns,viewBox:`0 0 ${w} ${h}`,width:w,height:h,role:'img','aria-label':s.title||'نمودار'});
  svg.style.fontFamily=family(project);svg.append(node('title',{},s.title),node('desc',{},s.subtitle),node('rect',{'data-background':'true',width:w,height:h,fill:s.background}));
  const text=(x:number,y:number,value:string,size=s.fontSize,attrs:Attributes={}):SVGTextElement=>node('text',{x,y,fill:s.textColor,'font-size':size,'font-family':family(project),'text-anchor':'middle',direction:'rtl','unicode-bidi':'plaintext',...attrs},value);
  svg.append(text(w/2,48,s.title,s.titleSize,{'font-weight':700}),text(w/2,80,s.subtitle,s.subtitleSize,{opacity:.75}));
  const names=[...new Set(project.rows.map(r=>r.group))],columns=Math.max(2,Math.floor((w-100)/165)),legendRows=s.showLegend?Math.ceil(names.length/columns):0,legendHeight=legendRows*(s.legendSize+19);
  const top=132,bottom=h-95-legendHeight,height=bottom-top;
  if(height<110)throw Error('ارتفاع بوم کم است؛ ارتفاع را بیشتر یا راهنمای رنگ را خاموش کنید.');
  function interactive(el:SVGElement,group:string,label:string):void{
    el.setAttribute('data-group',group);el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',label);el.style.cursor='pointer';el.append(node('title',{},label));
    el.addEventListener('click',()=>select?.(group));el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select?.(group);}});
  }
  let summaries:ChartResult['summaries'],note:string;
  if(project.kind==='bump'){
    const table=rankTable(project.rows,s),labelMargin=Math.min(215,Math.max(115,Math.max(...names.map(n=>n.length))*s.fontSize*.65+30)),labels=s.showLabels&&s.endLabels!=='none';
    const startLabels=labels&&s.endLabels==='both',endLabels=labels;
    const left=60+(s.direction==='rtl'?(endLabels?labelMargin:0):(startLabels?labelMargin:0)),right=w-55-(s.direction==='rtl'?(startLabels?labelMargin:0):(endLabels?labelMargin:0)),width=right-left;
    if(width<150)throw Error('برای نام گروه‌ها، عرض بوم را بیشتر کنید یا برچسب‌ها را فقط در انتهای مسیر بگذارید.');
    const x=(i:number):number=>s.direction==='rtl'?right-i/(table.periods.length-1)*width:left+i/(table.periods.length-1)*width;
    const y=(rank:number):number=>table.maxRank===1?(top+bottom)/2:top+(rank-1)/(table.maxRank-1)*height;
    const ticks=table.maxRank<=16?Array.from({length:Math.floor(table.maxRank)},(_,i)=>i+1).concat(Number.isInteger(table.maxRank)?[]:[table.maxRank]):Array.from({length:5},(_,i)=>1+(table.maxRank-1)*i/4);
    for(const rank of ticks){if(s.showGrid)svg.append(node('line',{x1:left,x2:right,y1:y(rank),y2:y(rank),stroke:s.textColor,'stroke-opacity':.1}));if(s.showAxes)svg.append(text(left-20,y(rank)+4,format(project,rank),s.fontSize,{direction:'ltr'}));}
    if(s.showAxes){
      const every=Math.max(1,Math.ceil(table.periods.length/Math.max(2,Math.floor(width/95))));
      table.periods.forEach((period,i)=>{if(i%every===0||i===table.periods.length-1)svg.append(text(x(i),bottom+35,trim(period,13),s.fontSize));});svg.append(text(left,top-19,'رتبه',s.fontSize));
    }
    const curve=s.bumpCurve==='linear'?curveLinear:s.bumpCurve==='step'?curveStep:curveBumpX;
    const plot=node('g'),pathMaker=line<RankPoint|null>().defined((p):p is RankPoint=>p!==null).x(p=>x(table.periods.indexOf(p!.period))).y(p=>y(p!.rank)).curve(curve);
    for(const series of table.series){
      const points=s.connectMissing?series.points.filter((p):p is RankPoint=>p!==null):series.points;
      const path=node('path',{d:pathMaker(points)??'',fill:'none',stroke:colorFor(project,series.name),'stroke-width':s.lineWidth,opacity:s.opacity,'data-rank-line':series.name});
      interactive(path,series.name,`مسیر ${series.name}`);plot.append(path);
    }
    const sharedPoints=new Map<string,RankPoint[]>();for(const series of table.series)for(const p of series.points)if(p){const key=JSON.stringify([p.period,p.rank]),peers=sharedPoints.get(key)??[];peers.push(p);sharedPoints.set(key,peers);}
    const shape=arc();
    for(const peers of sharedPoints.values()){
      const first=peers[0],cx=x(table.periods.indexOf(first.period)),cy=y(first.rank);
      peers.forEach((p,index)=>{
        if(!s.showPoints)return;
        const attrs={fill:colorFor(project,p.group),stroke:s.background,'stroke-width':s.strokeWidth,opacity:s.opacity,'data-rank':p.rank,'data-period':p.period};
        const marker=peers.length===1?node('circle',{cx,cy,r:s.pointRadius,...attrs}):node('path',{d:shape({innerRadius:0,outerRadius:s.pointRadius+2,startAngle:index/peers.length*Math.PI*2,endAngle:(index+1)/peers.length*Math.PI*2})??'',transform:`translate(${cx},${cy})`,...attrs});
        interactive(marker,p.group,`${p.group}؛ ${p.period}؛ رتبهٔ ${format(project,p.rank)}${s.rankInput==='value'?`؛ مقدار ${format(project,p.value)} ${s.unit}`:''}${peers.length>1?'؛ رتبهٔ مشترک':''}`);plot.append(marker);
      });
      if(s.showValues){const value=format(project,first.rank),inside=s.showPoints&&value.length*s.valueSize*.58<s.pointRadius*1.8;plot.append(text(cx,cy+(inside?s.valueSize*.34:-s.pointRadius-7),value,s.valueSize,{fill:inside?'#ffffff':s.textColor,'pointer-events':'none',direction:'ltr'}));}
    }
    svg.append(plot);
    const drawLabels=(side:'start'|'end'):void=>{
      const items=table.series.map(series=>({name:series.name,p:(side==='end'?[...series.points].reverse():series.points).find(p=>p!==null)!}));
      const positions=labelPositions(items.map(item=>({key:item.name,y:y(item.p.rank)})),top,bottom,s.fontSize+9);
      const onRight=side==='end'?s.direction!=='rtl':s.direction==='rtl',edge=onRight?right:left,labelX=edge+(onRight?19:-19),limit=Math.max(6,Math.floor((labelMargin-30)/(s.fontSize*.65)));
      for(const item of items){const yy=positions.get(item.name)!,px=x(table.periods.indexOf(item.p.period)),py=y(item.p.rank),color=colorFor(project,item.name);
        svg.append(node('path',{d:`M${px},${py}L${edge+(onRight?9:-9)},${yy}`,stroke:color,'stroke-opacity':.4,'stroke-width':1,fill:'none'}));
        const label=text(labelX,yy+4,trim(item.name,limit),s.fontSize,{'text-anchor':onRight?'end':'start','font-weight':600});interactive(label,item.name,`${item.name}؛ رتبهٔ ${format(project,item.p.rank)} در ${item.p.period}`);svg.append(label);
      }
    };
    if(startLabels)drawLabels('start');if(endLabels)drawLabels('end');
    summaries=[{label:'گروه',value:format(project,table.groups.length)},{label:'دوره',value:format(project,table.periods.length)},{label:'دادهٔ ثبت‌شده',value:format(project,project.rows.length)}];
    note=`ترتیب دوره‌ها، ترتیب ورود داده است. ${table.missing?`${format(project,table.missing)} ترکیب گروه و دوره بدون داده است؛ ${s.connectMissing?'فاصله‌ها به هم وصل شده‌اند':'مسیر در فاصله‌ها قطع می‌شود'}. `:''}${table.ties?'نشانگر چندرنگ یعنی رتبهٔ مشترک. ':''}${s.rankInput==='rank'?'رتبه‌های ورودی مستقیماً رسم شده‌اند.':'رتبه‌ها فقط میان گروه‌های حاضر در هر دوره محاسبه شده‌اند.'}`;
  }else{
    const left=s.swarmLayout==='grouped'?Math.min(215,Math.max(115,s.fontSize*8)):65,right=w-55,width=right-left;
    const values=project.rows.map(r=>r.value);let low=Math.min(...values),high=Math.max(...values);
    if(low===high){const d=s.axisScale==='log'?Math.pow(10,.1):Math.max(1,Math.abs(low)*.05);if(s.axisScale==='log'){low/=d;high*=d;}else{low-=d;high+=d;}}
    const lo=s.axisScale==='log'?Math.log10(low):low,hi=s.axisScale==='log'?Math.log10(high):high,inset=18;
    const x=(value:number):number=>{const t=((s.axisScale==='log'?Math.log10(value):value)-lo)/(hi-lo);return s.direction==='rtl'?right-inset-t*(width-inset*2):left+inset+t*(width-inset*2);};
    let groups=names.map(name=>({name,indices:project.rows.flatMap((r,i)=>r.group===name?[i]:[])}));
    if(s.swarmSort==='median')groups.sort((a,b)=>median(a.indices.map(i=>values[i]))-median(b.indices.map(i=>values[i])));if(s.swarmSort==='name')groups.sort((a,b)=>a.name.localeCompare(b.name,'fa'));
    if(s.swarmLayout==='combined')groups=[{name:'همهٔ مشاهده‌ها',indices:project.rows.map((_,i)=>i)}];
    const band=height/groups.length,half=band/2-27;
    if(half<8)throw Error('برای تعداد گروه‌ها، ارتفاع بیشتری لازم است؛ ارتفاع را افزایش دهید یا همهٔ نقطه‌ها را در یک ردیف قرار دهید.');
    const groupInputs=groups.map(group=>group.indices.map(index=>({index,x:x(values[index])}))),fits=groupInputs.map(input=>fitSwarm(input,s.pointRadius,s.pointPadding+s.strokeWidth,half,s.autoPointSize));
    const actualRadius=Math.min(...fits.map(f=>f.radius));let hiddenLabels=0;
    for(let i=0;i<=5;i++){const value=s.axisScale==='log'?10**(lo+(hi-lo)*i/5):low+(high-low)*i/5,xx=x(value);if(s.showGrid)svg.append(node('line',{x1:xx,x2:xx,y1:top,y2:bottom,stroke:s.textColor,'stroke-opacity':.1}));if(s.showAxes)svg.append(text(xx,bottom+32,format(project,value),s.fontSize,{direction:'ltr'}));}
    if(s.showAxes)svg.append(text((left+right)/2,bottom+61,s.unit,s.fontSize));
    const placedLabels:{x:number;y:number;width:number;height:number}[]=[];
    for(const [g,group] of groups.entries()){
      const center=top+band*(g+.5),layout=fits[g].radius===actualRadius?fits[g]:fitSwarm(groupInputs[g],actualRadius,s.pointPadding+s.strokeWidth,half,false);
      svg.append(node('line',{x1:left,x2:right,y1:center,y2:center,stroke:s.textColor,'stroke-opacity':.12}));
      if(s.showLabels&&s.swarmLayout==='grouped')svg.append(text(left-16,center+4,trim(group.name,Math.max(7,Math.floor((left-30)/(s.fontSize*.65)))),s.fontSize,{'text-anchor':'start','font-weight':600}));
      const groupValues=group.indices.map(i=>values[i]);
      for(const [shown,value,label,dash] of [[s.showMedian,median(groupValues),'میانه',''],[s.showMean,groupValues.reduce((a,b)=>a+b,0)/groupValues.length,'میانگین','5 4']] as const)if(shown){const marker=node('line',{x1:x(value),x2:x(value),y1:center-half*.85,y2:center+half*.85,stroke:s.textColor,'stroke-width':Math.max(1,s.strokeWidth),'stroke-dasharray':dash,'stroke-opacity':.65});marker.append(node('title',{},`${label} ${group.name}؛ ${format(project,value)}`));svg.append(marker);}
      const sorted=[...layout.points].sort((a,b)=>values[a.index]-values[b.index]),labelSet=new Set(s.pointLabels==='all'?(project.rows.length<=40?sorted.map(p=>p.index):[]):s.pointLabels==='extremes'?[sorted[0].index,sorted.at(-1)!.index]:[]);
      if(s.pointLabels==='all'&&project.rows.length>40)throw Error('برچسب همهٔ نقطه‌ها برای حداکثر ۴۰ مشاهده است؛ «کمینه و بیشینه» یا «بدون برچسب» را انتخاب کنید.');
      for(const p of layout.points){
        const row=project.rows[p.index],circle=node('circle',{cx:p.x,cy:center+p.y,r:layout.radius,fill:colorFor(project,row.group),opacity:s.opacity,stroke:s.background,'stroke-width':s.strokeWidth,'data-observation':p.index,'data-value':row.value});
        interactive(circle,row.group,`${row.x}؛ ${row.group}؛ ${format(project,row.value)} ${s.unit}`);svg.append(circle);
        if(s.showLabels&&labelSet.has(p.index)){
          const label=trim(row.x,22),amount=s.showValues?' · '+format(project,row.value):'',lw=label.length*s.fontSize*.64+amount.length*s.valueSize*.64,lx=Math.max(left+lw/2,Math.min(right-lw/2,p.x));
          const candidates=[center-half-8,center+half+18];let used=false;
          for(const ly of candidates){const box={x:lx-lw/2,y:ly-Math.max(s.fontSize,s.valueSize),width:lw,height:Math.max(s.fontSize,s.valueSize)+5};if(!placedLabels.some(b=>b.x<box.x+box.width+5&&b.x+b.width+5>box.x&&b.y<box.y+box.height&&b.y+b.height>box.y)){const annotation=text(lx,ly,label,s.fontSize,{'pointer-events':'none'});if(amount)annotation.append(node('tspan',{'font-size':s.valueSize},amount));svg.append(annotation);placedLabels.push(box);used=true;break;}}
          if(!used)hiddenLabels++;
        }
      }
    }
    summaries=[{label:'مشاهدهٔ مستقل',value:format(project,project.rows.length)},{label:'گروه',value:format(project,names.length)},{label:`میانه · ${s.unit}`,value:format(project,median(values))}];
    note=`هر نقطه یک مشاهده است؛ جابه‌جایی عمودی فقط برای جلوگیری از هم‌پوشانی است. ${actualRadius<s.pointRadius-.01?`شعاع برای جا شدن تا ${format(project,actualRadius)} پیکسل کوچک شده است. `:''}${s.showMedian?'خط پیوسته: میانه. ':''}${s.showMean?'خط‌چین: میانگین. ':''}${hiddenLabels?`${format(project,hiddenLabels)} برچسب برای جلوگیری از برخورد نوشته‌ها پنهان شده؛ جزئیات همهٔ نقطه‌ها در راهنمای آن‌ها موجود است.`:''}`;
  }
  if(s.showLegend)names.forEach((name,i)=>{const col=i%columns,row=Math.floor(i/columns),x=50+(w-100)/columns*(col+.5),y=h-legendHeight+row*(s.legendSize+19)+6;svg.append(node('rect',{x:x+48,y:y-10,width:10,height:10,rx:2,fill:colorFor(project,name)}),text(x+40,y,trim(name,18),s.legendSize,{'text-anchor':'start'}));});
  return {svg,summaries,note};
}
