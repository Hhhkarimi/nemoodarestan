import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const base=resolve('dist');
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.svg':'image/svg+xml'};
const port=Number(process.env.PORT||4173);
createServer(async(req,res)=>{try{const path=resolve(base,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(path!==base&&!path.startsWith(base+sep)){res.writeHead(403);res.end();return;}const file=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Chord Studio: http://127.0.0.1:${port}`));
