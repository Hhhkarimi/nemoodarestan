import type { Project } from '../series/model.ts';
import type { ChartResult } from '../series/chart.ts';
import { colorFor,format } from '../series/model.ts';
import { activate,scene,short,svgNode as node,svgTitle } from '../series/svg.ts';
import { ternaryPoints,ternaryPosition,validateTernarySettings } from './math.ts';
export function renderTernary(project:Project,select?:(group:string)=>void):ChartResult{
  const s=project.settings,w=s.width,h=s.height,{svg,text}=scene(project);validateTernarySettings(project.rows,s);
  const groups=[...new Set(project.rows.map(r=>r.group))],cols=Math.min(groups.length,Math.max(1,Math.floor((w-100)/190))),legendRows=s.showLegend?Math.ceil(groups.length/cols):0,legendTop=h-38-legendRows*(s.legendSize+22),top=155,side=Math.min(w-190,(legendTop-top-85)*2/Math.sqrt(3)),height=side*Math.sqrt(3)/2,left=(w-side)/2;
  if(side<150)throw Error('بوم برای مثلث کم است؛ ابعاد را بیشتر یا راهنمای رنگ را خاموش کنید.');
  const positions=ternaryPoints(project.rows,s.ternaryNormalize).map(p=>({...p,...ternaryPosition(p.a,p.b,p.c,side,s.ternaryOrder)})),vertices=[{x:side/2,y:0},{x:0,y:height},{x:side,y:height}],names:Record<string,string>={a:s.ternaryA,b:s.ternaryB,c:s.ternaryC},colors:Record<string,string>={a:s.ternaryAColor,b:s.ternaryBColor,c:s.ternaryCColor};
  const point=(weights:number[]):{x:number;y:number}=>({x:left+weights.reduce((n,v,i)=>n+v*vertices[i].x,0),y:top+weights.reduce((n,v,i)=>n+v*vertices[i].y,0)});
  svg.append(node('path',{d:`M${left+side/2} ${top}L${left} ${top+height}L${left+side} ${top+height}Z`,fill:'none',stroke:s.textColor,'stroke-opacity':.5,'stroke-width':Math.max(1,s.strokeWidth)}));
  for(let axis=0;axis<3;axis++){
    const key=s.ternaryOrder[axis],next=(axis+1)%3,other=(axis+2)%3,va=vertices[axis],vb=vertices[next],mx=(va.x+vb.x)/2-side/2,my=(va.y+vb.y)/2-height*2/3,len=Math.hypot(mx,my)||1;
    for(let percent=s.ternaryGridStep;percent<100;percent+=s.ternaryGridStep){
      const t=percent/100,a=[0,0,0],b=[0,0,0];a[axis]=b[axis]=t;a[next]=1-t;b[other]=1-t;const p=point(a),q=point(b);
      if(s.showGrid)svg.append(node('line',{x1:p.x,x2:q.x,y1:p.y,y2:q.y,stroke:colors[key],'stroke-opacity':.2,'stroke-width':1}));
      if(s.showAxes)svg.append(text(p.x+mx/len*17,p.y+my/len*17+4,format(project,percent)+'٪',s.valueSize,{fill:colors[key]}));
    }
    if(s.showAxes){const v=vertices[axis],label=text(left+v.x,top+v.y+(axis===0?-28:45),short(names[key],Math.max(8,Math.floor(side*.55/(s.fontSize*.6)))),s.fontSize,{fill:colors[key],'font-weight':700});svgTitle(label,names[key]+'؛ رأس صددرصدی');svg.append(label);}
  }
  const maxSize=Math.max(1,...project.rows.map(r=>r.size??1)),boxes:{x:number;y:number;w:number;h:number}[]=[];let omitted=0;
  const radii=positions.map(p=>s.ternarySizeMode==='value'?Math.max(2,s.pointRadius*1.6*Math.sqrt((p.row.size??1)/maxSize)):s.pointRadius);
  for(const [index,p] of positions.entries()){
    const x=left+p.x,y=top+p.y,r=radii[index],g=node('g',{opacity:s.opacity,'data-point':p.row.x,'data-a':p.a,'data-b':p.b,'data-c':p.c});g.append(node('circle',{cx:x,cy:y,r,fill:colorFor(project,p.row.group),stroke:s.background,'stroke-width':s.strokeWidth}));
    const description=`${p.row.x}؛ ${p.row.group}؛ ${s.ternaryA}: ${format(project,p.row.value)} ${s.unit} (${format(project,p.a*100)}٪)؛ ${s.ternaryB}: ${format(project,p.row.second!)} ${s.unit} (${format(project,p.b*100)}٪)؛ ${s.ternaryC}: ${format(project,p.row.third!)} ${s.unit} (${format(project,p.c*100)}٪)؛ مجموع خام ${format(project,p.sum)} ${s.unit}؛ اندازه ${format(project,p.row.size??1)}`;
    activate(g,p.row.group,description,()=>select?.(p.row.group));svg.append(g);
    if(s.showLabels&&s.ternaryLabels!=='none'){
      const name=short(p.row.x,23),labelWidth=name.length*s.fontSize*.6,candidates=[y-r-10,y+r+s.fontSize+8].map(baseline=>({baseline,x:x-labelWidth/2,y:baseline-s.fontSize,w:labelWidth,h:s.fontSize+4}));
      const box=s.ternaryLabels==='all'?candidates[0]:candidates.find(b=>b.x>25&&b.x+b.w<w-25&&b.y>top-18&&b.y+b.h<legendTop-10&&!boxes.some(o=>b.x<o.x+o.w&&b.x+b.w>o.x&&b.y<o.y+o.h&&b.y+b.h>o.y)&&!positions.some((other,j)=>j!==index&&Math.hypot(left+other.x-Math.max(b.x,Math.min(b.x+b.w,left+other.x)),top+other.y-Math.max(b.y,Math.min(b.y+b.h,top+other.y)))<radii[j]+3));
      if(box){boxes.push(box);const label=text(x,box.baseline,name,s.fontSize,{'paint-order':'stroke',stroke:s.background,'stroke-width':3,'pointer-events':'none'});svgTitle(label,p.row.x);g.append(label);}else omitted++;
    }
  }
  if(s.showAxes&&s.unit)svg.append(text(w/2,top+height+70,short('مقدار خام به '+s.unit+' · جای نقاط بر پایهٔ درصد',Math.floor((w-100)/(s.legendSize*.6))),s.legendSize,{opacity:.75}));
  if(s.showLegend)groups.forEach((group,i)=>{
    const slot=(w-100)/cols,x=50+(i%cols+.5)*slot,y=legendTop+Math.floor(i/cols)*(s.legendSize+22),g=node('g',{opacity:s.opacity});g.append(node('circle',{cx:x+slot/2-18,cy:y-4,r:5,fill:colorFor(project,group)}),text(x-10,y,short(group,Math.floor((slot-50)/(s.legendSize*.6))),s.legendSize));activate(g,group,group,()=>select?.(group));svg.append(g);
  });
  const normalized=positions.filter(p=>Math.abs(p.sum-100)>1e-6).length,identical=positions.length-new Set(positions.map(p=>[p.a,p.b,p.c].map(v=>v.toFixed(10)).join(','))).size;
  return {svg,summaries:[{label:'مشاهده',value:format(project,positions.length)},{label:'گروه',value:format(project,groups.length)},{label:'میانگین مجموع خام'+(s.unit?' · '+s.unit:''),value:format(project,positions.reduce((sum,p)=>sum+p.sum,0)/positions.length)}],note:`هر رأس سهم صددرصدی یک مؤلفه است؛ جای نقطه از نسبت سه مؤلفه محاسبه می‌شود. ${normalized?format(project,normalized)+' مشاهده از دادهٔ خام نرمال شده‌اند؛ مقدارهای اصلی در پروژه و خروجی داده حفظ می‌شوند. ':''}${identical?format(project,identical)+' مشاهده ترکیب یکسان دارند و روی هم قرار گرفته‌اند. ':''}${omitted?'نام‌های متراکم پنهان شده‌اند؛ نام و همهٔ مقدارها روی هر نقطه قابل خواندن است.':''}`};
}
