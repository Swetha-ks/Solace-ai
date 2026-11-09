import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import chatRoutes from './routes/chat.js';
import moodRoutes from './routes/moods.js';
import insightRoutes from './routes/insights.js';
import { hasGroqKey } from './groq.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'solace-ai-api',
    ai: hasGroqKey() ? 'groq' : 'fallback',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/insights', insightRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server]', err);
  res.status(500).json({ error: 'Something went wrong on our side.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Solace AI API running at http://localhost:${PORT}`);
  console.log(`  AI provider: ${hasGroqKey() ? 'Groq' : 'fallback (no GROQ_API_KEY)'}\n`);
});
