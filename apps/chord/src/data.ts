export interface Flow { source: string; target: string; value: string; }
export function numberValue(value: string): number {
 return Number(value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[٬,\s]/g,'').replace('٫','.'));
}
export function parseCSV(text: string): Flow[] {
 const separator = text.split(/\r?\n/)[0].includes('\t') ? '\t' : ',';
 const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===separator&&!quoted){row.push(cell);cell='';}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted) throw new Error('علامت نقل‌قول در فایل بسته نشده است.');
 row.push(cell.replace(/\r$/,'')); if(row.some(c=>c.trim())) rows.push(row);
 const clean=rows.filter(r=>r.some(c=>c.trim()));
 if(clean[0]&&['source','مبدأ','مبدا'].includes(clean[0][0].replace(/^\uFEFF/,'').trim().toLowerCase()))clean.shift();
 if(clean.some(r=>r.length!==3))throw new Error('هر ردیف باید سه ستون مبدأ، مقصد و مقدار داشته باشد.');
 return clean.map(r=>({source:r[0].trim(),target:r[1].trim(),value:r[2].trim()}));
}
export function validate(flows: Flow[]): string {
 if(!flows.length)return 'برای رسم نمودار، حداقل یک ارتباط وارد کنید.';
 if(flows.length>1000)return 'حداکثر ۱۰۰۰ ارتباط پشتیبانی می‌شود.';
 for(const [i,f] of flows.entries())if(!f.source.trim()||!f.target.trim()||!f.value.trim()||!Number.isFinite(numberValue(f.value))||numberValue(f.value)<=0)return `ردیف ${new Intl.NumberFormat('fa').format(i+1)}: نام مبدأ و مقصد و مقدار مثبت لازم است.`;
 if(new Set(flows.flatMap(f=>[f.source.trim(),f.target.trim()])).size>60)return 'حداکثر ۶۰ گروه پشتیبانی می‌شود.';
 if(!Number.isFinite(flows.reduce((n,f)=>n+numberValue(f.value),0)))return 'مجموع مقدارها بیش از محدوده قابل نمایش است.';
 return '';
}
export function matrixFor(flows: Flow[]): {names:string[]; matrix:number[][]} {
 const names=[...new Set(flows.flatMap(f=>[f.source.trim(),f.target.trim()]))];
 const matrix=names.map(()=>names.map(()=>0));
 flows.forEach(f=>matrix[names.indexOf(f.source.trim())][names.indexOf(f.target.trim())]+=numberValue(f.value));
 return {names,matrix};
}
export function layoutMatrix(matrix:number[][],directed:boolean):number[][] {
 return directed?matrix:matrix.map((row,i)=>row.map((v,j)=>i===j?v:v+matrix[j][i]));
}
export const examples: Record<string,Flow[]>={
 'تبادل بین واحدها':[['فروش','تولید','۱۲۰'],['تولید','مالی','۸۰'],['مالی','فروش','۶۵'],['فروش','بازاریابی','۹۰'],['بازاریابی','پشتیبانی','۴۵'],['پشتیبانی','فروش','۵۵'],['تولید','پشتیبانی','۷۰'],['مالی','بازاریابی','۳۵'],['بازاریابی','تولید','۶۰']].map(([source,target,value])=>({source,target,value})),
 'جابه‌جایی مسافران':[['تهران','شیراز','۳۲۰'],['شیراز','اصفهان','۱۸۰'],['اصفهان','تهران','۲۶۰'],['مشهد','تهران','۲۱۰'],['تهران','مشهد','۱۷۰'],['شیراز','مشهد','۹۵']].map(([source,target,value])=>({source,target,value})),
 'گردش مواد':[['مواد اولیه','تولید','۵۰۰'],['تولید','بسته‌بندی','۳۸۰'],['تولید','بازیافت','۱۲۰'],['بازیافت','مواد اولیه','۸۵'],['بسته‌بندی','انبار','۳۶۰']].map(([source,target,value])=>({source,target,value}))
};
