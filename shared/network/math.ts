import type { Row,Settings,NetworkNode } from '../series/model.ts';
export interface GraphNode extends NetworkNode { degree:number; strength:number }
export interface GraphLink { source:string;target:string;value:number }
export interface Graph { nodes:GraphNode[];links:GraphLink[] }
export interface PositionedNode extends GraphNode { px:number;py:number;r:number }
export interface Layout { nodes:PositionedNode[];links:GraphLink[];width:number;height:number }

export function validateNetworkRows(input:unknown,number:(v:unknown)=>number):Row[]{
  if(!Array.isArray(input)||input.length>600)throw Error('آرایهٔ ارتباط‌ها با حداکثر ۶۰۰ ردیف لازم است.');
  const rows=input.map((raw,i)=>{
    if(!raw||typeof raw!=='object')throw Error(`ارتباط ${i+1} معتبر نیست.`);
    const r=raw as Record<string,unknown>,x=String(r.x??r.source??'').trim(),group=String(r.group??r.target??'').trim(),value=number(r.value??r.weight??1);
    if(!x||!group||x.length>80||group.length>80)throw Error(`ارتباط ${i+1}: نام مبدأ و مقصد بین ۱ تا ۸۰ حرف لازم است.`);
    if(!Number.isFinite(value)||value<=0||value>1e12)throw Error(`ارتباط ${i+1}: وزن مثبت تا یک تریلیون لازم است.`);
    return {x,group,value};
  });
  if(new Set(rows.flatMap(r=>[r.x,r.group])).size>100)throw Error('حداکثر ۱۰۰ گره مجاز است.');
  return rows;
}
export function validateNodes(input:unknown,number:(v:unknown)=>number=Number):NetworkNode[]{
  if(input===undefined)return [];
  if(!Array.isArray(input)||input.length>100)throw Error('فهرست گره‌ها باید آرایه‌ای با حداکثر ۱۰۰ گره باشد.');
  const seen=new Set<string>();
  return input.map((raw,i)=>{
    if(!raw||typeof raw!=='object')throw Error(`گره ${i+1} معتبر نیست.`);
    const n=raw as Record<string,unknown>,id=String(n.id??n.name??'').trim(),group=String(n.group??'همه').trim(),size=number(n.size??1);
    if(!id||id.length>80||!group||group.length>80||seen.has(id))throw Error('نام گره‌ها باید یکتا و نام و گروه بین ۱ تا ۸۰ حرف باشند.');seen.add(id);
    if(!Number.isFinite(size)||size<0||size>1e12)throw Error(`اندازهٔ گره «${id}» باید نامنفی و تا یک تریلیون باشد.`);
    const position=typeof n.x==='number'&&typeof n.y==='number'&&Number.isFinite(n.x)&&Number.isFinite(n.y)?{x:Math.max(0,Math.min(1,n.x)),y:Math.max(0,Math.min(1,n.y))}:{};
    return {id,group,size,...position};
  });
}
export function graphTable(rows:Row[],metadata:NetworkNode[]=[],directed=false):Graph{
  const nodes=new Map<string,GraphNode>();
  for(const n of metadata)nodes.set(n.id,{...n,degree:0,strength:0});
  const links:GraphLink[]=[],bySource=new Map<string,Map<string,GraphLink>>();
  for(const row of rows){
    for(const id of [row.x,row.group])if(!nodes.has(id))nodes.set(id,{id,group:'همه',size:1,degree:0,strength:0});
    const [source,target]=!directed&&row.x.localeCompare(row.group)>0?[row.group,row.x]:[row.x,row.group];
    const targets=bySource.get(source)??new Map<string,GraphLink>(),existing=targets.get(target);
    if(existing)existing.value+=row.value;else{const link={source,target,value:row.value};targets.set(target,link);links.push(link);}bySource.set(source,targets);
  }
  if(!nodes.size)throw Error('حداقل یک گره یا ارتباط وارد کنید.');
  if(nodes.size>100)throw Error('مجموع گره‌های تعریف‌شده و ارتباط‌ها حداکثر ۱۰۰ گره است.');
  if(new Set([...nodes.values()].map(n=>n.group)).size>24)throw Error('حداکثر ۲۴ گروه رنگی مجاز است.');
  for(const link of links){
    const a=nodes.get(link.source)!,b=nodes.get(link.target)!;a.degree++;a.strength+=link.value;if(a!==b){b.degree++;b.strength+=link.value;}
  }
  return {nodes:[...nodes.values()],links};
}
export function neighbors(graph:Graph,id:string):Set<string>{
  const ids=new Set([id]);for(const link of graph.links){if(link.source===id)ids.add(link.target);if(link.target===id)ids.add(link.source);}return ids;
}

// A fixed iteration count and seeded starts keep previews, exports and saved drafts stable.
export function networkLayout(graph:Graph,s:Settings,width:number,height:number):Layout{
  let seed=Math.round(s.networkSeed)||1;
  const random=():number=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const values=graph.nodes.map(n=>s.networkSize==='value'?n.size:s.networkSize==='strength'?n.strength:n.degree),max=Math.max(1,...values);
  const nodes=graph.nodes.map((node,i)=>{
    const angle=2*Math.PI*i/graph.nodes.length+random()*.15,r=s.networkSize==='uniform'?s.networkRadius:s.networkRadius*(.55+.9*Math.sqrt(values[i]/max));
    return {...node,r,px:node.x!==undefined?r+node.x*(width-2*r):width/2+Math.cos(angle)*width*.34,py:node.y!==undefined?r+node.y*(height-2*r):height/2+Math.sin(angle)*height*.34};
  });
  const byId=new Map(nodes.map((n,i)=>[n.id,i])),velocities=nodes.map(()=>({x:0,y:0}));
  for(let iteration=0;iteration<240;iteration++){
    const cooling=1-iteration/270;
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j];let dx=b.px-a.px,dy=b.py-a.py;if(Math.abs(dx)+Math.abs(dy)<.01){dx=.1+i*.01;dy=.13+j*.01;}
      const distance=Math.hypot(dx,dy),collision=Math.max(0,a.r+b.r+8-distance),force=Math.min(8,s.networkRepulsion/(distance*distance)+collision*.15),fx=dx/distance*force,fy=dy/distance*force;
      velocities[i].x-=fx;velocities[i].y-=fy;velocities[j].x+=fx;velocities[j].y+=fy;
    }
    for(const link of graph.links){
      if(link.source===link.target)continue;
      const i=byId.get(link.source)!,j=byId.get(link.target)!,a=nodes[i],b=nodes[j],dx=b.px-a.px,dy=b.py-a.py,d=Math.hypot(dx,dy)||1,target=Math.max(s.networkDistance,a.r+b.r+12),f=(d-target)*.018;
      velocities[i].x+=dx/d*f;velocities[i].y+=dy/d*f;velocities[j].x-=dx/d*f;velocities[j].y-=dy/d*f;
    }
    nodes.forEach((n,i)=>{
      if(n.x!==undefined&&n.y!==undefined)return;
      const v=velocities[i];v.x=(v.x+(width/2-n.px)*.002)*.72;v.y=(v.y+(height/2-n.py)*.002)*.72;
      n.px=Math.max(n.r,Math.min(width-n.r,n.px+v.x*cooling));n.py=Math.max(n.r,Math.min(height-n.r,n.py+v.y*cooling));
    });
  }
  return {nodes,links:graph.links,width,height};
}
export function networkSamples(alternative=false):{rows:Row[];nodes:NetworkNode[]}{
  const names=alternative?['آب','انرژی','اقلیم','سلامت','غذا','فناوری','اقتصاد','شهر','آموزش']:['آوا','باران','چکاد','دریا','راستا','سپهر','شایا','فرات','کارن','مانا','نوین','هامون'];
  const edges=alternative?[[0,1],[0,2],[0,4],[1,2],[1,5],[1,6],[2,3],[2,7],[3,4],[3,8],[4,6],[5,7],[5,8],[6,7]]:[[0,1],[0,2],[1,2],[1,3],[2,4],[3,4],[3,5],[4,5],[4,6],[5,7],[6,7],[6,8],[7,8],[8,9],[8,10],[9,10],[9,11],[10,11],[0,11],[2,7]];
  return {rows:edges.map(([a,b],i)=>({x:names[a],group:names[b],value:2+(i*7)%15})),nodes:names.map((id,i)=>({id,group:(alternative?['منابع','جامعه','نوآوری']:['پژوهش','طراحی','توسعه'])[Math.floor(i/(alternative?3:4))],size:10+i*7}))};
}
