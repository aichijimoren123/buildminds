#!/usr/bin/env bun
/**
 * Create Better Auth tables using Drizzle schema
 * Run with: bun run scripts/migrate-auth-tables.ts
 */

import Database from "bun:sqlite";
import { resolve } from "path";

const dbPath = process.env.DB_PATH || resolve(process.cwd(), "webui.db");
const db = new Database(dbPath);

console.log("Creating Better Auth tables in:", dbPath);

const sql = `
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" integer DEFAULT false NOT NULL,
  "image" text,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user" ("email");

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" integer NOT NULL,
  "token" text NOT NULL,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session" ("token");
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("user_id");

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" integer,
  "refresh_token_expires_at" integer,
  "scope" text,
  "password" text,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("user_id");

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" integer NOT NULL,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);

CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
`;

try {
  db.exec(sql);
  console.log("✅ Better Auth tables created successfully!");

  // Verify tables were created
  const tables = db
    .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();
  console.log("\nAll tables in database:");
  tables.forEach((t: any) => console.log("  -", t.name));

  // Specifically check auth tables
  const authTables = db
    .query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('user', 'session', 'account', 'verification')",
    )
    .all();
  console.log("\nBetter Auth tables:");
  authTables.forEach((t: any) => console.log("  ✓", t.name));
} catch (error) {
  console.error("❌ Error creating tables:", error);
  process.exit(1);
} finally {
  db.close();
}
