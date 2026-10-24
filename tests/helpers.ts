import {createServer,type Server} from 'node:http';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
export async function listen(server:Server){server.listen(0,'127.0.0.1');await once(server,'listening');return (server.address() as {port:number}).port;}
export async function startApi(t:any,env:Record<string,string>={}){
 const reservation=createServer();const port=await listen(reservation);await new Promise<void>(r=>reservation.close(()=>r()));
 const child=spawn(process.execPath,['--import','tsx','apps/api/src/index.ts'],{env:{...process.env,NODE_ENV:'test',PORT:String(port),SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',ASSISTANT_PROVIDER:'fake',KITCHEN_MODE:'manual',...env},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 t.after(async()=>{if(child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}});
 for(let i=0;i<400;i++){if(output.includes('API listening'))return `http://127.0.0.1:${port}`;if(child.exitCode!==null)throw new Error(output);await pause(25);}throw new Error('API start timed out');
}
export async function sqlDatabase(){
 const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');
 for(const file of (await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort()){
  const sql=(await readFile(`supabase/migrations/${file}`,'utf8')).replace('create extension if not exists pgcrypto;','');
  await db.exec(sql);
 }
 return db;
}
export async function rpcFixture(t:any,db:PGlite){
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url!,'http://localhost');let result:unknown;
   if(url.pathname.startsWith('/rest/v1/rpc/')){
    let raw='';for await(const chunk of req)raw+=chunk;const input=JSON.parse(raw);const name=url.pathname.split('/').at(-1)!;
    const keys=Object.keys(input);const placeholders=keys.map((k,i)=>`${k}=>$${i+1}`).join(',');
    if(!/^[a-z_]+$/.test(name)||keys.some(k=>!/^p_[a-z_]+$/.test(k)))throw new Error('bad RPC');
    const rows=await db.query(`select public.${name}(${placeholders}) value`,Object.values(input));result=(rows.rows[0] as any).value;
   }else if(url.pathname==='/rest/v1/demo_menu'){result=(await db.query('select * from demo_menu where available')).rows;}
   else throw new Error('Unexpected fixture route');
   res.setHeader('content-type','application/json');res.end(JSON.stringify(result));
  }catch{res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({code:'fixture_failure',message:'fixture failure'}));}
 });
 const port=await listen(server);t.after(()=>new Promise<void>(r=>server.close(()=>r())));return `http://127.0.0.1:${port}`;
}
