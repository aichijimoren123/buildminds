import { Database } from "bun:sqlite";
import { join } from "path";

// 打开数据库
const dbPath = process.env.DB_PATH || join(process.cwd(), "webui.db");
const db = new Database(dbPath, { create: true });

// 启用外键约束
db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");

console.log("Applying migrations...");

try {
  // 创建 users 表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      github_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      email TEXT,
      avatar_url TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  console.log("✓ Created users table");

  // 创建 github_repos 表
  db.run(`
    CREATE TABLE IF NOT EXISTS github_repos (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      repo_full_name TEXT NOT NULL,
      repo_url TEXT NOT NULL,
      clone_url TEXT NOT NULL,
      local_path TEXT NOT NULL UNIQUE,
      branch TEXT DEFAULT 'main' NOT NULL,
      last_synced INTEGER,
      is_private INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log("✓ Created github_repos table");

  // 检查 sessions 表是否需要添加新列
  const tableInfo = db.prepare("PRAGMA table_info(sessions)").all();
  const columns = tableInfo.map((col: any) => col.name);

  if (!columns.includes("user_id")) {
    db.run("ALTER TABLE sessions ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
    console.log("✓ Added user_id column to sessions");
  }

  if (!columns.includes("github_repo_id")) {
    db.run("ALTER TABLE sessions ADD COLUMN github_repo_id TEXT REFERENCES github_repos(id) ON DELETE SET NULL");
    console.log("✓ Added github_repo_id column to sessions");
  }

  console.log("\n✅ All migrations applied successfully!");
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
} finally {
  db.close();
}
