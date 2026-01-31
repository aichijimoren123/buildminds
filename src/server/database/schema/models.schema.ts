import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Model Provider 表 - 存储 API 提供商配置
 * 例如：OpenAI, Anthropic, Azure, OpenRouter, 自定义等
 */
export const modelProviders = sqliteTable("model_providers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(), // 显示名称，如 "OpenAI", "Anthropic"
  slug: text("slug").notNull().unique(), // 唯一标识，如 "openai", "anthropic"
  baseUrl: text("base_url").notNull(), // API 基础 URL
  apiKey: text("api_key"), // API Key（加密存储更好，但先简单实现）
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertModelProviderSchema = createInsertSchema(modelProviders, {
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
});

export type ModelProvider = typeof modelProviders.$inferSelect;
export type InsertModelProvider = typeof modelProviders.$inferInsert;

/**
 * Model 表 - 存储具体模型配置
 */
export const models = sqliteTable("models", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  providerId: text("provider_id").notNull().references(() => modelProviders.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // 显示名称，如 "GPT-4o", "Claude 3.5 Sonnet"
  modelId: text("model_id").notNull(), // 实际发送到 API 的模型 ID，如 "gpt-4o", "claude-3-5-sonnet-20241022"
  description: text("description"), // 描述
  maxTokens: integer("max_tokens"), // 最大 token 数
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertModelSchema = createInsertSchema(models, {
  name: z.string().min(1).max(100),
  modelId: z.string().min(1).max(100),
  description: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
});

export type Model = typeof models.$inferSelect;
export type InsertModel = typeof models.$inferInsert;
