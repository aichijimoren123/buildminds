# Backend Architecture Redesign Plan

## 🎯 设计目标

1. **关注点分离** - 清晰的分层架构
2. **可测试性** - 易于单元测试和集成测试
3. **可扩展性** - 便于添加新功能
4. **类型安全** - 充分利用 TypeScript
5. **错误处理** - 统一的错误处理机制
6. **配置管理** - 集中化的配置管理

## 📐 架构分层

```
┌─────────────────────────────────────────────────────────┐
│                     HTTP Layer                          │
│  (Hono App, Routes, Middleware, WebSocket Handler)     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                         │
│  (Business Logic, Session Management, Settings)         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Repository Layer                       │
│  (Data Access, Database Operations)                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                           │
│  (SQLite, File System)                                  │
└─────────────────────────────────────────────────────────┘
```

## 📁 建议的目录结构

```
src/
├── server/
│   ├── index.ts                    # 服务器入口
│   ├── app.ts                      # Hono 应用配置
│   │
│   ├── routes/                     # 路由层
│   │   ├── index.ts                # 路由注册
│   │   ├── sessions.routes.ts     # Session 相关路由
│   │   ├── settings.routes.ts     # Settings 相关路由
│   │   └── health.routes.ts        # 健康检查路由
│   │
│   ├── controllers/                # 控制器层（处理 HTTP 请求）
│   │   ├── sessions.controller.ts
│   │   ├── settings.controller.ts
│   │   └── websocket.controller.ts
│   │
│   ├── services/                   # 服务层（业务逻辑）
│   │   ├── session.service.ts      # Session 管理
│   │   ├── claude.service.ts       # Claude Agent SDK 集成
│   │   ├── settings.service.ts     # Settings 管理
│   │   └── websocket.service.ts    # WebSocket 管理
│   │
│   ├── repositories/               # 数据访问层
│   │   ├── session.repository.ts
│   │   ├── message.repository.ts
│   │   └── settings.repository.ts
│   │
│   ├── models/                     # 数据模型
│   │   ├── session.model.ts
│   │   ├── message.model.ts
│   │   └── settings.model.ts
│   │
│   ├── middleware/                 # 中间件
│   │   ├── error-handler.ts        # 错误处理
│   │   ├── logger.ts               # 日志记录
│   │   ├── cors.ts                 # CORS 配置
│   │   └── validation.ts           # 请求验证
│   │
│   ├── database/                   # 数据库相关
│   │   ├── connection.ts           # 数据库连接
│   │   ├── migrations/             # 数据库迁移
│   │   │   ├── 001_initial.ts
│   │   │   ├── 002_add_settings.ts
│   │   │   └── migration-runner.ts
│   │   └── schema.ts               # 数据库 Schema
│   │
│   ├── config/                     # 配置管理
│   │   ├── index.ts                # 配置入口
│   │   ├── env.ts                  # 环境变量
│   │   └── constants.ts            # 常量定义
│   │
│   ├── utils/                      # 工具函数
│   │   ├── logger.ts               # 日志工具
│   │   ├── errors.ts               # 自定义错误类
│   │   └── validation.ts           # 验证工具
│   │
│   └── types/                      # 类型定义
│       ├── api.types.ts            # API 相关类型
│       ├── database.types.ts       # 数据库类型
│       └── events.types.ts         # 事件类型
│
└── shared/                         # 前后端共享
    └── types.ts                    # 共享类型定义
```

## 🔧 核心模块设计

### 1. Configuration Management (配置管理)

```typescript
// src/server/config/index.ts
export class Config {
  private static instance: Config;

  public readonly server = {
    port: Number(process.env.PORT ?? 10086),
    host: process.env.HOST ?? "0.0.0.0",
    corsOrigin: process.env.CORS_ORIGIN ?? "*",
  };

  public readonly database = {
    path: process.env.DB_PATH ?? "./webui.db",
    walMode: true,
  };

  public readonly claude = {
    authToken: process.env.ANTHROPIC_AUTH_TOKEN,
    baseUrl: process.env.ANTHROPIC_BASE_URL,
    model: process.env.ANTHROPIC_MODEL,
    timeout: Number(process.env.API_TIMEOUT_MS ?? 600000),
  };

  private constructor() {
    this.loadFromDatabase();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public reload() {
    this.loadFromDatabase();
  }

  private loadFromDatabase() {
    // 从数据库加载配置并覆盖
  }
}
```

### 2. Database Layer (数据库层)

```typescript
// src/server/database/connection.ts
export class Database {
  private static instance: Database;
  private db: BunDatabase;

  private constructor(dbPath: string) {
    this.db = new BunDatabase(dbPath);
    this.initialize();
  }

  public static getInstance(dbPath?: string): Database {
    if (!Database.instance) {
      Database.instance = new Database(dbPath ?? "./webui.db");
    }
    return Database.instance;
  }

  private initialize() {
    this.db.run("PRAGMA journal_mode = WAL;");
    this.runMigrations();
  }

  private runMigrations() {
    // 运行迁移脚本
  }

  public getConnection() {
    return this.db;
  }
}

// src/server/database/migrations/migration-runner.ts
export class MigrationRunner {
  constructor(private db: BunDatabase) {}

  async run() {
    // 检查 migrations 表
    // 运行未执行的迁移
  }
}
```

### 3. Repository Pattern (仓储模式)

```typescript
// src/server/repositories/base.repository.ts
export abstract class BaseRepository<T> {
  constructor(protected db: BunDatabase) {}

  abstract findById(id: string): T | null;
  abstract findAll(): T[];
  abstract create(data: Partial<T>): T;
  abstract update(id: string, data: Partial<T>): T | null;
  abstract delete(id: string): boolean;
}

// src/server/repositories/session.repository.ts
export class SessionRepository extends BaseRepository<Session> {
  findById(id: string): Session | null {
    const row = this.db.query("SELECT * FROM sessions WHERE id = ?").get(id);
    return row ? this.mapToSession(row) : null;
  }

  findByStatus(status: SessionStatus): Session[] {
    const rows = this.db
      .query("SELECT * FROM sessions WHERE status = ?")
      .all(status);
    return rows.map(this.mapToSession);
  }

  // ... 其他方法
}

// src/server/repositories/settings.repository.ts
export class SettingsRepository {
  constructor(private db: BunDatabase) {}

  get(key: string): string | null {
    // ...
  }

  getAll(): Record<string, string> {
    // ...
  }

  set(key: string, value: string): void {
    // ...
  }

  setMany(settings: Record<string, string>): void {
    // 使用事务
    this.db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        this.set(key, value);
      }
    });
  }
}
```

### 4. Service Layer (服务层)

```typescript
// src/server/services/session.service.ts
export class SessionService {
  constructor(
    private sessionRepo: SessionRepository,
    private messageRepo: MessageRepository,
    private claudeService: ClaudeService,
  ) {}

  async createSession(params: CreateSessionParams): Promise<Session> {
    // 创建 session
    const session = this.sessionRepo.create({
      title: params.title,
      cwd: params.cwd,
      status: "idle",
    });

    // 记录初始消息
    if (params.prompt) {
      this.messageRepo.create({
        sessionId: session.id,
        type: "user_prompt",
        content: params.prompt,
      });
    }

    return session;
  }

  async startSession(sessionId: string, prompt: string): Promise<void> {
    const session = this.sessionRepo.findById(sessionId);
    if (!session) throw new NotFoundError("Session not found");

    // 更新状态
    this.sessionRepo.update(sessionId, { status: "running" });

    // 启动 Claude
    await this.claudeService.run({
      sessionId,
      prompt,
      cwd: session.cwd,
      onMessage: (msg) => this.handleClaudeMessage(sessionId, msg),
      onComplete: () => this.handleClaudeComplete(sessionId),
      onError: (err) => this.handleClaudeError(sessionId, err),
    });
  }

  private handleClaudeMessage(sessionId: string, message: SDKMessage) {
    // 保存消息
    this.messageRepo.create({
      sessionId,
      type: message.type,
      content: JSON.stringify(message),
    });

    // 广播到 WebSocket
    this.wsService.broadcast({
      type: "stream.message",
      payload: { sessionId, message },
    });
  }
}

// src/server/services/settings.service.ts
export class SettingsService {
  constructor(
    private settingsRepo: SettingsRepository,
    private config: Config,
  ) {}

  getAll(): Record<string, string> {
    return this.settingsRepo.getAll();
  }

  update(settings: Record<string, string>): void {
    this.settingsRepo.setMany(settings);

    // 重新加载配置
    this.config.reload();
  }
}

// src/server/services/claude.service.ts
export class ClaudeService {
  private activeRunners = new Map<string, AbortController>();

  constructor(private config: Config) {}

  async run(options: ClaudeRunOptions): Promise<void> {
    const abortController = new AbortController();
    this.activeRunners.set(options.sessionId, abortController);

    try {
      const q = query({
        prompt: options.prompt,
        options: {
          cwd: options.cwd,
          abortController,
          env: this.config.claude,
        },
      });

      for await (const message of q) {
        options.onMessage(message);
      }

      options.onComplete();
    } catch (error) {
      options.onError(error);
    } finally {
      this.activeRunners.delete(options.sessionId);
    }
  }

  abort(sessionId: string): void {
    const controller = this.activeRunners.get(sessionId);
    controller?.abort();
    this.activeRunners.delete(sessionId);
  }
}

// src/server/services/websocket.service.ts
export class WebSocketService {
  private clients = new Set<WebSocket>();

  addClient(ws: WebSocket) {
    this.clients.add(ws);
  }

  removeClient(ws: WebSocket) {
    this.clients.delete(ws);
  }

  broadcast(event: ServerEvent) {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === 1) {
        client.send(payload);
      }
    }
  }

  sendTo(clientId: string, event: ServerEvent) {
    // 发送给特定客户端
  }
}
```

### 5. Controller Layer (控制器层)

```typescript
// src/server/controllers/sessions.controller.ts
export class SessionsController {
  constructor(private sessionService: SessionService) {}

  async list(c: Context) {
    try {
      const sessions = await this.sessionService.listSessions();
      return c.json({ sessions });
    } catch (error) {
      throw new ApiError(500, "Failed to list sessions", error);
    }
  }

  async create(c: Context) {
    const body = await c.req.json();
    const validated = createSessionSchema.parse(body);

    const session = await this.sessionService.createSession(validated);
    return c.json({ session }, 201);
  }

  async get(c: Context) {
    const { id } = c.req.param();
    const session = await this.sessionService.getSession(id);

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    return c.json({ session });
  }

  async delete(c: Context) {
    const { id } = c.req.param();
    await this.sessionService.deleteSession(id);
    return c.json({ success: true });
  }
}

// src/server/controllers/settings.controller.ts
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  async get(c: Context) {
    const settings = this.settingsService.getAll();
    return c.json({ settings });
  }

  async update(c: Context) {
    const body = await c.req.json();
    const validated = updateSettingsSchema.parse(body);

    this.settingsService.update(validated.settings);
    return c.json({ success: true });
  }
}

// src/server/controllers/websocket.controller.ts
export class WebSocketController {
  constructor(
    private wsService: WebSocketService,
    private sessionService: SessionService,
  ) {}

  handleConnection(ws: WebSocket) {
    this.wsService.addClient(ws);

    ws.addEventListener("message", (event) => {
      this.handleMessage(ws, event.data);
    });

    ws.addEventListener("close", () => {
      this.wsService.removeClient(ws);
    });
  }

  private async handleMessage(ws: WebSocket, data: string) {
    try {
      const event = JSON.parse(data) as ClientEvent;

      switch (event.type) {
        case "session.start":
          await this.sessionService.startSession(
            event.payload.sessionId,
            event.payload.prompt,
          );
          break;

        case "session.stop":
          await this.sessionService.stopSession(event.payload.sessionId);
          break;

        // ... 其他事件处理
      }
    } catch (error) {
      this.wsService.broadcast({
        type: "error",
        payload: { message: String(error) },
      });
    }
  }
}
```

### 6. Routes (路由层)

```typescript
// src/server/routes/sessions.routes.ts
export function registerSessionRoutes(
  app: Hono,
  controller: SessionsController,
) {
  const router = new Hono();

  router.get("/", (c) => controller.list(c));
  router.post("/", (c) => controller.create(c));
  router.get("/:id", (c) => controller.get(c));
  router.delete("/:id", (c) => controller.delete(c));
  router.get("/:id/history", (c) => controller.getHistory(c));

  app.route("/api/sessions", router);
}

// src/server/routes/index.ts
export function registerRoutes(app: Hono) {
  // 依赖注入
  const db = Database.getInstance();
  const config = Config.getInstance();

  // Repositories
  const sessionRepo = new SessionRepository(db.getConnection());
  const messageRepo = new MessageRepository(db.getConnection());
  const settingsRepo = new SettingsRepository(db.getConnection());

  // Services
  const wsService = new WebSocketService();
  const claudeService = new ClaudeService(config);
  const sessionService = new SessionService(
    sessionRepo,
    messageRepo,
    claudeService,
  );
  const settingsService = new SettingsService(settingsRepo, config);

  // Controllers
  const sessionsController = new SessionsController(sessionService);
  const settingsController = new SettingsController(settingsService);
  const wsController = new WebSocketController(wsService, sessionService);

  // 注册路由
  registerSessionRoutes(app, sessionsController);
  registerSettingsRoutes(app, settingsController);
  registerHealthRoutes(app);

  return { wsController };
}
```

### 7. Error Handling (错误处理)

```typescript
// src/server/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, details);
  }
}

export class ApiError extends AppError {
  constructor(statusCode: number, message: string, details?: unknown) {
    super(statusCode, message, details);
  }
}

// src/server/middleware/error-handler.ts
export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode,
    );
  }

  // 未知错误
  console.error(err);
  return c.json(
    {
      error: {
        message: "Internal server error",
      },
    },
    500,
  );
}
```

### 8. Logging (日志记录)

```typescript
// src/server/utils/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  constructor(private level: LogLevel = LogLevel.INFO) {}

  debug(message: string, meta?: unknown) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  }

  info(message: string, meta?: unknown) {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, meta);
    }
  }

  warn(message: string, meta?: unknown) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, meta);
    }
  }

  error(message: string, error?: Error, meta?: unknown) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error, meta);
    }
  }
}

export const logger = new Logger();
```

## 🔄 数据库迁移系统

```typescript
// src/server/database/migrations/001_initial.ts
export const migration_001_initial = {
  version: 1,
  name: "initial",
  up: (db: BunDatabase) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        claude_session_id TEXT,
        status TEXT NOT NULL,
        cwd TEXT,
        allowed_tools TEXT,
        last_prompt TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_messages_session_id
      ON messages(session_id)
    `);
  },
  down: (db: BunDatabase) => {
    db.run("DROP TABLE IF EXISTS messages");
    db.run("DROP TABLE IF EXISTS sessions");
  },
};

// src/server/database/migrations/002_add_settings.ts
export const migration_002_add_settings = {
  version: 2,
  name: "add_settings",
  up: (db: BunDatabase) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  },
  down: (db: BunDatabase) => {
    db.run("DROP TABLE IF EXISTS settings");
  },
};
```

## 🧪 测试策略

```typescript
// tests/unit/services/session.service.test.ts
describe("SessionService", () => {
  let sessionService: SessionService;
  let mockSessionRepo: jest.Mocked<SessionRepository>;
  let mockMessageRepo: jest.Mocked<MessageRepository>;
  let mockClaudeService: jest.Mocked<ClaudeService>;

  beforeEach(() => {
    mockSessionRepo = createMockSessionRepository();
    mockMessageRepo = createMockMessageRepository();
    mockClaudeService = createMockClaudeService();

    sessionService = new SessionService(
      mockSessionRepo,
      mockMessageRepo,
      mockClaudeService,
    );
  });

  describe("createSession", () => {
    it("should create a new session", async () => {
      const params = {
        title: "Test Session",
        cwd: "/test/path",
        prompt: "Hello",
      };

      const result = await sessionService.createSession(params);

      expect(mockSessionRepo.create).toHaveBeenCalledWith({
        title: params.title,
        cwd: params.cwd,
        status: "idle",
      });

      expect(result).toBeDefined();
    });
  });
});
```

## 🚀 迁移步骤

1. **Phase 1: 基础架构**
   - 创建新的目录结构
   - 实现 Config、Database、Logger
   - 实现 Base Repository

2. **Phase 2: 核心功能**
   - 实现 Repositories
   - 实现 Services
   - 实现数据库迁移系统

3. **Phase 3: API 层**
   - 实现 Controllers
   - 实现 Routes
   - 实现错误处理中间件

4. **Phase 4: WebSocket**
   - 重构 WebSocket 服务
   - 集成到新架构

5. **Phase 5: 测试 & 文档**
   - 编写单元测试
   - 编写集成测试
   - 更新 API 文档

## 📊 优势总结

1. **可维护性** ↑
   - 清晰的分层，职责明确
   - 易于定位和修复问题

2. **可测试性** ↑
   - 依赖注入，便于 mock
   - 每层可独立测试

3. **可扩展性** ↑
   - 添加新功能无需修改现有代码
   - 符合开闭原则

4. **类型安全** ↑
   - 完整的类型定义
   - 编译时错误检测

5. **性能** ↑
   - 数据库连接复用
   - 事务支持
   - 更好的错误恢复机制
