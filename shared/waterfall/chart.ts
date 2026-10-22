import type { Project } from '../series/model.ts';
import type { ChartResult } from '../series/chart.ts';
import { colorFor,format } from '../series/model.ts';
import { activate,scene,short,svgNode as node,svgTitle } from '../series/svg.ts';
import { waterfallColors,waterfallColorLabel,waterfallSteps,waterfallDomain } from './math.ts';
export function renderWaterfall(project:Project,select?:(group:string)=>void):ChartResult{
  const s=project.settings,w=s.width,h=s.height,{svg,text}=scene(project),steps=waterfallSteps(project.rows,s.waterfallBase),vertical=s.waterfallOrientation==='vertical';
  const cols=Math.min(4,Math.max(1,Math.floor((w-100)/200))),legendRows=s.showLegend?Math.ceil(4/cols):0,legendTop=h-38-legendRows*(s.legendSize+22),top=140,bottom=legendTop-(vertical?100:65),height=bottom-top,left=vertical?100:s.showLabels?Math.min(230,Math.max(145,s.fontSize*10)):80,right=w-65,width=right-left;
  if(height<110||width<180)throw Error('بوم برای نمودار کم است؛ ابعاد را بیشتر یا راهنمای رنگ را خاموش کنید.');
  const band=(vertical?width:height)/steps.length,barSize=band*(1-s.waterfallGap),slanted=s.waterfallLabels==='slanted'||(s.waterfallLabels==='auto'&&band<s.fontSize*6);
  if(band<(s.showLabels?(vertical?20:s.fontSize+12):8))throw Error('مراحل در این ابعاد جا نمی‌شوند؛ بوم را بزرگ‌تر یا برچسب‌ها را خاموش کنید.');
  const {lo,hi,ticks}=waterfallDomain(steps);
  const valuePos=(value:number):number=>{const t=(value-lo)/(hi-lo);return vertical?bottom-t*height:s.direction==='rtl'?right-t*width:left+t*width;};
  const categoryPos=(i:number):number=>vertical?(s.direction==='rtl'?right-(i+.5)*band:left+(i+.5)*band):top+(i+.5)*band;
  for(const value of ticks){
    const p=valuePos(value);
    if(s.showGrid)svg.append(node('line',vertical?{x1:left,x2:right,y1:p,y2:p,stroke:s.textColor,'stroke-opacity':.12}:{x1:p,x2:p,y1:top,y2:bottom,stroke:s.textColor,'stroke-opacity':.12}));
    if(s.showAxes)svg.append(vertical?text(left-17,p+4,format(project,value),s.valueSize,{'text-anchor':'end',direction:'ltr'}):text(p,bottom+28,format(project,value),s.valueSize,{direction:'ltr'}));
  }
  const zero=valuePos(0);svg.append(node('line',vertical?{x1:left,x2:right,y1:zero,y2:zero,stroke:s.textColor,'stroke-opacity':.35}:{x1:zero,x2:zero,y1:top,y2:bottom,stroke:s.textColor,'stroke-opacity':.35}));
  let omitted=0;
  for(const [i,step] of steps.entries()){
    const cat=categoryPos(i),a=valuePos(step.from),b=valuePos(step.to),description=`${step.name}؛ ${waterfallColorLabel(step.color)}؛ پیش از مرحله ${format(project,step.before)}؛ ${step.type==='change'?'تغییر '+format(project,step.value):'مقدار '+format(project,step.after)}؛ مانده ${format(project,step.after)} ${s.unit}`;
    const group=node('g',{opacity:s.opacity,'data-step-index':i,'data-balance':step.after});
    const bar=node('rect',vertical?{x:cat-barSize/2,y:Math.min(a,b),width:barSize,height:Math.max(1,Math.abs(b-a)),fill:colorFor(project,step.color),stroke:s.background,'stroke-width':s.strokeWidth}:{x:Math.min(a,b),y:cat-barSize/2,width:Math.max(1,Math.abs(b-a)),height:barSize,fill:colorFor(project,step.color),stroke:s.background,'stroke-width':s.strokeWidth});
    group.append(bar);activate(group,step.color,description,()=>select?.(step.color));svg.append(group);
    if(s.waterfallConnectors&&i<steps.length-1&&steps[i+1].type!=='absolute'){
      const next=categoryPos(i+1),sign=vertical&&s.direction==='rtl'?-1:1,p=valuePos(step.after);
      svg.append(node('line',vertical?{x1:cat+sign*barSize/2,x2:next-sign*barSize/2,y1:p,y2:p,stroke:s.connectorColor,'stroke-width':s.lineWidth,'stroke-dasharray':'4 3'}:{x1:p,x2:p,y1:cat+barSize/2,y2:next-barSize/2,stroke:s.connectorColor,'stroke-width':s.lineWidth,'stroke-dasharray':'4 3'}));
    }
    if(s.showValues){
      const value=step.type==='change'&&s.waterfallValue==='change'?step.value:step.after,label=(step.type==='change'&&s.waterfallValue==='change'&&value>0?'+':'')+format(project,value),fits=vertical?label.length*s.valueSize*.6<band-3:band>s.valueSize+5;
      if(fits){
        const el=vertical?text(cat,Math.min(a,b)-10,label,s.valueSize,{direction:'ltr','font-weight':600}):text(valuePos(step.to)+(s.direction==='rtl'?-1:1)*(step.to>=step.from?12:-12),cat+4,label,s.valueSize,{direction:'ltr','text-anchor':(step.to>=step.from)!==(s.direction==='rtl')?'start':'end','font-weight':600});svgTitle(el,description);svg.append(el);
      }else omitted++;
    }
    if(s.showLabels){
      const maxChars=vertical?Math.max(3,Math.floor((slanted?100:band-8)/(s.fontSize*.55))):Math.floor((left-30)/(s.fontSize*.55)),el=vertical?text(cat,bottom+30,short(step.name,maxChars),s.fontSize,slanted?{transform:`rotate(-35 ${cat} ${bottom+30})`,'text-anchor':'end'}:{}):text(left-18,cat+4,short(step.name,maxChars),s.fontSize,{'text-anchor':'end'});svgTitle(el,step.name);svg.append(el);
    }
  }
  if(s.showAxes)svg.append(text((left+right)/2,vertical?bottom+83:bottom+57,s.unit,s.fontSize,{opacity:.75}));
  if(s.showLegend)waterfallColors.forEach((key,i)=>{
    const slot=(w-100)/cols,x=50+(i%cols+.5)*slot,y=legendTop+Math.floor(i/cols)*(s.legendSize+22),group=node('g',{opacity:s.opacity});group.append(node('rect',{x:x+slot/2-24,y:y-11,width:13,height:13,rx:2,fill:colorFor(project,key)}),text(x-10,y,short(waterfallColorLabel(key),Math.floor((slot-50)/(s.legendSize*.6))),s.legendSize));activate(group,key,waterfallColorLabel(key),()=>select?.(key));svg.append(group);
  });
  const changes=steps.filter(p=>p.type==='change'),increase=changes.reduce((sum,p)=>sum+Math.max(0,p.value),0),decrease=changes.reduce((sum,p)=>sum+Math.min(0,p.value),0);
  return {svg,summaries:[{label:'جمع افزایش‌ها',value:format(project,increase)},{label:'جمع کاهش‌ها',value:format(project,decrease)},{label:`ماندهٔ نهایی · ${s.unit}`,value:format(project,steps.at(-1)!.after)}],note:`ترتیب مراحل همان ترتیب ورود است. جمع‌های میانی و کل، ماندهٔ همان نقطه را نشان می‌دهند و محاسبه را از صفر شروع نمی‌کنند. ${omitted?'عددهای بدون فضای کافی پنهان شده‌اند؛ جزئیات کامل روی هر ستون موجود است.':''}`};
}
