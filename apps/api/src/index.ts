import {createServer} from 'node:http';
import {createApi} from './api.js';
const port=Number(process.env.PORT||3001);
const api=createApi();
createServer(api.handle).listen(port,()=>console.log(`Last Slice API listening on http://localhost:${port}${process.env.SUPABASE_URL?' (Supabase)':' (memory demo)'}`));
