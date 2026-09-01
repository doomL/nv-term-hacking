import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import scoreRoutes from './routes/scores.js';
import { setupSocketHandlers } from './socket/multiplayer.js';
import { pool } from './db/pool.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: [CLIENT_URL, 'http://localhost:5173'], credentials: true }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/scores', scoreRoutes);

const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    next();
    return;
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

setupSocketHandlers(io);

async function start() {
  // Wait for DB
  for (let i = 0; i < 30; i++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch {
      console.log('Waiting for database...');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const migrateSql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      difficulty VARCHAR(20) NOT NULL,
      score INTEGER NOT NULL,
      time_ms INTEGER NOT NULL,
      attempts_left INTEGER NOT NULL,
      won BOOLEAN NOT NULL DEFAULT true,
      mode VARCHAR(20) NOT NULL DEFAULT 'solo',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await pool.query(migrateSql);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(console.error);
