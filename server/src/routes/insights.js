import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const AFFIRMATIONS = [
  'I am allowed to rest without earning it.',
  'My feelings are valid, even the messy ones.',
  'I am doing better than I think I am.',
  'I can take this one gentle breath at a time.',
  'I deserve the same kindness I give to others.',
  'I am not behind. I am exactly where I need to be.',
  'Small steps still move me forward.',
  'I am safe to feel and safe to heal.',
  'I choose progress over perfection today.',
  'My worth is not measured by my productivity.',
  'I can ask for help and still be strong.',
  'Today, I will speak to myself like someone I love.',
  'I am allowed to begin again.',
  'Peace is something I can practise, not chase.',
];

function currentStreak(userId) {
  const dates = db
    .prepare(
      'SELECT DISTINCT date(created_at) AS d FROM moods WHERE user_id = ? ORDER BY d DESC'
    )
    .all(userId)
    .map((row) => row.d);

  if (!dates.length) return 0;

  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const isToday = (iso) => new Date(`${iso}T00:00:00Z`).getTime() === today.getTime();
  const isYesterday = (iso) =>
    new Date(`${iso}T00:00:00Z`).getTime() === today.getTime() - dayMs;

  // The streak can start today or yesterday; otherwise it is broken.
  if (!isToday(dates[0]) && !isYesterday(dates[0])) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i += 1) {
    const prev = new Date(`${dates[i - 1]}T00:00:00Z`).getTime();
    const curr = new Date(`${dates[i]}T00:00:00Z`).getTime();
    if (prev - curr === dayMs) streak += 1;
    else break;
  }
  return streak;
}

// GET /api/insights
router.get('/', (req, res) => {
  const userId = req.user.id;

  const totalCheckIns = db
    .prepare('SELECT COUNT(*) AS n FROM moods WHERE user_id = ?')
    .get(userId).n;

  const moodCounts = db
    .prepare(
      'SELECT mood, COUNT(*) AS count FROM moods WHERE user_id = ? GROUP BY mood ORDER BY count DESC'
    )
    .all(userId);

  const last7Days = db
    .prepare(
      `SELECT date(created_at) AS date, mood
       FROM moods
       WHERE user_id = ? AND created_at >= datetime('now', '-6 days')
       ORDER BY date ASC`
    )
    .all(userId);

  const latest = db
    .prepare('SELECT * FROM moods WHERE user_id = ? ORDER BY id DESC LIMIT 1')
    .get(userId);

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );

  res.json({
    streak: currentStreak(userId),
    totalCheckIns,
    moodCounts,
    last7Days,
    latestMood: latest || null,
    affirmation: AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length],
  });
});

export default router;
