import { pool } from './pool.js';

const schema = `
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

CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_difficulty ON scores(difficulty);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
`;

async function migrate() {
  console.log('Running migrations...');
  await pool.query(schema);
  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
