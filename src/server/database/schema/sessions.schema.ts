import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";
import { worktrees } from "./worktrees.schema";

// Rename to claude_sessions to avoid conflict with better-auth's session table
export const claudeSessions = sqliteTable("claude_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  title: text("title").notNull(),
  claudeSessionId: text("claude_session_id"),
  status: text("status").notNull().default("idle"), // "idle" | "running" | "completed" | "error"

  // WorkTree 关联 (1:1) - 每个会话对应一个独立的 git worktree
  worktreeId: text("worktree_id").references(() => worktrees.id, {
    onDelete: "set null",
  }),

  cwd: text("cwd"), // 保留向后兼容，新会话会从 worktree.localPath 获取
  allowedTools: text("allowed_tools"), // JSON string
  lastPrompt: text("last_prompt"),
  // Store user_id as simple string (no FK) - better-auth manages users
  userId: text("user_id"),
  githubRepoId: text("github_repo_id"), // 保留向后兼容
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Zod schemas for validation
export const insertClaudeSessionSchema = createInsertSchema(claudeSessions, {
  title: z.string().min(1).max(255),
  status: z.enum(["idle", "running", "completed", "error"]),
  cwd: z.string().optional(),
});

export const selectClaudeSessionSchema = createSelectSchema(claudeSessions);

export type ClaudeSession = typeof claudeSessions.$inferSelect;
export type InsertClaudeSession = typeof claudeSessions.$inferInsert;

// Keep legacy names for backward compatibility in code
export const sessions = claudeSessions;
export const insertSessionSchema = insertClaudeSessionSchema;
export const selectSessionSchema = selectClaudeSessionSchema;
export type Session = ClaudeSession;
export type InsertSession = InsertClaudeSession;
