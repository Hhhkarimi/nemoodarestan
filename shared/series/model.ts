import {graphTable,networkSamples,validateNetworkRows,validateNodes} from '../network/math.ts';
import {waterfallSamples,validateWaterfallRows,waterfallColors,waterfallColorLabel} from '../waterfall/math.ts';
import {multiSamples,validateMultiRows,parallelTable,axisState} from '../multivariate/math.ts';
import { radialSamples, validateRadialRows } from '../radial/math.ts';
import { comparisonSamples, validateComparisonRows, validateComparisonData } from '../comparison/math.ts';
import { businessSamples, validateBusinessRows, validateBusinessData } from '../business/math.ts';
import {motionSamples,validateMotionRows,raceTable} from '../motion/math.ts';
import {parseLogos} from '../motion/data.ts';
export type Kind = 'network' | 'waterfall' | 'waffle' | 'parallel-coordinates' | 'streamgraph' | 'ridgeline' | 'sunburst' | 'spiral-heatmap' | 'bump' | 'beeswarm' | 'marimekko' | 'dumbbell' | 'bar-chart-race' | 'circle-packing';
export interface Row { x: string; group: string; value: number; second?: number; axis?:string }
export interface NetworkNode {id:string;group:string;size:number;x?:number;y?:number}
export interface CustomFont { id: string; name: string; dataUrl: string; format: 'woff2' | 'woff' | 'truetype' | 'opentype' }
export interface Settings {
  title: string; subtitle: string; unit: string; fontFamily: string;
  titleSize: number; subtitleSize: number; fontSize: number; legendSize: number;
  width: number; height: number; palette: string; background: string; textColor: string;
  opacity: number; strokeWidth: number; showLegend: boolean; showLabels: boolean; showGrid: boolean;
  showAxes: boolean; showValues: boolean; transparent: boolean; dark: boolean; direction: string;
  digits: string; decimals: number; curve: string; offset: string; order: string; normalize: boolean;
  bandwidth: number; overlap: number; densityScale: string; ridgeSort: string; showMedian: boolean;
  innerRadius: number; rotation: number; ringGap: number; sunSort: string; labelMode: string; valueMode: string; focusPath: string;
  slotsPerTurn: number; timeUnit: string; aggregation: string; calendar: string; clockwise: boolean;
  heatPalette: string; reverseColors: boolean; autoDomain: boolean; domainMin: number; domainMax: number;
  lowColor: string; highColor: string; missingColor: string;
  rankInput:string; rankDirection:string; tieMethod:string; bumpCurve:string; endLabels:string;
  lineWidth:number; pointRadius:number; valueSize:number; showPoints:boolean; connectMissing:boolean;
  swarmLayout:string; swarmSort:string; axisScale:string; pointPadding:number; autoPointSize:boolean;
  pointLabels:string; showMean:boolean;
  mekkoOrientation:string; mekkoSort:string; segmentSort:string; mekkoGap:number; showTotals:boolean;
  mekkoLabel:string; mekkoPercent:string; firstLabel:string; secondLabel:string; pairSort:string;
  changeLabel:string; includeZero:boolean; connectorStyle:string; connectorColor:string;
  racePosition:number; raceDuration:number; raceTopN:number; raceScale:string; raceMissing:string; raceLoop:boolean; raceTimeSize:number; showLogos:boolean;
  waffleCells:number; waffleColumns:number; waffleGap:number; waffleShape:string; waffleSort:string; waffleFill:string;
  parallelScale:string; parallelMissing:string; parallelOrder:string; parallelInverted:string; parallelFilters:string;
  networkDirected:boolean;networkSize:string;networkRadius:number;networkDistance:number;networkRepulsion:number;
  networkLinkColor:string;networkLabels:string;networkNeighbors:boolean;networkFocus:string;networkSeed:number;
  waterfallBase:number;waterfallOrientation:string;waterfallGap:number;waterfallConnectors:boolean;waterfallValue:string;waterfallLabels:string;
  packSort:string; packPadding:number; packLabels:string; showContainers:boolean;
}
export interface Project { version: 1; kind: Kind; rows: Row[]; settings: Settings; fonts: CustomFont[]; colors: Record<string, string>; logos?:Record<string,string>;nodes?:NetworkNode[] }
export const palettes: Record<string, string[]> = {
  ocean: ['#168879','#55ad96','#4d8cb5','#e9b754','#9786ba','#dc8972','#5697a4','#758aa8'],
  forest: ['#285943','#4e8262','#78a279','#a3bb83','#c9d6a5','#dca96b','#a97453'],
  sunset: ['#9b5871','#c36c67','#de9673','#e8bc7b','#86799e','#567e91'],
  blue: ['#244d79','#3976a4','#5198b8','#76b7bd','#b1d4ca','#8a93bf'],
  vivid: ['#087f8c','#dc7352','#8b6bb3','#d5ae31','#458dad','#b45276'],
  mono: ['#1f524d','#326f65','#4b8b7d','#70a995','#97c2aa','#bfd8c0']
};
export const metadata: Record<Kind, { title: string; english: string; category: string }> = {
  network:{title:'شبکه‌ای استودیو',english:'NETWORK GRAPH STUDIO',category:'اعضا و ارتباط‌های میان آن‌ها'},
  waterfall:{title:'آبشاری استودیو',english:'WATERFALL CHART STUDIO',category:'از مقدار اولیه تا نتیجهٔ نهایی'},
  waffle:{title:'وافل استودیو',english:'WAFFLE CHART STUDIO',category:'سهم‌ها در خانه‌های برابر'},
  'parallel-coordinates':{title:'مختصات موازی استودیو',english:'PARALLEL COORDINATES STUDIO',category:'مقایسهٔ چند شاخص در یک مسیر'},
  streamgraph: { title: 'رودخانه‌ای استودیو', english: 'STREAMGRAPH STUDIO', category: 'روند لایه‌های سیال' },
  ridgeline: { title: 'کوهستانی استودیو', english: 'RIDGELINE STUDIO', category: 'مقایسهٔ توزیع گروه‌ها' },
  sunburst: { title: 'خورشیدی استودیو', english: 'SUNBURST STUDIO', category: 'سلسله‌مراتب در حلقه‌ها' },
  'spiral-heatmap': { title: 'مارپیچی استودیو', english: 'SPIRAL HEATMAP STUDIO', category: 'الگوی زمانی در مسیر مارپیچ' },
  bump: { title: 'تغییر رتبه استودیو', english: 'BUMP CHART STUDIO', category: 'رقابت گروه‌ها در طول زمان' },
  beeswarm: { title: 'ازدحام نقطه‌ای استودیو', english: 'BEESWARM STUDIO', category: 'هر مشاهده، یک نقطه' },
  marimekko: {title:'موزاییکی استودیو',english:'MARIMEKKO STUDIO',category:'اندازهٔ دسته و سهم زیرگروه‌ها'},
  'bar-chart-race':{title:'مسابقهٔ میله‌ای استودیو',english:'BAR CHART RACE STUDIO',category:'رقابت گروه‌ها در گذر زمان'},
  'circle-packing':{title:'حبابی تودرتو استودیو',english:'CIRCLE PACKING STUDIO',category:'سلسله‌مراتب در دایره‌های تودرتو'},
  dumbbell: {title:'دمبلی استودیو',english:'DUMBBELL STUDIO',category:'مقایسهٔ دو مقدار و فاصلهٔ آن‌ها'}
};
export function numberValue(input: unknown): number {
  const text = String(input ?? '').trim().replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[٬,\s]/g, '').replace('٫', '.');
  return text === '' ? NaN : Number(text);
}
export const hex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export function defaults(kind: Kind): Settings {
  return {
    title: ({network:'شبکهٔ همکاری تیم‌ها',waterfall:'از درآمد تا سود خالص',waffle:'ترکیب هزینهٔ خانوار','parallel-coordinates':'مقایسهٔ دوازده محصول',streamgraph:'توجه مخاطبان در طول سال',ridgeline:'توزیع زمان پاسخ‌گویی',sunburst:'ترکیب فروش در بازارها','spiral-heatmap':'نبض فعالیت در طول زمان',bump:'رقابت برندها در شش ماه',beeswarm:'قیمت محصولات در سه دسته',marimekko:'سهم برندها در بازار استان‌ها',dumbbell:'فروش استان‌ها؛ قبل و بعد','bar-chart-race':'رقابت برندها در گذر ماه‌ها','circle-packing':'ترکیب فروش در دایره‌ها'})[kind],
    subtitle: ({network:'هر گره یک عضو؛ ضخامت خط وزن همکاری · داده‌های نمونه',waterfall:'تغییرها و جمع‌های میانی · داده‌های نمونه',waffle:'سهم دسته‌ها از کل · داده‌های نمونه','parallel-coordinates':'پنج شاخص؛ هر مسیر یک محصول · داده‌های نمونه',streamgraph:'روند کانال‌های ارتباطی · داده‌های نمونه',ridgeline:'مقایسهٔ شش تیم · داده‌های نمونه',sunburst:'از بازار تا دسته و محصول · داده‌های نمونه','spiral-heatmap':'هر خانه یک روز؛ هر دور ۳۰ روز · داده‌های نمونه',bump:'رتبهٔ فروش؛ مقدار بزرگ‌تر بهتر است · داده‌های نمونه',beeswarm:'هر نقطه یک محصول · داده‌های نمونه',marimekko:'عرض ستون: اندازهٔ بازار؛ ارتفاع بخش: سهم برند · داده‌های نمونه',dumbbell:'مقایسهٔ دو دوره در هفت استان · داده‌های نمونه','bar-chart-race':'فروش هشت برند در هشت ماه · داده‌های نمونه','circle-packing':'از بازار تا دسته و محصول · داده‌های نمونه'})[kind],
    unit: ({network:'همکاری',waterfall:'میلیون تومان',waffle:'واحد','parallel-coordinates':'',streamgraph:'هزار بازدید',ridgeline:'دقیقه',sunburst:'میلیون تومان','spiral-heatmap':'فعالیت',bump:'امتیاز فروش',beeswarm:'میلیون تومان',marimekko:'میلیون تومان',dumbbell:'میلیون تومان','bar-chart-race':'میلیون تومان','circle-packing':'میلیون تومان'})[kind], fontFamily: 'Vazirmatn',
    titleSize: 28, subtitleSize: 15, fontSize: 14, legendSize: 13,
    width: 1200, height: 760, palette: 'ocean', background: '#ffffff', textColor: '#263d45',
    opacity: .87, strokeWidth: 1, showLegend: true, showLabels: true, showGrid: false,
    showAxes: true, showValues: ['waterfall','waffle','bump','marimekko','dumbbell','bar-chart-race','circle-packing'].includes(kind), transparent: true, dark: false, direction: 'ltr', digits: 'fa', decimals: 1,
    curve: kind === 'streamgraph' ? 'basis' : 'monotone', offset: 'wiggle', order: 'inside-out', normalize: false,
    bandwidth: 0, overlap: 1.65, densityScale: 'shared', ridgeSort: 'input', showMedian: false,
    innerRadius: .2, rotation: 0, ringGap: 1.5, sunSort: 'input', labelMode: 'horizontal', valueMode: 'percent', focusPath: '',
    slotsPerTurn: 30, timeUnit: 'day', aggregation: 'mean', calendar: 'persian', clockwise: true,
    heatPalette: 'teal', reverseColors: false, autoDomain: true, domainMin: 0, domainMax: 100,
    lowColor: '#e9f2eb', highColor: '#12675e', missingColor: '#dce1e4',
    rankInput:'value',rankDirection:'higher',tieMethod:'competition',bumpCurve:'smooth',endLabels:'end',
    lineWidth:3.5,pointRadius:kind==='bump'?7:5,valueSize:kind==='bar-chart-race'?14:11,showPoints:true,connectMissing:false,
    swarmLayout:'grouped',swarmSort:'input',axisScale:'linear',pointPadding:1,autoPointSize:true,
    pointLabels:'extremes',showMean:false,
    mekkoOrientation:'vertical',mekkoSort:'input',segmentSort:'input',mekkoGap:4,showTotals:true,
    mekkoLabel:'percent',mekkoPercent:'category',firstLabel:'قبل',secondLabel:'بعد',pairSort:'input',
    changeLabel:'difference',includeZero:false,connectorStyle:'line',connectorColor:'#a5b9b4',
    racePosition:0,raceDuration:1.5,raceTopN:8,raceScale:'global',raceMissing:'hide',raceLoop:false,raceTimeSize:36,showLogos:true,
    waffleCells:100,waffleColumns:10,waffleGap:4,waffleShape:'square',waffleSort:'input',waffleFill:'row',
    parallelScale:'independent',parallelMissing:'gaps',parallelOrder:'[]',parallelInverted:'[]',parallelFilters:'{}',
    networkDirected:false,networkSize:'degree',networkRadius:18,networkDistance:130,networkRepulsion:2500,
    networkLinkColor:'neutral',networkLabels:'auto',networkNeighbors:true,networkFocus:'',networkSeed:19,
    waterfallBase:0,waterfallOrientation:'vertical',waterfallGap:.25,waterfallConnectors:true,waterfallValue:'change',waterfallLabels:'auto',
    packSort:'value',packPadding:5,packLabels:'leaves',showContainers:true
  };
}
export function sampleRows(kind: Kind, alternative = false): Row[] {
  if(kind==='network')return networkSamples(alternative).rows;
  if(kind==='waterfall')return waterfallSamples(alternative);
  if(kind==='waffle'||kind==='parallel-coordinates')return multiSamples(kind,alternative);
  if(kind==='bar-chart-race'||kind==='circle-packing')return motionSamples(kind,alternative);
  if(kind==='marimekko'||kind==='dumbbell')return businessSamples(kind,alternative);
  if(kind==='bump'||kind==='beeswarm')return comparisonSamples(kind,alternative);
  if(kind==='sunburst'||kind==='spiral-heatmap')return radialSamples(kind,alternative);
  if (kind === 'streamgraph') {
    const months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
    const names = alternative ? ['محصول الف','محصول ب','محصول ج','محصول د','محصول ه'] : ['جست‌وجو','شبکه‌های اجتماعی','مراجعهٔ مستقیم','ایمیل','معرفی دوستان','تبلیغات'];
    return months.flatMap((x, i) => names.map((group, j) => ({ x, group, value: Math.round(10 + 30 * Math.exp(-Math.pow((i - j * 1.5 - 2) / 2.8, 2)) + 18 * (1 + Math.sin(i * .62 + j * 1.3))) })));
  }
  const names = alternative ? ['دورهٔ اول','دورهٔ دوم','دورهٔ سوم','دورهٔ چهارم','دورهٔ پنجم'] : ['فروش','پشتیبانی','عملیات','محصول','مالی','توسعه'];
  let seed = 19;
  const random = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed + 1) / 4294967297; };
  return names.flatMap((group, g) => Array.from({ length: 44 }, (_, i) => {
    const normal = Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
    return { group, x: String(Number((Math.max(.5, 14 + g * 5 + normal * (3 + g * .7) + (i % 7 === 0 ? 10 : 0))).toFixed(2))), value: 1 };
  }));
}
export function initial(kind: Kind): Project { return { version: 1, kind, rows: sampleRows(kind), settings: defaults(kind), fonts: [], colors: {},...(kind==='bar-chart-race'?{logos:{}}:{}),...(kind==='network'?{nodes:networkSamples().nodes}:{}) }; }
export function validateRows(input: unknown, kind: Kind): Row[] {
  if(kind==='network')return validateNetworkRows(input,numberValue);
  if(kind==='waterfall')return validateWaterfallRows(input,numberValue);
  if(kind==='waffle'||kind==='parallel-coordinates')return validateMultiRows(input,kind,numberValue);
  if(kind==='bar-chart-race'||kind==='circle-packing')return validateMotionRows(input,kind,numberValue);
  if(kind==='marimekko'||kind==='dumbbell')return validateBusinessRows(input,kind,numberValue);
  if(kind==='bump'||kind==='beeswarm')return validateComparisonRows(input,kind,numberValue);
  if(kind==='sunburst'||kind==='spiral-heatmap')return validateRadialRows(input,kind,numberValue);
  if (!Array.isArray(input) || !input.length) throw Error('حداقل یک ردیف داده وارد کنید.');
  if (input.length > 5000) throw Error('حداکثر ۵۰۰۰ ردیف داده مجاز است.');
  const rows = input.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw Error(`ردیف ${index + 1} معتبر نیست.`);
    const r = raw as Record<string, unknown>;
    const group = String(r.group ?? '').trim(), x = String(r.x ?? '').trim(), value = numberValue(r.value);
    if (!group || group.length > 80) throw Error(`ردیف ${index + 1}: نام گروه باید بین ۱ تا ۸۰ حرف باشد.`);
    if (!x || x.length > 80) throw Error(`ردیف ${index + 1}: ${kind === 'streamgraph' ? 'دوره' : 'مقدار مشاهده'} الزامی است.`);
    if (!Number.isFinite(value) || value < 0 || value > 1e12 || (kind === 'ridgeline' && value === 0)) throw Error(`ردیف ${index + 1}: ${kind === 'streamgraph' ? 'مقدار نامنفی' : 'وزن مثبت'} و حداکثر یک تریلیون لازم است.`);
    if (kind === 'ridgeline' && (!Number.isFinite(numberValue(x)) || Math.abs(numberValue(x)) > 1e12)) throw Error(`ردیف ${index + 1}: مقدار مشاهده باید عددی متناهی باشد.`);
    return { group, x: kind === 'ridgeline' ? String(numberValue(x)) : x, value };
  });
  const groups = new Set(rows.map(r => r.group));
  if (groups.size > (kind === 'streamgraph' ? 24 : 30)) throw Error(kind === 'streamgraph' ? 'حداکثر ۲۴ لایه پشتیبانی می‌شود.' : 'حداکثر ۳۰ گروه پشتیبانی می‌شود.');
  if (kind === 'streamgraph') {
    const periods = new Set(rows.map(r => r.x));
    if (periods.size < 2) throw Error('برای نمایش روند، حداقل دو دورهٔ متفاوت لازم است.');
    if (periods.size > 120) throw Error('حداکثر ۱۲۰ دوره پشتیبانی می‌شود.');
    if (!rows.some(r => r.value > 0)) throw Error('حداقل یک مقدار بزرگ‌تر از صفر لازم است.');
  }
  return rows;
}
const numericRanges: Partial<Record<keyof Settings, [number, number]>> = {
  width: [600,2400], height: [400,1800], titleSize: [14,60], subtitleSize: [10,32], fontSize: [9,28], legendSize: [9,24],
  opacity: [.1,1], strokeWidth: [0,4], decimals: [0,3], bandwidth: [0,1e12], overlap: [.5,4],
  innerRadius:[.08,.45],rotation:[-180,180],ringGap:[0,8],slotsPerTurn:[3,366],domainMin:[-1e12,1e12],domainMax:[-1e12,1e12],
  networkRadius:[5,35],networkDistance:[40,250],networkRepulsion:[100,6000],networkSeed:[1,99999],waterfallBase:[-1e12,1e12],waterfallGap:[.05,.6],waffleCells:[10,1000],waffleColumns:[2,50],waffleGap:[0,12],lineWidth:[1,8],pointRadius:[2,14],valueSize:[8,24],pointPadding:[0,5],mekkoGap:[0,14],racePosition:[0,119],raceDuration:[.5,10],raceTopN:[1,20],raceTimeSize:[18,60],packPadding:[0,20]
};
export function parseProject(input: unknown, kind: Kind): Project {
  if (!input || typeof input !== 'object') throw Error('فایل پروژه معتبر نیست.');
  const p = input as Record<string, unknown>;
  if (p.version !== 1 || p.kind !== kind) throw Error('این فایل متعلق به این نوع نمودار نیست یا نسخهٔ آن پشتیبانی نمی‌شود.');
  const settings = defaults(kind);
  const source = p.settings && typeof p.settings === 'object' ? p.settings as Record<string, unknown> : {};
  const target = settings as unknown as Record<string, unknown>;
  for (const key of Object.keys(settings) as (keyof Settings)[]) if (typeof source[key] === typeof settings[key]) target[key] = source[key];
  for (const [key, limits] of Object.entries(numericRanges)) {
    const n = Number(target[key]);
    target[key] = Number.isFinite(n) ? Math.max(limits[0], Math.min(limits[1], n)) : (defaults(kind) as unknown as Record<string, unknown>)[key];
  }
  settings.width = Math.round(settings.width); settings.height = Math.round(settings.height); settings.decimals = Math.round(settings.decimals);
  settings.waffleCells=Math.round(settings.waffleCells);settings.waffleColumns=Math.round(settings.waffleColumns);settings.slotsPerTurn=Math.round(settings.slotsPerTurn);settings.raceTopN=Math.round(settings.raceTopN);
  for (const key of ['title','subtitle','unit'] as const) settings[key] = settings[key].slice(0, key === 'subtitle' ? 180 : 100);
  settings.focusPath=settings.focusPath.slice(0,647);
  settings.firstLabel=settings.firstLabel.trim().slice(0,40);settings.secondLabel=settings.secondLabel.trim().slice(0,40);
  if (!Object.hasOwn(palettes,settings.palette)) settings.palette = 'ocean';
  for (const key of ['background','textColor','lowColor','highColor','missingColor','connectorColor'] as const) if (!hex(settings[key])) settings[key] = defaults(kind)[key];
  const choices: Partial<Record<keyof Settings,string[]>> = { direction:['ltr','rtl'], digits:['fa','en'], curve:['basis','monotone','linear','step'], offset:['wiggle','silhouette','zero'], order:['inside-out','input','total','reverse'], densityScale:['shared','individual'], ridgeSort:['input','mean','median','reverse'] };
  for (const [key, values] of Object.entries(choices)) if (!values.includes(String(target[key]))) target[key] = (defaults(kind) as unknown as Record<string, unknown>)[key];
  const radialChoices:Partial<Record<keyof Settings,string[]>>={sunSort:['input','value','name'],labelMode:['horizontal','radial','none'],valueMode:['value','percent','parent'],timeUnit:['hour','day','month'],aggregation:['mean','sum','max'],calendar:['persian','gregory'],heatPalette:['teal','amber','purple','diverging','custom']};
  for(const [key,values] of Object.entries(radialChoices))if(!values.includes(String(target[key])))target[key]=(defaults(kind) as unknown as Record<string,unknown>)[key];
  const comparisonChoices:Partial<Record<keyof Settings,string[]>>={rankInput:['value','rank'],rankDirection:['higher','lower'],tieMethod:['competition','dense','average'],bumpCurve:['smooth','linear','step'],endLabels:['end','both','none'],swarmLayout:['grouped','combined'],swarmSort:['input','median','name'],axisScale:['linear','log'],pointLabels:['extremes','none','all']};
  for(const [key,values] of Object.entries(comparisonChoices))if(!values.includes(String(target[key])))target[key]=(defaults(kind) as unknown as Record<string,unknown>)[key];
  const businessChoices:Partial<Record<keyof Settings,string[]>>={mekkoOrientation:['vertical','horizontal'],mekkoSort:['input','total','name'],segmentSort:['input','total','name'],mekkoLabel:['percent','value','both'],mekkoPercent:['category','total'],pairSort:['input','name','first','second','change','gap','percent'],changeLabel:['difference','percent','both','none'],connectorStyle:['line','arrow']};
  for(const [key,values] of Object.entries(businessChoices))if(!values.includes(String(target[key])))target[key]=(defaults(kind) as unknown as Record<string,unknown>)[key];
  const graphChoices:Partial<Record<keyof Settings,string[]>>={networkSize:['degree','strength','value','uniform'],networkLinkColor:['neutral','source'],networkLabels:['auto','all','selected','none'],waterfallOrientation:['vertical','horizontal'],waterfallValue:['change','balance'],waterfallLabels:['auto','horizontal','slanted']};
  for(const [key,values] of Object.entries(graphChoices))if(!values.includes(String(target[key])))target[key]=(defaults(kind) as unknown as Record<string,unknown>)[key];
  settings.networkFocus=settings.networkFocus.slice(0,80);settings.networkSeed=Math.round(settings.networkSeed);
  const multiChoices:Partial<Record<keyof Settings,string[]>>={waffleShape:['square','circle'],waffleSort:['input','value','name'],waffleFill:['row','column'],parallelScale:['independent','shared'],parallelMissing:['gaps','exclude']};
  for(const [key,values] of Object.entries(multiChoices))if(!values.includes(String(target[key])))target[key]=(defaults(kind) as unknown as Record<string,unknown>)[key];
  const motionChoices:Partial<Record<keyof Settings,string[]>>={raceScale:['global','period'],raceMissing:['hide','zero','carry'],packSort:['input','value','name'],packLabels:['leaves','groups','both','none']};
  for(const [key,values] of Object.entries(motionChoices))if(!values.includes(String(target[key])))target[key]=(defaults(kind) as unknown as Record<string,unknown>)[key];
  const fonts: CustomFont[] = [];
  if (Array.isArray(p.fonts)) for (const item of p.fonts) {
    if (!item || typeof item !== 'object') continue;
    const f = item as CustomFont;
    if (typeof f.id === 'string' && /^uploaded-[a-zA-Z0-9-]{1,80}$/.test(f.id) && typeof f.name === 'string' && typeof f.dataUrl === 'string' && /^data:font\/(woff2|woff|ttf|otf);base64,[A-Za-z0-9+/]+=*$/.test(f.dataUrl) && f.dataUrl.length <= 3 * 1024 * 1024 && ['woff2','woff','truetype','opentype'].includes(f.format) && !fonts.some(v => v.id === f.id)) fonts.push({ ...f, name:f.name.slice(0,80) });
  }
  if (fonts.reduce((n, f) => n + f.dataUrl.length, 0) > 4 * 1024 * 1024) throw Error('مجموع فونت‌های پروژه بیش از حد مجاز است.');
  if (!['Vazirmatn','Tahoma','Arial',...fonts.map(f => f.id)].includes(settings.fontFamily)) settings.fontFamily = 'Vazirmatn';
  const colors: Record<string,string> = {};
  if (p.colors && typeof p.colors === 'object') for (const [name, color] of Object.entries(p.colors)) if (hex(color) && !['__proto__','constructor','prototype'].includes(name)) colors[name] = color;
  const rows=validateRows(p.rows,kind);if(kind==='bump'||kind==='beeswarm')validateComparisonData(rows,kind,settings);
  if(kind==='marimekko'||kind==='dumbbell')validateBusinessData(rows,kind,settings);
  if(kind==='parallel-coordinates'){
    const state=axisState(settings,[...new Set(rows.map(r=>r.axis!))]);
    settings.parallelOrder=JSON.stringify(state.order);settings.parallelInverted=JSON.stringify(state.inverted);settings.parallelFilters=JSON.stringify(state.filters);parallelTable(rows,settings);
  }
  if(kind==='bar-chart-race')settings.racePosition=Math.min(settings.racePosition,raceTable(rows,settings.raceMissing).periods.length-1);
  const nodes=kind==='network'?validateNodes(p.nodes,numberValue):undefined;
  if(kind==='network'){const graph=graphTable(rows,nodes,settings.networkDirected);if(!graph.nodes.some(n=>n.id===settings.networkFocus))settings.networkFocus='';}
  return { version:1, kind, rows, settings, fonts, colors,...(kind==='bar-chart-race'?{logos:parseLogos(p.logos)}:{}),...(kind==='network'?{nodes}:{}) };
}
export function colorFor(project: Project, group: string): string {
  if(project.kind==='waterfall'){const index=waterfallColors.indexOf(group),indices=[0,5,4,2];return Object.hasOwn(project.colors,group)?project.colors[group]:palettes[project.settings.palette][indices[Math.max(0,index)]%palettes[project.settings.palette].length];}
  if(project.kind==='network'){const groups=[...new Set(graphTable(project.rows,project.nodes).nodes.map(n=>n.group))];return Object.hasOwn(project.colors,group)?project.colors[group]:palettes[project.settings.palette][Math.max(0,groups.indexOf(group))%palettes[project.settings.palette].length];}
  if(project.kind==='dumbbell')return Object.hasOwn(project.colors,group)?project.colors[group]:palettes[project.settings.palette][group==='second'?2:0];
  const groups = [...new Set(project.rows.map(r => r.group))];
  return Object.hasOwn(project.colors,group) ? project.colors[group] : palettes[project.settings.palette][groups.indexOf(group) % palettes[project.settings.palette].length];
}
export function colorLabel(project:Project,group:string):string{return project.kind==='waterfall'?waterfallColorLabel(group):project.kind==='dumbbell'?(group==='first'?project.settings.firstLabel:project.settings.secondLabel):group;}
export function format(project: Project, value: number): string {
  return new Intl.NumberFormat(project.settings.digits === 'fa' ? 'fa-IR' : 'en-US',{ maximumFractionDigits:project.settings.decimals }).format(value);
}
