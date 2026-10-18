import type { Project } from '../series/model.ts';
import type { ChartResult } from '../series/chart.ts';
import { colorFor, colorLabel, format } from '../series/model.ts';
import { family } from '../series/fonts.ts';
import { mekkoCells, mekkoTable, pairs, validateBusinessData } from './math.ts';

const ns='http://www.w3.org/2000/svg';
type Attributes=Record<string,string|number>;
function node<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Attributes={},value?:string):SVGElementTagNameMap[K]{
  const el=document.createElementNS(ns,tag);
  for(const [key,v] of Object.entries(attrs))el.setAttribute(key,String(v));
  if(value!==undefined)el.textContent=value;
  return el;
}
const trim=(value:string,limit:number):string=>value.length>limit?value.slice(0,Math.max(1,limit-1))+'…':value;
function ink(fill:string,background:string,opacity:number):string{
  const rgb=(hex:string):number[]=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const base=rgb(background),channels=rgb(fill).map((c,i)=>(c*opacity+base[i]*(1-opacity))/255);
  const light=channels.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  return .2126*light[0]+.7152*light[1]+.0722*light[2]>.179?'#142e32':'#ffffff';
}
export function renderBusiness(project:Project,select?:(group:string)=>void):ChartResult{
  const s=project.settings,w=s.width,h=s.height,mekko=project.kind==='marimekko';
  validateBusinessData(project.rows,mekko?'marimekko':'dumbbell',s);
  const svg=node('svg',{xmlns:ns,viewBox:`0 0 ${w} ${h}`,width:w,height:h,role:'img','aria-label':s.title||'نمودار'});
  svg.style.fontFamily=family(project);
  svg.append(node('title',{},s.title),node('desc',{},s.subtitle),node('rect',{'data-background':'true',width:w,height:h,fill:s.background}));
  const text=(x:number,y:number,value:string,size=s.fontSize,attrs:Attributes={}):SVGTextElement=>node('text',{x,y,fill:s.textColor,'font-size':size,'font-family':family(project),'text-anchor':'middle',direction:'rtl','unicode-bidi':'plaintext',...attrs},value);
  const title=(el:SVGElement,value:string):void=>{el.append(node('title',{},value));};
  function interactive(el:SVGElement,group:string,label:string):void{
    el.setAttribute('data-group',group);el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',label);el.style.cursor='pointer';title(el,label);
    el.addEventListener('click',()=>select?.(group));
    el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select?.(group);}});
  }
  svg.append(text(w/2,48,s.title,s.titleSize,{'font-weight':700}),text(w/2,80,s.subtitle,s.subtitleSize,{opacity:.75}));
  const names=mekko?[...new Set(project.rows.map(r=>r.group))]:['first','second'];
  const columns=Math.min(names.length,Math.max(2,Math.floor((w-100)/180))),legendRows=s.showLegend?Math.ceil(names.length/columns):0,legendHeight=legendRows*(s.legendSize+19);
  const top=139,bottom=h-95-legendHeight,height=bottom-top;
  if(height<110)throw Error('ارتفاع بوم کم است؛ ارتفاع را بیشتر یا راهنمای رنگ را خاموش کنید.');
  let summaries:ChartResult['summaries'],note:string;
  if(mekko){
    const table=mekkoTable(project.rows,s),vertical=s.mekkoOrientation==='vertical';
    const left=vertical?90:Math.min(220,Math.max(125,s.fontSize*9)),right=w-(vertical?50:s.showTotals?130:50),width=right-left;
    if(width<180)throw Error('عرض بوم برای موزاییک کم است؛ عرض را بیشتر کنید.');
    const cells=mekkoCells(table,vertical?width:height,s.mekkoGap),labels=node('g',{'pointer-events':'none'});
    let omitted=0,omittedCategories=0;
    for(const cell of cells){
      if(cell.value===0)continue;
      const x=vertical?(s.direction==='rtl'?right-cell.start-cell.size:left+cell.start):(s.direction==='rtl'?right-cell.high*width:left+cell.low*width);
      const y=vertical?bottom-cell.high*height:top+cell.start;
      const cw=vertical?cell.size:cell.share*width,ch=vertical?cell.share*height:cell.size,color=colorFor(project,cell.group);
      const rect=node('rect',{x,y,width:cw,height:ch,fill:color,opacity:s.opacity,stroke:s.background,'stroke-width':s.strokeWidth,'data-category':cell.category,'data-value':cell.value,'data-share':cell.share});
      interactive(rect,cell.group,`${cell.category}؛ ${cell.group}؛ ${format(project,cell.value)} ${s.unit}؛ ${format(project,cell.share*100)}٪ از دسته؛ ${format(project,cell.totalShare*100)}٪ از کل`);svg.append(rect);
      const percentage=format(project,(s.mekkoPercent==='total'?cell.totalShare:cell.share)*100)+'٪';
      const value=s.mekkoLabel==='value'?format(project,cell.value):s.mekkoLabel==='both'?`${format(project,cell.value)} · ${percentage}`:percentage;
      const nameFits=s.showLabels&&cell.group.length*s.fontSize*.66<cw-16&&ch>s.fontSize+12;
      const valueFits=s.showValues&&value.length*s.valueSize*.65<cw-16&&ch>s.valueSize+12;
      const both=nameFits&&valueFits&&ch>s.fontSize+s.valueSize+22;
      const attrs={fill:ink(color,s.background,s.opacity)};
      if(nameFits)labels.append(text(x+cw/2,y+ch/2+(both?-5:s.fontSize*.34),cell.group,s.fontSize,attrs));
      if(valueFits&&(!nameFits||both))labels.append(text(x+cw/2,y+ch/2+(both?s.valueSize+5:s.valueSize*.34),value,s.valueSize,attrs));
      if((s.showLabels&&!nameFits)||(s.showValues&&(!valueFits||(nameFits&&!both))))omitted++;
    }
    for(let i=0;i<=4;i++){
      const share=i/4,xx=s.direction==='rtl'?right-share*width:left+share*width,yy=bottom-share*height;
      if(s.showGrid)svg.append(node('line',vertical?{x1:left,x2:right,y1:yy,y2:yy,stroke:s.textColor,'stroke-opacity':.18}:{x1:xx,x2:xx,y1:top,y2:bottom,stroke:s.textColor,'stroke-opacity':.18}));
      if(s.showAxes)svg.append(vertical?text(left-18,yy+4,format(project,share*100)+'٪',s.fontSize,{'text-anchor':'start'}):text(xx,bottom+30,format(project,share*100)+'٪'));
    }
    svg.append(labels);
    for(const category of table.categories){
      const cell=cells.find(c=>c.category===category.name)!;
      const center=vertical?(s.direction==='rtl'?right-cell.start-cell.size/2:left+cell.start+cell.size/2):top+cell.start+cell.size/2;
      if(s.showAxes&&cell.size>=(vertical?s.fontSize*1.4:s.fontSize+6)){
        const max=Math.max(2,Math.floor((vertical?cell.size-12:left-35)/(s.fontSize*.66)));
        const label=vertical?text(center,bottom+30,trim(category.name,max)):text(left-18,center+4,trim(category.name,max),s.fontSize,{'text-anchor':'start'});
        title(label,category.name);svg.append(label);
      }else if(s.showAxes)omittedCategories++;
      if(s.showTotals){
        const amount=format(project,category.total),fits=vertical?amount.length*s.valueSize*.65<cell.size-8:cell.size>s.valueSize+6;
        if(fits){const total=vertical?text(center,top-15,amount,s.valueSize,{direction:'ltr'}):text(right+18,center+4,amount,s.valueSize,{direction:'ltr','text-anchor':'start'});title(total,`مجموع ${category.name}؛ ${amount} ${s.unit}`);svg.append(total);}
      }
    }
    if(s.showAxes)svg.append(text((left+right)/2,bottom+60,vertical?'اندازهٔ دسته‌ها بر پایهٔ '+s.unit:'سهم زیرگروه در هر دسته · مجموع‌ها به '+s.unit,s.fontSize,{opacity:.75}));
    summaries=[{label:'دسته',value:format(project,table.categories.length)},{label:'زیرگروه',value:format(project,table.groups.length)},{label:`مجموع · ${s.unit}`,value:format(project,table.total)}];
    note=`مساحت هر بخش متناسب با مقدار آن است؛ ${vertical?'عرض ستون':'ارتفاع ردیف'} اندازهٔ دسته را نشان می‌دهد. ${table.missing?`${format(project,table.missing)} ترکیب غایب با صفر محاسبه شده است. `:''}${omitted||omittedCategories?'برچسب‌های بدون فضای کافی پنهان شده‌اند؛ جزئیات همهٔ بخش‌ها در راهنمای آن‌ها موجود است.':''}`;
  }else{
    const values=pairs(project.rows,s.pairSort),changes=s.changeLabel!=='none';
    const left=s.showLabels?Math.min(220,Math.max(130,s.fontSize*9)):60,right=w-(changes?(s.changeLabel==='both'?200:145):55),width=right-left;
    if(width<180)throw Error('عرض بوم کم است؛ عرض را بیشتر کنید یا ستون تغییر را خاموش کنید.');
    const band=height/values.length,minBand=Math.max(2*s.pointRadius+8,s.showLabels?s.fontSize+8:0,s.showValues?2*s.valueSize+2*s.pointRadius+16:0);
    if(band<minBand)throw Error('ردیف‌ها در این ارتفاع جا نمی‌شوند؛ ارتفاع را بیشتر، نوشته‌ها و نشانگرها را کوچک‌تر یا نمایش دو مقدار را خاموش کنید.');
    const all=values.flatMap(p=>[p.first,p.second]);let low=Math.min(...all),high=Math.max(...all);
    if(s.includeZero&&s.axisScale==='linear'){low=Math.min(0,low);high=Math.max(0,high);}
    if(low===high){if(s.axisScale==='log'){low/=1.25;high*=1.25;}else{const d=Math.max(1,Math.abs(low)*.05);low-=d;high+=d;}}
    const lo=s.axisScale==='log'?Math.log10(low):low,hi=s.axisScale==='log'?Math.log10(high):high,inset=s.pointRadius+12;
    const x=(value:number):number=>{const t=((s.axisScale==='log'?Math.log10(value):value)-lo)/(hi-lo);return s.direction==='rtl'?right-inset-t*(width-2*inset):left+inset+t*(width-2*inset);};
    const firstColor=colorFor(project,'first'),secondColor=colorFor(project,'second'),deltaX=right+(w-right)/2;
    if(s.connectorStyle==='arrow'){
      const defs=node('defs'),marker=node('marker',{id:'pair-arrow',markerWidth:6,markerHeight:6,refX:5,refY:3,orient:'auto',markerUnits:'userSpaceOnUse'});
      marker.append(node('path',{d:'M0 0L6 3L0 6Z',fill:s.connectorColor}));defs.append(marker);svg.append(defs);
    }
    const tickCount=Math.max(2,Math.min(5,Math.floor(width/125)));
    for(let i=0;i<=tickCount;i++){
      const value=s.axisScale==='log'?10**(lo+(hi-lo)*i/tickCount):low+(high-low)*i/tickCount,xx=x(value);
      if(s.showGrid)svg.append(node('line',{x1:xx,x2:xx,y1:top,y2:bottom,stroke:s.textColor,'stroke-opacity':.12}));
      if(s.showAxes)svg.append(text(xx,bottom+31,format(project,value),s.fontSize,{direction:'ltr'}));
    }
    if(s.showAxes)svg.append(text((left+right)/2,bottom+60,s.unit,s.fontSize));
    if(changes)svg.append(text(deltaX,top-17,s.changeLabel==='percent'?'تغییر درصدی':'تغییر',s.fontSize,{'font-weight':600}));
    const signed=(value:number):string=>(value>0?'+':'')+format(project,value);
    for(const [i,pair] of values.entries()){
      const yy=top+band*(i+.5),a=x(pair.first),b=x(pair.second),equal=pair.first===pair.second;
      svg.append(node('line',{x1:left,x2:right,y1:yy,y2:yy,stroke:s.textColor,'stroke-opacity':.07}));
      const connector=node('line',{x1:a,x2:b,y1:yy,y2:yy,stroke:s.connectorColor,'stroke-width':s.lineWidth});
      // The arrow ends before the second marker so that its direction stays visible.
      if(s.connectorStyle==='arrow'&&!equal&&Math.abs(b-a)>s.pointRadius*2+10){connector.setAttribute('x2',String(b-Math.sign(b-a)*(s.pointRadius+3)));connector.setAttribute('marker-end','url(#pair-arrow)');}
      title(connector,`${pair.name}؛ اختلاف ${signed(pair.change)} ${s.unit}`);svg.append(connector);
      if(s.showLabels){const label=text(left-18,yy+4,trim(pair.name,Math.floor((left-35)/(s.fontSize*.66))),s.fontSize,{'text-anchor':'start','font-weight':600});title(label,pair.name);svg.append(label);}
      for(const [key,value,xx,color] of [['first',pair.first,a,firstColor],['second',pair.second,b,secondColor]] as const){
        const circle=node('circle',{cx:xx,cy:yy,r:equal?(key==='first'?s.pointRadius+2.5:Math.max(1,s.pointRadius-1.5)):s.pointRadius,fill:equal&&key==='first'?s.background:color,stroke:equal&&key==='first'?color:s.background,'stroke-width':equal&&key==='first'?2.5:s.strokeWidth,opacity:s.opacity,'data-pair':pair.name,'data-value':value,'data-series':key});
        interactive(circle,key,`${pair.name}؛ ${colorLabel(project,key)}؛ ${format(project,value)} ${s.unit}`);svg.append(circle);
        if(s.showValues)svg.append(text(xx,yy+(key==='first'?-s.pointRadius-7:s.pointRadius+s.valueSize+7),format(project,value),s.valueSize,{direction:'ltr','pointer-events':'none'}));
      }
      if(changes){const percent=pair.percent===null?'—':signed(pair.percent)+'٪',change=s.changeLabel==='percent'?percent:s.changeLabel==='both'?`${signed(pair.change)} · ${percent}`:signed(pair.change);const label=text(deltaX,yy+4,change,s.valueSize,{direction:'ltr','data-change':pair.name});title(label,`اختلاف: ${signed(pair.change)} ${s.unit}؛ درصد تغییر: ${percent}`);svg.append(label);}
    }
    if(s.showMean)for(const [key,color] of [['first',firstColor],['second',secondColor]] as const){const mean=values.reduce((n,p)=>n+p[key],0)/values.length,xx=x(mean),line=node('line',{x1:xx,x2:xx,y1:top,y2:bottom,stroke:color,'stroke-width':1.5,'stroke-dasharray':'5 5'});title(line,`میانگین ${colorLabel(project,key)}: ${format(project,mean)} ${s.unit}`);svg.append(line);}
    const undefinedPercent=values.filter(p=>p.percent===null).length;
    summaries=[{label:'مقایسه',value:format(project,values.length)},{label:`مجموع ${s.firstLabel}`,value:format(project,values.reduce((n,p)=>n+p.first,0))},{label:`مجموع ${s.secondLabel}`,value:format(project,values.reduce((n,p)=>n+p.second,0))}];
    note=`اختلاف = ${s.secondLabel} منهای ${s.firstLabel}. ${undefinedPercent?`در ${format(project,undefinedPercent)} ردیف، مقدار اول صفر یا منفی است؛ درصد تغییر با خط تیره نمایش داده می‌شود. `:''}${values.some(p=>p.first===p.second)?'نشانگر حلقه‌ای یعنی دو مقدار برابرند. ':''}${s.axisScale==='log'?'محور لگاریتمی است؛ فاصله‌ها نسبت مقدارها را نشان می‌دهند.':''}`;
  }
  if(s.showLegend)names.forEach((name,i)=>{
    const col=i%columns,row=Math.floor(i/columns),x=50+(w-100)/columns*(col+.5),y=h-legendHeight+row*(s.legendSize+19)+6,label=colorLabel(project,name);
    const legend=node('g');legend.append(node('rect',{x:x+48,y:y-10,width:10,height:10,rx:2,fill:colorFor(project,name)}),text(x+40,y,trim(label,18),s.legendSize,{'text-anchor':'start'}));interactive(legend,name,label);svg.append(legend);
  });
  return {svg,summaries,note};
}
