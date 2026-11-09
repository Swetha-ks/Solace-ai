import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { chatCompletion, parseJsonReply } from '../groq.js';
import { buildSystemPrompt, toGroqMessages, fallbackReply, stripEmoji } from '../prompt.js';

const router = Router();
router.use(requireAuth);

const ACTIVITIES = new Set(['breathing', 'journal', 'affirmation', 'chat', 'none']);

function normalizeActivity(value) {
  return ACTIVITIES.has(value) ? value : 'none';
}

// POST /api/chat
// Send a message and receive Solace's reply. Creates a conversation if none
// is supplied, and stores both sides of the exchange in SQLite.
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { conversationId, message, mood, language } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'A message is required.' });
  }

  let conversation;
  let isNewConversation = false;

  if (conversationId) {
    conversation = db
      .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
      .get(conversationId, userId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
  } else {
    const info = db
      .prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)')
      .run(userId, 'New conversation');
    conversation = db
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .get(info.lastInsertRowid);
    isNewConversation = true;
  }

  const userInfo = db
    .prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
    .run(conversation.id, 'user', message.trim());

  const storedMessages = db
    .prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC')
    .all(conversation.id)
    .slice(-24);

  const latestMood =
    mood ||
    db
      .prepare('SELECT mood FROM moods WHERE user_id = ? ORDER BY id DESC LIMIT 1')
      .get(userId)?.mood;

  const recentMoods = db
    .prepare('SELECT mood FROM moods WHERE user_id = ? ORDER BY id DESC LIMIT 5')
    .all(userId)
    .map((row) => row.mood);

  const systemPrompt = buildSystemPrompt({
    user: req.user,
    mood: latestMood,
    recentMoods,
    isNewConversation,
    language,
  });

  let result;
  let provider = 'groq';

  try {
    const raw = await chatCompletion({
      messages: toGroqMessages(systemPrompt, storedMessages),
      temperature: 0.75,
      maxTokens: 900,
      json: true,
    });

    const parsed = parseJsonReply(raw);
    if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) {
      result = {
        reply: stripEmoji(parsed.reply),
        suggestedActivity: normalizeActivity(parsed.suggestedActivity),
        affirmation:
          typeof parsed.affirmation === 'string' ? stripEmoji(parsed.affirmation) : '',
        title: typeof parsed.title === 'string' ? stripEmoji(parsed.title) : '',
      };
    } else if (raw.trim()) {
      result = { reply: stripEmoji(raw), suggestedActivity: 'none', affirmation: '', title: '' };
    } else {
      throw new Error('Empty AI response');
    }
  } catch (error) {
    console.error('[chat] AI request failed:', error.message);
    provider = 'fallback';
    result = fallbackReply(message, { name: req.user?.name, mood: latestMood });
  }

  const assistantInfo = db
    .prepare(
      'INSERT INTO messages (conversation_id, role, content, suggested_activity) VALUES (?, ?, ?, ?)'
    )
    .run(conversation.id, 'assistant', result.reply, result.suggestedActivity);

  const finalTitle =
    isNewConversation && result.title ? result.title.slice(0, 60) : conversation.title;

  db.prepare(
    "UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(finalTitle, conversation.id);

  const userMessage = db
    .prepare('SELECT * FROM messages WHERE id = ?')
    .get(userInfo.lastInsertRowid);
  const assistantMessage = db
    .prepare('SELECT * FROM messages WHERE id = ?')
    .get(assistantInfo.lastInsertRowid);

  res.json({
    provider,
    conversation: { ...conversation, title: finalTitle },
    userMessage,
    assistantMessage,
    affirmation: result.affirmation,
  });
});

export default router;
