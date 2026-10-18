import {validateRows} from '../series/model.ts';
import type {Row} from '../series/model.ts';
import {radialMatrix} from '../radial/data.ts';
import type {MotionKind} from './math.ts';
const normalize=(v:unknown):string=>String(v??'').trim().replace(/^\uFEFF/,'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c_-]/g,'').toLowerCase();
export function motionMatrix(matrix:unknown[][],kind:MotionKind):Row[]{
  if(kind==='circle-packing')return radialMatrix(matrix,'sunburst');
  const lines=matrix.filter(r=>r.some(c=>String(c??'').trim()!==''));if(!lines.length)throw Error('فایل داده خالی است.');
  const header=lines[0].map(normalize),xi=header.findIndex(h=>['دوره','زمان','تاریخ','سال','ماه','period','time','date','year','x'].includes(h)),gi=header.findIndex(h=>['گروه','نام','برند','دسته','group','name','brand','category','series'].includes(h)),vi=header.findIndex(h=>['مقدار','فروش','value','amount','sales'].includes(h));
  if(xi>=0&&gi<0&&vi<0&&header.length>1){
    const columns=lines[0].map((name,i)=>({name:String(name??'').trim(),i})).filter(c=>c.i!==xi&&c.name);
    if(new Set(columns.map(c=>c.name)).size!==columns.length)throw Error('نام ستون‌های گروه تکراری است.');
    const data=lines.slice(1).flatMap(r=>{const present=columns.filter(c=>String(r[c.i]??'').trim()!=='');if(!present.length)throw Error(`دورهٔ «${r[xi]}» هیچ مقداری ندارد؛ حداقل یک مقدار یا صفر ثبت کنید.`);return present.map(c=>({x:r[xi],group:c.name,value:r[c.i]}));});
    return validateRows(data,kind);
  }
  const hasHeader=xi>=0||gi>=0||vi>=0;if(hasHeader&&(xi<0||gi<0||vi<0))throw Error('ستون‌های دوره، گروه و مقدار لازم‌اند.');
  return validateRows((hasHeader?lines.slice(1):lines).map(r=>({x:r[hasHeader?xi:0],group:r[hasHeader?gi:1],value:r[hasHeader?vi:2]})),kind);
}
export function parseLogos(value:unknown):Record<string,string>{
  const logos:Record<string,string>={};
  if(value&&typeof value==='object')for(const [name,url] of Object.entries(value))if(name.length<=80&&!['__proto__','constructor','prototype'].includes(name)&&typeof url==='string'&&url.length<=700000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(url))logos[name]=url;
  if(Object.values(logos).reduce((n,v)=>n+v.length,0)>4*1024*1024)throw Error('مجموع لوگوها از ۳ مگابایت بیشتر است.');
  return logos;
}
export async function readLogo(file:File):Promise<string>{
  if(file.size>512*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('لوگو باید PNG، JPG یا WebP و حداکثر ۵۱۲ کیلوبایت باشد.');
  const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('خواندن لوگو ناموفق بود.'));reader.readAsDataURL(file);});
  const image=new Image();image.src=url;try{await image.decode();}catch{throw Error('فایل تصویر قابل خواندن نیست؛ یک لوگوی سالم انتخاب کنید.');}
  if(image.naturalWidth>4096||image.naturalHeight>4096)throw Error('ابعاد لوگو باید حداکثر ۴۰۹۶ پیکسل باشد.');
  return url;
}
