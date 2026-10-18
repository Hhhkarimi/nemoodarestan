import type {Project} from '../series/model.ts';
import type {RaceView} from './race-runtime.ts';
import {paintRace} from './race-runtime.ts';
import {raceFrame,raceTable} from './math.ts';
const escaped=(s:string):string=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const safeJSON=(v:unknown):string=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
function scene(content:string):{svg:SVGSVGElement;view:RaceView}{
  const doc=new DOMParser().parseFromString(content,'image/svg+xml');
  if(doc.querySelector('parsererror'))throw Error('ساخت نمودار متحرک ناموفق بود.');
  const svg=doc.documentElement as unknown as SVGSVGElement,view=JSON.parse(svg.getAttribute('data-race-view')??'null') as RaceView|null;
  if(!view)throw Error('تنظیمات انیمیشن در نمودار موجود نیست.');return {svg,view};
}
export function raceHTML(content:string,project:Project,view:RaceView=scene(content).view):string{
  const table=raceTable(project.rows,project.settings.raceMissing),s=project.settings;
  return `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaped(s.title)}</title><style>body{margin:0;background:${s.background};color:${s.textColor};font-family:Vazirmatn,Tahoma,sans-serif}svg{width:100%;height:auto;display:block}nav{display:flex;align-items:center;gap:12px;padding:16px;max-width:1100px;margin:auto}button{font:inherit;padding:8px 16px;border:1px solid #c5d3cd;background:transparent;color:inherit;border-radius:4px;cursor:pointer;min-height:44px}input{flex:1;min-width:40px}p{font-size:12px;text-align:center}button:focus-visible,input:focus-visible{outline:2px solid #168879;outline-offset:3px}</style>${content}<nav aria-label="کنترل مسابقه"><button id="play">پخش</button><button id="reset">از ابتدا</button><input id="seek" type="range" min="0" max="${table.periods.length-1}" step="0.01" value="${s.racePosition}" aria-label="زمان مسابقه"></nav><p>مقدارهای بین دو دوره خطی برآورد شده‌اند · ساخته‌شده با نمودارستان</p><script>
const frame=${raceFrame.toString()},paint=${paintRace.toString()},table=${safeJSON(table)},view=${safeJSON(view)},config=${safeJSON({duration:s.raceDuration,loop:s.raceLoop,position:s.racePosition})};
const svg=document.querySelector('svg'),seek=document.querySelector('#seek'),button=document.querySelector('#play');let position=config.position,running=false,last=0,raf=0;
function show(){const f=frame(table,position,view.scale);paint(svg,f,view);seek.value=String(position);seek.setAttribute('aria-valuetext',f.fraction===0?f.from:f.from+' تا '+f.to);}
function pause(){running=false;cancelAnimationFrame(raf);button.textContent='پخش';button.setAttribute('aria-pressed','false');}
function tick(now){if(!running)return;position+=(now-last)/(config.duration*1000);last=now;if(position>=table.periods.length-1){position=table.periods.length-1;show();if(config.loop)position=0;else{pause();return;}}show();raf=requestAnimationFrame(tick);}
button.onclick=()=>{if(running){pause();return;}if(position>=table.periods.length-1)position=0;running=true;last=performance.now();button.textContent='توقف';button.setAttribute('aria-pressed','true');raf=requestAnimationFrame(tick);};
seek.oninput=()=>{pause();position=Number(seek.value);show();};document.querySelector('#reset').onclick=()=>{pause();position=0;show();};document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});show();
</script></html>`;
}
export async function raceVideo(content:string,project:Project,progress:(value:number)=>void,signal:AbortSignal):Promise<Blob>{
  if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream)throw Error('این مرورگر خروجی WebM را پشتیبانی نمی‌کند؛ از Chrome یا Edge استفاده کنید.');
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(v=>MediaRecorder.isTypeSupported(v));if(!mime)throw Error('کدک WebM در این مرورگر موجود نیست.');
  const table=raceTable(project.rows,project.settings.raceMissing),duration=(table.periods.length-1)*project.settings.raceDuration*1000;
  if(duration>60000)throw Error('ویدیو حداکثر ۶۰ ثانیه است؛ زمان هر دوره را کمتر یا تعداد دوره‌ها را محدود کنید.');
  const {svg,view}=scene(content),s=project.settings,scale=Math.min(1,1280/s.width,1280/s.height),canvas=document.createElement('canvas');
  canvas.width=Math.round(s.width*scale);canvas.height=Math.round(s.height*scale);
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('ساخت بوم ویدیو ممکن نیست.');
  const draw=async(position:number):Promise<void>=>{
    paintRace(svg,raceFrame(table,position,s.raceScale),view);
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}));
    try{const image=new Image();image.src=url;await image.decode();ctx.fillStyle=s.background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}
  };
  await draw(0);const stream=canvas.captureStream(25),chunks:BlobPart[]=[],recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});let failed=false;
  const finished=new Promise<Blob>(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>{failed=true;};recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));});
  try{
    recorder.start(250);const start=performance.now();
    while(true){
      if(signal.aborted)throw Error('ساخت ویدیو لغو شد.');if(failed||recorder.state==='inactive')throw Error('مرورگر ضبط ویدیو را متوقف کرد؛ دوباره تلاش کنید.');
      const elapsed=performance.now()-start,t=Math.min(1,elapsed/duration);await draw(t*(table.periods.length-1));progress(t);
      if(t===1)break;await new Promise<void>(resolve=>setTimeout(resolve,40));
    }
    await new Promise<void>(resolve=>setTimeout(resolve,250));recorder.stop();const blob=await finished;
    if(blob.size<1000)throw Error('ویدیو دادهٔ کافی ندارد؛ دوباره تلاش کنید.');return blob;
  }finally{if(recorder.state!=='inactive')recorder.stop();await finished;stream.getTracks().forEach(track=>track.stop());}
}
