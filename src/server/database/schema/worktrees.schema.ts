import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";
import { githubRepos } from "./github-repos.schema";

/**
 * WorkTree 表 - 每个会话对应一个独立的 git worktree
 *
 * 关系: github_repos (Workspace) 1:N worktrees 1:1 claude_sessions
 */
export const worktrees = sqliteTable(
  "worktrees",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),

    // 关联到 github_repos (Workspace)
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => githubRepos.id, { onDelete: "cascade" }),

    // WorkTree 信息
    name: text("name").notNull(), // 任务名称
    branchName: text("branch_name").notNull(), // e.g., "buildminds/task-abc123"
    localPath: text("local_path").notNull(), // WorkTree 的绝对路径
    baseBranch: text("base_branch").notNull(), // 基于哪个分支创建

    // 状态: active | pending | merged | abandoned | archived
    status: text("status").notNull().default("active"),

    // 文件变更统计（JSON）
    changesStats: text("changes_stats"), // { added: 5, modified: 3, deleted: 1 }

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("worktrees_workspace_idx").on(table.workspaceId),
    index("worktrees_status_idx").on(table.status),
  ],
);

// Relations
export const worktreesRelations = relations(worktrees, ({ one }) => ({
  workspace: one(githubRepos, {
    fields: [worktrees.workspaceId],
    references: [githubRepos.id],
  }),
}));

// Types
export type WorkTree = typeof worktrees.$inferSelect;
export type InsertWorkTree = typeof worktrees.$inferInsert;

// WorkTree 状态类型
export type WorkTreeStatus =
  | "active" // 正在使用中
  | "pending" // 等待审批
  | "merged" // 已合并到主分支
  | "abandoned" // 已废弃
  | "archived"; // 已归档

// 文件变更统计类型
export interface ChangesStats {
  added: number;
  modified: number;
  deleted: number;
}
