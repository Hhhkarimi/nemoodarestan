import './style.css';
import { icon } from '../../src/icons.ts';
import { colorFor, colorLabel, defaults, format, initial, metadata, numberValue, palettes, parseProject, sampleRows, validateRows } from './model.ts';
import type { Kind, Project, Row, Settings } from './model.ts';
import { dataCSV, dataMatrix, parseMatrix, parseText } from './data.ts';
import { family, fontCss, loadFonts, readFont } from './fonts.ts';
import { renderChart } from './chart.ts';
import { editorInfo, radialControls } from '../radial/controls.ts';
import { heatTable } from '../radial/math.ts';
import { comparisonControls } from '../comparison/controls.ts';
import { validateComparisonData } from '../comparison/math.ts';
import { rankInputHint } from '../comparison/data.ts';
import { businessControls } from '../business/controls.ts';
import { validateBusinessData } from '../business/math.ts';
import { pairLabelsHint } from '../business/data.ts';
const escape = (value: unknown): string => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const glyph = (value: string): string => `<span aria-hidden="true">${value}</span>`;
const chartMark = (kind: Kind): string => `<svg class="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="10" fill="var(--soft)"/><g stroke="var(--accent)" stroke-width="2" stroke-linecap="round">${kind==='marimekko'?'<rect x="7" y="8" width="14" height="24"/><rect x="21" y="8" width="12" height="24"/><path d="M7 20h14M21 16h12M21 25h12"/>':kind==='dumbbell'?'<path d="M11 12h18M15 20h10M9 28h19"/><circle cx="11" cy="12" r="3"/><circle cx="29" cy="12" r="3"/><circle cx="15" cy="20" r="3"/><circle cx="25" cy="20" r="3"/><circle cx="9" cy="28" r="3"/><circle cx="28" cy="28" r="3"/>':kind==='bump'?'<path d="M7 11c10 0 16 18 26 18M7 29c10 0 16-18 26-18"/><circle cx="7" cy="11" r="2"/><circle cx="33" cy="11" r="2"/>':kind==='beeswarm'?'<circle cx="20" cy="12" r="3"/><circle cx="13" cy="18" r="3"/><circle cx="27" cy="18" r="3"/><circle cx="20" cy="24" r="3"/><circle cx="10" cy="27" r="3"/><circle cx="30" cy="27" r="3"/>':kind==='sunburst'?'<circle cx="20" cy="20" r="12"/><circle cx="20" cy="20" r="6"/><path d="M20 8v6M20 26v6M8 20h6M26 20h6"/>':kind==='spiral-heatmap'?'<path d="M20 20c-5 0-5-8 1-8 13 0 13 20-1 20C0 32 0 5 20 5c9 0 16 6 16 15"/>':kind==='streamgraph'?'<path d="M8 14c8-10 16 10 24 0M8 20c8-10 16 10 24 0M8 26c8-10 16 10 24 0"/>':'<path d="M7 29c7 0 4-12 11-12s3 12 15 12M7 22c8 0 5-12 12-12s4 12 14 12"/>'}</g></svg>`;

export function mount(kind: Kind): void {
  const meta=metadata[kind], info=editorInfo(kind), radial=kind==='sunburst'||kind==='spiral-heatmap', comparison=kind==='bump'||kind==='beeswarm', business=kind==='marimekko'||kind==='dumbbell', storage=`nemoodarestan-${kind}-v1`;
  const selectionPrompt=kind==='spiral-heatmap'?'برای دیدن جزئیات، یک خانه را انتخاب کنید.':`برای دیدن جزئیات و تغییر رنگ، یک ${info.noun} را انتخاب کنید.`;
  let project=initial(kind), step=0, mode='table', page=0, selected='', zoom=1, exportScale=2, busy=false;
  let history: Project[] = [], historyIndex=0, svg: SVGSVGElement | undefined;
  let toastTimer:ReturnType<typeof setTimeout>, fontTask:Promise<void>=Promise.resolve();
  const $=(id:string):HTMLElement=>document.getElementById(id)!;
  const snapshot=():Project=>structuredClone(project);
  try { const saved=localStorage.getItem(storage);if(saved)project=parseProject(JSON.parse(saved),kind); } catch { /* A damaged draft must not prevent opening the editor. */ }
  history=[snapshot()];
  const root=document.querySelector<HTMLElement>('#app');
  if(!root)throw Error('Application root missing');
  root.innerHTML=`<header><div class="brand">${chartMark(kind)}<div><h1>${meta.title}</h1><span dir="ltr">${meta.english}</span></div></div><div class="top-actions"><button id="guide" class="icon" aria-label="راهنمای استفاده">${icon('book')}</button><button id="theme" class="icon" aria-label="تغییر پوسته">${glyph('◐')}</button><button id="save" class="project-save">${icon('arrowUp') }<span>ذخیرهٔ پروژه</span></button><button id="load" aria-label="باز کردن پروژه">${icon('external')}<span class="action-label">باز کردن</span></button></div></header>
  <main class="workspace"><aside class="sidebar" aria-label="تنظیمات نمودار"><nav class="steps" aria-label="مراحل ساخت">${['داده','طراحی','خروجی'].map((label,index)=>`<button data-step="${index}"><span class="num">${new Intl.NumberFormat('fa').format(index+1)}</span>${label}</button>`).join('')}</nav><div id="panel"></div><div class="panel-bottom"><button id="next" class="primary">مرحلهٔ بعد ${icon('arrow')}</button></div></aside>
  <section class="stage" aria-label="پیش‌نمایش نمودار"><div class="stage-head"><div class="stage-meta"><strong>پیش‌نمایش نمودار</strong><span class="badge">زنده</span></div><div class="tools"><button id="undo" class="icon" aria-label="واگرد" title="واگرد · Ctrl+Z">${glyph('↶')}</button><button id="redo" class="icon" aria-label="بازانجام" title="بازانجام · Ctrl+Shift+Z">${glyph('↷')}</button><button id="zoom-out" class="icon" aria-label="کوچک‌نمایی">${glyph('−')}</button><button id="zoom-in" class="icon" aria-label="بزرگ‌نمایی">${glyph('+')}</button><button id="fit" class="icon" aria-label="بازنشانی بزرگ‌نمایی">${glyph('⤢')}</button><button id="present" class="icon" aria-label="نمایش تمام‌صفحه">${icon('external')}</button></div></div><div class="canvas-wrap"><div class="canvas-top"><span>${meta.category}</span><span id="canvas-size" dir="ltr"></span></div><div class="canvas" id="canvas"></div><div class="canvas-bottom"><span id="selection">برای دیدن جزئیات و تغییر رنگ، یک ${info.noun} را انتخاب کنید.</span><button id="clear-selection" hidden>نمایش همه</button></div></div><p class="chart-note" id="chart-note"></p><div class="stats" id="stats"></div><div class="export-bar"><span>دریافت تصویر <b id="export-size" dir="ltr"></b></span><select id="scale" aria-label="کیفیت خروجی"><option value="1">1×</option><option value="2" selected>2×</option><option value="4">4×</option></select><button data-export="png">PNG</button><button data-export="jpg">JPG</button><button data-export="svg">SVG</button></div></section></main>
  <footer><span>تهیه‌شده توسط حسین کریمی · ${meta.title}</span><span>رایگان · پردازش داده در مرورگر شما</span><nav class="social-links" aria-label="شبکه‌های اجتماعی"><a href="https://github.com/Hhhkarimi/nemoodarestan" target="_blank" rel="noopener noreferrer" aria-label="گیت‌هاب نمودارستان">${icon('github')}</a><a href="https://www.linkedin.com/in/hossein-karimi-8a452153/" target="_blank" rel="noopener noreferrer" aria-label="لینکدین حسین کریمی">${icon('external')}</a></nav></footer><div id="toast" role="status" aria-live="polite"></div><dialog id="dialog" aria-labelledby="dialog-title"></dialog><input type="file" id="project-file" accept=".json" hidden>`;
  function toast(message:string,error=false):void { $('toast').textContent=message;$('toast').className=error?'error':'';$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',6000); }
  function persist():void { try{localStorage.setItem(storage,JSON.stringify(project));}catch{toast('ذخیرهٔ خودکار در این مرورگر ممکن نیست؛ فایل پروژه را دانلود کنید.',true);} }
  function commit(redrawPanel=false):void { history=history.slice(0,historyIndex+1);history.push(snapshot());if(history.length>30)history.shift();historyIndex=history.length-1;persist();draw();if(redrawPanel)panel(); }
  function setProject(next:Project):void { project=next;selected='';page=0;fontTask=loadFonts(project);commit(true);void fontTask.then(draw).catch(()=>toast('بارگذاری فونت پروژه ناموفق بود؛ فونت را دوباره انتخاب کنید.',true)); }
  function checkedRows(rows:Row[],settings=project.settings):Row[]{const validated=validateRows(rows,kind);if(kind==='spiral-heatmap')heatTable(validated,settings.timeUnit,settings.aggregation);if(kind==='bump'||kind==='beeswarm')validateComparisonData(validated,kind,settings);if(kind==='marimekko'||kind==='dumbbell')validateBusinessData(validated,kind,settings);return validated;}
  function updateRows(rows:Row[],hint?:'rank'|'value',labels?:[string,string]):void { const settings={...project.settings,...(kind==='bump'&&hint?{rankInput:hint}:{}),...(kind==='dumbbell'&&labels?{firstLabel:labels[0],secondLabel:labels[1]}:{})},validated=checkedRows(rows,settings);project.settings=settings;project.rows=validated;project.settings.focusPath='';selected='';page=0;commit(true); }
  function restoreHistory(delta:number):void { const index=historyIndex+delta;if(index<0||index>=history.length)return;historyIndex=index;project=structuredClone(history[index]);selected='';fontTask=loadFonts(project);persist();draw();panel();void fontTask.then(draw).catch(()=>toast('بارگذاری فونت ناموفق بود.',true)); }
  function setSetting<K extends keyof Settings>(key:K,value:Settings[K]):void { project.settings[key]=value;commit(); }
  function applyTheme():void { document.body.classList.toggle('dark',project.settings.dark); $('theme').setAttribute('aria-pressed',String(project.settings.dark)); }
  function draw():void {
    applyTheme();
    $('canvas-size').textContent=`${project.settings.width} × ${project.settings.height}`;
    $('export-size').textContent=`${project.settings.width*exportScale} × ${project.settings.height*exportScale} px`;
    ($('undo') as HTMLButtonElement).disabled=historyIndex===0;($('redo') as HTMLButtonElement).disabled=historyIndex===history.length-1;
    $('canvas').classList.toggle('zoomed',zoom!==1);$('canvas').style.setProperty('--view-zoom',String(zoom));
    try {
      const result=renderChart(project,group=>{selected=group;step=1;panel();highlight();});svg=result.svg;
      svg.addEventListener('chart-focus',event=>{project.settings.focusPath=String((event as CustomEvent<unknown>).detail??'');selected='';commit(true);});
      $('canvas').replaceChildren(svg);$('chart-note').textContent=result.note;
      $('stats').innerHTML=result.summaries.map(summary=>`<div class="stat"><div><strong>${escape(summary.value)}</strong><span>${escape(summary.label)}</span></div></div>`).join('');
      highlight();
    } catch(error) { $('canvas').innerHTML=`<p class="error-box">${escape(error instanceof Error?error.message:'رسم نمودار ناموفق بود.')}</p>`;$('chart-note').textContent='';$('stats').replaceChildren();svg=undefined; }
  }
  function highlight():void {
    svg?.querySelectorAll<SVGPathElement>('[data-group]').forEach(path=>path.setAttribute('opacity',String(selected&&path.dataset.group!==selected?project.settings.opacity*.25:project.settings.opacity)));
    const selectedDescription=selected&&kind==='spiral-heatmap'?[...svg?.querySelectorAll<SVGElement>('[data-group]')??[]].find(path=>path.dataset.group===selected)?.getAttribute('aria-label'):undefined;
    $('selection').textContent=selected?(selectedDescription||`گروه انتخاب‌شده: ${colorLabel(project,selected)}`):selectionPrompt;
    $('clear-selection').hidden=!selected;
  }
  function field(label:string,key:keyof Settings,type='text',extra=''):string {
    const value=project.settings[key];return `<label class="field"><span>${label}</span><input data-setting="${key}" type="${type}" value="${escape(value)}" ${type==='number'?'required':''} ${extra}></label>`;
  }
  function choice(label:string,key:keyof Settings,items:[string,string][]):string {
    return `<label class="field"><span>${label}</span><select data-setting="${key}">${items.map(([value,text])=>`<option value="${escape(value)}" ${String(project.settings[key])===value?'selected':''}>${escape(text)}</option>`).join('')}</select></label>`;
  }
  function toggle(label:string,key:keyof Settings):string { return `<label class="toggle"><span>${label}</span><input data-setting="${key}" type="checkbox" ${project.settings[key]?'checked':''}></label>`; }
  function panel():void {
    document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button=>{button.classList.toggle('active',Number(button.dataset.step)===step);button.setAttribute('aria-current',Number(button.dataset.step)===step?'step':'false');});
    $('next').hidden=step===2;
    if(step===0)dataPanel();else if(step===1)designPanel();else exportPanel();
    bindSettings();
  }
  function dataPanel():void {
    const size=30,pages=Math.ceil(project.rows.length/size);page=Math.min(page,pages-1);
    $('panel').innerHTML=`<div class="section-heading"><h2>داده‌های شما</h2><span class="small">${format(project,project.rows.length)} ردیف</span></div><label class="field"><span>شروع با یک نمونه</span><select id="example"><option value="">انتخاب نمونه…</option><option value="default">${info.samples[0]}</option><option value="alternative">${info.samples[1]}</option></select></label><div class="segments" role="group" aria-label="روش ورود داده"><button data-mode="table" class="${mode==='table'?'active':''}">جدول</button><button data-mode="text" class="${mode==='text'?'active':''}">متن</button><button data-mode="file" class="${mode==='file'?'active':''}">فایل</button></div>${kind==='bump'?choice('نوع دادهٔ ورودی','rankInput',[['value','محاسبهٔ رتبه از مقدار'],['rank','رتبهٔ آماده']]):''}<div id="data-input"></div><p class="help">${info.help}</p><div class="checks">داده‌ها معتبرند · ${business||comparison?'مقدارهای عددی معتبر':kind==='sunburst'?'مقادیر برگ‌ها و مسیرهای معتبر':kind==='spiral-heatmap'?'تاریخ و مقدار عددی معتبر':kind==='streamgraph'?'مقدارهای نامنفی':'مشاهده‌های عددی با وزن مثبت'}</div><div class="divider"></div><button id="csv-template" class="full">دریافت قالب CSV</button><button id="load-data-project" class="full">باز کردن پروژه</button><p class="help">ذخیرهٔ خودکار فقط در همین مرورگر؛ برای نگهداری کار، فایل پروژه را ذخیره کنید.</p>`;
    document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode!;panel();});
    ($('example') as HTMLSelectElement).onchange=event=>{
      const alternative=(event.target as HTMLSelectElement).value==='alternative';if(!(event.target as HTMLSelectElement).value)return;
      project.rows=sampleRows(kind,alternative);project.settings.focusPath='';project.settings.title=alternative?(kind==='streamgraph'?'فروش محصولات در طول سال':'تغییر توزیع در پنج دوره'):defaults(kind).title;project.settings.subtitle=alternative?'داده‌های نمونه · قابل ویرایش':defaults(kind).subtitle;project.settings.unit=alternative?(kind==='streamgraph'?'میلیون تومان':'امتیاز'):defaults(kind).unit;if(radial||comparison||business){project.settings.title=alternative?info.samples[1]:defaults(kind).title;project.settings.unit=defaults(kind).unit;project.settings.subtitle=alternative?'داده‌های نمونه · قابل ویرایش':defaults(kind).subtitle;if(kind==='bump')project.settings.rankInput='value';if(kind==='dumbbell'){project.settings.firstLabel=alternative?'بودجه':'قبل';project.settings.secondLabel=alternative?'عملکرد':'بعد';}if(kind==='spiral-heatmap'){project.settings.slotsPerTurn=alternative?7:30;project.settings.timeUnit='day';}}selected='';page=0;commit(true);
    };
    $('csv-template').onclick=()=>download('\ufeff'+dataCSV(comparison||business?sampleRows(kind):sampleRows(kind).slice(0,kind==='streamgraph'?18:12),kind,defaults(kind)),`${kind}-template.csv`,'text/csv;charset=utf-8');
    $('load-data-project').onclick=()=>($('project-file') as HTMLInputElement).click();
    if(mode==='table'){
      const headers=kind==='dumbbell'?['نام',project.settings.firstLabel,project.settings.secondLabel]:kind==='bump'?['دوره','گروه',project.settings.rankInput==='rank'?'رتبه':'مقدار']:info.columns;
      const keys=info.keys;
      $('data-input').innerHTML=`<table class="flows ${radial?'radial-data':''}"><thead><tr>${headers.map(h=>`<th>${escape(h)}</th>`).join('')}<th><span class="sr-only">حذف</span></th></tr></thead><tbody>${project.rows.slice(page*size,(page+1)*size).map((row,index)=>{const i=page*size+index;return `<tr>${keys.map((key,k)=>`<td><input aria-label="${escape(headers[k])} ردیف ${i+1}" data-row="${i}" data-key="${key}" value="${escape(row[key])}" ${key==='value'||key==='second'||(kind==='ridgeline'&&key==='x')?'inputmode="decimal"':''}></td>`).join('')}<td><button class="delete" data-delete="${i}" aria-label="حذف ردیف ${i+1}">×</button></td></tr>`;}).join('')}</tbody></table><div class="pagination"><button id="page-prev" ${page===0?'disabled':''} aria-label="صفحهٔ قبل">${glyph('→')}</button><span>${format(project,page+1)} / ${format(project,pages)}</span><button id="page-next" ${page===pages-1?'disabled':''} aria-label="صفحهٔ بعد">${glyph('←')}</button></div><button id="add-row" class="add-flow">${glyph('+')} افزودن ردیف</button>`;
      $('page-prev').onclick=()=>{page--;panel();};$('page-next').onclick=()=>{page++;panel();};
      $('add-row').onclick=()=>{
        try{
          if(project.rows.length>=(kind==='dumbbell'?100:kind==='beeswarm'?2000:5000))throw Error(kind==='dumbbell'?'حداکثر ۱۰۰ مقایسه مجاز است.':kind==='beeswarm'?'حداکثر ۲۰۰۰ مشاهده مجاز است.':'حداکثر ۵۰۰۰ ردیف مجاز است.');
          const last={...project.rows.at(-1)!};
          if(kind==='dumbbell'){let suffix=1;while(project.rows.some(r=>r.x===`مقایسهٔ جدید ${suffix}`))suffix++;last.x=`مقایسهٔ جدید ${suffix}`;}if(kind==='sunburst')last.x+=' جدید';if(kind==='beeswarm')last.x=`مشاهدهٔ ${project.rows.length+1}`;if(kind==='bump'){let suffix=1;while(project.rows.some(r=>r.x===last.x&&r.group===`گروه جدید ${suffix}`))suffix++;last.group=`گروه جدید ${suffix}`;}
          if(kind==='spiral-heatmap'){
            const latest=project.rows.reduce((a,r)=>r.x>a?r.x:a,'');
            const date=new Date(latest.length===10?latest+'T00:00:00Z':latest+':00Z');
            if(project.settings.timeUnit==='hour')date.setUTCHours(date.getUTCHours()+1);
            else if(project.settings.timeUnit==='month'){date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+1);}
            else date.setUTCDate(date.getUTCDate()+1);
            last.x=date.toISOString().slice(0,project.settings.timeUnit==='hour'?16:10);last.group=last.x;
          }
          project.rows=checkedRows([...project.rows,last]);page=Math.floor((project.rows.length-1)/size);commit(true);
        }catch(error){toast((error as Error).message,true);}
      };
      document.querySelectorAll<HTMLInputElement>('[data-row]').forEach(input=>input.onchange=()=>{
        const index=Number(input.dataset.row),key=input.dataset.key as keyof Row, rows=project.rows.map(r=>({...r}));
        if(key==='value'||key==='second')rows[index][key]=numberValue(input.value);else rows[index][key]=input.value;
        try{project.rows=checkedRows(rows);commit();}catch(error){input.value=String(project.rows[index][key]);toast((error as Error).message,true);}
      });
      document.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(button=>button.onclick=()=>{try{const rows=project.rows.filter((_,i)=>i!==Number(button.dataset.delete));project.rows=checkedRows(rows);commit(true);}catch(error){toast((error as Error).message,true);}});
    } else if(mode==='text'){
      $('data-input').innerHTML=`<p class="help">CSV، Tab یا JSON را وارد کنید. نام ستون‌های فارسی و انگلیسی پذیرفته می‌شوند.</p><textarea id="text-data" aria-label="داده‌های متنی" spellcheck="false" dir="auto"></textarea><button id="apply-text" class="primary full">اعمال داده‌ها</button>`;
      ($('text-data') as HTMLTextAreaElement).value=dataCSV(project.rows,kind,project.settings);
      $('apply-text').onclick=()=>{try{const text=($('text-data') as HTMLTextAreaElement).value;if(text.length>2*1024*1024)throw Error('متن ورودی بیش از حد بزرگ است.');updateRows(parseText(text,kind),kind==='bump'?rankInputHint(text):undefined,kind==='dumbbell'?pairLabelsHint(text):undefined);toast('داده‌ها اعمال شدند.');}catch(error){toast((error as Error).message,true);}};
    } else {
      $('data-input').innerHTML=`<button class="dropzone" id="dropzone"><span aria-hidden="true">${glyph('↑')}</span><strong>فایل را رها کنید یا انتخاب کنید</strong><span>Excel، CSV، TSV یا JSON · حداکثر ۵ مگابایت</span></button><input type="file" id="data-file" accept=".xlsx,.xls,.csv,.tsv,.json" hidden><p class="help">${radial||comparison||business?info.help:kind==='streamgraph'?'ستون‌ها: دوره، گروه، مقدار. جدول گسترده با ستون دوره و نام گروه‌ها نیز پذیرفته می‌شود.':'ستون‌ها: گروه، مقدار، وزن (اختیاری). هر گروه می‌تواند تعداد مشاهدهٔ متفاوت داشته باشد.'}</p>`;
      const fileInput=$('data-file') as HTMLInputElement;fileInput.onchange=()=>{if(fileInput.files?.[0])void importData(fileInput.files[0]);};
      $('dropzone').onclick=()=>fileInput.click();$('dropzone').ondragover=event=>{event.preventDefault();};$('dropzone').ondrop=event=>{event.preventDefault();const file=event.dataTransfer?.files[0];if(file)void importData(file);};
    }
  }
  async function spreadsheet():Promise<typeof import('xlsx')>{
    const imported=await import('xlsx');
    const fallback=(imported as unknown as {default?:typeof imported}).default;
    const api=imported.utils?imported:fallback;
    if(!api?.utils||typeof api.write!=='function')throw Error('کتابخانهٔ Excel بارگذاری نشد؛ صفحه را دوباره باز کنید.');
    return api;
  }
  async function importData(file:File):Promise<void>{
    if(busy)return;busy=true;
    try{
      if(file.size>5*1024*1024)throw Error('حداکثر حجم داده ۵ مگابایت است.');
      if(/\.xlsx?$/i.test(file.name)){
        const XLSX=await spreadsheet(),book=XLSX.read(await file.arrayBuffer(),{type:'array'});
        const apply=(sheet:string):void=>{const matrix=XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheet],{header:1,defval:''});updateRows(parseMatrix(matrix,kind),kind==='bump'?rankInputHint(matrix):undefined,kind==='dumbbell'?pairLabelsHint(matrix):undefined);toast('داده‌های Excel وارد شدند.');};
        if(book.SheetNames.length===1)apply(book.SheetNames[0]);
        else showDialog('انتخاب برگهٔ Excel',`<label class="field"><span>برگهٔ داده</span><select id="sheet-choice">${book.SheetNames.map(name=>`<option value="${escape(name)}">${escape(name)}</option>`).join('')}</select></label><button id="apply-sheet" class="primary full">ورود دادهٔ این برگه</button>`,()=>{$('apply-sheet').onclick=()=>{try{apply(($('sheet-choice') as HTMLSelectElement).value);($('dialog') as HTMLDialogElement).close();}catch(error){toast((error as Error).message,true);}};});
      } else {const content=await file.text();updateRows(parseText(content,kind),kind==='bump'?rankInputHint(content):undefined,kind==='dumbbell'?pairLabelsHint(content):undefined);toast('داده‌های فایل وارد شدند.');}
    }catch(error){toast(error instanceof Error?error.message:'فایل قابل خواندن نیست.',true);}finally{busy=false;}
  }
  function designPanel():void{
    const s=project.settings,groups=kind==='dumbbell'?['first','second']:kind==='spiral-heatmap'?[]:[...new Set(project.rows.map(r=>r.group))];
    $('panel').innerHTML=`<div class="section-heading"><h2>طراحی نمودار</h2></div>${field('عنوان','title','text','maxlength="100"')}${field('زیرعنوان','subtitle','text','maxlength="180"')}${field('واحد داده','unit','text','maxlength="40"')}
    ${business?businessControls(project,{field,choice,toggle}):comparison?comparisonControls(project,{field,choice,toggle}):radial?radialControls(project,{field,choice,toggle}):`<details open><summary>چیدمان ${kind==='streamgraph'?'لایه‌ها':'توزیع‌ها'}</summary><div>${kind==='streamgraph'?`${choice('خط مبنای لایه‌ها','offset',[['wiggle','رودخانه‌ای (کمترین نوسان)'],['silhouette','متقارن حول مرکز'],['zero','انباشت از صفر']])}${choice('ترتیب لایه‌ها','order',[['inside-out','متعادل از داخل به بیرون'],['input','ترتیب ورود گروه‌ها'],['total','مجموع مقدار؛ نزولی'],['reverse','معکوس ترتیب ورود']])}${toggle('نمایش سهم درصدی در هر دوره','normalize')}${toggle('مجموع مقدار در برچسب لایه','showValues')}`:`${field('پهنای هموارسازی؛ صفر = خودکار','bandwidth','number','min="0" max="1000000000000" step="any"')}${field('هم‌پوشانی منحنی‌ها','overlap','range','min="0.5" max="4" step="0.05"')}${choice('مقیاس ارتفاع منحنی‌ها','densityScale',[['shared','چگالی مشترک برای همهٔ گروه‌ها'],['individual','ارتفاع مستقل برای هر گروه']])}${choice('ترتیب گروه‌ها','ridgeSort',[['input','ترتیب ورود'],['mean','میانگین؛ صعودی'],['median','میانه؛ صعودی'],['reverse','معکوس ترتیب ورود']])}${toggle('خط میانهٔ هر توزیع','showMedian')}${toggle('عدد میانه در کنار هر گروه','showValues')}`}${choice('نرمی منحنی','curve',[['basis','سیال و نرم'],['monotone','هموار بدون نوسان اضافی'],['linear','خطی'],['step','پله‌ای']])}${choice('جهت محور افقی','direction',[['ltr','چپ به راست'],['rtl','راست به چپ']])}<p class="help">${kind==='streamgraph'?'برای مقایسهٔ مقدار مطلق محور عمودی، چیدمان «انباشت از صفر» را انتخاب کنید.':'ارتفاع منحنی، چگالی است؛ اندازهٔ نمونه را نشان نمی‌دهد. تغییر پهنا فقط هموارسازی را تغییر می‌دهد، نه داده‌ها را.'}</p></div></details>`}
    <details open><summary>رنگ‌ها و نمایش</summary><div><div class="palette" ${kind==='spiral-heatmap'?'hidden':''}>${Object.entries(palettes).map(([key,colors])=>`<button data-palette="${key}" class="${key===s.palette?'active':''}" aria-label="پالت ${key}" aria-pressed="${key===s.palette}"><span class="swatches">${colors.slice(0,5).map(color=>`<i style="background:${color}"></i>`).join('')}</span><span>${({ocean:'دریایی',forest:'جنگلی',sunset:'غروب',blue:'آبی',vivid:'رنگارنگ',mono:'تک‌رنگ'} as Record<string,string>)[key]}</span></button>`).join('')}</div><div class="field-row">${field('پس‌زمینه','background','color')}${field('رنگ نوشته‌ها','textColor','color')}</div>${field('شفافیت رنگ‌ها','opacity','range','min="0.1" max="1" step="0.01"')}${field('ضخامت خط دور','strokeWidth','range','min="0" max="4" step="0.25"')}${toggle(kind==='dumbbell'?'نام مقایسه‌ها':kind==='spiral-heatmap'?'شمارهٔ خانه‌های هر دور':comparison?'نام مسیرها، گروه‌ها و برچسب مشاهده‌ها':'برچسب نام بخش‌ها','showLabels')}${toggle('راهنمای رنگ در خروجی','showLegend')}${kind==='sunburst'?'':toggle(kind==='spiral-heatmap'?'شماره‌گذاری دور مارپیچ':'محورها و واحد','showAxes')}${toggle('خطوط راهنما','showGrid')}<div class="divider"></div><div class="node-colors" id="group-colors">${groups.map((group,index)=>`<label class="node-color ${group===selected?'selected-color':''}"><span>${escape(colorLabel(project,group))}</span><input type="color" data-group-color="${index}" value="${colorFor(project,group)}" aria-label="رنگ ${escape(colorLabel(project,group))}"></label>`).join('')}</div><button id="reset-colors" class="full" ${kind==='spiral-heatmap'?'hidden':''}>بازنشانی رنگ گروه‌ها</button></div></details>
    <details open><summary>فونت و نوشته‌ها</summary><div>${choice('فونت نمودار','fontFamily',[['Vazirmatn','وزیرمتن'],['Tahoma','Tahoma'],['Arial','Arial'],...project.fonts.map(font=>[font.id,font.name] as [string,string])])}<label class="file-label">بارگذاری فونت دلخواه<input type="file" id="font-file" accept=".ttf,.otf,.woff,.woff2" aria-label="بارگذاری فونت دلخواه"></label><p class="help">TTF، OTF، WOFF و WOFF2 · حداکثر ۲ مگابایت. فونت در پروژه و SVG جاسازی می‌شود.</p>${project.fonts.map(font=>`<div class="font-asset"><span>${escape(font.name)}</span><button data-remove-font="${font.id}" aria-label="حذف فونت ${escape(font.name)}">حذف</button></div>`).join('')}<div class="field-row">${field('اندازهٔ عنوان','titleSize','number','min="14" max="60"')}${field('اندازهٔ زیرعنوان','subtitleSize','number','min="10" max="32"')}</div><div class="field-row">${field('اندازهٔ برچسب‌ها','fontSize','number','min="9" max="28"')}${field('اندازهٔ راهنمای رنگ','legendSize','number','min="9" max="24"')}</div>${choice('نمایش اعداد','digits',[['fa','فارسی'],['en','لاتین']])}${choice('رقم اعشار','decimals',[['0','بدون اعشار'],['1','یک رقم'],['2','دو رقم'],['3','سه رقم']])}</div></details>`;
    document.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach(button=>button.onclick=()=>{project.settings.palette=button.dataset.palette!;commit(true);});
    document.querySelectorAll<HTMLInputElement>('[data-group-color]').forEach(input=>input.onchange=()=>{project.colors={...project.colors,[groups[Number(input.dataset.groupColor)]]:input.value};commit();});
    $('reset-colors').onclick=()=>{project.colors={};commit(true);};
    ($('font-file') as HTMLInputElement).onchange=async event=>{
      const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;input.disabled=true;
      try{const font=await readFont(file,project.fonts);project.fonts.push(font);project.settings.fontFamily=font.id;fontTask=loadFonts(project);await fontTask;commit(true);toast('فونت بارگذاری شد و روی نمودار اعمال شد.');}catch(error){toast((error as Error).message,true);}finally{input.disabled=false;input.value='';}
    };
    document.querySelectorAll<HTMLButtonElement>('[data-remove-font]').forEach(button=>button.onclick=()=>{project.fonts=project.fonts.filter(font=>font.id!==button.dataset.removeFont);if(project.settings.fontFamily===button.dataset.removeFont)project.settings.fontFamily='Vazirmatn';commit(true);});
  }
  function exportPanel():void {
    $('panel').innerHTML=`<div class="section-heading"><h2>آماده برای ارائه</h2></div><p class="help">خروجی شامل داده‌ها، عنوان، رنگ‌ها و فونت انتخابی است.</p><div class="field-row">${field('عرض بوم (پیکسل)','width','number','min="600" max="2400" step="10"')}${field('ارتفاع بوم (پیکسل)','height','number','min="400" max="1800" step="10"')}</div>${toggle('پس‌زمینهٔ شفاف برای PNG و SVG','transparent')}<div class="export-grid"><button data-export="png">PNG<span>تصویر با کیفیت انتخابی</span></button><button data-export="jpg">JPG<span>همراه پس‌زمینه</span></button><button data-export="svg">SVG<span>برداری با فونت داخلی</span></button><button id="print">PDF / چاپ<span>ذخیره از پنجرهٔ چاپ</span></button></div><div class="divider"></div><h2 class="panel-h2">ذخیره و ادامهٔ کار</h2><button id="save-panel" class="full">ذخیرهٔ پروژهٔ قابل ویرایش</button><button id="csv-export" class="full">دریافت دادهٔ CSV</button><button id="xlsx-export" class="full">دریافت دادهٔ Excel</button><button id="html-export" class="full">دریافت نمودار HTML</button><p class="help">فایل پروژه شامل داده‌ها، تنظیمات و فونت‌هاست. ذخیرهٔ خودکار به همین مرورگر محدود است.</p>`;
    $('print').onclick=()=>window.print();$('save-panel').onclick=save;
    $('csv-export').onclick=()=>download('\ufeff'+dataCSV(project.rows,kind,project.settings),`${kind}-data.csv`,'text/csv;charset=utf-8');
    $('xlsx-export').onclick=async()=>{try{const XLSX=await spreadsheet(),book=XLSX.utils.book_new();const rows=dataMatrix(project.rows,kind,project.settings);XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'Data');download(new Blob([XLSX.write(book,{type:'array',bookType:'xlsx'})]),`${kind}-data.xlsx`);toast('داده‌های Excel آماده شدند.');}catch{toast('خروجی Excel ناموفق بود.',true);}};
    $('html-export').onclick=async()=>{try{const content=await serialized(false);download(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(project.settings.title)}</title><style>svg{max-width:100%;height:auto;display:block}</style></head><body style="margin:0">${content}</body></html>`,`${kind}-chart.html`,'text/html');toast('نمودار HTML آماده شد.');}catch(error){toast((error as Error).message,true);}};
    bindExports();
  }
  function bindSettings():void {
    document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-setting]').forEach(input=>{
      const key=input.dataset.setting as keyof Settings;
      input.addEventListener('change',()=>{
        if(input instanceof HTMLInputElement&&!input.checkValidity()){toast('مقدار خارج از محدودهٔ مجاز است.',true);input.value=String(project.settings[key]);return;}
        let value:unknown=input instanceof HTMLInputElement&&input.type==='checkbox'?input.checked:typeof project.settings[key]==='number'?Number(input.value):input.value;
        if(typeof value==='number'&&!Number.isFinite(value)){toast('مقدار عددی معتبر لازم است.',true);return;}
        if(kind==='spiral-heatmap'&&key==='timeUnit')try{heatTable(project.rows,String(value),project.settings.aggregation);}catch(error){input.value=project.settings.timeUnit;toast((error as Error).message,true);return;}
        if(comparison){try{const next={...project.settings,[key]:value} as Settings;validateComparisonData(project.rows,kind==='bump'?'bump':'beeswarm',next);}catch(error){input.value=String(project.settings[key]);toast((error as Error).message,true);return;}}
        if(business){try{validateBusinessData(project.rows,kind==='marimekko'?'marimekko':'dumbbell',{...project.settings,[key]:value} as Settings);}catch(error){input.value=String(project.settings[key]);toast((error as Error).message,true);return;}}
        (project.settings as unknown as Record<string,unknown>)[key]=value;commit((kind==='bump'&&key==='rankInput')||(kind==='dumbbell'&&(key==='firstLabel'||key==='secondLabel')));
      });
    });
  }
  function download(data:string|Blob,name:string,type='application/octet-stream'):void {
    const blob=typeof data==='string'?new Blob([data],{type}):data,url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function save():void { download(JSON.stringify(project,null,2),`${kind}-project.json`,'application/json');toast('پروژه همراه داده‌ها و فونت‌ها ذخیره شد.'); }
  let defaultFont: Promise<string> | undefined;
  async function serialized(forceBackground:boolean):Promise<string>{
    await fontTask;await loadFonts(project);await document.fonts.ready;if(!svg)throw Error('نمودار آماده نیست.');
    const copy=svg.cloneNode(true) as SVGSVGElement;copy.setAttribute('width',String(project.settings.width));copy.setAttribute('height',String(project.settings.height));copy.style.transform='';copy.style.removeProperty('width');copy.style.removeProperty('height');
    if(project.settings.transparent&&!forceBackground)copy.querySelector('[data-background]')?.remove();
    copy.querySelectorAll<SVGPathElement>('[data-group]').forEach(path=>{path.removeAttribute('tabindex');path.removeAttribute('role');path.removeAttribute('data-group');path.setAttribute('opacity',String(project.settings.opacity));path.style.cursor='';});
    defaultFont ??= fetch(new URL('fonts/vazirmatn.woff2',document.baseURI)).then(response=>{if(!response.ok)throw Error('فونت خروجی دریافت نشد.');return response.blob();}).then(blob=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('خواندن فونت خروجی ناموفق بود.'));reader.readAsDataURL(blob);})).catch(error=>{defaultFont=undefined;throw error;});
    const builtIn=await defaultFont,style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=`@font-face{font-family:Vazirmatn;src:url('${builtIn}') format('woff2');}${fontCss(project)}text{font-family:${family(project)}}`;copy.prepend(style);
    return new XMLSerializer().serializeToString(copy);
  }
  async function exportImage(formatName:string):Promise<void>{
    if(busy)return;busy=true;document.querySelectorAll<HTMLButtonElement>('[data-export]').forEach(button=>button.disabled=true);
    try{
      if(formatName==='svg'){download(await serialized(false),`${kind}.svg`,'image/svg+xml;charset=utf-8');toast('فایل SVG با فونت داخلی آماده شد.');return;}
      const width=project.settings.width*exportScale,height=project.settings.height*exportScale;
      if(width*height>40_000_000)throw Error('این تصویر بیش از ۴۰ مگاپیکسل است؛ کیفیت یا اندازهٔ بوم را کمتر کنید.');
      const content=await serialized(formatName==='jpg'),url=URL.createObjectURL(new Blob([content],{type:'image/svg+xml;charset=utf-8'}));
      try{
        const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('ساخت تصویر در این مرورگر ممکن نیست.');
        if(formatName==='jpg'){ctx.fillStyle=project.settings.background;ctx.fillRect(0,0,width,height);}ctx.drawImage(image,0,0,width,height);
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('ساخت تصویر ناموفق بود.')),formatName==='jpg'?'image/jpeg':'image/png',.95));
        download(blob,`${kind}.${formatName}`);toast(`خروجی ${formatName.toUpperCase()} آماده شد.`);
      }finally{URL.revokeObjectURL(url);}
    }catch(error){toast(error instanceof Error?error.message:'خروجی ناموفق بود.',true);}finally{busy=false;document.querySelectorAll<HTMLButtonElement>('[data-export]').forEach(button=>button.disabled=false);}
  }
  function bindExports():void { document.querySelectorAll<HTMLButtonElement>('[data-export]').forEach(button=>button.onclick=()=>void exportImage(button.dataset.export!)); }
  function showDialog(title:string,body:string,bind?:()=>void):void {
    const dialog=$('dialog') as HTMLDialogElement;dialog.innerHTML=`<div class="series-dialog-head"><h2 id="dialog-title">${escape(title)}</h2><button id="close-dialog" class="icon" aria-label="بستن راهنما">${icon('close')}</button></div>${body}`;$('close-dialog').onclick=()=>dialog.close();bind?.();dialog.showModal();
  }
  document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button=>button.onclick=()=>{step=Number(button.dataset.step);panel();});
  $('next').onclick=()=>{step=Math.min(2,step+1);panel();$('panel').scrollTop=0;};$('save').onclick=save;$('load').onclick=()=>($('project-file') as HTMLInputElement).click();
  ($('project-file') as HTMLInputElement).onchange=async event=>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;try{if(file.size>8*1024*1024)throw Error('حداکثر حجم پروژه ۸ مگابایت است.');const next=parseProject(JSON.parse(await file.text()),kind);await loadFonts(next);setProject(next);toast('پروژه همراه تنظیمات و فونت‌ها باز شد.');}catch(error){toast((error as Error).message,true);}finally{input.value='';}};
  $('theme').onclick=()=>{setSetting('dark',!project.settings.dark);};$('undo').onclick=()=>restoreHistory(-1);$('redo').onclick=()=>restoreHistory(1);
  $('zoom-in').onclick=()=>{zoom=Math.min(2,zoom+.2);draw();};$('zoom-out').onclick=()=>{zoom=Math.max(.6,zoom-.2);draw();};$('fit').onclick=()=>{zoom=1;draw();};
  $('clear-selection').onclick=()=>{selected='';highlight();};
  $('present').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.stage')!.requestFullscreen();}catch{toast('تمام‌صفحه در این مرورگر در دسترس نیست.',true);}};
  ($('scale') as HTMLSelectElement).onchange=event=>{exportScale=Number((event.target as HTMLSelectElement).value);draw();};
  $('guide').onclick=()=>showDialog(`راهنمای ${meta.title}`,`<div class="guide-prose"><p>۱. دادهٔ نمونه را تغییر دهید یا CSV، Excel و JSON وارد کنید.</p><p>۲. از «طراحی»، رنگ، فونت دلخواه، اندازهٔ نوشته‌ها و ${kind==='marimekko'?'اندازه و جهت موزاییک':kind==='dumbbell'?'نام دو سری، ترتیب و اختلاف مقدارها':kind==='bump'?'رتبه‌بندی و مسیرها':kind==='beeswarm'?'چیدمان و اندازهٔ نقطه‌ها':kind==='sunburst'?'حلقه‌ها و سلسله‌مراتب':kind==='spiral-heatmap'?'چرخهٔ زمانی و مقیاس رنگ':kind==='streamgraph'?'نوع چیدمان لایه‌ها':'پهنای هموارسازی و هم‌پوشانی منحنی‌ها'} را تنظیم کنید.</p><p>۳. از «خروجی»، SVG، PNG، JPG یا چاپ PDF بگیرید. اندازه و کیفیت تصویر قابل تغییر است.</p><p>فایل پروژهٔ JSON، داده‌ها و فونت‌ها را با هم نگه می‌دارد. فونت دلخواه روی نمودار و خروجی اعمال می‌شود؛ رابط کاربری فونت خوانای خودش را حفظ می‌کند.</p><p>${info.guide}</p><p>داده‌ها به سرور فرستاده نمی‌شوند. برای کار مهم، ذخیرهٔ پروژه را انجام دهید.</p></div>`);
  document.addEventListener('keydown',event=>{const target=event.target;if(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement||document.querySelector('dialog[open]'))return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();restoreHistory(event.shiftKey?1:-1);}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();save();}});
  bindExports();panel();draw();fontTask=loadFonts(project);void fontTask.then(draw).catch(()=>toast('فونت ذخیره‌شده بارگذاری نشد؛ از طراحی دوباره آن را انتخاب کنید.',true));
}
