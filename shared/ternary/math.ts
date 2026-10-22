import type { Row,Settings } from '../series/model.ts';
export interface TernaryPoint {row:Row;a:number;b:number;c:number;sum:number}
export const ternaryOrders=['abc','acb','bac','bca','cab','cba'];
export function validateTernaryRows(input:unknown,number:(v:unknown)=>number):Row[]{
  if(!Array.isArray(input)||!input.length||input.length>500)throw Error('بین ۱ تا ۵۰۰ مشاهده لازم است.');
  const names=new Set<string>();
  const rows=input.map((raw,i)=>{
    if(!raw||typeof raw!=='object')throw Error(`ردیف ${i+1} معتبر نیست.`);
    const r=raw as Record<string,unknown>,x=String(r.x??r.name??r.label??`مشاهدهٔ ${i+1}`).trim(),group=String(r.group??r.category??'همه').trim(),value=number(r.value??r.a??r.A),second=number(r.second??r.b??r.B),third=number(r.third??r.c??r.C),size=number(String(r.size??'').trim()===''?1:r.size);
    if(!x||x.length>80||!group||group.length>80||names.has(x))throw Error(`ردیف ${i+1}: نام مشاهده باید یکتا و نام و گروه بین ۱ تا ۸۰ حرف باشند.`);names.add(x);
    if([value,second,third,size].some(v=>!Number.isFinite(v)||v<0||v>1e12))throw Error(`ردیف ${i+1}: سه مؤلفه و اندازه باید عدد نامنفی تا یک تریلیون باشند؛ مقدار خالی پذیرفته نمی‌شود.`);
    if(value+second+third<=0)throw Error(`ردیف ${i+1}: مجموع سه مؤلفه باید مثبت باشد.`);
    return {x,group,value,second,third,size};
  });
  if(new Set(rows.map(r=>r.group)).size>24)throw Error('حداکثر ۲۴ گروه رنگی مجاز است.');return rows;
}
export function ternaryPoints(rows:Row[],normalize=true):TernaryPoint[]{
  return rows.map(row=>{
    const sum=row.value+row.second!+row.third!;
    if(!normalize&&Math.abs(sum-100)>1e-6)throw Error(`مجموع مؤلفه‌های «${row.x}» برابر ۱۰۰ نیست؛ نرمال‌سازی خودکار را روشن کنید یا داده را اصلاح کنید.`);
    return {row,sum,a:row.value/sum,b:row.second!/sum,c:row.third!/sum};
  });
}
export function ternaryPosition(a:number,b:number,c:number,side:number,order='abc'):{x:number;y:number}{
  const sum=a+b+c,values:Record<string,number>={a:a/sum,b:b/sum,c:c/sum},p=[...order].map(key=>values[key]);
  return {x:side*(p[0]/2+p[2]),y:side*Math.sqrt(3)/2*(p[1]+p[2])};
}
export function validateTernarySettings(rows:Row[],s:Settings):void{
  const names=[s.ternaryA,s.ternaryB,s.ternaryC].map(v=>v.trim());
  if(names.some(v=>!v)||new Set(names).size!==3)throw Error('نام سه مؤلفه باید غیرخالی و متفاوت باشد.');ternaryPoints(rows,s.ternaryNormalize);
}
export function ternarySamples(alternative=false):Row[]{
  const groups=alternative?['شمال','مرکز','جنوب']:['اقتصادی','میان‌رده','حرفه‌ای'];
  return Array.from({length:18},(_,i)=>{
    const a=10+(i*17)%61,b=8+(i*11)%Math.max(10,88-a),c=100-a-b;
    return {x:(alternative?'منطقهٔ ':'محصول ')+['آوا','باران','چکاد','دریا','راستا','سپهر','شایا','فرات','کارن','مانا','نوین','هامون','آرمان','بهار','پارس','تابان','سرو','مهتاب'][i],group:groups[i%3],value:a,second:b,third:c,size:20+(i*43)%240};
  });
}
