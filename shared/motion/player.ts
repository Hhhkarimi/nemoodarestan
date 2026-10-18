import type {Project,Row} from '../series/model.ts';
import {raceTable} from './math.ts';
import type {RaceTable} from './math.ts';
export const playerMarkup=():string=>`<div class="race-controls" id="race-controls" role="group" aria-label="کنترل زمان مسابقه"><div class="race-buttons"><button id="race-prev" aria-label="دورهٔ قبل">→</button><button id="race-play" aria-pressed="false">پخش</button><button id="race-next" aria-label="دورهٔ بعد">←</button><button id="race-reset">از ابتدا</button></div><label class="race-seek"><span class="sr-only">زمان مسابقه</span><input id="race-position" type="range" min="0" max="1" step="0.01" value="0" aria-label="زمان مسابقه"><output id="race-period"></output></label></div>`;
export class RacePlayer{
  private playing=false;private raf=0;private last=0;private painted=0;private busy=false;
  private rows:Row[]|undefined;private policy='';private table:RaceTable|undefined;
  private play:HTMLButtonElement;private range:HTMLInputElement;private output:HTMLOutputElement;
  constructor(private root:HTMLElement,private project:()=>Project,private svg:()=>SVGSVGElement|undefined,private commit:()=>void){
    this.play=root.querySelector('#race-play')!;this.range=root.querySelector('#race-position')!;this.output=root.querySelector('#race-period')!;
    this.play.onclick=()=>{if(this.playing)this.stop(true);else this.start();};
    root.querySelector<HTMLButtonElement>('#race-prev')!.onclick=()=>this.seek(Math.ceil(this.project().settings.racePosition)-1);
    root.querySelector<HTMLButtonElement>('#race-next')!.onclick=()=>this.seek(Math.floor(this.project().settings.racePosition)+1);
    root.querySelector<HTMLButtonElement>('#race-reset')!.onclick=()=>this.seek(0);
    this.range.oninput=()=>{const position=Number(this.range.value);this.stop();this.project().settings.racePosition=position;this.paint();};this.range.onchange=()=>this.commit();
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop(true);});
  }
  private data():RaceTable{
    const p=this.project();if(!this.table||this.rows!==p.rows||this.policy!==p.settings.raceMissing){this.rows=p.rows;this.policy=p.settings.raceMissing;this.table=raceTable(p.rows,this.policy);}return this.table;
  }
  refresh():void{
    const table=this.data(),s=this.project().settings;s.racePosition=Math.max(0,Math.min(table.periods.length-1,s.racePosition));
    this.range.max=String(table.periods.length-1);this.range.value=String(s.racePosition);
    const index=Math.floor(s.racePosition),t=s.racePosition-index,label=t===0?table.periods[index]:`${table.periods[index]} تا ${table.periods[Math.min(index+1,table.periods.length-1)]}`;
    this.output.textContent=label;this.range.setAttribute('aria-valuetext',label);this.play.textContent=this.playing?'توقف':'پخش';this.play.setAttribute('aria-pressed',String(this.playing));
    const disabled=this.busy||!this.svg();this.root.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button').forEach(el=>el.disabled=disabled);
    this.root.querySelector<HTMLButtonElement>('#race-prev')!.disabled=disabled||s.racePosition===0;
    this.root.querySelector<HTMLButtonElement>('#race-next')!.disabled=disabled||s.racePosition===table.periods.length-1;
  }
  setBusy(value:boolean):void{this.busy=value;if(value)this.stop();this.refresh();}
  stop(record=false):void{const wasPlaying=this.playing;this.playing=false;cancelAnimationFrame(this.raf);this.refresh();if(record&&wasPlaying)this.commit();}
  private seek(position:number):void{if(this.busy)return;this.stop();this.project().settings.racePosition=Math.max(0,Math.min(this.data().periods.length-1,position));this.commit();}
  private paint():void{this.svg()?.dispatchEvent(new CustomEvent('race-frame',{detail:this.project().settings.racePosition}));this.refresh();}
  private start():void{
    if(this.busy||!this.svg())return;
    const s=this.project().settings;if(s.racePosition>=this.data().periods.length-1)s.racePosition=0;
    this.playing=true;this.last=performance.now();this.painted=0;this.refresh();
    const tick=(now:number):void=>{
      if(!this.playing)return;const settings=this.project().settings;settings.racePosition=Math.min(this.data().periods.length-1,settings.racePosition+(now-this.last)/(settings.raceDuration*1000));this.last=now;
      if(now-this.painted>=32){this.paint();this.painted=now;}
      if(settings.racePosition>=this.data().periods.length-1){if(settings.raceLoop)settings.racePosition=0;else{this.stop(true);return;}}
      this.raf=requestAnimationFrame(tick);
    };this.raf=requestAnimationFrame(tick);
  }
}
