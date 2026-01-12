import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";

export const githubRepos = sqliteTable("github_repos", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  // Store user_id as simple string (no FK) - better-auth manages users
  userId: text("user_id").notNull(),
  repoFullName: text("repo_full_name").notNull(),
  repoUrl: text("repo_url").notNull(),
  cloneUrl: text("clone_url").notNull(),
  localPath: text("local_path").notNull().unique(),
  branch: text("branch").notNull().default("main"),
  lastSynced: integer("last_synced", { mode: "timestamp" }),
  isPrivate: integer("is_private", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertGithubRepoSchema = createInsertSchema(githubRepos, {
  repoFullName: z.string().min(1).max(255),
  repoUrl: z.string().url(),
  cloneUrl: z.string().url(),
  localPath: z.string().min(1),
  branch: z.string().default("main"),
});

export const selectGithubRepoSchema = createSelectSchema(githubRepos);

export type GithubRepo = typeof githubRepos.$inferSelect;
export type InsertGithubRepo = typeof githubRepos.$inferInsert;
