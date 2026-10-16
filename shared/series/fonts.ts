import type { Project, CustomFont } from './model.ts';
const loaded = new Map<string,Promise<FontFace>>();
export function family(project: Project): string { return `${project.settings.fontFamily}, Vazirmatn, Tahoma, sans-serif`; }
export async function loadFonts(project: Pick<Project, 'fonts'>): Promise<void> {
  await Promise.all(project.fonts.map(async font => {
    if (!loaded.has(font.id)) loaded.set(font.id,new FontFace(font.id,`url(${font.dataUrl})`).load());
    try { document.fonts.add(await loaded.get(font.id)!); } catch (error) { loaded.delete(font.id); throw error; }
  }));
}
export async function readFont(file: File, existing: CustomFont[]): Promise<CustomFont> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const formats: Record<string,CustomFont['format']> = {woff2:'woff2',woff:'woff',ttf:'truetype',otf:'opentype'};
  if (!formats[extension]) throw Error('فرمت فونت باید WOFF2، WOFF، TTF یا OTF باشد.');
  if (file.size > 2*1024*1024) throw Error('حداکثر حجم هر فونت ۲ مگابایت است.');
  if (existing.reduce((n,f)=>n+f.dataUrl.length,0)+file.size*1.34 > 4*1024*1024) throw Error('مجموع فونت‌ها بیش از حد مجاز است؛ یک فونت قبلی را حذف کنید.');
  const data = await new Promise<string>((resolve,reject) => { const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('خواندن فونت ناموفق بود.'));reader.readAsDataURL(file); });
  const mime: Record<string,string> = {woff2:'woff2',woff:'woff',ttf:'ttf',otf:'otf'};
  const font: CustomFont = {id:`uploaded-${crypto.randomUUID()}`,name:file.name.slice(0,80),format:formats[extension],dataUrl:`data:font/${mime[extension]};base64,${data.split(',')[1]}`};
  await loadFonts({fonts:[font]});
  return font;
}
export function fontCss(project: Project): string { return project.fonts.map(font=>`@font-face{font-family:'${font.id}';src:url('${font.dataUrl}') format('${font.format}');}`).join(''); }
