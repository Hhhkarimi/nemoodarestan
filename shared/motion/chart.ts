import type {Project} from '../series/model.ts';
import type {ChartResult} from '../series/chart.ts';
import {colorFor,format} from '../series/model.ts';
import {family} from '../series/fonts.ts';
import {packingLayout,raceFrame,raceTable} from './math.ts';
import {paintRace} from './race-runtime.ts';
import type {RaceView} from './race-runtime.ts';
const ns='http://www.w3.org/2000/svg';
type Attributes=Record<string,string|number>;
function node<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Attributes={},value?:string):SVGElementTagNameMap[K]{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(value!==undefined)el.textContent=value;return el;}
const trim=(s:string,n:number):string=>s.length>n?s.slice(0,Math.max(1,n-1))+'…':s;
export function raceView(project:Project,top:number,bottom:number):RaceView{
  const s=project.settings,table=raceTable(project.rows,s.raceMissing),count=Math.min(s.raceTopN,table.groups.length),logos=s.showLogos&&table.groups.some(name=>project.logos?.[name]);
  const nameMargin=(s.showLabels?Math.min(240,Math.max(125,s.fontSize*10)):40)+(logos?36:0),valueMargin=s.showValues?Math.max(90,Math.min(205,format(project,table.max).length*s.valueSize*.65+18)):50;
  const left=s.direction==='rtl'?valueMargin:nameMargin,right=s.width-(s.direction==='rtl'?nameMargin:valueMargin),band=(bottom-top)/count;
  if(right-left<140||band<Math.max(s.fontSize+10,s.valueSize+10,logos?32:0))throw Error('میله‌ها در این بوم جا نمی‌شوند؛ ارتفاع یا عرض را بیشتر، نوشته‌ها را کوچک‌تر یا تعداد میله‌های برتر را کمتر کنید.');
  return {left,right,top,band,barHeight:Math.min(48,band*.66),topN:count,direction:s.direction,digits:s.digits,decimals:s.decimals,unit:s.unit,scale:s.raceScale,timeLimit:Math.max(10,Math.floor((s.width-80)/(s.raceTimeSize*.65)))};
}
export function renderMotion(project:Project,select?:(group:string)=>void):ChartResult{
  const s=project.settings,w=s.width,h=s.height,race=project.kind==='bar-chart-race',names=[...new Set(project.rows.map(r=>r.group))];
  const svg=node('svg',{xmlns:ns,viewBox:`0 0 ${w} ${h}`,width:w,height:h,role:'img','aria-label':s.title||'نمودار'});svg.style.fontFamily=family(project);
  svg.append(node('title',{},s.title),node('desc',{},s.subtitle),node('rect',{'data-background':'true',width:w,height:h,fill:s.background}));
  const text=(x:number,y:number,value:string,size=s.fontSize,attrs:Attributes={}):SVGTextElement=>node('text',{x,y,fill:s.textColor,'font-size':size,'font-family':family(project),'text-anchor':'middle',direction:'rtl','unicode-bidi':'plaintext',...attrs},value);
  svg.append(text(w/2,48,s.title,s.titleSize,{'font-weight':700}),text(w/2,80,s.subtitle,s.subtitleSize,{opacity:.75}));
  const columns=Math.min(names.length,Math.max(2,Math.floor((w-100)/180))),legendHeight=s.showLegend?Math.ceil(names.length/columns)*(s.legendSize+19):0;
  function interactive(el:SVGElement,group:string,label:string,focus?:string):void{
    el.setAttribute('data-group',group);el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',label);el.style.cursor='pointer';el.append(node('title',{},label));
    el.addEventListener('click',()=>select?.(group));
    const zoom=():void=>{svg.dispatchEvent(new CustomEvent('chart-focus',{detail:focus}));};
    if(focus!==undefined)el.addEventListener('dblclick',zoom);
    el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(event.key==='Enter'&&focus!==undefined)zoom();else select?.(group);}});
  }
  let summaries:ChartResult['summaries'],note:string;
  if(race){
    const table=raceTable(project.rows,s.raceMissing),top=132,bottom=h-125-legendHeight,view=raceView(project,top,bottom),rtl=s.direction==='rtl';
    svg.setAttribute('data-race-view',JSON.stringify(view));
    const defs=node('defs'),clip=node('clipPath',{id:'race-clip'});clip.append(node('rect',{x:0,y:top,width:w,height:bottom-top}));defs.append(clip);svg.append(defs);
    const ticks=Math.max(2,Math.min(5,Math.floor((view.right-view.left)/120)));
    for(let i=0;i<=ticks;i++){
      const fraction=i/ticks,x=rtl?view.right-(view.right-view.left)*fraction:view.left+(view.right-view.left)*fraction;
      if(s.showGrid)svg.append(node('line',{x1:x,x2:x,y1:top,y2:bottom,stroke:s.textColor,'stroke-opacity':.12}));
      if(s.showAxes)svg.append(text(x,top-15,'',s.fontSize,{'data-race-tick':fraction,direction:'ltr'}));
    }
    const plot=node('g',{'clip-path':'url(#race-clip)'}),hasLogos=s.showLogos&&table.groups.some(name=>project.logos?.[name]);
    table.groups.forEach((name,i)=>{
      const group=node('g',{'data-race-index':i}),bar=node('rect',{'data-race-bar':'',x:view.left,y:-view.barHeight/2,height:view.barHeight,width:0,rx:2,fill:colorFor(project,name),opacity:s.opacity,stroke:s.background,'stroke-width':s.strokeWidth});
      interactive(bar,name,name);group.append(bar);
      if(s.showLabels){const label=text(rtl?view.right+(hasLogos?48:15):view.left-(hasLogos?48:15),s.fontSize*.34,trim(name,Math.max(4,Math.floor((rtl?w-view.right-65:view.left-65)/(s.fontSize*.65)))),s.fontSize,{'text-anchor':rtl?'end':'start'});label.append(node('title',{},name));group.append(label);}
      if(hasLogos&&project.logos?.[name])group.append(node('image',{href:project.logos[name],x:rtl?view.right+12:view.left-38,y:-13,width:26,height:26,preserveAspectRatio:'xMidYMid meet'}));
      if(s.showValues)group.append(text(0,s.valueSize*.34,'',s.valueSize,{'data-race-value':'',direction:'ltr','text-anchor':rtl?'end':'start','pointer-events':'none'}));plot.append(group);
    });svg.append(plot);
    svg.append(text(w/2,bottom+52,'',s.raceTimeSize,{'data-race-time':'','font-weight':700}),text(w/2,bottom+78,s.unit,s.fontSize,{opacity:.75}));
    const paint=(position:number):void=>paintRace(svg,raceFrame(table,position,s.raceScale),view);
    paint(s.racePosition);svg.addEventListener('race-frame',event=>paint(Number((event as CustomEvent<unknown>).detail)));
    summaries=[{label:'گروه',value:format(project,table.groups.length)},{label:'دوره',value:format(project,table.periods.length)},{label:'مجموع دورهٔ پایانی',value:format(project,table.values.at(-1)!.reduce<number>((n,v)=>n+(v??0),0))}];
    note=`دوره‌ها به ترتیب ورود هستند؛ مقدارهای بین دو دوره خطی برآورد می‌شوند. ${table.missing?`${format(project,table.missing)} ترکیب غایب: ${s.raceMissing==='zero'?'با صفر محاسبه می‌شود':s.raceMissing==='carry'?'آخرین مقدار موجود حفظ می‌شود؛ پیش از اولین مشاهده پنهان است':'بدون فرض مقدار پنهان می‌شود'}. `:''}${s.raceScale==='global'?'مقیاس طول در کل مسابقه ثابت است.':'مقیاس طول با مقدارهای همان لحظه تغییر می‌کند.'}`;
  }else{
    const top=143,bottom=h-60-legendHeight,diameter=Math.min(w-100,bottom-top);
    if(diameter<170)throw Error('ارتفاع بوم کم است؛ ارتفاع را بیشتر یا راهنمای رنگ را خاموش کنید.');
    const root=packingLayout(project.rows,s,diameter),focus=root.descendants().find(n=>n.data.path===s.focusPath&&n.children?.length)??root,k=diameter/(2*focus.r),cx=w/2,cy=(top+bottom)/2;
    const back=focus.parent;
    if(back){const button=node('g',{tabindex:0,role:'button','aria-label':`بازگشت به ${back.data.name}`,'data-pack-back':back.data.path});button.style.cursor='pointer';button.append(text(w/2,116,`بازگشت به ${trim(back.data.name,30)} ↑`,s.fontSize,{'font-weight':600}));const go=():void=>{svg.dispatchEvent(new CustomEvent('chart-focus',{detail:back.data.path}));};button.addEventListener('click',go);button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});svg.append(button);}
    const nodes=focus.descendants().filter(n=>n!==focus),labels=node('g',{'pointer-events':'none'});let omitted=0;
    for(const n of nodes){
      const x=cx+(n.x-focus.x)*k,y=cy+(n.y-focus.y)*k,r=n.r*k,branch=!!n.children?.length,color=colorFor(project,n.data.group);
      if(branch&&!s.showContainers)continue;
      const circle=node('circle',{cx:x,cy:y,r,fill:color,'fill-opacity':branch?.06:1,stroke:branch?color:s.background,'stroke-width':s.strokeWidth,opacity:s.opacity,'data-pack-path':n.data.path,'data-pack-value':n.value??0,'data-pack-leaf':String(!branch)});
      const description=`${n.data.path}؛ ${format(project,n.value??0)} ${s.unit}؛ ${format(project,(n.value??0)/root.value!*100)}٪ از کل${branch?'؛ دوبار کلیک یا Enter برای ورود':''}`;
      interactive(circle,n.data.group,description,branch?n.data.path:undefined);svg.append(circle);
      const showName=s.showLabels&&(s.packLabels==='both'||s.packLabels===(branch?'groups':'leaves')),limit=Math.floor((2*r-18)/(s.fontSize*.65)),nameFits=showName&&limit>=3&&r>s.fontSize;
      const value=s.valueMode==='value'?format(project,n.value??0):format(project,(n.value??0)/(s.valueMode==='parent'?(n.parent?.value??root.value!):root.value!)*100)+'٪';
      const valueFits=s.showValues&&!branch&&value.length*s.valueSize*.65<2*r-16&&r>(nameFits?s.fontSize+s.valueSize:s.valueSize);
      // A light label backing keeps uploaded fonts readable on all palettes.
      const boxWidth=Math.min(2*r-8,Math.max(nameFits?Math.min(n.data.name.length,limit)*s.fontSize*.68:0,valueFits?value.length*s.valueSize*.68:0)+10),boxHeight=(nameFits?s.fontSize+5:0)+(valueFits?s.valueSize+5:0)+6;
      if(!branch&&(nameFits||valueFits))labels.append(node('rect',{x:x-boxWidth/2,y:y-boxHeight/2,width:boxWidth,height:boxHeight,rx:4,fill:s.background,'fill-opacity':.88}));
      if(nameFits)labels.append(text(x,branch?y-r+s.fontSize+6:y-(valueFits?(s.valueSize+5)/2:0)+s.fontSize*.34,trim(n.data.name,limit),s.fontSize));
      if(valueFits)labels.append(text(x,y+(nameFits?(s.fontSize+5)/2:0)+s.valueSize*.34,value,s.valueSize));
      if(showName&&!nameFits||s.showValues&&!branch&&!valueFits)omitted++;
    }
    svg.append(labels);const leaves=focus.leaves();
    summaries=[{label:'برگ در این نما',value:format(project,leaves.length)},{label:'شاخهٔ اصلی',value:format(project,root.children?.length??0)},{label:`مجموع این نما · ${s.unit}`,value:format(project,focus.value??0)}];
    note=`مساحت حباب‌های نهایی، مقدار داده را نشان می‌دهد؛ مساحت والد به‌دلیل فضای خالی معیار دقیق مجموع نیست. ${focus!==root?`نمای شاخهٔ «${focus.data.path}». `:''}${omitted?'برچسب‌های بدون فضای کافی پنهان شده‌اند؛ راهنما مقدار کامل را دارد. ':''}${project.rows.some(r=>r.value===0)?'مقدارهای صفر در داده حفظ شده‌اند و حبابی ندارند.':''}`;
  }
  if(s.showLegend)names.forEach((name,i)=>{const columnWidth=(w-100)/columns,x=50+columnWidth*(i%columns+.5),y=h-legendHeight+Math.floor(i/columns)*(s.legendSize+19)+6,limit=Math.max(3,Math.floor((columnWidth/2+26)/(s.legendSize*.65)));const group=node('g');group.append(node('rect',{x:x+48,y:y-10,width:10,height:10,rx:2,fill:colorFor(project,name)}),text(x+40,y,trim(name,limit),s.legendSize,{'text-anchor':'start'}));interactive(group,name,name);svg.append(group);});
  return {svg,summaries,note};
}
