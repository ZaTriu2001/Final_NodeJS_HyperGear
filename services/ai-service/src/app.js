import 'dotenv/config';
import { Product, publicProduct } from '@hypergear/core/models';
import { appBase, rateLimit, start } from '@hypergear/core/http';
import { integer, text, normalize, fail } from '@hypergear/core/validation';
import { buildPc } from './builder.js';
import { generateAnswer } from './gemini.js';
const app = appBase('ai-service');
app.get('/config', (_req,res)=>res.json({ geminiConfigured: Boolean(process.env.GEMINI_API_KEY), model: process.env.GEMINI_MODEL ?? 'gemini-flash-lite-latest' }));
app.post('/pc-builder', rateLimit(20), async (req,res)=> {
  const budget = integer(req.body.budget, 'Ngân sách', 1000000, 300000000), purpose = req.body.purpose ?? 'gaming';
  if (!['gaming','office','creative'].includes(purpose)) fail(400, 'Mục đích không hợp lệ.');
  const result = buildPc(await Product.find({ active: true, 'specs.role': { $exists: true } }).lean(), budget, purpose);
  result.parts = result.parts.map(p=>({ ...p, variant: (({ costPrice, ...v })=>v)(p.variant) }));
  const question = req.body.message ? text(req.body.message,'Yêu cầu',1,1000) : 'Giải thích ngắn vì sao bộ PC này phù hợp nhu cầu ' + purpose + ' và ngân sách.';
  res.json({ ...result, answer: result.available ? await generateAnswer(question, result) : null });
});
app.post('/chat', rateLimit(30), async (req,res)=> {
  const message = text(req.body.message, 'Câu hỏi', 2, 1000);
  const products = await Product.find({ active: true }).lean();
  const words = normalize(message).split(/\s+/).filter(w=>w.length>2);
  const ranked = products.map(p=>({p,score:words.filter(w=>normalize([p.name,p.category,p.brand,p.shortDescription].join(' ')).includes(w)).length})).sort((a,b)=>b.score-a.score || b.p.sold-a.p.sold);
  const sources = ranked.slice(0,6).map(({p})=>publicProduct(p));
  res.json({ answer: await generateAnswer(message, sources), sources, retrieval: 'mongodb-catalog' });
});
start(app, Number(process.env.PORT ?? 3005)).catch(error=>{console.error(error.message);process.exit(1);});
