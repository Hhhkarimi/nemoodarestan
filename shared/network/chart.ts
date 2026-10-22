import type { Project } from '../series/model.ts';
import type { ChartResult } from '../series/chart.ts';
import { colorFor,format } from '../series/model.ts';
import { activate,scene,short,svgNode as node,svgTitle } from '../series/svg.ts';
import { graphTable,networkLayout,neighbors } from './math.ts';
import type { GraphLink } from './math.ts';

export function renderNetwork(project:Project,select?:(group:string)=>void):ChartResult{
  const s=project.settings,w=s.width,h=s.height,{svg,text}=scene(project),graph=graphTable(project.rows,project.nodes,s.networkDirected),groups=[...new Set(graph.nodes.map(n=>n.group))];
  const cols=Math.min(groups.length,Math.max(1,Math.floor((w-100)/180))),legendRows=s.showLegend?Math.ceil(groups.length/cols):0,legendTop=h-38-legendRows*(s.legendSize+22),top=142,left=75,width=w-150,height=legendTop-top-55;
  if(height<140||width<200)throw Error('بوم برای شبکه کم است؛ ابعاد را بیشتر یا راهنمای رنگ را خاموش کنید.');
  const layout=networkLayout(graph,s,width,height),byId=new Map(layout.nodes.map(n=>[n.id,n])),focused=byId.has(s.networkFocus)?s.networkFocus:'',related=neighbors(graph,focused),maxWeight=Math.max(1,...graph.links.map(l=>l.value));
  const zone=node('g',{transform:`translate(${left} ${top})`}),edgeLayer=node('g'),nodeLayer=node('g');zone.append(edgeLayer,nodeLayer);svg.append(zone);
  if(s.networkDirected){
    const defs=node('defs');
    for(const [i,group] of ['neutral',...groups].entries()){
      const marker=node('marker',{id:`network-arrow-${i}`,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto',markerUnits:'userSpaceOnUse'});
      marker.append(node('path',{d:'M0 0L10 5L0 10Z',fill:i===0?s.connectorColor:colorFor(project,group)}));defs.append(marker);
    }
    svg.append(defs);
  }
  const geometry=(link:GraphLink):{d:string;x:number;y:number}=>{
    const a=byId.get(link.source)!,b=byId.get(link.target)!;
    if(a===b){
      let dx=width/2-a.px,dy=height/2-a.py;const length=Math.hypot(dx,dy)||1;dx=length===1?1:dx/length;dy/=length;const px=-dy,py=dx,r=a.r;
      const start=[a.px+dx*r*.6+px*r*.8,a.py+dy*r*.6+py*r*.8],end=[a.px+dx*r*.6-px*r*.8,a.py+dy*r*.6-py*r*.8];
      return {d:`M${start}C${a.px+dx*(r*3+18)+px*r*1.8},${a.py+dy*(r*3+18)+py*r*1.8} ${a.px+dx*(r*3+18)-px*r*1.8},${a.py+dy*(r*3+18)-py*r*1.8} ${end}`,x:a.px+dx*(r*2+18),y:a.py+dy*(r*2+18)};
    }
    const dx=b.px-a.px,dy=b.py-a.py,distance=Math.hypot(dx,dy)||1,ux=dx/distance,uy=dy/distance,start=[a.px+ux*(a.r+2),a.py+uy*(a.r+2)],end=[b.px-ux*(b.r+(s.networkDirected?7:2)),b.py-uy*(b.r+(s.networkDirected?7:2))];
    const reciprocal=s.networkDirected&&graph.links.some(l=>l.source===link.target&&l.target===link.source),bend=reciprocal?30:0,cx=(a.px+b.px)/2-uy*bend,cy=(a.py+b.py)/2+ux*bend;
    return {d:reciprocal?`M${start}Q${cx},${cy} ${end}`:`M${start}L${end}`,x:(a.px+b.px)/2-uy*bend*.5,y:(a.py+b.py)/2+ux*bend*.5};
  };
  const edgeViews=graph.links.map(link=>{
    const close=!focused||!s.networkNeighbors||link.source===focused||link.target===focused,color=s.networkLinkColor==='source'?colorFor(project,byId.get(link.source)!.group):s.connectorColor;
    const g=node('g',{opacity:close?s.opacity*.72:s.opacity*.08}),path=node('path',{fill:'none',stroke:color,'stroke-width':s.lineWidth*(.4+1.6*Math.sqrt(link.value/maxWeight)),'data-network-link':'true'});
    if(s.networkDirected)path.setAttribute('marker-end',`url(#network-arrow-${s.networkLinkColor==='source'?groups.indexOf(byId.get(link.source)!.group)+1:0})`);svgTitle(path,`${link.source} ${s.networkDirected?'←':'—'} ${link.target}؛ وزن ${format(project,link.value)} ${s.unit}`);g.append(path);
    const label=s.showValues?text(0,0,format(project,link.value),s.valueSize,{'paint-order':'stroke',stroke:s.background,'stroke-width':4,'pointer-events':'none'}):undefined;if(label)g.append(label);edgeLayer.append(g);return {link,path,label};
  });
  function updateEdges():void{for(const view of edgeViews){const p=geometry(view.link);view.path.setAttribute('d',p.d);view.label?.setAttribute('x',String(p.x));view.label?.setAttribute('y',String(p.y-5));}}
  updateEdges();
  const labelBoxes:{x:number;y:number;w:number;h:number}[]=[];let omitted=0;
  const labelOrder=[...layout.nodes].sort((a,b)=>(a.id===focused?-1:b.id===focused?1:b.degree-a.degree));
  const labels=new Map<string,number>();
  if(s.showLabels)for(const n of labelOrder){
    if(s.networkLabels==='none'||(s.networkLabels==='selected'&&focused!==n.id&&!related.has(n.id)))continue;
    const name=short(n.id,22),labelWidth=name.length*s.fontSize*.6;
    const candidates=[n.r+s.fontSize+6,-n.r-9].map(dy=>({dy,x:n.px-labelWidth/2,y:n.py+dy-s.fontSize,w:labelWidth,h:s.fontSize+5}));
    const candidate=s.networkLabels!=='auto'?candidates[0]:candidates.find(box=>
      !labelBoxes.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y)&&
      !layout.nodes.some(other=>other!==n&&Math.hypot(other.px-Math.max(box.x,Math.min(box.x+box.w,other.px)),other.py-Math.max(box.y,Math.min(box.y+box.h,other.py)))<other.r+3));
    if(!candidate){omitted++;continue;}labels.set(n.id,candidate.dy);labelBoxes.push(candidate);
  }
  for(const n of layout.nodes){
    const g=node('g',{transform:`translate(${n.px} ${n.py})`,'data-node':n.id,opacity:s.opacity}),body=node('g',{opacity:!focused||!s.networkNeighbors||related.has(n.id)?1:.14});
    body.append(node('circle',{r:n.r,fill:colorFor(project,n.group),stroke:focused===n.id?s.textColor:s.background,'stroke-width':focused===n.id?s.strokeWidth+2:s.strokeWidth}));
    if(n.x!==undefined)body.append(node('circle',{cx:n.r*.6,cy:-n.r*.6,r:3,fill:s.textColor,'pointer-events':'none'}));
    if(labels.has(n.id))body.append(text(0,labels.get(n.id)!,short(n.id,22),s.fontSize,{'paint-order':'stroke',stroke:s.background,'stroke-width':3,'pointer-events':'none'}));g.append(body);nodeLayer.append(g);
    let moved=false,start:{x:number;y:number;px:number;py:number}|undefined;
    const focus=():void=>{if(moved){moved=false;return;}svg.dispatchEvent(new CustomEvent('network-focus',{detail:n.id}));};
    activate(g,n.group,`${n.id}؛ گروه ${n.group}؛ ${format(project,n.degree)} ارتباط؛ مجموع وزن ${format(project,n.strength)} ${s.unit}؛ مقدار دلخواه ${format(project,n.size)}؛ با کلیدهای جهت جابه‌جا کنید.`,focus);
    g.style.touchAction='none';
    const point=(event:PointerEvent):DOMPoint|undefined=>{const matrix=svg.getScreenCTM();return matrix?new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()):undefined;};
    const place=(x:number,y:number):void=>{n.px=Math.max(n.r,Math.min(width-n.r,x));n.py=Math.max(n.r,Math.min(height-n.r,y));g.setAttribute('transform',`translate(${n.px} ${n.py})`);updateEdges();};
    const save=():void=>{svg.dispatchEvent(new CustomEvent('network-move',{detail:{id:n.id,x:(n.px-n.r)/(width-2*n.r),y:(n.py-n.r)/(height-2*n.r)}}));};
    g.addEventListener('pointerdown',event=>{if(event.button!==0)return;const p=point(event);if(!p)return;moved=false;start={x:p.x,y:p.y,px:n.px,py:n.py};g.setPointerCapture(event.pointerId);});
    g.addEventListener('pointermove',event=>{if(!start)return;const p=point(event);if(!p)return;const dx=p.x-start.x,dy=p.y-start.y;if(Math.hypot(dx,dy)>3)moved=true;if(moved){event.preventDefault();place(start.px+dx,start.py+dy);}});
    g.addEventListener('pointerup',()=>{if(!start)return;start=undefined;if(moved)save();});
    g.addEventListener('pointercancel',()=>{if(start)place(start.px,start.py);start=undefined;moved=false;});
    g.addEventListener('keydown',event=>{
      const delta:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=delta[event.key];if(!d)return;event.preventDefault();const step=event.shiftKey?15:4;place(n.px+d[0]*step,n.py+d[1]*step);save();
    });
  }
  if(s.showLegend)groups.forEach((group,i)=>{
    const slot=(w-100)/cols,x=50+(i%cols+.5)*slot,y=legendTop+Math.floor(i/cols)*(s.legendSize+22),g=node('g',{opacity:s.opacity});g.append(node('circle',{cx:x+slot/2-18,cy:y-4,r:6,fill:colorFor(project,group)}),text(x-10,y,short(group,Math.floor((slot-50)/(s.legendSize*.6))),s.legendSize));activate(g,group,`گروه ${group}`,()=>select?.(group));svg.append(g);
  });
  let overlaps=0;for(let i=0;i<layout.nodes.length;i++)for(let j=i+1;j<layout.nodes.length;j++){const a=layout.nodes[i],b=layout.nodes[j];if(Math.hypot(a.px-b.px,a.py-b.py)<a.r+b.r)overlaps++;}
  return {svg,summaries:[{label:'گره',value:format(project,graph.nodes.length)},{label:'ارتباط',value:format(project,graph.links.length)},{label:'گرهٔ ثابت',value:format(project,graph.nodes.filter(n=>n.x!==undefined).length)}],note:`گره را انتخاب کنید تا همسایه‌هایش برجسته شوند؛ با کشیدن یا کلیدهای جهت، جای آن را ثابت کنید. ${omitted?'نام‌های متراکم پنهان شده‌اند؛ جزئیات با نام کامل روی هر گره می‌ماند. ':''}${overlaps?'بعضی گره‌ها هم‌پوشانی دارند؛ اندازهٔ گره‌ها را کم، بوم را بزرگ یا جای آن‌ها را جابه‌جا کنید. ':''}اندازهٔ گره: ${s.networkSize==='value'?'مقدار دلخواه':s.networkSize==='strength'?'مجموع وزن':s.networkSize==='uniform'?'یکنواخت':'تعداد ارتباط‌ها'}.`};
}
