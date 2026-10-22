import type { Project } from './model.ts';
import { family } from './fonts.ts';
export type Attributes=Record<string,string|number>;
export const svgNS='http://www.w3.org/2000/svg';
export function svgNode<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Attributes={},value?:string):SVGElementTagNameMap[K]{
  const el=document.createElementNS(svgNS,tag);for(const [key,v] of Object.entries(attrs))el.setAttribute(key,String(v));if(value!==undefined)el.textContent=value;return el;
}
export function svgTitle(el:SVGElement,value:string):void{el.append(svgNode('title',{},value));}
export function scene(project:Project):{svg:SVGSVGElement;text:(x:number,y:number,value:string,size?:number,attrs?:Attributes)=>SVGTextElement}{
  const s=project.settings,svg=svgNode('svg',{xmlns:svgNS,viewBox:`0 0 ${s.width} ${s.height}`,width:s.width,height:s.height,role:'img','aria-label':s.title||'نمودار'});svg.style.fontFamily=family(project);
  svg.append(svgNode('title',{},s.title),svgNode('desc',{},s.subtitle),svgNode('rect',{'data-background':'true',width:s.width,height:s.height,fill:s.background}));
  const text=(x:number,y:number,value:string,size=s.fontSize,attrs:Attributes={}):SVGTextElement=>svgNode('text',{x,y,fill:s.textColor,'font-size':size,'font-family':family(project),'text-anchor':'middle',direction:'rtl','unicode-bidi':'plaintext',...attrs},value);
  svg.append(text(s.width/2,48,s.title,s.titleSize,{'font-weight':700}),text(s.width/2,80,s.subtitle,s.subtitleSize,{opacity:.75}));return {svg,text};
}
export function activate(el:SVGElement,group:string,label:string,callback:()=>void):void{
  el.setAttribute('data-group',group);el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',label);el.style.cursor='pointer';svgTitle(el,label);
  el.addEventListener('click',callback);el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();callback();}});
}
export const short=(value:string,max:number):string=>value.length>max?value.slice(0,Math.max(1,max-1))+'…':value;
