import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  title: text("title").notNull(),
  claudeSessionId: text("claude_session_id"),
  status: text("status").notNull().default("idle"), // "idle" | "running" | "completed" | "error"
  cwd: text("cwd"),
  allowedTools: text("allowed_tools"), // JSON string
  lastPrompt: text("last_prompt"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Zod schemas for validation
export const insertSessionSchema = createInsertSchema(sessions, {
  title: z.string().min(1).max(255),
  status: z.enum(["idle", "running", "completed", "error"]),
  cwd: z.string().optional(),
});

export const selectSessionSchema = createSelectSchema(sessions);

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
