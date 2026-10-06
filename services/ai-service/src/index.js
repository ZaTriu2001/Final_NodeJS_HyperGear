import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

const app = express();
const port = Number(process.env.PORT ?? 3005);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '32kb' }));

app.get('/healthz', (_request, response) => {
  response.json({
    service: 'ai-service',
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    retrievalProvider: process.env.ELASTICSEARCH_URL ? 'elasticsearch' : 'not-configured',
  });
});

app.post('/pc-builder', (_request, response) => {
  response.status(501).json({
    message: 'RAG PC Builder thuộc giai đoạn 2: truy xuất catalog từ Elasticsearch, kiểm tra tương thích bằng rule engine, sau đó Gemini diễn giải đề xuất.',
  });
});

app.listen(port, () => console.log(`[ai-service] listening on port ${port}`));
