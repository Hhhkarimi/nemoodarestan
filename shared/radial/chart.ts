import { arc } from 'd3-shape';
import { colorFor, format } from '../series/model.ts';
import type { Project } from '../series/model.ts';
import type { ChartResult } from '../series/chart.ts';
import { family } from '../series/fonts.ts';
import { flatten, heatColor, heatDomain, heatTable, hierarchy, spiralCell, tau } from './math.ts';
const ns='http://www.w3.org/2000/svg';
type Attributes=Record<string,string|number>;
function node<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Attributes={},text?:string):SVGElementTagNameMap[K]{
  const element=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))element.setAttribute(k,String(v));if(text!==undefined)element.textContent=text;return element;
}
function shade(color:string,amount:number):string{return '#'+[1,3,5].map(i=>{const v=parseInt(color.slice(i,i+2),16);return Math.round(v+(255-v)*amount).toString(16).padStart(2,'0');}).join('');}
function ink(color:string):string{const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.32?'#18352e':'#ffffff';}
export function renderRadial(project:Project,select?:(group:string)=>void):ChartResult{
  const s=project.settings,w=s.width,h=s.height,svg=node('svg',{xmlns:ns,viewBox:`0 0 ${w} ${h}`,width:w,height:h,role:'img','aria-label':s.title||'نمودار'});
  svg.style.fontFamily=family(project);svg.append(node('title',{},s.title),node('desc',{},s.subtitle),node('rect',{'data-background':'true',width:w,height:h,fill:s.background}));
  const text=(x:number,y:number,value:string,size=s.fontSize,attrs:Attributes={}):SVGTextElement=>node('text',{x,y,fill:s.textColor,'font-size':size,'font-family':family(project),'text-anchor':'middle',direction:'rtl','unicode-bidi':'plaintext',...attrs},value);
  svg.append(text(w/2,48,s.title,s.titleSize,{'font-weight':700}),text(w/2,79,s.subtitle,s.subtitleSize,{opacity:.75}));
  function interactive(path:SVGElement,group:string,description:string):void{
    path.append(node('title',{},description));path.setAttribute('data-group',group);path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',description);path.style.cursor='pointer';
    path.addEventListener('click',()=>select?.(group));path.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select?.(group);}});
  }
  if(project.kind==='sunburst'){
    const root=hierarchy(project.rows,s.sunSort),all=flatten(root),focus=all.find(n=>n.path===s.focusPath&&n.children.length&&n.value>0)??root;
    const nodes=flatten(focus),depth=Math.max(...nodes.map(n=>n.depth-focus.depth)),groups=root.children.map(n=>n.name);
    const columns=Math.max(2,Math.floor((w-90)/170)),legendRows=s.showLegend?Math.ceil(groups.length/columns):0;
    const legendHeight=legendRows*(s.legendSize+18),radius=Math.min((w-100)/2,(h-150-legendHeight)/2);
    if(radius<80)throw Error('بوم برای این تعداد گروه کوچک است؛ ارتفاع را بیشتر یا راهنمای رنگ را خاموش کنید.');
    const cx=w/2,cy=110+radius,hole=radius*s.innerRadius,band=(radius-hole)/depth;
    const plot=node('g',{transform:`translate(${cx},${cy})`}),rotation=s.rotation*Math.PI/180,extent=focus.end-focus.start;
    const angular=(a:number):number=>(a-focus.start)/extent*tau+rotation;
    const shape=arc();
    for(const n of nodes){
      if(n.value<=0)continue;
      const level=n.depth-focus.depth-1,inner=hole+level*band,outer=hole+(level+1)*band-Math.min(s.ringGap,band*.4),a0=angular(n.start),a1=angular(n.end);
      const color=shade(colorFor(project,n.group),Math.min(.55,(n.depth-1)*.17));
      const d=shape({innerRadius:inner,outerRadius:outer,startAngle:a0,endAngle:a1,padAngle:Math.min(.02,s.ringGap/radius)});
      const parent=all.find(p=>p.path===n.path.split('/').slice(0,-1).join('/'))??root;
      const amount=s.valueMode==='value'?format(project,n.value):format(project,n.value/(s.valueMode==='parent'?parent.value:root.value)*100)+'٪';
      const path=node('path',{d:d??'',fill:color,stroke:s.background,'stroke-width':s.strokeWidth,opacity:s.opacity,'data-path':n.path});
      interactive(path,n.group,`${n.path}؛ ${format(project,n.value)} ${s.unit}؛ ${format(project,n.value/root.value*100)} درصد از کل`);
      if(n.children.length)path.addEventListener('dblclick',()=>svg.dispatchEvent(new CustomEvent('chart-focus',{detail:n.path})));
      plot.append(path);
      if(s.showLabels&&s.labelMode!=='none'){
        const mid=(a0+a1)/2,r=(inner+outer)/2,x=Math.sin(mid)*r,y=-Math.cos(mid)*r;
        const angularSpace=(a1-a0)*r,radial=s.labelMode==='radial';
        const label=n.name+(s.showValues?' · '+amount:'');
        const estimated=label.length*s.fontSize*.65;
        // Hide labels that do not fit; the full path/value remains keyboard accessible.
        const available=radial?band*.88:Math.min(angularSpace*.82,band*.85/Math.max(.35,Math.abs(Math.sin(mid))));
        if(estimated<=available&&angularSpace>s.fontSize*1.6&&band>s.fontSize*1.8){
          let angle=mid*180/Math.PI-90;angle=((angle%360)+360)%360;if(angle>90&&angle<270)angle+=180;
          plot.append(text(x,y+4,label,s.fontSize,{fill:ink(color),'pointer-events':'none',...(radial?{transform:`rotate(${angle} ${x} ${y})`}:{})}));
        }
      }
    }
    const center=node('g',focus!==root?{role:'button',tabindex:0,'aria-label':'بازگشت به شاخهٔ والد'}:{});
    center.append(node('circle',{r:Math.max(5,hole-5),fill:s.background,stroke:s.showGrid?s.textColor:'none','stroke-opacity':.12}));
    center.append(text(0,-4,format(project,focus.value),Math.min(25,hole*.38),{'font-weight':700}),text(0,20,focus===root?'مجموع':focus.name.slice(0,12),Math.min(s.fontSize,hole*.23)));
    if(focus!==root){center.style.cursor='pointer';center.append(node('title',{},'بازگشت به شاخهٔ والد'));const back=():void=>{svg.dispatchEvent(new CustomEvent('chart-focus',{detail:focus.path.split('/').slice(0,-1).join('/')}));};center.addEventListener('click',back);center.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();back();}});}
    plot.append(center);svg.append(plot);
    if(s.showLegend)groups.forEach((group,i)=>{const col=i%columns,row=Math.floor(i/columns),columnWidth=(w-90)/columns,x=45+col*columnWidth+columnWidth/2,y=h-legendHeight+row*(s.legendSize+18);svg.append(node('rect',{x:x+48,y:y-10,width:10,height:10,rx:2,fill:colorFor(project,group)}),text(x+40,y,group.length>18?group.slice(0,17)+'…':group,s.legendSize,{'text-anchor':'start'}));});
    return {svg,summaries:[{label:'برگ داده',value:format(project,all.filter(n=>!n.children.length).length)},{label:'سطح سلسله‌مراتب',value:format(project,Math.max(...all.map(n=>n.depth)))},{label:`مجموع · ${s.unit}`,value:format(project,root.value)}],note:`${focus===root?'نمایش همهٔ داده‌ها':'شاخهٔ بازشده: '+focus.path} · جمع شاخه‌ها از برگ‌ها محاسبه می‌شود. رنگ هر شاخه در زیرشاخه‌های آن ادامه دارد. بخش‌های کوچک، جزئیات را در راهنمای شناور دارند.`};
  }
  const cells=heatTable(project.rows,s.timeUnit,s.aggregation),domain=heatDomain(cells,s),legendHeight=s.showLegend?72:12,radius=Math.min((w-150)/2,(h-160-legendHeight)/2);
  if(radius<70)throw Error('بوم کوچک است؛ ارتفاع را افزایش دهید.');
  const cx=w/2,cy=111+radius,hole=radius*s.innerRadius,plot=node('g',{transform:`translate(${cx},${cy})`});
  const dateFormat=new Intl.DateTimeFormat(s.digits==='fa'?`fa-IR-u-ca-${s.calendar}`:`en-US-u-ca-${s.calendar}`,{year:'numeric',month:'short',day:'numeric',...(s.timeUnit==='hour'?{hour:'2-digit',hourCycle:'h23' as const}:{}),timeZone:'UTC'});
  const dateLabel=(date:string):string=>dateFormat.format(new Date(date.length===10?date+'T00:00:00Z':date+':00Z'));
  for(const cell of cells){
    const geometry=spiralCell(cell.index,cells.length,s.slotsPerTurn,radius,hole,s.ringGap,s.rotation,s.clockwise),color=cell.value===null?s.missingColor:heatColor(cell.value,domain,s);
    const path=node('path',{d:geometry.path,fill:color,opacity:s.opacity,stroke:s.showGrid?s.textColor:s.background,'stroke-opacity':s.showGrid ? .22 : 1,'stroke-width':Math.min(s.strokeWidth,geometry.thickness*.25),'data-date':cell.date,'data-value':cell.value??'missing'});
    interactive(path,cell.date,`${dateLabel(cell.date)}؛ ${cell.value===null?'بدون داده':format(project,cell.value)+' '+s.unit}؛ ${format(project,cell.count)} ردیف`);plot.append(path);
    if(s.showValues&&cell.value!==null&&geometry.thickness>s.fontSize*1.4&&Math.hypot(geometry.x,geometry.y)*tau/s.slotsPerTurn>format(project,cell.value).length*s.fontSize*.7)plot.append(text(geometry.x,geometry.y+4,format(project,cell.value),s.fontSize,{fill:ink(color),'pointer-events':'none'}));
  }
  plot.append(text(0,-3,format(project,cells.length),Math.min(26,hole*.45),{'font-weight':700}),text(0,20,({hour:'ساعت',day:'روز',month:'ماه'} as Record<string,string>)[s.timeUnit],Math.min(s.fontSize,hole*.3)));
  if(s.showAxes&&s.showLabels){
    const every=Math.max(1,Math.ceil(s.slotsPerTurn/12));
    for(let i=0;i<s.slotsPerTurn;i+=every){const angle=(s.clockwise?1:-1)*tau*(i+.5)/s.slotsPerTurn+s.rotation*Math.PI/180-Math.PI/2;plot.append(text(Math.cos(angle)*(radius+20),Math.sin(angle)*(radius+20)+4,format(project,i+1),s.fontSize,{opacity:.7}));}
  }
  svg.append(plot);
  if(s.showLegend){
    const defs=node('defs'),gradient=node('linearGradient',{id:'heat-scale'});for(let i=0;i<=16;i++)gradient.append(node('stop',{offset:`${i/16*100}%`,'stop-color':heatColor(domain[0]+(domain[1]-domain[0])*i/16,domain,s)}));defs.append(gradient);svg.append(defs);
    const length=Math.min(340,w-230),left=w/2-length/2,y=h-57;
    svg.append(node('rect',{x:left,y,width:length,height:12,rx:3,fill:'url(#heat-scale)'}),text(left,y+31,format(project,domain[0]),s.legendSize,{'text-anchor':'start',direction:'ltr'}),text(left+length,y+31,format(project,domain[1]),s.legendSize,{'text-anchor':'end',direction:'ltr'}),text(w/2,y-11,s.unit,s.legendSize));
    const missing=cells.filter(c=>c.value===null).length;if(missing)svg.append(node('rect',{x:left+length+24,y,width:12,height:12,fill:s.missingColor}),text(left+length+42,y+11,'بدون داده',s.legendSize,{'text-anchor':'end'}));
  }
  const missing=cells.filter(c=>c.value===null).length,duplicates=project.rows.length-cells.filter(c=>c.count>0).length;
  const note=`از ${dateLabel(cells[0].date)} تا ${dateLabel(cells.at(-1)!.date)} · هر دور ${format(project,s.slotsPerTurn)} خانه · ${format(project,missing)} خانهٔ بدون داده${duplicates?` · ${format(project,duplicates)} ردیف تکراری با روش «${({mean:'میانگین',sum:'مجموع',max:'بیشینه'} as Record<string,string>)[s.aggregation]}» تجمیع شد`:''}. ${s.timeUnit==='month'?'ماه‌ها بر اساس تقویم میلادی هستند.':'چرخش‌ها چرخهٔ ثابت‌اند؛ ماه تقویمی نیستند.'}`;
  return {svg,note,summaries:[{label:'خانهٔ زمانی',value:format(project,cells.length)},{label:'دور مارپیچ',value:format(project,cells.length/s.slotsPerTurn)},{label:'کمینه / بیشینهٔ مقدار',value:`${format(project,Math.min(...cells.flatMap(c=>c.value===null?[]:[c.value])))} / ${format(project,Math.max(...cells.flatMap(c=>c.value===null?[]:[c.value])))}`} ]};
}
