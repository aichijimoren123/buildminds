# Multi-Session Architecture Design

## 🎯 设计目标

支持真正的 multi-session 和 multi-agent 场景：
1. **多会话并发** - 用户可以同时运行多个独立的 Claude 会话
2. **会话隔离** - 每个会话有独立的状态、消息流和权限请求
3. **客户端订阅模型** - 前端按需订阅感兴趣的会话
4. **资源高效** - 只向关心该会话的客户端推送消息
5. **Workspace/WorkTree 支持** - 每个 GitHub 仓库对应一个 Workspace，每个会话对应独立的 WorkTree

---

## 🏗️ Workspace & WorkTree 架构

### 核心概念

参考 Lody 产品的设计理念：**一个任务，一个独立 WorkTree**

```
GitHub Repository
       │
       ▼
   Workspace (1:1 对应仓库)
       │
       ├── WorkTree A (session-1 的独立工作目录)
       │      └── Session 1 (运行中)
       │
       ├── WorkTree B (session-2 的独立工作目录)
       │      └── Session 2 (等待审批)
       │
       └── WorkTree C (session-3 的独立工作目录)
              └── Session 3 (已完成)
```

### 为什么需要 WorkTree？

1. **任务隔离** - 多个 AI 任务可以并行运行，互不干扰
2. **安全回滚** - 每个任务的改动在独立分支上，可以轻松丢弃
3. **代码审查** - 每个 WorkTree 的 diff 清晰可见，便于审批
4. **协作支持** - 团队成员可以同时在不同 WorkTree 上工作

### 数据模型

```typescript
// Workspace - 对应一个 GitHub 仓库
interface Workspace {
  id: string;
  name: string;                    // 显示名称
  githubRepoUrl: string;           // GitHub 仓库地址
  githubRepoId?: number;           // GitHub 仓库 ID
  localPath: string;               // 本地主仓库路径
  defaultBranch: string;           // 默认分支 (main/master)
  createdAt: Date;
  updatedAt: Date;

  // 关联
  worktrees: WorkTree[];
}

// WorkTree - 对应一个 git worktree
interface WorkTree {
  id: string;
  workspaceId: string;             // 所属 Workspace
  name: string;                    // 显示名称（通常与任务相关）
  branchName: string;              // 分支名 (e.g., "buildminds/task-123")
  localPath: string;               // WorkTree 的本地路径
  baseBranch: string;              // 基于哪个分支创建
  status: WorkTreeStatus;
  createdAt: Date;
  updatedAt: Date;

  // 文件变更追踪
  changedFiles: FileChange[];

  // 关联
  session?: Session;               // 1:1 对应的会话
}

type WorkTreeStatus =
  | 'active'      // 正在使用中
  | 'pending'     // 等待审批
  | 'merged'      // 已合并到主分支
  | 'abandoned'   // 已废弃
  | 'archived';   // 已归档

// 文件变更
interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  diff?: string;                   // 可选的 diff 内容
}
```

### 数据库 Schema (Drizzle)

```typescript
// schema/workspace.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  githubRepoUrl: text('github_repo_url').notNull(),
  githubRepoId: integer('github_repo_id'),
  localPath: text('local_path').notNull(),
  defaultBranch: text('default_branch').notNull().default('main'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const worktrees = sqliteTable('worktrees', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  name: text('name').notNull(),
  branchName: text('branch_name').notNull(),
  localPath: text('local_path').notNull(),
  baseBranch: text('base_branch').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 更新 sessions 表，添加 worktree 关联
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  worktreeId: text('worktree_id').references(() => worktrees.id),  // 新增
  // ... 其他字段
});
```

### WorkTree 生命周期

```
1. 创建 Session
   └── 自动创建 WorkTree
       ├── git worktree add -b buildminds/task-{id} ./worktrees/{id} {baseBranch}
       └── 状态: active

2. Session 运行中
   └── AI 在 WorkTree 目录下执行操作
       └── 实时追踪文件变更

3. Session 完成
   └── 状态: pending (等待用户审批)
       ├── 用户可查看 diff
       ├── 用户可批准变更 (merge)
       └── 用户可丢弃变更 (abandon)

4. 用户批准
   └── 创建 PR 或直接合并
       ├── git checkout {defaultBranch}
       ├── git merge buildminds/task-{id}
       └── 状态: merged

5. 清理
   └── git worktree remove ./worktrees/{id}
       └── 状态: archived
```

### WorkTree Service

```typescript
// services/WorkTreeService.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class WorkTreeService {
  constructor(
    private repository: WorkTreeRepository,
    private workspaceRepository: WorkspaceRepository,
  ) {}

  /**
   * 为新会话创建 WorkTree
   */
  async createForSession(
    workspaceId: string,
    sessionId: string,
    taskName: string,
  ): Promise<WorkTree> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    const branchName = `buildminds/task-${sessionId.slice(0, 8)}`;
    const worktreePath = `${workspace.localPath}/.worktrees/${sessionId}`;

    // 创建 git worktree
    await execAsync(
      `git worktree add -b ${branchName} "${worktreePath}" ${workspace.defaultBranch}`,
      { cwd: workspace.localPath }
    );

    // 保存到数据库
    const worktree = await this.repository.create({
      id: sessionId, // 使用相同 ID 简化关联
      workspaceId,
      name: taskName,
      branchName,
      localPath: worktreePath,
      baseBranch: workspace.defaultBranch,
      status: 'active',
    });

    return worktree;
  }

  /**
   * 获取 WorkTree 的文件变更
   */
  async getChanges(worktreeId: string): Promise<FileChange[]> {
    const worktree = await this.repository.findById(worktreeId);
    if (!worktree) throw new Error('WorkTree not found');

    // 获取相对于基础分支的变更
    const { stdout } = await execAsync(
      `git diff --stat ${worktree.baseBranch}...HEAD`,
      { cwd: worktree.localPath }
    );

    return this.parseGitDiffStat(stdout);
  }

  /**
   * 获取特定文件的 diff
   */
  async getFileDiff(worktreeId: string, filePath: string): Promise<string> {
    const worktree = await this.repository.findById(worktreeId);
    if (!worktree) throw new Error('WorkTree not found');

    const { stdout } = await execAsync(
      `git diff ${worktree.baseBranch}...HEAD -- "${filePath}"`,
      { cwd: worktree.localPath }
    );

    return stdout;
  }

  /**
   * 合并 WorkTree 到主分支
   */
  async merge(worktreeId: string): Promise<void> {
    const worktree = await this.repository.findById(worktreeId);
    if (!worktree) throw new Error('WorkTree not found');

    const workspace = await this.workspaceRepository.findById(worktree.workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    // 在主仓库中合并
    await execAsync(
      `git merge ${worktree.branchName} -m "Merge task: ${worktree.name}"`,
      { cwd: workspace.localPath }
    );

    // 更新状态
    await this.repository.update(worktreeId, { status: 'merged' });
  }

  /**
   * 废弃 WorkTree
   */
  async abandon(worktreeId: string): Promise<void> {
    const worktree = await this.repository.findById(worktreeId);
    if (!worktree) throw new Error('WorkTree not found');

    // 删除 worktree
    await execAsync(
      `git worktree remove "${worktree.localPath}" --force`,
      { cwd: worktree.localPath.replace(/\/.worktrees\/.*$/, '') }
    );

    // 删除分支
    await execAsync(
      `git branch -D ${worktree.branchName}`,
      { cwd: worktree.localPath.replace(/\/.worktrees\/.*$/, '') }
    );

    // 更新状态
    await this.repository.update(worktreeId, { status: 'abandoned' });
  }

  /**
   * 创建 Pull Request
   */
  async createPullRequest(
    worktreeId: string,
    title: string,
    body?: string,
  ): Promise<{ url: string; number: number }> {
    const worktree = await this.repository.findById(worktreeId);
    if (!worktree) throw new Error('WorkTree not found');

    // 推送分支
    await execAsync(
      `git push -u origin ${worktree.branchName}`,
      { cwd: worktree.localPath }
    );

    // 使用 gh cli 创建 PR
    const { stdout } = await execAsync(
      `gh pr create --title "${title}" --body "${body || ''}" --base ${worktree.baseBranch}`,
      { cwd: worktree.localPath }
    );

    const prUrl = stdout.trim();
    const prNumber = parseInt(prUrl.split('/').pop() || '0');

    return { url: prUrl, number: prNumber };
  }

  private parseGitDiffStat(diffStat: string): FileChange[] {
    // 解析 git diff --stat 输出
    const lines = diffStat.split('\n').filter(l => l.includes('|'));
    return lines.map(line => {
      const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*([+-]+)/);
      if (!match) return null;

      const [, path, changes, indicators] = match;
      const additions = (indicators.match(/\+/g) || []).length;
      const deletions = (indicators.match(/-/g) || []).length;

      return {
        path: path.trim(),
        status: 'modified' as const,
        additions,
        deletions,
      };
    }).filter(Boolean) as FileChange[];
  }
}
```

### Workspace Service

```typescript
// services/WorkspaceService.ts
export class WorkspaceService {
  constructor(
    private repository: WorkspaceRepository,
    private githubService: GitHubService,
  ) {}

  /**
   * 从 GitHub 仓库创建 Workspace
   */
  async createFromGitHub(
    repoUrl: string,
    localPath: string,
  ): Promise<Workspace> {
    // 解析 GitHub URL
    const { owner, repo } = this.parseGitHubUrl(repoUrl);

    // 获取仓库信息
    const repoInfo = await this.githubService.getRepository(owner, repo);

    // 克隆仓库（如果本地不存在）
    if (!await this.existsLocally(localPath)) {
      await execAsync(`git clone ${repoUrl} "${localPath}"`);
    }

    // 创建 Workspace
    const workspace = await this.repository.create({
      id: generateId(),
      name: repoInfo.full_name,
      githubRepoUrl: repoUrl,
      githubRepoId: repoInfo.id,
      localPath,
      defaultBranch: repoInfo.default_branch,
    });

    return workspace;
  }

  /**
   * 获取 Workspace 下的所有 WorkTree
   */
  async getWorkTrees(workspaceId: string): Promise<WorkTree[]> {
    return this.worktreeRepository.findByWorkspace(workspaceId);
  }

  /**
   * 同步 Workspace（拉取最新代码）
   */
  async sync(workspaceId: string): Promise<void> {
    const workspace = await this.repository.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    await execAsync(`git fetch origin`, { cwd: workspace.localPath });
    await execAsync(
      `git pull origin ${workspace.defaultBranch}`,
      { cwd: workspace.localPath }
    );
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!match) throw new Error('Invalid GitHub URL');
    return { owner: match[1], repo: match[2] };
  }
}
```

### 更新后的架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Workspace  │  │   Tasks     │  │   Chat      │  │   Diff View     │ │
│  │  Selector   │  │   (列表)    │  │  (交互)     │  │   (变更审查)    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │               │                │                 │             │
│         └───────────────┴────────────────┴─────────────────┘             │
│                                    │                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         useAppStore                                │  │
│  │  - workspaces: Record<id, Workspace>                              │  │
│  │  - activeWorkspaceId: string | null                               │  │
│  │  - worktrees: Record<id, WorkTree>                                │  │
│  │  - sessions: Record<id, Session>                                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                WebSocket
                                     │
┌─────────────────────────────────────────────────────────────────────────┐
│                               Backend                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      WebSocketController                           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                      │
│         ┌──────────┬───────────────┼───────────────┬──────────┐         │
│         ↓          ↓               ↓               ↓          ↓         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐  │
│  │Workspace  │ │ WorkTree  │ │ Session   │ │  Claude   │ │WebSocket│  │
│  │ Service   │ │ Service   │ │ Service   │ │  Service  │ │ Service │  │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └─────────┘  │
│         │          │               │               │          │         │
│         └──────────┴───────────────┴───────────────┴──────────┘         │
│                                    │                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                       Repository Layer                             │  │
│  │  WorkspaceRepo, WorkTreeRepo, SessionRepo, MessageRepo             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         SQLite (Drizzle)                           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        File System                                 │  │
│  │   /projects/                                                       │  │
│  │   └── my-repo/                    (Workspace - 主仓库)             │  │
│  │       ├── .git/                                                    │  │
│  │       ├── .worktrees/             (WorkTree 目录)                  │  │
│  │       │   ├── session-abc/        (WorkTree A)                     │  │
│  │       │   └── session-xyz/        (WorkTree B)                     │  │
│  │       └── src/                    (源代码)                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 新增 WebSocket 事件

```typescript
// Client → Server
type ClientEvent =
  // ... 原有事件 ...

  // Workspace 管理
  | { type: "workspace.create"; payload: { githubUrl: string; localPath: string } }
  | { type: "workspace.list" }
  | { type: "workspace.select"; payload: { workspaceId: string } }
  | { type: "workspace.sync"; payload: { workspaceId: string } }

  // WorkTree 管理
  | { type: "worktree.list"; payload: { workspaceId: string } }
  | { type: "worktree.changes"; payload: { worktreeId: string } }
  | { type: "worktree.diff"; payload: { worktreeId: string; filePath: string } }
  | { type: "worktree.merge"; payload: { worktreeId: string } }
  | { type: "worktree.abandon"; payload: { worktreeId: string } }
  | { type: "worktree.createPR"; payload: { worktreeId: string; title: string; body?: string } };

// Server → Client
type ServerEvent =
  // ... 原有事件 ...

  // Workspace 事件
  | { type: "workspace.created"; payload: { workspace: Workspace } }
  | { type: "workspace.list"; payload: { workspaces: Workspace[] } }
  | { type: "workspace.synced"; payload: { workspaceId: string } }

  // WorkTree 事件
  | { type: "worktree.created"; payload: { worktree: WorkTree } }
  | { type: "worktree.list"; payload: { workspaceId: string; worktrees: WorkTree[] } }
  | { type: "worktree.changes"; payload: { worktreeId: string; changes: FileChange[] } }
  | { type: "worktree.diff"; payload: { worktreeId: string; filePath: string; diff: string } }
  | { type: "worktree.merged"; payload: { worktreeId: string } }
  | { type: "worktree.abandoned"; payload: { worktreeId: string } }
  | { type: "worktree.prCreated"; payload: { worktreeId: string; url: string; number: number } };
```

### 会话启动流程（更新版）

```
1. 用户选择 Workspace（或创建新的）
2. 用户输入任务描述
3. 前端发送 session.start { workspaceId, prompt, title }
4. 后端：
   a. 创建 Session 记录
   b. 创建 WorkTree (git worktree add)
   c. 返回 session.created { session, worktree }
5. 前端自动订阅该会话
6. 后端在 WorkTree 目录下启动 Claude
7. Claude 执行任务，所有文件操作在 WorkTree 中
8. 会话完成，状态变为 pending
9. 用户查看 diff，决定 merge 或 abandon

```

---

## 🔍 当前架构问题

### 问题 1: 全局广播模式
```typescript
// 当前: WebSocketService 向所有客户端广播所有事件
broadcast(event: ServerEvent) {
  for (const client of this.clients) {
    ws.send(payload);  // 所有客户端都收到所有会话的消息
  }
}
```

**问题**: 当有多个会话同时运行时，所有客户端会收到所有会话的消息，导致：
- 消息混乱
- 带宽浪费
- 前端需要过滤大量无关消息

### 问题 2: 单一活跃会话假设
```typescript
// 前端 store 假设只有一个活跃会话
activeSessionId: string | null;
pendingStart: boolean;  // 全局状态，无法区分是哪个会话在启动
```

**问题**: 无法同时跟踪多个正在运行的会话

### 问题 3: 状态同步困难
当用户在 Home 页面启动新会话时，依赖 `pendingStart` 状态来触发页面跳转，但这个状态是全局的。

## 📐 新架构设计

### 核心概念

#### 1. 客户端订阅模型 (Subscription Model)

每个 WebSocket 客户端可以订阅多个会话，只接收订阅会话的事件。

```typescript
// 客户端订阅状态
interface ClientSubscription {
  clientId: string;
  subscribedSessions: Set<string>;  // 订阅的会话 ID 列表
  ws: WebSocket;
}
```

#### 2. 事件路由 (Event Routing)

```typescript
class WebSocketService {
  private clients = new Map<string, ClientSubscription>();

  // 订阅会话
  subscribe(clientId: string, sessionId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscribedSessions.add(sessionId);
    }
  }

  // 取消订阅
  unsubscribe(clientId: string, sessionId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscribedSessions.delete(sessionId);
    }
  }

  // 向订阅了特定会话的客户端发送事件
  sendToSession(sessionId: string, event: ServerEvent): void {
    for (const [, client] of this.clients) {
      if (client.subscribedSessions.has(sessionId)) {
        client.ws.send(JSON.stringify(event));
      }
    }
  }

  // 向所有客户端广播（用于全局事件如 session.list）
  broadcast(event: ServerEvent): void {
    for (const [, client] of this.clients) {
      client.ws.send(JSON.stringify(event));
    }
  }
}
```

### 新的事件类型

#### Client → Server Events

```typescript
type ClientEvent =
  // 会话管理
  | { type: "session.start"; payload: { prompt: string; cwd?: string; title?: string } }
  | { type: "session.continue"; payload: { sessionId: string; prompt: string } }
  | { type: "session.stop"; payload: { sessionId: string } }
  | { type: "session.delete"; payload: { sessionId: string } }

  // 订阅管理
  | { type: "session.subscribe"; payload: { sessionId: string } }
  | { type: "session.unsubscribe"; payload: { sessionId: string } }

  // 数据请求
  | { type: "session.list" }
  | { type: "session.history"; payload: { sessionId: string } }

  // 权限响应
  | { type: "permission.response"; payload: { sessionId: string; toolUseId: string; result: PermissionResult } };
```

#### Server → Client Events

```typescript
type ServerEvent =
  // 会话状态
  | { type: "session.created"; payload: { session: SessionInfo } }  // 新增：会话创建完成
  | { type: "session.status"; payload: { sessionId: string; status: SessionStatus; title?: string; cwd?: string; error?: string } }
  | { type: "session.list"; payload: { sessions: SessionInfo[] } }
  | { type: "session.history"; payload: { sessionId: string; status: SessionStatus; messages: StreamMessage[] } }
  | { type: "session.deleted"; payload: { sessionId: string } }

  // 消息流（只发给订阅者）
  | { type: "stream.message"; payload: { sessionId: string; message: StreamMessage } }
  | { type: "stream.user_prompt"; payload: { sessionId: string; prompt: string } }

  // 权限请求（只发给订阅者）
  | { type: "permission.request"; payload: { sessionId: string; toolUseId: string; toolName: string; input: unknown } }

  // 错误
  | { type: "runner.error"; payload: { sessionId?: string; message: string } };
```

### 前端状态管理重构

```typescript
interface AppState {
  // 会话数据
  sessions: Record<string, SessionView>;

  // 订阅状态
  subscribedSessions: Set<string>;  // 当前订阅的会话

  // UI 状态
  activeSessionId: string | null;   // 当前查看的会话（不一定是运行中的）

  // 移除 pendingStart，改用更精确的状态
  pendingSessionStart: string | null;  // 正在启动的会话 ID（临时 ID）

  // Actions
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: (sessionId: string) => void;
}
```

### 会话启动流程重构

#### 当前流程（有问题）
```
1. 用户点击发送
2. 前端设置 pendingStart = true
3. 前端发送 session.start
4. 后端创建会话，发送 session.status (running)
5. 前端收到 session.status，设置 activeSessionId，清除 pendingStart
6. Home 页面检测 pendingStart 变化，跳转到 chat 页面
```

问题：如果同时启动多个会话，pendingStart 会混乱

#### 新流程
```
1. 用户点击发送
2. 前端生成临时 ID (tempId)，设置 pendingSessionStart = tempId
3. 前端发送 session.start { tempId, prompt, cwd }
4. 后端创建会话，返回 session.created { session, tempId }
5. 前端收到 session.created：
   - 如果 tempId 匹配 pendingSessionStart，跳转到 /chat/{sessionId}
   - 自动订阅该会话
   - 清除 pendingSessionStart
6. 后端开始运行会话，发送 session.status (running)
7. 前端更新会话状态
```

### 架构分层图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Home      │  │   Chat      │  │   SessionList           │ │
│  │  (创建会话) │  │ (查看/交互) │  │   (会话列表)            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│         │               │                    │                  │
│         └───────────────┼────────────────────┘                  │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    useAppStore                               ││
│  │  - sessions: Record<id, SessionView>                        ││
│  │  - subscribedSessions: Set<string>                          ││
│  │  - handleServerEvent()                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                         │                                        │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   useWebSocket                               ││
│  │  - 管理 WebSocket 连接                                       ││
│  │  - 发送/接收事件                                             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                         WebSocket
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        Backend                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 WebSocketController                          ││
│  │  - handleClientEvent()                                       ││
│  │  - 路由事件到对应 Service                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                         │                                        │
│         ┌───────────────┼───────────────┐                       │
│         ↓               ↓               ↓                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │SessionService│ │ClaudeService│ │WebSocketSvc │               │
│  │ - CRUD      │ │ - run()     │ │ - 订阅管理  │               │
│  │ - 启动/停止 │ │ - abort()   │ │ - 事件路由  │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│         │               │               │                       │
│         └───────────────┼───────────────┘                       │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Repository Layer                          ││
│  │  SessionRepository, MessageRepository                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                         │                                        │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     SQLite (Drizzle)                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 多会话运行示例

```
用户场景：
- 会话 A: 正在运行代码分析任务
- 会话 B: 等待用户回答问题
- 会话 C: 已完成

前端状态：
{
  sessions: {
    "a": { status: "running", messages: [...] },
    "b": { status: "running", permissionRequests: [...] },
    "c": { status: "completed", messages: [...] }
  },
  subscribedSessions: new Set(["a", "b"]),  // 只订阅了 A 和 B
  activeSessionId: "b"  // 当前查看 B
}

WebSocket 消息流：
- 会话 A 的 stream.message → 发给订阅了 A 的客户端
- 会话 B 的 permission.request → 发给订阅了 B 的客户端
- 会话 C 的消息 → 不发送（无人订阅）
```

## 🔄 迁移计划

### Phase 1: WebSocketService 改造
1. 添加客户端订阅管理
2. 实现 `sendToSession()` 方法
3. 添加 `session.subscribe` / `session.unsubscribe` 事件处理

### Phase 2: 事件类型更新
1. 添加 `session.created` 事件
2. 在 `session.start` 中支持 `tempId`
3. 更新 TypeScript 类型定义

### Phase 3: 前端状态重构
1. 添加 `subscribedSessions` 状态
2. 用 `pendingSessionStart` 替换 `pendingStart`
3. 更新 Home 页面跳转逻辑

### Phase 4: 自动订阅逻辑
1. 创建会话时自动订阅
2. 进入 chat 页面时自动订阅
3. 离开 chat 页面时可选取消订阅

## 📝 API 变更摘要

### 新增事件
- `session.created` - 会话创建完成，返回会话信息和 tempId
- `session.subscribe` - 客户端订阅会话
- `session.unsubscribe` - 客户端取消订阅

### 修改事件
- `session.start` - 添加可选的 `tempId` 字段

### 前端状态变更
- 新增 `subscribedSessions: Set<string>`
- 修改 `pendingStart: boolean` → `pendingSessionStart: string | null`

## ✅ 预期效果

1. **真正的多会话支持**: 可以同时运行多个会话，互不干扰
2. **精确的消息投递**: 只向关心的客户端发送消息
3. **更好的用户体验**: 用户可以在多个会话间切换，不会丢失进度
4. **资源优化**: 减少不必要的消息传输
5. **扩展性**: 为未来的 multi-agent 场景打好基础

---

## 📊 当前数据库设计对比与迁移

### 现有表结构分析

#### 1. `claude_sessions` 表（已存在）
```typescript
// src/server/database/schema/sessions.schema.ts
export const claudeSessions = sqliteTable("claude_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  claudeSessionId: text("claude_session_id"),
  status: text("status").notNull().default("idle"),
  cwd: text("cwd"),
  allowedTools: text("allowed_tools"),
  lastPrompt: text("last_prompt"),
  userId: text("user_id"),
  githubRepoId: text("github_repo_id"),  // ← 已有仓库关联
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

**评估**：
- ✅ 支持多会话（每条记录是一个会话）
- ✅ 有 `userId` 支持多用户
- ✅ 有 `githubRepoId` 关联仓库
- ❌ **缺少 `worktreeId`** - 无法实现工作目录隔离
- ❌ `cwd` 是静态的，多个会话会共用同一目录

#### 2. `github_repos` 表（已存在，相当于 Workspace）
```typescript
// src/server/database/schema/github-repos.schema.ts
export const githubRepos = sqliteTable("github_repos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  repoFullName: text("repo_full_name").notNull(),
  repoUrl: text("repo_url").notNull(),
  cloneUrl: text("clone_url").notNull(),
  localPath: text("local_path").notNull().unique(),
  branch: text("branch").notNull().default("main"),
  lastSynced: integer("last_synced", { mode: "timestamp" }),
  isPrivate: integer("is_private", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

**评估**：
- ✅ 基本就是 Workspace 概念
- ✅ 有 `localPath` 和 `branch`
- ⚠️ 可以复用，只需重命名为 `workspaces` 或保持现名

#### 3. `messages` 表（已存在）
```typescript
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id),
  data: text("data").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
});
```

**评估**：
- ✅ 已关联到 session，无需修改

### 需要新增的表

#### `worktrees` 表（新增）
```typescript
// src/server/database/schema/worktrees.schema.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";
import { githubRepos } from "./github-repos.schema";

export const worktrees = sqliteTable("worktrees", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),

  // 关联到 github_repos (Workspace)
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => githubRepos.id, { onDelete: "cascade" }),

  // WorkTree 信息
  name: text("name").notNull(),               // 任务名称
  branchName: text("branch_name").notNull(),  // e.g., "buildminds/task-abc123"
  localPath: text("local_path").notNull(),    // WorkTree 的绝对路径
  baseBranch: text("base_branch").notNull(),  // 基于哪个分支创建

  // 状态: active | pending | merged | abandoned | archived
  status: text("status").notNull().default("active"),

  // 文件变更统计（JSON）
  changesStats: text("changes_stats"),  // { added: 5, modified: 3, deleted: 1 }

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => [
  index("worktrees_workspace_idx").on(table.workspaceId),
  index("worktrees_status_idx").on(table.status),
]);

// Relations
export const worktreesRelations = relations(worktrees, ({ one }) => ({
  workspace: one(githubRepos, {
    fields: [worktrees.workspaceId],
    references: [githubRepos.id],
  }),
}));

export type WorkTree = typeof worktrees.$inferSelect;
export type InsertWorkTree = typeof worktrees.$inferInsert;
```

### 需要修改的表

#### `claude_sessions` 表（修改）
```typescript
// 添加 worktreeId 字段
export const claudeSessions = sqliteTable("claude_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  claudeSessionId: text("claude_session_id"),
  status: text("status").notNull().default("idle"),

  // ⚠️ 新增: WorkTree 关联（1:1）
  worktreeId: text("worktree_id")
    .references(() => worktrees.id, { onDelete: "set null" }),

  // 保留 cwd，但现在会从 worktree.localPath 动态获取
  cwd: text("cwd"),

  allowedTools: text("allowed_tools"),
  lastPrompt: text("last_prompt"),
  userId: text("user_id"),
  githubRepoId: text("github_repo_id"),  // 保留向后兼容
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

### 数据库迁移脚本

```sql
-- Migration: Add worktrees table and update claude_sessions

-- 1. 创建 worktrees 表
CREATE TABLE IF NOT EXISTS worktrees (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  local_path TEXT NOT NULL,
  base_branch TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  changes_stats TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS worktrees_workspace_idx ON worktrees(workspace_id);
CREATE INDEX IF NOT EXISTS worktrees_status_idx ON worktrees(status);

-- 2. 添加 worktree_id 到 claude_sessions
ALTER TABLE claude_sessions ADD COLUMN worktree_id TEXT REFERENCES worktrees(id) ON DELETE SET NULL;
```

### 关系图

```
┌─────────────────────┐
│       user          │ (better-auth)
│  - id               │
│  - email            │
│  - name             │
└─────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐
│   github_repos      │ (= Workspace)
│  - id               │
│  - userId           │
│  - repoFullName     │
│  - localPath        │
│  - branch           │
└─────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐
│    worktrees        │ (新增)
│  - id               │
│  - workspaceId  ────┼──→ github_repos.id
│  - branchName       │
│  - localPath        │
│  - status           │
└─────────────────────┘
          │
          │ 1:1
          ▼
┌─────────────────────┐
│  claude_sessions    │
│  - id               │
│  - worktreeId   ────┼──→ worktrees.id (新增)
│  - githubRepoId ────┼──→ github_repos.id (保留)
│  - status           │
│  - userId           │
└─────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐
│     messages        │
│  - id               │
│  - sessionId    ────┼──→ claude_sessions.id
│  - data             │
└─────────────────────┘
```

### 多会话支持现状总结

| 功能 | 当前状态 | 改进方案 |
|------|---------|---------|
| 多会话存储 | ✅ 支持 | - |
| 会话与用户关联 | ✅ 支持 | - |
| 会话与仓库关联 | ✅ 支持 | - |
| **会话工作目录隔离** | ❌ 不支持 | 新增 `worktrees` 表 |
| **并行任务互不干扰** | ❌ 不支持 | 每个会话独立 WorkTree |
| **变更审查/合并** | ❌ 不支持 | WorkTree 状态管理 |
| **创建 PR** | ❌ 不支持 | WorkTreeService |

### 迁移优先级

1. **Phase 0** - 新增 `worktrees` 表（不影响现有功能）
2. **Phase 1** - 修改 `claude_sessions` 添加 `worktreeId`
3. **Phase 2** - 创建会话时自动创建 WorkTree
4. **Phase 3** - 实现 diff 查看和 merge/abandon 功能
