import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const app = express();
app.use(express.json({ limit: '2mb' }));
const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const cache = new Map<string, unknown>();
const pending = new Map<string, Promise<unknown>>();
const inputSchema = z.object({ expeditionId:z.string().min(1), note:z.string().max(8000), duration:z.number().int().positive().max(180), quests:z.array(z.object({title:z.string(),description:z.string(),category:z.string(),durationMinutes:z.number()})).max(5) });
const resultSchema = z.object({ reflection:z.string().max(500), pattern:z.string().max(180), tomorrowQuest:z.object({title:z.string().max(80),description:z.string().max(240),category:z.enum(['nature','sounds','people','places','making','care','observation']),durationMinutes:z.number().int().min(5).max(45)}) });
const categoryNames = {nature:'Nature',sounds:'Sounds',people:'People & Neighborhood',places:'Places',making:'Food & Making',care:'Care',observation:'Observation'} as const;
const fallback = {reflection:'You noticed something worth paying attention to. Tomorrow, choose one familiar route and look for something you have never noticed before.',pattern:'A small detail became a reason to slow down.',tomorrowQuest:{title:'Look Again',description:'Tomorrow, take a familiar route and notice one detail you have never really seen before.',category:'Observation',durationMinutes:15}};
app.post('/api/reflect', async (req,res) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error:'Invalid reflection request.'});
  const {expeditionId,note,duration,quests} = parsed.data;
  if (cache.has(expeditionId)) return res.json(cache.get(expeditionId));
  if (pending.has(expeditionId)) return res.json(await pending.get(expeditionId));
  const task=(async()=>{
    let result: z.infer<typeof resultSchema> = fallback;
    const key=process.env.GEMMA_API_KEY, model=process.env.GEMMA_MODEL;
    if (key && model && note.trim()) {
      try {
        const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),12000);
        const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
          method:'POST',signal:controller.signal,headers:{'content-type':'application/json','x-goog-api-key':key},
          body:JSON.stringify({systemInstruction:{parts:[{text:'You are Gemma, a thoughtful field-notebook reflection. Reflect only what the person actually observed. Identify one simple pattern and create one realistic outdoor observation for tomorrow. Encourage attention to the physical world. Never invent observations, identify species or people without evidence, offer generic wellness advice, encourage unsafe behavior, or suggest photographing strangers. Return concise valid JSON only. reflection <=80 words, pattern <=30 words, tomorrow description <=50 words. JSON keys are reflection, pattern, tomorrowQuest; tomorrowQuest has title, description, category (one of nature, sounds, people, places, making, care, observation, lowercase), and durationMinutes.'}]},contents:[{role:'user',parts:[{text:JSON.stringify({fieldNote:note.slice(0,4000),durationMinutes:duration,quests:quests.map(q=>q.title)})}]}],generationConfig:{responseMimeType:'application/json',temperature:0.55,maxOutputTokens:280}})
        }); clearTimeout(timer);
        if (!response.ok) throw new Error('Gemma request failed');
        const body=await response.json() as any;
        const text=body?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join('');
        const parsedResult=resultSchema.parse(JSON.parse(text));
        result={...parsedResult,tomorrowQuest:{...parsedResult.tomorrowQuest,category:categoryNames[parsedResult.tomorrowQuest.category]}};
      } catch { result=fallback; }
    }
    cache.set(expeditionId,result);
    return result;
  })();
  pending.set(expeditionId,task);
  const result=await task; pending.delete(expeditionId); res.json(result);
});
if (process.env.NODE_ENV==='production') { app.use(express.static(path.join(here,'dist'))); app.get('*',(req,res)=>res.sendFile(path.join(here,'dist','index.html'))); }
app.listen(port,()=>console.log(`OBSERVE server listening on ${port}`));
