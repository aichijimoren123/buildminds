import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sessions } from "./sessions.schema";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  data: text("data").notNull(), // JSON string - use JSON.stringify/parse
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Relations
export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ many }) => ({
  messages: many(messages),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
