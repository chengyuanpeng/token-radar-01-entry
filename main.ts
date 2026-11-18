import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';
import { parseSnapshot, buildRadar, boardIssue, dataScript } from './lib/model.ts';

function fail(message:string, code:number):never { process.stderr.write(message+'\n'); process.exit(code); }
const args=process.argv.slice(2); let input='/input', output=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(let i=0;i<args.length;i++){
 if(args[i]==='--input'){if(!args[i+1])fail('--input requires a path',2);input=args[++i];}
 else if(args[i]==='--output'){if(!args[i+1])fail('--output requires a path',2);output=args[++i];}
 else fail(`Unknown argument: ${args[i]}`,2);
}
let inputFile=resolve(input);
try { if(statSync(inputFile).isDirectory())inputFile=join(inputFile,'snapshot.json'); }
catch { fail(`Missing input: ${inputFile}`,2); }
try { statSync(inputFile); } catch { fail(`Missing input: ${inputFile}`,2); }
const here=resolve(fileURLToPath(new URL('.',import.meta.url)));
const out=resolve(output);
function copyTree(src:string,dest:string):void{
 mkdirSync(dest,{recursive:true});
 for(const name of readdirSync(src).sort((a,b)=>a.localeCompare(b,'en'))){
  if(name.startsWith('.'))continue;
  const from=join(src,name), to=join(dest,name); const st=statSync(from);
  if(st.isDirectory())copyTree(from,to); else if(st.isFile())copyFileSync(from,to);
 }
}
try {
 const snapshot=parseSnapshot(readFileSync(inputFile,'utf8'));
 const {board,radar}=buildRadar(snapshot);
 const problem=boardIssue(board,snapshot); if(problem)fail(problem,1);
 mkdirSync(out,{recursive:true});
 writeFileSync(join(out,'board.json'),JSON.stringify({rows:board})+'\n');
 writeFileSync(join(out,'data.js'),dataScript(radar));
 for(const dir of ['dashboard','screenshots']){
  const source=join(here,dir); if(!statSync(source).isDirectory())fail(`Missing ${dir}/ directory`,1);
  copyTree(source,join(out,dir));
 }
 const shotDir=join(out,'screenshots');
 const shots=readdirSync(shotDir).filter(n=>statSync(join(shotDir,n)).isFile()).sort((a,b)=>a.localeCompare(b,'en'));
 if(shots.length<3)fail(`Fewer than 3 screenshots (${shots.length})`,1);
 for(const name of shots)if(!/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(name))fail(`Invalid screenshot name: ${name}`,1);
 const dossier=buildDossier(out,{text_max_bytes:65536,screenshots:{max:4,max_bytes:524288},dashboard:{max_files:400,max_bytes:4194304}});
 writeFileSync(join(out,'dossier.json'),dossier);
 process.stdout.write(`Built ${board.length} rows from ${snapshot.protocols.length} protocols; ${snapshot.watchlist.length} watchlist entries; output ${out}\n`);
} catch(e) { if((e as any)?.code===undefined)process.stderr.write(`${e instanceof Error?e.message:String(e)}\n`); process.exit(1); }
