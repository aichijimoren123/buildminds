# Changelog: Workspace Mode 功能实现

## 概述

本次更新实现了双模式会话创建功能，用户可以选择创建普通会话或 Workspace 模式会话（带 Git Worktree）。

## 新增功能

### 1. 会话模式切换

在 PromptInput 组件中添加了模式切换开关，用户可以在创建新会话时选择：

- **Normal 模式**：创建普通会话，直接对话
- **Workspace 模式**：创建带 Git Worktree 的会话，为任务创建独立分支

#### UI 交互

```
┌─────────────────────────────────────────────────────────────────┐
│  [分配一个任务或提问任何问题...]                                   │
│                                                                   │
│  [+] [🔌]              [Normal|Workspace] [Model▼] [Quality▼] [🎤] [↑] │
└─────────────────────────────────────────────────────────────────┘
```

- 模式切换按钮只在创建新会话时显示
- 在已有会话中继续对话时，不显示切换按钮
- Workspace 模式下，发送按钮变为 accent 颜色

### 2. Workspace 会话创建弹窗

当用户选择 Workspace 模式并点击发送时，会弹出 `WorkspaceSessionModal` 对话框：

#### 弹窗内容

- 显示任务预览（用户输入的 prompt）
- 分支名输入框，默认根据 prompt 自动生成
- 分支名前缀固定为 `buildminds/`
- 实时预览完整分支名

#### 分支名生成规则

1. 从 prompt 中提取关键词（长度 > 2 的单词）
2. 取前 3 个关键词用 `-` 连接
3. 自动转小写，移除非法字符

### 3. 状态管理更新

#### useAppStore 新增

```typescript
export type SessionMode = "normal" | "workspace";

interface AppState {
  // ...
  sessionMode: SessionMode;
  setSessionMode: (mode: SessionMode) => void;
}
```

- `sessionMode` 状态会持久化到 localStorage
- 默认值为 `"normal"`

#### useSessionsStore 更新

- 新会话创建时（`session.status` 事件，status="running"），自动设置为 `activeSessionId`
- 修复了 Zustand selector 返回新数组导致的无限循环问题

### 4. 导航流程修复

修复了从 Home 页面创建新会话后不跳转的问题：

1. `pendingStart` 设置为 true（发送请求时）
2. 服务器返回 `session.status` 事件
3. `useSessionsStore` 设置 `activeSessionId`
4. `useAppStore` 重置 `pendingStart` 为 false
5. Home 页面检测到状态变化，导航到新会话

## 文件变更

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/WorkspaceSessionModal.tsx` | Workspace 会话创建弹窗组件 |

### 修改文件

| 文件 | 说明 |
|------|------|
| `src/store/useAppStore.ts` | 添加 `sessionMode` 状态和 `session.status` 事件处理 |
| `src/store/useSessionsStore.ts` | 修复 selector 无限循环，添加自动选择新会话逻辑 |
| `src/components/PromptInput.tsx` | 添加模式切换 UI 和 workspace 弹窗集成 |
| `src/components/Layout.tsx` | 路由 `session.status` 事件到 AppStore |

## 数据库变更

运行 `bun run db:push` 同步以下 schema 变更：

- `claude_sessions` 表添加 `worktree_id` 列
- 新增 `worktrees` 表

## 使用流程

### Normal 模式

1. 确保模式切换为 "Normal"
2. 输入 prompt
3. 点击发送
4. 直接创建会话并跳转

### Workspace 模式

1. 切换到 "Workspace" 模式
2. 输入 prompt
3. 点击发送
4. 在弹窗中确认/修改分支名
5. 点击 "Create Session"
6. 创建带 worktree 的会话并跳转

## 技术细节

### 避免无限循环

原来的 `useSessionsSortedByDate` 在 Zustand selector 内部创建新数组，导致每次渲染返回新引用。修复方案：

```typescript
// 修复前（问题代码）
export const useSessionsSortedByDate = (workspaceId: string | null) => {
  return useSessionsStore((state) => {
    // 每次都返回新数组引用 → 无限循环
    return [...filtered].sort(...);
  });
};

// 修复后
export const useSessionsSortedByDate = (workspaceId: string | null) => {
  const sessions = useSessionsStore((state) => state.sessions);
  return useMemo(() => {
    // 只在 sessions 或 workspaceId 变化时重新计算
    return filtered.sort(...);
  }, [sessions, workspaceId]);
};
```

### 事件路由

`session.status` 事件现在同时路由到：
- `useSessionsStore.handleSessionEvent` - 更新会话列表
- `useAppStore.handleAppEvent` - 重置 `pendingStart`
