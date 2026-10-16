export type Kind = 'streamgraph' | 'ridgeline';
export interface Row { x: string; group: string; value: number }
export interface CustomFont { id: string; name: string; dataUrl: string; format: 'woff2' | 'woff' | 'truetype' | 'opentype' }
export interface Settings {
  title: string; subtitle: string; unit: string; fontFamily: string;
  titleSize: number; subtitleSize: number; fontSize: number; legendSize: number;
  width: number; height: number; palette: string; background: string; textColor: string;
  opacity: number; strokeWidth: number; showLegend: boolean; showLabels: boolean; showGrid: boolean;
  showAxes: boolean; showValues: boolean; transparent: boolean; dark: boolean; direction: string;
  digits: string; decimals: number; curve: string; offset: string; order: string; normalize: boolean;
  bandwidth: number; overlap: number; densityScale: string; ridgeSort: string; showMedian: boolean;
}
export interface Project { version: 1; kind: Kind; rows: Row[]; settings: Settings; fonts: CustomFont[]; colors: Record<string, string> }
export const palettes: Record<string, string[]> = {
  ocean: ['#168879','#55ad96','#4d8cb5','#e9b754','#9786ba','#dc8972','#5697a4','#758aa8'],
  forest: ['#285943','#4e8262','#78a279','#a3bb83','#c9d6a5','#dca96b','#a97453'],
  sunset: ['#9b5871','#c36c67','#de9673','#e8bc7b','#86799e','#567e91'],
  blue: ['#244d79','#3976a4','#5198b8','#76b7bd','#b1d4ca','#8a93bf'],
  vivid: ['#087f8c','#dc7352','#8b6bb3','#d5ae31','#458dad','#b45276'],
  mono: ['#1f524d','#326f65','#4b8b7d','#70a995','#97c2aa','#bfd8c0']
};
export const metadata: Record<Kind, { title: string; english: string; category: string }> = {
  streamgraph: { title: 'رودخانه‌ای استودیو', english: 'STREAMGRAPH STUDIO', category: 'روند لایه‌های سیال' },
  ridgeline: { title: 'کوهستانی استودیو', english: 'RIDGELINE STUDIO', category: 'مقایسهٔ توزیع گروه‌ها' }
};
export function numberValue(input: unknown): number {
  const text = String(input ?? '').trim().replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[٬,\s]/g, '').replace('٫', '.');
  return text === '' ? NaN : Number(text);
}
export const hex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export function defaults(kind: Kind): Settings {
  return {
    title: kind === 'streamgraph' ? 'توجه مخاطبان در طول سال' : 'توزیع زمان پاسخ‌گویی',
    subtitle: kind === 'streamgraph' ? 'روند کانال‌های ارتباطی · داده‌های نمونه' : 'مقایسهٔ شش تیم · داده‌های نمونه',
    unit: kind === 'streamgraph' ? 'هزار بازدید' : 'دقیقه', fontFamily: 'Vazirmatn',
    titleSize: 28, subtitleSize: 15, fontSize: 14, legendSize: 13,
    width: 1200, height: 760, palette: 'ocean', background: '#ffffff', textColor: '#263d45',
    opacity: .87, strokeWidth: 1, showLegend: true, showLabels: true, showGrid: false,
    showAxes: true, showValues: false, transparent: true, dark: false, direction: 'ltr', digits: 'fa', decimals: 1,
    curve: kind === 'streamgraph' ? 'basis' : 'monotone', offset: 'wiggle', order: 'inside-out', normalize: false,
    bandwidth: 0, overlap: 1.65, densityScale: 'shared', ridgeSort: 'input', showMedian: false
  };
}
export function sampleRows(kind: Kind, alternative = false): Row[] {
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
export function initial(kind: Kind): Project { return { version: 1, kind, rows: sampleRows(kind), settings: defaults(kind), fonts: [], colors: {} }; }
export function validateRows(input: unknown, kind: Kind): Row[] {
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
  opacity: [.1,1], strokeWidth: [0,4], decimals: [0,3], bandwidth: [0,1e12], overlap: [.5,4]
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
  for (const key of ['title','subtitle','unit'] as const) settings[key] = settings[key].slice(0, key === 'subtitle' ? 180 : 100);
  if (!Object.hasOwn(palettes,settings.palette)) settings.palette = 'ocean';
  for (const key of ['background','textColor'] as const) if (!hex(settings[key])) settings[key] = defaults(kind)[key];
  const choices: Partial<Record<keyof Settings,string[]>> = { direction:['ltr','rtl'], digits:['fa','en'], curve:['basis','monotone','linear','step'], offset:['wiggle','silhouette','zero'], order:['inside-out','input','total','reverse'], densityScale:['shared','individual'], ridgeSort:['input','mean','median','reverse'] };
  for (const [key, values] of Object.entries(choices)) if (!values.includes(String(target[key]))) target[key] = (defaults(kind) as unknown as Record<string, unknown>)[key];
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
  return { version:1, kind, rows:validateRows(p.rows,kind), settings, fonts, colors };
}
export function colorFor(project: Project, group: string): string {
  const groups = [...new Set(project.rows.map(r => r.group))];
  return Object.hasOwn(project.colors,group) ? project.colors[group] : palettes[project.settings.palette][groups.indexOf(group) % palettes[project.settings.palette].length];
}
export function format(project: Project, value: number): string {
  return new Intl.NumberFormat(project.settings.digits === 'fa' ? 'fa-IR' : 'en-US',{ maximumFractionDigits:project.settings.decimals }).format(value);
}
