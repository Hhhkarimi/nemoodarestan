import type { Project } from '../series/model.ts';
import type { ChartResult } from '../series/chart.ts';
import { format } from '../series/model.ts';
import { activate,scene,short,svgNode as node,svgTitle } from '../series/svg.ts';
import { heatColor,heatDomain } from '../radial/math.ts';
import { calendarTable,calendarYearLabel,dateParts } from './math.ts';
function ink(color:string,background:string,opacity:number):string{
  const rgb=(hex:string):number[]=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),bg=rgb(background),channels=rgb(color).map((c,i)=>(c*opacity+bg[i]*(1-opacity))/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]>.179?'#173b3b':'#ffffff';
}
export function renderCalendar(project:Project,select?:(date:string)=>void):ChartResult{
  const s=project.settings,w=s.width,h=s.height,{svg,text}=scene(project),table=calendarTable(project.rows,s),yearly=s.calendarView==='year';
  const top=145,bottom=h-(s.showLegend?100:48),cols=yearly?s.calendarColumns:1,rows=yearly?Math.ceil(12/cols):1,panelW=(w-90)/cols,panelH=(bottom-top)/rows;
  const domain=heatDomain(table.yearCells.map((c,index)=>({...c,index})),s),dayNames=['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'],abbr=['ی','د','س','چ','پ','ج','ش'];let omitted=0;
  for(const [index,month] of table.months.entries()){
    const visualCol=s.direction==='rtl'?cols-1-index%cols:index%cols,x0=45+visualCol*panelW,y0=top+Math.floor(index/cols)*panelH;
    const pitch=Math.min((panelW-22)/7,(panelH-60)/(yearly?6:month.weeks)),gap=Math.min(s.calendarGap,pitch*.35),size=pitch-gap;
    if(size<7)throw Error('خانه‌های تقویم در این ابعاد جا نمی‌شوند؛ بوم را بزرگ‌تر یا تعداد ماه‌های هر ردیف را بیشتر کنید.');
    const left=x0+(panelW-7*pitch)/2,gridTop=y0+48;
    if(s.showLabels)svg.append(text(x0+panelW/2,y0+5,month.label+' '+calendarYearLabel(table.year,s.digits),s.fontSize,{'font-weight':600}));
    if(s.showAxes)for(let weekday=0;weekday<7;weekday++){
      const d=(weekday+Number(s.calendarWeekStart))%7,x=left+(s.direction==='rtl'?6-weekday:weekday)*pitch+pitch/2,label=text(x,gridTop-13,yearly?abbr[d]:dayNames[d],yearly?Math.min(s.fontSize,12):s.fontSize,{opacity:.75});svgTitle(label,dayNames[d]);svg.append(label);
    }
    for(const cell of month.cells){
      const index=month.offset+cell.day-1,col=index%7,row=Math.floor(index/7),x=left+(s.direction==='rtl'?6-col:col)*pitch+gap/2,y=gridTop+row*pitch+gap/2,color=cell.value===null?s.missingColor:heatColor(cell.value,domain,s);
      const g=node('g',{opacity:s.opacity,'data-date':cell.date,'data-value':cell.value===null?'missing':cell.value}),rect=node('rect',{x,y,width:size,height:size,rx:Math.min(3,size*.1),fill:color,stroke:s.calendarWeekend&&cell.weekday===5?s.textColor:s.background,'stroke-width':s.calendarWeekend&&cell.weekday===5?Math.max(1,s.strokeWidth):s.strokeWidth,'stroke-opacity':s.calendarWeekend&&cell.weekday===5?.7:1});g.append(rect);
      const parts=dateParts(cell.epoch,s.calendar),labelDate=[parts.year,String(parts.month).padStart(2,'0'),String(parts.day).padStart(2,'0')].join('/'),description=`${dayNames[cell.weekday]} ${s.digits==='fa'?labelDate.replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]):labelDate}؛ ${cell.value===null?'بدون داده':format(project,cell.value)+' '+s.unit}؛ ${format(project,cell.count)} ردیف ورودی`;
      if(s.calendarCellText!=='none'){
        const label=s.calendarCellText==='day'?format(project,cell.day):cell.value===null?'':format(project,cell.value);
        if(label&&label.length*s.valueSize*.61<size-3&&s.valueSize+3<size)g.append(text(x+size/2,y+size/2+s.valueSize*.35,label,s.valueSize,{fill:ink(color,s.background,s.opacity),'pointer-events':'none'}));else if(label)omitted++;
      }
      activate(g,cell.date,description,()=>select?.(cell.date));svg.append(g);
    }
  }
  if(s.showLegend){
    const legendY=h-55,barW=Math.min(240,w*.28),start=w/2-barW/2;
    for(let i=0;i<50;i++)svg.append(node('rect',{x:start+i*barW/50,y:legendY-14,width:barW/50+1,height:14,fill:heatColor(domain[0]+(domain[1]-domain[0])*i/49,domain,s),opacity:s.opacity}));
    svg.append(text(start-16,legendY-3,format(project,domain[0]),s.legendSize,{'text-anchor':'end',direction:'ltr'}),text(start+barW+16,legendY-3,format(project,domain[1]),s.legendSize,{'text-anchor':'start',direction:'ltr'}),text(w/2,legendY+29,short(s.unit,Math.max(8,Math.floor((w-360)/(s.legendSize*.6)))),s.legendSize));
    const missing=node('g');missing.append(node('rect',{x:55,y:legendY+16,width:14,height:14,fill:s.missingColor,opacity:s.opacity}),text(130,legendY+29,'بدون داده',s.legendSize));svg.append(missing);
  }
  const values=table.observed.map(c=>c.value!),sum=values.reduce((n,v)=>n+v,0),mean=values.length?sum/values.length:0;
  return {svg,summaries:[{label:'روز دارای داده',value:format(project,values.length)},{label:'روز بدون داده',value:format(project,table.cells.length-values.length)},{label:(s.aggregation==='sum'?'مجموع':'میانگین روزها')+' · '+s.unit,value:values.length?format(project,s.aggregation==='sum'?sum:mean):'—'}],note:`رنگ‌ها بر پایهٔ همهٔ روزهای دارای دادهٔ سال ${calendarYearLabel(table.year,s.digits)} هستند؛ روز بدون داده با صفر فرق دارد. ${!values.length?'نمای انتخابی داده‌ای ندارد. ':''}${table.outside?format(project,table.outside)+' ردیف بیرون این نما در پروژه حفظ شده است. ':''}${omitted?'نوشته‌های بدون فضای کافی پنهان شده‌اند؛ جزئیات همهٔ روزها با انتخاب آن‌ها قابل خواندن است.':''}`};
}
