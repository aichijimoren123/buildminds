# Workspace 模式功能更新日志

## 2026-01-15: 实现 Workspace 模式核心功能

### 功能概述

新增 **Workspace 模式**，支持基于 GitHub 仓库的远程编码工作流。与常规模式不同，Workspace 模式为每个任务创建独立的 git worktree，实现代码隔离和并行开发。

### 两种模式对比

| 特性 | 常规模式 | Workspace 模式 |
|------|----------|----------------|
| 目标用户 | 本地开发者 | 远程/移动端开发者 |
| 工作目录 | 手动输入任意路径 | 基于已克隆的 GitHub 仓库 |
| Session 创建 | 直接输入 prompt 开始 | 先选仓库 → 创建 worktree → 再对话 |
| 代码隔离 | 无 | 每个任务一个 worktree，互不干扰 |
| 适用场景 | 快速提问、本地项目 | 手机编程、远程服务器开发 |

### 后端更新

#### 1. Worktree 服务增强 (`src/server/services/worktree.service.ts`)

新增方法：
- `create(options)` - 简化版 worktree 创建，用于创建新任务
- `delete(worktreeId)` - 删除 worktree 及关联的 git 分支
- `getBranches(workspaceId)` - 获取仓库可用的远程分支列表

#### 2. Worktree API 路由 (`src/server/routes/worktree.routes.ts`)

新建 REST API 端点：

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/worktrees/workspace/:workspaceId` | 列出工作区下的所有 worktree |
| GET | `/api/worktrees/workspace/:workspaceId/branches` | 获取可用分支列表 |
| POST | `/api/worktrees/` | 创建新 worktree |
| GET | `/api/worktrees/:worktreeId` | 获取 worktree 详情 |
| GET | `/api/worktrees/:worktreeId/status` | 获取 worktree 状态和变更统计 |
| GET | `/api/worktrees/:worktreeId/changes` | 获取文件变更列表 |
| PATCH | `/api/worktrees/:worktreeId/status` | 更新 worktree 状态 |
| POST | `/api/worktrees/:worktreeId/pr` | 创建 Pull Request |
| POST | `/api/worktrees/:worktreeId/merge` | 合并到主分支 |
| POST | `/api/worktrees/:worktreeId/abandon` | 废弃 worktree |
| DELETE | `/api/worktrees/:worktreeId` | 删除 worktree |

#### 3. 路由注册 (`src/server/routes/index.ts`)

- 导入并注册 `worktreeRoutes` 到 `/api/worktrees` 路径

### 前端更新

#### 1. WorkspaceSessionModal 增强 (`src/components/WorkspaceSessionModal.tsx`)

重新设计的创建任务对话框：

- **仓库信息展示**：显示当前选择的仓库名称和本地路径
- **任务描述预览**：显示用户输入的 prompt
- **任务名称输入**：自动从 prompt 生成默认名称，支持自定义
- **分支选择器**：从 API 加载可用分支列表，支持选择基础分支
- **路径预览**：实时显示将要创建的 worktree 路径
- **加载状态**：分支加载和创建过程的 loading 状态

Props 更新：
```typescript
interface WorkspaceSessionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (worktreeName: string, baseBranch: string) => void;
  prompt: string;
  workspace: WorkspaceInfo | null;  // 新增
}
```

#### 2. PromptInput 更新 (`src/components/PromptInput.tsx`)

- 新增 `WorkspaceInfo` 接口定义
- 新增 `workspace` state，加载当前选中仓库的详细信息
- 更新 `handleSubmit`：Workspace 模式下检查是否已选择仓库
- 更新 `handleWorkspaceConfirm`：接收 `baseBranch` 参数
- 传递 `workspace` 信息给 `WorkspaceSessionModal`

### 交互流程

**Workspace 模式下创建新 Session**:

```
1. 用户在左侧 WorkspaceSelector 选择一个 GitHub 仓库
2. 在 PromptInput 切换到 "Workspace" 模式
3. 输入任务描述，点击发送
4. 弹出 WorkspaceSessionModal 对话框：
   ┌─────────────────────────────────────────────┐
   │  创建新任务                                    │
   ├─────────────────────────────────────────────┤
   │  📁 owner/repo-name                          │
   │  /path/to/local/repo                         │
   │                                             │
   │  任务描述: "修复登录页面的样式问题"              │
   │                                             │
   │  任务名称: [fix-login-style        ]         │
   │  分支名: task/fix-login-style                │
   │                                             │
   │  基于分支: [main ▼]                          │
   │                                             │
   │  Worktree 路径:                              │
   │  /path/to/repo/.worktrees/fix-login-style   │
   │                                             │
   │           [取消]        [创建任务]            │
   └─────────────────────────────────────────────┘
5. 用户确认后，系统：
   - 调用 git worktree add 创建新的工作目录
   - 创建新分支 task/{name}
   - 创建 session，cwd 设置为 worktree 路径
   - 跳转到 chat 页面开始对话
```

### 文件变更清单

| 文件 | 操作 | 描述 |
|------|------|------|
| `src/server/services/worktree.service.ts` | 修改 | 新增 create/delete/getBranches 方法 |
| `src/server/routes/worktree.routes.ts` | 新增 | Worktree REST API 路由 |
| `src/server/routes/index.ts` | 修改 | 注册 worktree 路由 |
| `src/components/WorkspaceSessionModal.tsx` | 修改 | 增强创建任务对话框 |
| `src/components/PromptInput.tsx` | 修改 | 集成 workspace 信息和 modal |

### 后续计划

- [ ] 在 Sidebar 中显示 worktree 列表和状态
- [ ] 支持从 worktree 创建 PR 的 UI
- [ ] 支持 worktree 合并和废弃操作的 UI
- [ ] 添加 worktree 文件变更预览面板
