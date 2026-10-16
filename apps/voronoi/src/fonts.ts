export const customFamily = 'VoronoiUserFont';
export const maxFontBytes = 2 * 1024 * 1024;
const formats = {woff: 'woff', woff2: 'woff2', ttf: 'truetype', otf: 'opentype'} as const;
type Extension = keyof typeof formats;

export function isFontData(value: unknown): value is string {
  return typeof value === 'string' && value.length <= Math.ceil(maxFontBytes / 3) * 4 + 100 && /^data:font\/(woff2?|ttf|otf);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function fontFormat(data: string): string {
  const extension = data.match(/^data:font\/(woff2?|ttf|otf);/)?.[1] as Extension | undefined;
  if (!extension) throw new Error('قالب فونت ذخیره‌شده معتبر نیست.');
  return formats[extension];
}

export async function readFont(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() as Extension | undefined;
  if (!extension || !Object.hasOwn(formats, extension)) throw new Error('فونت باید WOFF، WOFF2، TTF یا OTF باشد.');
  if (!file.size || file.size > maxFontBytes) throw new Error('حداکثر اندازهٔ فونت ۲ مگابایت است.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = Array.from(bytes.slice(0, 4)).map(x => String.fromCharCode(x)).join('');
  const valid = extension === 'woff' ? signature === 'wOFF' : extension === 'woff2' ? signature === 'wOF2' : extension === 'otf' ? signature === 'OTTO' : bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0;
  if (!valid) throw new Error('محتوای فایل با قالب فونت مطابقت ندارد.');
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return `data:font/${extension};base64,${btoa(binary)}`;
}

export async function loadFont(data: string): Promise<FontFace> {
  if (!isFontData(data)) throw new Error('دادهٔ فونت معتبر نیست.');
  const face = new FontFace(customFamily, `url("${data}") format("${fontFormat(data)}")`, {weight: '100 900'});
  try { await face.load(); } catch { throw new Error('مرورگر نتوانست فونت را بخواند؛ یک فایل فونت سالم انتخاب کنید.'); }
  return face;
}

export function embeddedFontCss(data: string, custom: boolean): string {
  if (!isFontData(data)) throw new Error('دادهٔ فونت خروجی معتبر نیست.');
  return `@font-face{font-family:${custom ? customFamily : 'Vazirmatn'};src:url("${data}") format("${fontFormat(data)}");font-weight:100 900;}`;
}
