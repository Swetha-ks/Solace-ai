import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function ownsConversation(userId, conversationId) {
  return db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(conversationId, userId);
}

// GET /api/conversations
router.get('/', (req, res) => {
  const conversations = db
    .prepare(
      `SELECT
         c.id,
         c.title,
         c.created_at,
         c.updated_at,
         (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
         (SELECT content FROM messages m WHERE m.conversation_id = c.id
            ORDER BY m.id DESC LIMIT 1) AS last_message
       FROM conversations c
       WHERE c.user_id = ?
       ORDER BY datetime(c.updated_at) DESC, c.id DESC`
    )
    .all(req.user.id);

  res.json({ conversations });
});

// POST /api/conversations
router.post('/', (req, res) => {
  const title = req.body?.title?.trim() || 'New conversation';
  const info = db
    .prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)')
    .run(req.user.id, title);
  const conversation = db
    .prepare('SELECT * FROM conversations WHERE id = ?')
    .get(info.lastInsertRowid);
  res.status(201).json({ conversation });
});

// GET /api/conversations/:id
router.get('/:id', (req, res) => {
  const conversation = ownsConversation(req.user.id, req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

  const messages = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC')
    .all(conversation.id);

  res.json({ conversation, messages });
});

// PATCH /api/conversations/:id
router.patch('/:id', (req, res) => {
  const conversation = ownsConversation(req.user.id, req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

  const title = req.body?.title?.trim();
  if (!title) return res.status(400).json({ error: 'A title is required.' });

  db.prepare('UPDATE conversations SET title = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
    title,
    conversation.id
  );
  const updated = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversation.id);
  res.json({ conversation: updated });
});

// DELETE /api/conversations/:id
router.delete('/:id', (req, res) => {
  const conversation = ownsConversation(req.user.id, req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

  db.prepare('DELETE FROM conversations WHERE id = ?').run(conversation.id);
  res.json({ deleted: true, id: conversation.id });
});

export default router;
