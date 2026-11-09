import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const ALLOWED = new Set(['joyful', 'calm', 'okay', 'tired', 'anxious']);

// POST /api/moods
router.post('/', (req, res) => {
  const { mood, note } = req.body || {};
  if (!ALLOWED.has(mood)) {
    return res.status(400).json({ error: 'Unknown mood.' });
  }

  const info = db
    .prepare('INSERT INTO moods (user_id, mood, note) VALUES (?, ?, ?)')
    .run(req.user.id, mood, note?.trim() || null);

  const saved = db.prepare('SELECT * FROM moods WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ mood: saved });
});

// GET /api/moods?limit=30
router.get('/', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 200);
  const moods = db
    .prepare('SELECT * FROM moods WHERE user_id = ? ORDER BY id DESC LIMIT ?')
    .all(req.user.id, limit);
  res.json({ moods });
});

// GET /api/moods/today
router.get('/today', (req, res) => {
  const mood = db
    .prepare(
      "SELECT * FROM moods WHERE user_id = ? AND date(created_at) = date('now') ORDER BY id DESC LIMIT 1"
    )
    .get(req.user.id);
  res.json({ mood: mood || null });
});

export default router;
