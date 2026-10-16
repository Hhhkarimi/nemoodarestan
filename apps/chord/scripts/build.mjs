import * as esbuild from 'esbuild-wasm/esm/browser.js';
import {mkdir,readFile,writeFile,stat,cp} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,dirname,extname,isAbsolute,basename} from 'node:path';
globalThis.self=globalThis;
const require=createRequire(import.meta.url);
await esbuild.initialize({worker:false,wasmModule:await WebAssembly.compile(await readFile(require.resolve('esbuild-wasm/esbuild.wasm')))});
await mkdir('dist',{recursive:true});
const filePlugin={name:'local-files',setup(build){
 build.onResolve({filter:/.*/},async args=>{
  let path;
  if(args.kind==='entry-point')path=resolve(args.path);
  else if(args.path.startsWith('.')||isAbsolute(args.path))path=resolve(dirname(args.importer),args.path);
  else path=require.resolve(args.path,{paths:[dirname(args.importer)]});
  for(const suffix of ['', '.ts','.js','.css']){try{if((await stat(path+suffix)).isFile())return {path:path+suffix,namespace:'local'};}catch{}}
  throw new Error('Cannot resolve '+args.path);
 });
 build.onLoad({filter:/.*/,namespace:'local'},async args=>{const ext=extname(args.path);const loader={'.ts':'ts','.js':'js','.css':'css','.woff':'file','.woff2':'file','.ttf':'file'}[ext];return {contents:await readFile(args.path),loader,resolveDir:dirname(args.path)};});
}};
const result=await esbuild.build({entryPoints:['src/main.ts'],bundle:true,outdir:'dist/assets',entryNames:'app',assetNames:'[name]-[hash]',minify:true,sourcemap:false,target:'es2022',write:false,plugins:[filePlugin]});
for(const file of result.outputFiles){const output=resolve('dist/assets',basename(file.path));await mkdir(dirname(output),{recursive:true});await writeFile(output,file.contents);}
const html=await readFile('index.html','utf8');
await writeFile('dist/index.html',html.replace('<script type="module" src="/src/main.ts"></script>','<link rel="stylesheet" href="./assets/app.css"><script type="module" src="./assets/app.js"></script>'));
await cp('licenses','dist/licenses',{recursive:true});
console.log('Production build ready in dist/');

