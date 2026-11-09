import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'solace_dev_secret_change_me';
export const JWT_EXPIRES_IN = '30d';

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}
