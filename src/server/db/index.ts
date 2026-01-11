import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { join } from "path";

// Get database path from environment or use default
const DB_PATH = process.env.DB_PATH || join(process.cwd(), "webui.db");

// Create SQLite connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrency (same as current implementation)
sqlite.run("PRAGMA journal_mode = WAL");

// Create drizzle instance
export const db = drizzle({ client: sqlite, schema });

// Export types
export type DatabaseType = typeof db;

// Run migrations
export function runMigrations(): void {
  try {
    migrate(db, { migrationsFolder: "./src/server/db/migrations" });
    console.log("✅ Migrations completed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Health check
export function checkDatabaseConnection(): boolean {
  try {
    const result = sqlite.query("SELECT 1").get();
    return result !== undefined;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Graceful shutdown
export function closeDatabaseConnection(): void {
  sqlite.close();
}

// Export the raw sqlite connection for compatibility if needed
export { sqlite };
