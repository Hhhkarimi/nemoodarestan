// Build fallback for restricted environments without child-process support.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
import * as esbuild from 'esbuild-wasm/esm/browser.js';
const require=createRequire(import.meta.url);
globalThis.self=globalThis;
const wasm=await WebAssembly.compile(await fs.readFile(require.resolve('esbuild-wasm/esbuild.wasm')));
await esbuild.initialize({wasmModule:wasm,worker:false});
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,'.');
const program=ts.createProgram(parsed.fileNames,parsed.options);
const diagnostics=ts.getPreEmitDiagnostics(program);
if(diagnostics.length){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'}));process.exit(1);}
async function existing(file){for(const f of [file,file+'.tsx',file+'.ts',file+'.js',file+'.mjs',path.join(file,'index.js')]){try{if((await fs.stat(f)).isFile())return f;}catch{}}throw new Error('Cannot resolve '+file);}
const output=await esbuild.build({entryPoints:{main:path.resolve('src/main.tsx')},bundle:true,minify:true,splitting:true,format:'esm',target:'es2022',outdir:'dist/assets',write:false,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'local-files',setup(build){build.onResolve({filter:/.*/},async args=>{args.resolveDir=args.importer?path.dirname(args.importer):process.cwd();if(args.path.startsWith('/fonts/'))return {path:args.path,external:true};if(args.path==='stream')return {path:'stream',namespace:'stub'};let file;if(args.path.startsWith('.')||path.isAbsolute(args.path))file=await existing(path.resolve(args.resolveDir||process.cwd(),args.path));else if(args.path==='exceljs')file=require.resolve('exceljs/dist/exceljs.min.js');else file=require.resolve(args.path,{paths:[args.resolveDir||process.cwd()]});return {path:file,namespace:'local'};});build.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export default {};',loader:'js'}));build.onLoad({filter:/.*/,namespace:'local'},async args=>({contents:await fs.readFile(args.path,'utf8'),loader:args.path.endsWith('.tsx')?'tsx':args.path.endsWith('.ts')?'ts':args.path.endsWith('.css')?'css':'js',resolveDir:path.dirname(args.path)}));}}]});
await fs.mkdir('dist/assets',{recursive:true});for(const file of output.outputFiles)await fs.writeFile(path.join(process.cwd(),'dist/assets',path.win32.basename(file.path)),file.contents);
await fs.cp('public','dist',{recursive:true});
await fs.writeFile('dist/index.html',(await fs.readFile('index.html','utf8')).replace('<script type="module" src="/src/main.tsx"></script>','<link rel="stylesheet" href="/assets/main.css"><script type="module" src="/assets/main.js"></script>'));
console.log('Portable production build passed.');



