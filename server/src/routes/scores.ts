import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { difficulty, score, timeMs, attemptsLeft, won, mode } = req.body;
    if (!difficulty || score === undefined || timeMs === undefined) {
      res.status(400).json({ error: 'Missing fields' });
      return;
    }
    const result = await query(
      `INSERT INTO scores (user_id, difficulty, score, time_ms, attempts_left, won, mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user!.userId, difficulty, score, timeMs, attemptsLeft ?? 0, won ?? true, mode ?? 'solo'],
    );
    res.json({ score: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { difficulty, limit = '20' } = req.query;
    let sql = `
      SELECT s.*, u.username
      FROM scores s
      JOIN users u ON u.id = s.user_id
      WHERE s.won = true
    `;
    const params: unknown[] = [];
    if (difficulty) {
      params.push(difficulty);
      sql += ` AND s.difficulty = $${params.length}`;
    }
    params.push(Number(limit));
    sql += ` ORDER BY s.score DESC LIMIT $${params.length}`;

    const result = await query(sql, params);
    res.json({ scores: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.userId],
    );
    res.json({ scores: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

export default router;
