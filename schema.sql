-- Beat Saylor CTF - D1 Database Schema
-- Run this against your Cloudflare D1 database:
--   wrangler d1 execute beat-saylor-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  best_score REAL
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  strategy_text TEXT NOT NULL,
  execution_cost_bps REAL,
  execution_cost_usd REAL,
  annual_holding_cost_usd REAL,
  effective_price REAL,
  confidence REAL,
  feedback TEXT,
  strategy_summary TEXT,
  instruments TEXT,
  penalties TEXT,
  raw_ai_response TEXT,
  created_at INTEGER NOT NULL,
  score_vs_saylor REAL
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_score ON submissions(effective_price);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_users_best_score ON users(best_score);
