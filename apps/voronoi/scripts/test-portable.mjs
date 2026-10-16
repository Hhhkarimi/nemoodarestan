import ts from 'typescript';
import fs from 'node:fs/promises';
await fs.mkdir('.sites-runtime/tests',{recursive:true});
const transpile=(source)=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
await fs.writeFile('.sites-runtime/tests/fonts.mjs',transpile(await fs.readFile('src/fonts.ts','utf8')));
await fs.writeFile('.sites-runtime/tests/model.mjs',transpile((await fs.readFile('src/model.ts','utf8')).replace("'./fonts'","'./fonts.mjs'")));
for(const name of (await fs.readdir('tests')).filter(name=>name.endsWith('.test.ts'))){
  const source=(await fs.readFile('tests/'+name,'utf8')).replaceAll("'../src/model'","'./model.mjs'").replaceAll("'../src/fonts'","'./fonts.mjs'");
  const output=name.replace(/\.ts$/,'.mjs');
  await fs.writeFile('.sites-runtime/tests/'+output,transpile(source));
  await import('../.sites-runtime/tests/'+output);
}
