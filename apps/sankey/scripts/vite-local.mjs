// Avoid querying mapped network drives; this project uses ordinary local paths.
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
const originalExec=childProcess.exec;
childProcess.exec=function(command,...args){if(command==='net use'){const callback=args.at(-1);queueMicrotask(()=>callback(new Error('Network drive lookup is unnecessary for this local checkout'),''));return {}}return originalExec.call(this,command,...args)};
syncBuiltinESMExports();
const {build}=await import('vite');
const ts=await import('typescript');
await build({esbuild:false,build:{minify:false,cssMinify:false,rollupOptions:{output:{inlineDynamicImports:true}}},plugins:[{name:'local-typescript',transform(code,id){if(id.endsWith('.ts')&&!id.includes('node_modules'))return {code:ts.default.transpileModule(code,{compilerOptions:{target:ts.default.ScriptTarget.ES2022,module:ts.default.ModuleKind.ESNext}}).outputText,map:null}}}]});
process.exit(0);
