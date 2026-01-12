#!/usr/bin/env bun
/**
 * Initialize database with required tables
 * Run this script: bun scripts/init-db.ts
 */

import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = process.env.DB_PATH || join(process.cwd(), "webui.db");

console.log(`Initializing database at: ${DB_PATH}`);

const db = new Database(DB_PATH, { create: true });

// Enable WAL mode for better concurrency
db.exec("PRAGMA journal_mode = WAL;");

// Create application tables (claude_sessions, messages, settings, github_repos)
const appTables = `
CREATE TABLE IF NOT EXISTS claude_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  claude_session_id TEXT,
  status TEXT DEFAULT 'idle' NOT NULL,
  cwd TEXT,
  allowed_tools TEXT,
  last_prompt TEXT,
  user_id TEXT,
  github_repo_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES claude_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS github_repos (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  clone_url TEXT NOT NULL,
  local_path TEXT NOT NULL,
  branch TEXT DEFAULT 'main' NOT NULL,
  last_synced INTEGER,
  is_private INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS github_repos_local_path_unique ON github_repos (local_path);
`;

try {
  db.exec(appTables);
  console.log("✓ Application tables created successfully");
} catch (error) {
  console.error("Error creating application tables:", error);
  process.exit(1);
}

// Better-auth will create its own tables (user, session, account, verification) automatically
console.log("✓ Database initialized");
console.log(
  "Note: Better-auth tables (user, session, account, verification) will be created automatically on first request",
);

db.close();
