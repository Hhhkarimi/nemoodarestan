import type {RaceFrame} from './math.ts';
export interface RaceView {left:number;right:number;top:number;band:number;barHeight:number;topN:number;direction:string;digits:string;decimals:number;unit:string;scale:string;timeLimit:number}
// This DOM painter is deliberately self-contained so exported HTML uses exactly the preview's renderer.
export function paintRace(svg:SVGSVGElement,frame:RaceFrame,view:RaceView):void{
  const fmt=(n:number):string=>new Intl.NumberFormat(view.digits==='fa'?'fa-IR':'en-US',{maximumFractionDigits:view.decimals}).format(n);
  const width=view.right-view.left,rtl=view.direction==='rtl';
  frame.bars.forEach((bar,i)=>{
    const group=svg.querySelector<SVGGElement>(`[data-race-index="${i}"]`);if(!group)return;
    const length=bar.value/frame.max*width,x=rtl?view.right-length:view.left;
    group.setAttribute('transform',`translate(0,${view.top+view.band*(bar.rank+.5)})`);
    group.setAttribute('opacity',String(bar.rank<view.topN+1?bar.alpha:0));group.setAttribute('aria-hidden',String(bar.alpha===0||bar.rank>=view.topN));
    const rect=group.querySelector<SVGRectElement>('[data-race-bar]')!;rect.setAttribute('x',String(x));rect.setAttribute('width',String(length));rect.setAttribute('data-value',String(bar.value));rect.setAttribute('aria-label',`${bar.group}؛ ${fmt(bar.value)} ${view.unit}`);
    if(rect.hasAttribute('role'))rect.setAttribute('tabindex',bar.alpha>0&&bar.rank<view.topN?'0':'-1');
    const title=rect.querySelector('title');if(title)title.textContent=`${bar.group}؛ ${fmt(bar.value)} ${view.unit}`;
    const amount=group.querySelector<SVGTextElement>('[data-race-value]');if(amount){amount.setAttribute('x',String(rtl?x-10:x+length+10));amount.textContent=fmt(bar.value);}
  });
  svg.querySelectorAll<SVGTextElement>('[data-race-tick]').forEach(tick=>{tick.textContent=fmt(frame.max*Number(tick.getAttribute('data-race-tick')));});
  const time=svg.querySelector<SVGTextElement>('[data-race-time]');
  if(time){const full=frame.fraction===0?frame.from:`${frame.from} · ${fmt(frame.fraction*100)}٪ تا ${frame.to}`;time.textContent=full.length>view.timeLimit?full.slice(0,view.timeLimit-1)+'…':full;time.setAttribute('aria-label',full);}
  svg.setAttribute('data-race-position',String(frame.position));
}
