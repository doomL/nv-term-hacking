import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { authMiddleware, signToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Missing fields' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password too short' });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query<{ id: number; username: string }>(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
      [username, email, hash],
    );
    const user = result.rows[0];
    const token = signToken({ userId: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Missing fields' });
      return;
    }
    const result = await query<{ id: number; username: string; password_hash: string }>(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signToken({ userId: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: { id: req.user!.userId, username: req.user!.username } });
});

export default router;
