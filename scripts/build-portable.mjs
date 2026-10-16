// Optional local builder for environments that cannot launch native compiler processes.
// The normal Vercel build uses each studio's original toolchain.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { root } from './run.mjs';
const require = createRequire(path.join(root,'apps/chord/package.json'));
const esbuild = await import(pathToFileURL(require.resolve('esbuild-wasm/esm/browser.js')).href);
globalThis.self = globalThis;
await esbuild.initialize({ worker:false, wasmModule: await WebAssembly.compile(await fs.readFile(require.resolve('esbuild-wasm/esbuild.wasm'))) });
const jobs = [{ id:null, directory:root, entry:'src/main.ts' }, ...JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8')).map(c=>({id:c.id,directory:path.join(root,c.directory),entry:`src/main.${['voronoi','iran-map'].includes(c.id)?'tsx':'ts'}`}))];
for (const job of jobs) {
  const destination=job.id?path.join(root,'dist/studios',job.id):path.join(root,'dist');
  const localRequire=createRequire(path.join(job.directory,'package.json'));
  const plugin={name:'portable-files',setup(build){
    build.onResolve({filter:/.*/},async args=>{
      if(args.path.startsWith('/fonts/')) return {path:(job.id?`/studios/${job.id}`:'')+args.path,external:true};
      if(args.path==='stream')return {path:'stream',namespace:'empty'};
      const base=args.importer?path.dirname(args.importer):job.directory;
      let file;
      if(args.path==='exceljs')file=localRequire.resolve('exceljs/dist/exceljs.min.js');
      else if(args.path==='xlsx')file=localRequire.resolve('xlsx/dist/xlsx.full.min.js');
      else if(args.path.startsWith('.')||path.isAbsolute(args.path)){
        const raw=path.resolve(base,args.path);
        for(const candidate of [raw,...['.ts','.tsx','.js','.mjs','.json','/index.js'].map(ext=>raw+ext)]){try{if((await fs.stat(candidate)).isFile()){file=candidate;break}}catch{}}
      } else file=localRequire.resolve(args.path,{paths:[base]});
      if(!file)throw new Error(`Cannot resolve ${args.path} from ${base}`);
      return {path:file,namespace:'local'};
    });
    build.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export default {};',loader:'js'}));
    build.onLoad({filter:/.*/,namespace:'local'},async args=>{
      const ext=path.extname(args.path);
      const loader={'.ts':'ts','.tsx':'tsx','.js':'js','.mjs':'js','.cjs':'js','.css':'css','.json':'json','.woff2':'file','.woff':'file','.ttf':'file','.svg':'file'}[ext];
      if(!loader)throw new Error(`Missing loader for ${ext}: ${args.path}`);
      return {contents:await fs.readFile(args.path),loader,resolveDir:path.dirname(args.path)};
    });
  }};
  const result=await esbuild.build({entryPoints:[path.join(job.directory,job.entry)],bundle:true,minify:true,format:'esm',splitting:true,target:'es2022',outdir:'/out',entryNames:'app',assetNames:'[name]-[hash]',write:false,define:{'process.env.NODE_ENV':'"production"'},plugins:[plugin]});
  for(const file of result.outputFiles){await fs.mkdir(path.join(destination,'assets'),{recursive:true});await fs.writeFile(path.join(destination,'assets',path.posix.basename(file.path)),file.contents)}
  const publicPath=path.join(job.directory,'public');
  try{await fs.cp(publicPath,destination,{recursive:true})}catch(e){if(e.code!=='ENOENT')throw e}
  let html=await fs.readFile(path.join(job.directory,'index.html'),'utf8');
  const base=job.id?`/studios/${job.id}/`:'/';
  html=html.replace(/<script type="module" src="\/src\/main\.tsx?"><\/script>/,`<link rel="stylesheet" href="${base}assets/app.css"><script type="module" src="${base}assets/app.js"></script>`);
  if(job.id)html=html.replaceAll('href="/favicon.svg"',`href="${base}favicon.svg"`);
  await fs.writeFile(path.join(destination,'index.html'),html);
  console.log(`Built ${job.id||'gallery'}`);
}
