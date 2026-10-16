import { area, curveBasis, curveLinear, curveMonotoneX, curveStep, stack, stackOffsetNone, stackOffsetSilhouette, stackOffsetWiggle, stackOrderDescending, stackOrderInsideOut, stackOrderNone, stackOrderReverse } from 'd3-shape';
import type { SeriesPoint } from 'd3-shape';
import { colorFor, format } from './model.ts';
import type { Project } from './model.ts';
import { distributions, streamTable } from './math.ts';
import { family } from './fonts.ts';
import { renderRadial } from '../radial/chart.ts';
const ns = 'http://www.w3.org/2000/svg';
type Attributes = Record<string,string | number>;
function node<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attributes = {}, text?: string): SVGElementTagNameMap[K] {
  const element = document.createElementNS(ns,tag);
  for (const [key,value] of Object.entries(attrs)) element.setAttribute(key,String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}
const scale = (a: number,b: number,c: number,d: number) => (x: number): number => c+(x-a)/(b-a || 1)*(d-c);
export interface ChartResult { svg: SVGSVGElement; summaries: {label:string;value:string}[]; note: string; bandwidth?: number }
export function renderChart(project: Project, selectGroup?: (group: string) => void): ChartResult {
  if(project.kind==='sunburst'||project.kind==='spiral-heatmap')return renderRadial(project,selectGroup);
  const s = project.settings, w = s.width, h = s.height;
  const svg = node('svg',{xmlns:ns,viewBox:`0 0 ${w} ${h}`,width:w,height:h,role:'img','aria-label':s.title || 'نمودار'});
  svg.style.fontFamily = family(project);
  svg.append(node('title',{},s.title),node('desc',{},s.subtitle));
  svg.append(node('rect',{'data-background':'true',width:w,height:h,fill:s.background}));
  const text = (x:number,y:number,value:string,size=s.fontSize,attrs:Attributes={}): SVGTextElement => node('text',{x,y,fill:s.textColor,'font-size':size,'text-anchor':'middle','font-family':family(project),direction:'rtl','unicode-bidi':'plaintext',...attrs},value);
  svg.append(text(w/2,48,s.title,s.titleSize,{'font-weight':700}));
  svg.append(text(w/2,80,s.subtitle,s.subtitleSize,{opacity:.75}));
  const names = [...new Set(project.rows.map(r=>r.group))];
  const legendRows = s.showLegend ? Math.ceil(names.length/Math.max(2,Math.floor((w-100)/160))) : 0;
  const left = project.kind === 'ridgeline' ? Math.max(115,s.fontSize*8) : 70, right = 55, top = project.kind === 'streamgraph' ? 125 : 140;
  const bottom = h-65-legendRows*(s.legendSize+16), width = w-left-right, height = bottom-top;
  if(height<100)throw Error('ارتفاع بوم برای این تعداد گروه و راهنمای رنگ کافی نیست؛ از خروجی، ارتفاع را بیشتر کنید یا راهنمای رنگ را در طراحی خاموش کنید.');
  const clipId = `plot-${project.kind}`;
  const defs = node('defs'); const clip=node('clipPath',{id:clipId});clip.append(node('rect',{x:left,y:100,width,height:Math.max(1,bottom-100)}));defs.append(clip);svg.append(defs);
  const curves = {basis:curveBasis,linear:curveLinear,monotone:curveMonotoneX,step:curveStep};
  const curve = curves[s.curve as keyof typeof curves] ?? curveBasis;
  const interactive = (path: SVGPathElement, group: string, description: string): void => {
    path.append(node('title',{},description));
    path.setAttribute('data-group',group);
    path.setAttribute('tabindex','0'); path.setAttribute('role','button');path.setAttribute('aria-label',description);
    path.style.cursor='pointer';
    path.addEventListener('click',()=>selectGroup?.(group));
    path.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectGroup?.(group);}});
  };
  let summaries: ChartResult['summaries'] = [], note = '', bandwidth: number | undefined;
  if (project.kind === 'streamgraph') {
    const table = streamTable(project.rows,s.normalize), indices=table.groups.map((_,i)=>i);
    const offsets = {wiggle:stackOffsetWiggle,silhouette:stackOffsetSilhouette,zero:stackOffsetNone};
    const orders = {'inside-out':stackOrderInsideOut,input:stackOrderNone,total:stackOrderDescending,reverse:stackOrderReverse};
    const layers = stack<number[],number>().keys(indices).value((row,key)=>row[key]).offset(offsets[s.offset as keyof typeof offsets] ?? stackOffsetWiggle).order(orders[s.order as keyof typeof orders] ?? stackOrderInsideOut)(table.values);
    let low=Infinity,high=-Infinity;
    for(const layer of layers)for(const point of layer){low=Math.min(low,point[0]);high=Math.max(high,point[1]);}
    const x=scale(0,table.periods.length-1,s.direction==='rtl'?w-right:left,s.direction==='rtl'?left:w-right), y=scale(low,high,bottom,top);
    if(s.showGrid)for(let i=0;i<=4;i++){const yy=top+height*i/4;svg.append(node('line',{x1:left,x2:w-right,y1:yy,y2:yy,stroke:s.textColor,'stroke-opacity':.1}));}
    const paths = node('g',{'clip-path':`url(#${clipId})`});
    for(const layer of [...layers].sort((a,b)=>a.index-b.index)){
      const group=table.groups[layer.key], value=table.values.reduce((total,row)=>total+row[layer.key],0);
      const original=project.rows.filter(r=>r.group===group).reduce((n,r)=>n+r.value,0);
      const d=area<SeriesPoint<number[]>>().x((_,i)=>x(i)).y0(p=>y(p[0])).y1(p=>y(p[1])).curve(curve)(layer);
      const path=node('path',{d:d ?? '',fill:colorFor(project,group),opacity:s.opacity,stroke:s.background,'stroke-width':s.strokeWidth});
      interactive(path,group,`${group}؛ مجموع ${format(project,original)} ${s.unit}`);paths.append(path);
      if(s.showLabels && value>0){let best=0;layer.forEach((p,i)=>{if(p[1]-p[0]>layer[best][1]-layer[best][0])best=i;});
        const p=layer[best], thickness=Math.abs(y(p[0])-y(p[1]));
        if(thickness>s.fontSize*1.8)paths.append(text(x(Math.max(.4,Math.min(table.periods.length-1.4,best))),(y(p[0])+y(p[1]))/2+4,`${group}${s.showValues?' · '+format(project,original):''}`,s.fontSize,{'pointer-events':'none','font-weight':600}));
      }
    }
    svg.append(paths);
    if(s.showAxes){
      const every=Math.max(1,Math.ceil(table.periods.length/Math.max(3,Math.floor(width/95))));
      table.periods.forEach((period,i)=>{if(i%every===0||i===table.periods.length-1){svg.append(text(x(i),bottom+28,period,s.fontSize,{ 'text-anchor':i===0?(s.direction==='rtl'?'end':'start'):i===table.periods.length-1?(s.direction==='rtl'?'start':'end'):'middle'}));}});
      if(s.offset==='zero')for(let i=0;i<=4;i++){const v=high*i/4;svg.append(text(left-12,y(v)+4,`${format(project,v)}${s.normalize?'٪':''}`,s.fontSize,{'text-anchor':'end',direction:'ltr'}));}
    }
    summaries=[{label:'لایهٔ داده',value:format(project,table.groups.length)},{label:'دوره',value:format(project,table.periods.length)},{label:`مجموع · ${s.unit}`,value:format(project,project.rows.reduce((n,r)=>n+r.value,0))}];
    note=`فاصلهٔ دوره‌ها یکسان است. ${table.missing?`${format(project,table.missing)} ترکیبِ دوره و گروه با صفر پر شده است. `:''}${s.offset!=='zero'?'موقعیت عمودی لایه‌ها مقدار مطلق نیست؛ ضخامت را مقایسه کنید.':''}`;
  } else {
    const result=distributions(project.rows,s.bandwidth);bandwidth=result.groups[0].bandwidth;
    let groups=[...result.groups];
    if(s.ridgeSort==='mean')groups.sort((a,b)=>a.mean-b.mean);
    if(s.ridgeSort==='median')groups.sort((a,b)=>a.median-b.median);
    if(s.ridgeSort==='reverse')groups.reverse();
    const x=scale(...result.domain,s.direction==='rtl'?w-right:left,s.direction==='rtl'?left:w-right);
    const gap=height/(Math.max(0,groups.length-1)+s.overlap), rise=gap*s.overlap;
    const sharedPeak=Math.max(...groups.map(g=>g.peak),1e-20);
    if(s.showGrid)for(let i=0;i<=6;i++){const xx=left+width*i/6;svg.append(node('line',{x1:xx,x2:xx,y1:105,y2:bottom,stroke:s.textColor,'stroke-opacity':.1}));}
    const paths=node('g',{'clip-path':`url(#${clipId})`});
    groups.forEach((group,i)=>{
      const baseline=top+rise+gap*i, peak=s.densityScale==='individual'?Math.max(group.peak,1e-20):sharedPeak;
      const y=(density:number):number=>baseline-density/peak*rise;
      if(s.showAxes)svg.append(node('line',{x1:left,x2:w-right,y1:baseline,y2:baseline,stroke:s.textColor,'stroke-opacity':.13}));
      const path=node('path',{d:area<[number,number]>().x(p=>x(p[0])).y0(baseline).y1(p=>y(p[1])).curve(curve)(group.points) ?? '',fill:colorFor(project,group.name),opacity:s.opacity,stroke:colorFor(project,group.name),'stroke-width':s.strokeWidth});
      interactive(path,group.name,`${group.name}؛ میانگین ${format(project,group.mean)}؛ میانه ${format(project,group.median)} ${s.unit}`);paths.append(path);
      if(s.showMedian){const nearest=group.points.reduce((best,p)=>Math.abs(p[0]-group.median)<Math.abs(best[0]-group.median)?p:best,group.points[0]);paths.append(node('line',{x1:x(group.median),x2:x(group.median),y1:baseline,y2:y(nearest[1]),stroke:s.textColor,'stroke-dasharray':'4 3','stroke-width':1.5}));}
      if(s.showLabels){const label=text(left-12,baseline-4,group.name,s.fontSize,{'text-anchor':'end'});label.append(node('title',{},group.name));svg.append(label);}
      if(s.showValues)svg.append(text(w-right+8,baseline-4,format(project,group.median),s.fontSize,{'text-anchor':'start',direction:'ltr'}));
    });
    svg.append(paths);
    if(s.showAxes)for(let i=0;i<=6;i++){const v=result.domain[0]+(result.domain[1]-result.domain[0])*i/6;svg.append(text(x(v),bottom+28,format(project,v),s.fontSize,{direction:'ltr'}));}
    const weight=project.rows.reduce((n,r)=>n+r.value,0);
    summaries=[{label:'گروه',value:format(project,groups.length)},{label:'ردیف مشاهده',value:format(project,project.rows.length)},{label:'مجموع وزن‌ها',value:format(project,weight)}];
    note=`برآورد چگالی با هستهٔ گاوسی · پهنای هموارسازی ${format(project,bandwidth)} ${s.unit}. ${s.densityScale==='individual'?'ارتفاع هر گروه مستقل تنظیم شده؛ ارتفاع قله‌ها قابل مقایسه نیست.':'مقیاس چگالی همهٔ گروه‌ها یکسان است.'}`;
  }
  if(s.showLegend){
    const columns=Math.max(2,Math.floor((w-100)/160)), cell=(w-100)/columns;
    names.forEach((name,i)=>{const xx=w-55-(i%columns)*cell, yy=h-legendRows*(s.legendSize+16)+Math.floor(i/columns)*(s.legendSize+16)+4;
      svg.append(node('rect',{x:xx-8,y:yy-9,width:9,height:9,rx:2,fill:colorFor(project,name)}));
      svg.append(text(xx-16,yy,name,s.legendSize,{'text-anchor':'end'}));
    });
  }
  if(s.showAxes && s.unit)svg.append(text(w/2,bottom+49,project.kind==='streamgraph'&&s.normalize?'سهم از مجموع دوره (درصد)':s.unit,s.fontSize,{opacity:.7}));
  return {svg,summaries,note,bandwidth};
}
