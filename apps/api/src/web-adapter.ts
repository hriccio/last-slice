import {Buffer} from 'node:buffer';
import type {createApi} from './api.js';

// The API owns validation and response shapes; this only translates HTTP transports.
export async function webResponse(api:ReturnType<typeof createApi>,request:Request):Promise<Response>{
 const url=new URL(request.url);
 const headers=new Headers();let status=200;let output='';
 const req={method:request.method,url:url.pathname+url.search,headers:Object.fromEntries(request.headers),socket:{remoteAddress:'unknown'},
  async *[Symbol.asyncIterator](){
   const reader=request.body?.getReader();if(!reader)return;
   try{while(true){const {done,value}=await reader.read();if(done)return;yield Buffer.from(value);}}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  }};
 const res={setHeader(name:string,value:string){headers.set(name,value);},
  writeHead(code:number,values:Record<string,string>){status=code;for(const [name,value]of Object.entries(values))headers.set(name,value);},
  end(value?:string){output=value??'';}};
 await api.handle(req,res);
 return new Response(status===204?null:output,{status,headers});
}
