# Backend Architecture - Drizzle ORM + SQLite

## 🎯 技术栈

- **Runtime**: Bun
- **Web Framework**: Hono
- **Database**: SQLite (better-sqlite3)
- **ORM**: Drizzle ORM
- **Migration**: Drizzle Kit
- **Validation**: Zod
- **WebSocket**: Native Bun WebSocket

## 📦 依赖安装

```bash
# 核心依赖
bun add drizzle-orm better-sqlite3
bun add -d drizzle-kit @types/better-sqlite3

# 工具库
bun add zod
bun add nanoid  # 用于生成 ID
bun add date-fns
```

## 📁 项目结构

```
src/
├── server/
│   ├── index.ts                          # 服务器入口
│   ├── app.ts                            # Hono 应用配置
│   │
│   ├── config/                           # 配置管理
│   │   ├── index.ts                      # 配置入口
│   │   ├── database.config.ts            # 数据库配置
│   │   └── env.ts                        # 环境变量验证
│   │
│   ├── db/                               # 数据库相关
│   │   ├── index.ts                      # 数据库连接
│   │   ├── schema/                       # Drizzle Schema
│   │   │   ├── sessions.schema.ts
│   │   │   ├── messages.schema.ts
│   │   │   ├── settings.schema.ts
│   │   │   └── index.ts                  # 导出所有 schema
│   │   ├── migrations/                   # 自动生成的迁移文件
│   │   └── seed.ts                       # 种子数据
│   │
│   ├── repositories/                     # 数据访问层
│   │   ├── base.repository.ts            # 基础仓储
│   │   ├── session.repository.ts
│   │   ├── message.repository.ts
│   │   └── settings.repository.ts
│   │
│   ├── services/                         # 业务逻辑层
│   │   ├── session.service.ts
│   │   ├── claude.service.ts
│   │   ├── settings.service.ts
│   │   └── websocket.service.ts
│   │
│   ├── controllers/                      # 控制器层
│   │   ├── session.controller.ts
│   │   ├── settings.controller.ts
│   │   └── websocket.controller.ts
│   │
│   ├── routes/                           # 路由层
│   │   ├── index.ts
│   │   ├── session.routes.ts
│   │   └── settings.routes.ts
│   │
│   ├── middleware/                       # 中间件
│   │   ├── error-handler.ts
│   │   ├── logger.ts
│   │   ├── validation.ts
│   │   └── cors.ts
│   │
│   ├── validators/                       # Zod 验证器
│   │   ├── session.validator.ts
│   │   └── settings.validator.ts
│   │
│   ├── types/                           # 类型定义
│   │   ├── api.types.ts
│   │   ├── database.types.ts
│   │   └── events.types.ts
│   │
│   └── utils/                           # 工具函数
│       ├── logger.ts
│       ├── errors.ts
│       └── helpers.ts
│
├── shared/                              # 前后端共享
│   └── types.ts
│
├── drizzle.config.ts                    # Drizzle 配置文件
└── package.json
```

## 🗄️ 数据库 Schema 设计

### 1. Sessions Table

```typescript
// src/server/db/schema/sessions.schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";

export const sessions = sqliteTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  title: text("title").notNull(),
  claudeSessionId: text("claude_session_id"),
  status: text("status").notNull().default("idle"), // "idle" | "running" | "completed" | "error"
  cwd: text("cwd"),
  allowedTools: text("allowed_tools"), // JSON string
  lastPrompt: text("last_prompt"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
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
```

### 2. Messages Table

```typescript
// src/server/db/schema/messages.schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sessions } from "./sessions.schema";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";

export const messages = sqliteTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  data: text("data").notNull(), // JSON string - use JSON.stringify/parse
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
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
```

### 3. Settings Table

```typescript
// src/server/db/schema/settings.schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertSettingSchema = createInsertSchema(settings, {
  key: z.string().min(1).max(255),
  value: z.string(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
```

### 4. Schema Index

```typescript
// src/server/db/schema/index.ts
export * from "./sessions.schema";
export * from "./messages.schema";
export * from "./settings.schema";
```

## ⚙️ 配置文件

### 1. Drizzle 配置

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_PATH || "./webui.db",
  },
  verbose: true,
  strict: true,
});
```

### 2. 环境变量验证

```typescript
// src/server/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().transform(Number).default("10086"),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("*"),

  // Database
  DB_PATH: z.string().default("./webui.db"),

  // Claude
  ANTHROPIC_AUTH_TOKEN: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  ANTHROPIC_DEFAULT_SONNET_MODEL: z.string().optional(),
  ANTHROPIC_DEFAULT_OPUS_MODEL: z.string().optional(),
  ANTHROPIC_DEFAULT_HAIKU_MODEL: z.string().optional(),
  API_TIMEOUT_MS: z.string().transform(Number).default("600000"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
```

### 3. 数据库连接

```typescript
// src/server/db/index.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { env } from "../config/env";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

// Create SQLite connection
const sqlite = new Database(env.DB_PATH);

// Enable WAL mode for better concurrency
sqlite.pragma("journal_mode = WAL");

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

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
    const result = sqlite.prepare("SELECT 1").get();
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
```

## 📊 Repository Layer

### Base Repository

```typescript
// src/server/repositories/base.repository.ts
import type { DatabaseType } from "../db";

export abstract class BaseRepository {
  constructor(protected db: DatabaseType) {}

  protected handleError(error: unknown, operation: string): never {
    console.error(`Repository error in ${operation}:`, error);
    throw new Error(`Database operation failed: ${operation}`);
  }
}
```

### Session Repository

```typescript
// src/server/repositories/session.repository.ts
import { eq, desc, and, inArray, isNotNull } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { sessions, type Session, type InsertSession } from "../db/schema";

export class SessionRepository extends BaseRepository {
  async create(data: InsertSession): Promise<Session> {
    try {
      const [session] = await this.db.insert(sessions).values(data).returning();
      return session;
    } catch (error) {
      this.handleError(error, "create session");
    }
  }

  async findById(id: string): Promise<Session | null> {
    try {
      const [session] = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1);
      return session || null;
    } catch (error) {
      this.handleError(error, "find session by id");
    }
  }

  async findAll(): Promise<Session[]> {
    try {
      return await this.db
        .select()
        .from(sessions)
        .orderBy(desc(sessions.updatedAt));
    } catch (error) {
      this.handleError(error, "find all sessions");
    }
  }

  async findByStatus(status: string): Promise<Session[]> {
    try {
      return await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.status, status))
        .orderBy(desc(sessions.updatedAt));
    } catch (error) {
      this.handleError(error, "find sessions by status");
    }
  }

  async update(
    id: string,
    data: Partial<InsertSession>,
  ): Promise<Session | null> {
    try {
      const [updated] = await this.db
        .update(sessions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sessions.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      this.handleError(error, "update session");
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(sessions).where(eq(sessions.id, id));
      return result.count > 0;
    } catch (error) {
      this.handleError(error, "delete session");
    }
  }

  async getRecentCwds(limit = 8): Promise<string[]> {
    try {
      const result = await this.db
        .selectDistinct({ cwd: sessions.cwd })
        .from(sessions)
        .where(isNotNull(sessions.cwd))
        .orderBy(desc(sessions.updatedAt))
        .limit(limit);

      return result.map((r) => r.cwd).filter(Boolean) as string[];
    } catch (error) {
      this.handleError(error, "get recent cwds");
    }
  }
}
```

### Message Repository

```typescript
// src/server/repositories/message.repository.ts
import { eq, desc, and } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { messages, type Message, type InsertMessage } from "../db/schema";

export class MessageRepository extends BaseRepository {
  async create(data: InsertMessage): Promise<Message> {
    try {
      const [message] = await this.db.insert(messages).values(data).returning();
      return message;
    } catch (error) {
      this.handleError(error, "create message");
    }
  }

  async findBySessionId(sessionId: string): Promise<Message[]> {
    try {
      return await this.db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, sessionId))
        .orderBy(messages.createdAt);
    } catch (error) {
      this.handleError(error, "find messages by session");
    }
  }

  async deleteBySessionId(sessionId: string): Promise<number> {
    try {
      const result = await this.db
        .delete(messages)
        .where(eq(messages.sessionId, sessionId));
      return result.count;
    } catch (error) {
      this.handleError(error, "delete messages by session");
    }
  }

  async batchCreate(data: InsertMessage[]): Promise<Message[]> {
    try {
      return await this.db.insert(messages).values(data).returning();
    } catch (error) {
      this.handleError(error, "batch create messages");
    }
  }
}
```

### Settings Repository

```typescript
// src/server/repositories/settings.repository.ts
import { eq } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { settings, type Setting, type InsertSetting } from "../db/schema";

export class SettingsRepository extends BaseRepository {
  async get(key: string): Promise<string | null> {
    try {
      const [setting] = await this.db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);
      return setting?.value || null;
    } catch (error) {
      this.handleError(error, "get setting");
    }
  }

  async getAll(): Promise<Record<string, string>> {
    try {
      const allSettings = await this.db.select().from(settings);
      return allSettings.reduce(
        (acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        },
        {} as Record<string, string>,
      );
    } catch (error) {
      this.handleError(error, "get all settings");
    }
  }

  async set(key: string, value: string): Promise<Setting> {
    try {
      const [setting] = await this.db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() },
        })
        .returning();
      return setting;
    } catch (error) {
      this.handleError(error, "set setting");
    }
  }

  async setMany(data: Record<string, string>): Promise<void> {
    try {
      // Use transaction
      await this.db.transaction(async (tx) => {
        for (const [key, value] of Object.entries(data)) {
          await tx
            .insert(settings)
            .values({ key, value })
            .onConflictDoUpdate({
              target: settings.key,
              set: { value, updatedAt: new Date() },
            });
        }
      });
    } catch (error) {
      this.handleError(error, "set many settings");
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(settings)
        .where(eq(settings.key, key));
      return result.count > 0;
    } catch (error) {
      this.handleError(error, "delete setting");
    }
  }
}
```

## 🔧 Service Layer

### Configuration Service

```typescript
// src/server/services/config.service.ts
import { SettingsRepository } from "../repositories/settings.repository";
import { env } from "../config/env";

export class ConfigService {
  private static instance: ConfigService;
  private cachedSettings: Record<string, string> = {};

  private constructor(private settingsRepo: SettingsRepository) {}

  public static getInstance(settingsRepo: SettingsRepository): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService(settingsRepo);
    }
    return ConfigService.instance;
  }

  async load(): Promise<void> {
    this.cachedSettings = await this.settingsRepo.getAll();
    this.applyToEnv();
  }

  async reload(): Promise<void> {
    await this.load();
  }

  get(key: string): string | undefined {
    return this.cachedSettings[key] || process.env[key];
  }

  getAll(): Record<string, string> {
    return { ...this.cachedSettings };
  }

  async update(settings: Record<string, string>): Promise<void> {
    await this.settingsRepo.setMany(settings);
    await this.reload();
  }

  private applyToEnv(): void {
    for (const [key, value] of Object.entries(this.cachedSettings)) {
      if (value) {
        process.env[key] = value;
      }
    }
  }

  // Claude-specific getters
  get claudeAuthToken(): string | undefined {
    return this.get("ANTHROPIC_AUTH_TOKEN");
  }

  get claudeBaseUrl(): string | undefined {
    return this.get("ANTHROPIC_BASE_URL");
  }

  get claudeModel(): string | undefined {
    return this.get("ANTHROPIC_MODEL");
  }
}
```

### Session Service

```typescript
// src/server/services/session.service.ts
import { SessionRepository } from "../repositories/session.repository";
import { MessageRepository } from "../repositories/message.repository";
import { ClaudeService } from "./claude.service";
import type { InsertSession, Session } from "../db/schema";
import { NotFoundError } from "../utils/errors";

export class SessionService {
  constructor(
    private sessionRepo: SessionRepository,
    private messageRepo: MessageRepository,
    private claudeService: ClaudeService,
  ) {}

  async createSession(data: InsertSession): Promise<Session> {
    const session = await this.sessionRepo.create({
      ...data,
      status: "idle",
    });

    // Record initial prompt
    if (data.lastPrompt) {
      await this.messageRepo.create({
        sessionId: session.id,
        type: "user_prompt",
        data: { prompt: data.lastPrompt },
      });
    }

    return session;
  }

  async getSession(id: string): Promise<Session> {
    const session = await this.sessionRepo.findById(id);
    if (!session) {
      throw new NotFoundError(`Session not found: ${id}`);
    }
    return session;
  }

  async listSessions(): Promise<Session[]> {
    return await this.sessionRepo.findAll();
  }

  async getSessionHistory(id: string) {
    const session = await this.getSession(id);
    const messages = await this.messageRepo.findBySessionId(id);

    return {
      session,
      messages,
    };
  }

  async startSession(id: string, prompt: string): Promise<void> {
    const session = await this.getSession(id);

    // Update status
    await this.sessionRepo.update(id, {
      status: "running",
      lastPrompt: prompt,
    });

    // Record user prompt
    await this.messageRepo.create({
      sessionId: id,
      type: "user_prompt",
      data: { prompt },
    });

    // Start Claude
    await this.claudeService.run({
      sessionId: id,
      prompt,
      cwd: session.cwd,
      claudeSessionId: session.claudeSessionId,
    });
  }

  async stopSession(id: string): Promise<void> {
    await this.claudeService.abort(id);
    await this.sessionRepo.update(id, { status: "idle" });
  }

  async deleteSession(id: string): Promise<void> {
    await this.stopSession(id);
    await this.messageRepo.deleteBySessionId(id);
    await this.sessionRepo.delete(id);
  }

  async updateSession(
    id: string,
    data: Partial<InsertSession>,
  ): Promise<Session> {
    const updated = await this.sessionRepo.update(id, data);
    if (!updated) {
      throw new NotFoundError(`Session not found: ${id}`);
    }
    return updated;
  }

  async getRecentCwds(limit = 8): Promise<string[]> {
    return await this.sessionRepo.getRecentCwds(limit);
  }
}
```

## 🚀 迁移命令

```json
// package.json - scripts
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "bun run src/server/db/seed.ts"
  }
}
```

## 📝 数据库文件管理

SQLite 使用单个文件存储数据，默认路径为 `./webui.db`。

**优势**:

- 零配置，无需单独的数据库服务器
- 文件级备份和恢复
- 跨平台兼容
- 自动启用 WAL 模式提升并发性能

**备份与恢复**:

```bash
# 备份数据库
cp ./webui.db ./backups/webui-$(date +%Y%m%d).db

# 恢复数据库
cp ./backups/webui-20260111.db ./webui.db

# 使用 SQLite 命令行工具查看
sqlite3 ./webui.db
```

## 📝 示例使用

```typescript
// src/server/index.ts
import { db, checkDatabaseConnection, runMigrations } from "./db";
import { SessionRepository } from "./repositories/session.repository";
import { MessageRepository } from "./repositories/message.repository";
import { SettingsRepository } from "./repositories/settings.repository";
import { SessionService } from "./services/session.service";
import { ConfigService } from "./services/config.service";
import { ClaudeService } from "./services/claude.service";

async function bootstrap() {
  // Check database connection
  const isConnected = checkDatabaseConnection();
  if (!isConnected) {
    console.error("❌ Failed to connect to database");
    process.exit(1);
  }
  console.log("✅ Database connected");

  // Run migrations
  runMigrations();

  // Initialize repositories
  const sessionRepo = new SessionRepository(db);
  const messageRepo = new MessageRepository(db);
  const settingsRepo = new SettingsRepository(db);

  // Initialize services
  const configService = ConfigService.getInstance(settingsRepo);
  await configService.load();

  const claudeService = new ClaudeService(configService);
  const sessionService = new SessionService(
    sessionRepo,
    messageRepo,
    claudeService,
  );

  // Start server
  console.log("🚀 Server starting...");
}

bootstrap().catch(console.error);
```

## ✅ 优势总结

### Drizzle ORM

1. ✅ **类型安全** - 完整的 TypeScript 支持
2. ✅ **零运行时开销** - 编译时类型检查
3. ✅ **SQL-like API** - 接近原生 SQL
4. ✅ **自动迁移** - drizzle-kit 管理
5. ✅ **Zod 集成** - 统一验证

### SQLite

1. ✅ **零配置** - 无需独立数据库服务器
2. ✅ **单文件存储** - 易于备份和部署
3. ✅ **WAL 模式** - 良好的并发读写性能
4. ✅ **ACID 事务** - 数据一致性保证
5. ✅ **跨平台** - 支持所有主流操作系统
6. ✅ **轻量高效** - 非常适合桌面应用和中小型项目
7. ✅ **嵌入式** - 与应用一起分发，无需额外安装

### 架构优势

1. ✅ **清晰分层** - Repository → Service → Controller
2. ✅ **依赖注入** - 易于测试和替换
3. ✅ **类型安全** - 端到端类型检查
4. ✅ **事务支持** - Drizzle 原生事务
5. ✅ **可维护性** - 代码组织清晰

### 适用场景

**SQLite 非常适合本项目**:

- ✅ 桌面应用 - 无需配置数据库服务器
- ✅ 单用户或小团队使用 - 并发压力不大
- ✅ 快速部署 - 一个文件搞定
- ✅ 易于备份 - 直接复制文件即可
- ✅ 开发体验好 - 本地开发无需 Docker

**何时考虑切换到 PostgreSQL**:

- 需要高并发写入（100+ 并发用户）
- 需要分布式部署
- 需要复杂的全文搜索
- 需要更高级的索引策略
