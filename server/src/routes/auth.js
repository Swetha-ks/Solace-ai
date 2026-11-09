import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import db from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isGuest: Boolean(user.is_guest),
    createdAt: user.created_at,
  };
}

function issue(user) {
  return { token: signToken(user), user: publicUser(user) };
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name.trim(), normalizedEmail, passwordHash);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(issue(user));
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.trim().toLowerCase());

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  res.json(issue(user));
});

// POST /api/auth/guest
// Creates a throwaway account so someone can try the app instantly.
router.post('/guest', async (req, res) => {
  const { name } = req.body || {};
  const email = `guest-${randomUUID()}@solace.local`;
  const passwordHash = await bcrypt.hash(randomUUID(), 10);

  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, is_guest) VALUES (?, ?, ?, 1)')
    .run(name?.trim() || 'Friend', email, passwordHash);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(issue(user));
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(user) });
});

// PATCH /api/auth/me
// Lets someone soften the app around their own name.
router.patch('/me', requireAuth, (req, res) => {
  const name = String(req.body?.name || '').trim();

  if (!name) return res.status(400).json({ error: 'A name is required.' });
  if (name.length > 40) {
    return res.status(400).json({ error: 'Keep your name under 40 characters.' });
  }

  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

export default router;
