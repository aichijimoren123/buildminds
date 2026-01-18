# Changelog - UI Overhaul

## [2026-01-13] 前端 UI 重构 - Luban 风格界面

### 概述

对 Claude Code WebUI 前端进行全面 UI 重构，实现类似 Luban 应用的现代化界面设计。主要包括：
- 混合式侧边栏（工作区下拉 + 会话列表）
- Tab 标签页导航系统
- 聊天气泡样式消息显示
- 可折叠的工具步骤组
- 模型选择器和质量选择器

### 设计决策

根据用户选择：
- **侧边栏结构**: 混合方案 - 顶部工作区下拉 + 会话列表带分支徽章
- **Diff 视图范围**: 仅显示当前会话的工作树变更
- **主题风格**: 保持现有 Anthropic 橙色主题 (#D97757)

---

## Phase 1: 状态管理基础

### 修改文件

#### [useAppStore.ts](src/store/useAppStore.ts)

新增状态和类型：

```typescript
export type QualityLevel = "standard" | "high" | "max";

export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
] as const;

export const QUALITY_LEVELS: { id: QualityLevel; label: string; description: string }[] = [
  { id: "standard", label: "Standard", description: "快速响应，适合简单任务" },
  { id: "high", label: "High", description: "平衡质量与速度" },
  { id: "max", label: "Max", description: "最高质量，适合复杂任务" },
];

// 新增状态
interface AppState {
  selectedModel: string;
  qualityLevel: QualityLevel;
  activeWorkspaceId: string | null;
  setSelectedModel: (model: string) => void;
  setQualityLevel: (level: QualityLevel) => void;
  setActiveWorkspaceId: (id: string | null) => void;
}
```

**localStorage 持久化**: 模型和质量设置会保存到 `cc-webui:app-settings`

#### [useSessionsStore.ts](src/store/useSessionsStore.ts)

新增工作区过滤选择器：

```typescript
// 按工作区筛选会话
export const useSessionsByWorkspace = (workspaceId: string | null) => {
  return useSessionsStore((state) => {
    const allSessions = Object.values(state.sessions);
    if (!workspaceId) return allSessions;
    return allSessions.filter((s) => s.githubRepoId === workspaceId);
  });
};

// 按日期排序并筛选
export const useSessionsSortedByDate = (workspaceId: string | null) => {
  return useSessionsStore((state) => {
    const allSessions = Object.values(state.sessions);
    const filtered = workspaceId
      ? allSessions.filter((s) => s.githubRepoId === workspaceId)
      : allSessions;
    return [...filtered].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  });
};
```

### 新增文件

#### [useTabsStore.ts](src/store/useTabsStore.ts)

Tab 标签页状态管理：

```typescript
export interface Tab {
  id: string;
  type: "chat" | "changes";
  sessionId?: string;
  worktreeId?: string;
  label: string;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;

  addTab: (tab: Omit<Tab, "id">) => string;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabLabel: (tabId: string, label: string) => void;
  updateTabSession: (tabId: string, sessionId: string) => void;
  getOrCreateTabForSession: (sessionId: string, label?: string) => string;
  clearTabs: () => void;
}
```

**功能特性**:
- 使用 nanoid 生成唯一 Tab ID
- localStorage 持久化 (`cc-webui:tabs`)
- 支持 chat 和 changes 两种 Tab 类型
- 智能复用已存在的会话 Tab

**便捷 Hooks**:

```typescript
export const useTabs = () => useTabsStore((state) => state.tabs);
export const useActiveTab = () => {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  return tabs.find((t) => t.id === activeTabId);
};
```

---

## Phase 2: 侧边栏重构

### 新增文件

#### [WorkspaceSelector.tsx](src/components/WorkspaceSelector.tsx)

工作区下拉选择器组件：

```typescript
interface WorkspaceSelectorProps {
  onWorkspaceChange?: (workspaceId: string | null) => void;
}
```

**功能**:
- 使用 Base UI Menu 组件
- 显示所有已连接的 GitHub 仓库
- 支持 "All Workspaces" 选项
- 私有仓库显示 Lock 图标
- 当前选中项显示勾选标记

**UI 结构**:
```
┌─────────────────────────────┐
│ 📁 All Workspaces      ▼   │
├─────────────────────────────┤
│ ✓ All Workspaces           │
│   owner/repo-1             │
│ 🔒 owner/private-repo      │
│   owner/repo-2             │
└─────────────────────────────┘
```

### 修改文件

#### [Sidebar.tsx](src/components/Sidebar.tsx)

完全重构侧边栏：

**新增功能**:
1. 集成 WorkspaceSelector 组件
2. 会话项显示 Git 分支徽章（GitBranch 图标）
3. 使用 `useSessionsSortedByDate` 按日期排序
4. 按工作区过滤会话列表

**会话项结构**:
```
┌─────────────────────────────────┐
│ Session Title                   │
│ 📂 /path/to/cwd  🌿 main        │
└─────────────────────────────────┘
```

**分支徽章**:
- 仅在 worktreeId 存在时显示
- 使用 GitBranch 图标
- 显示 worktree 分支名或 "branch"

---

## Phase 3: Tab 导航系统

### 新增文件

#### [ChatTabs.tsx](src/components/ChatTabs.tsx)

水平 Tab 标签栏组件：

```typescript
interface ChatTabsProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: () => void;
}
```

**功能特性**:
- MessageSquare 图标（chat 类型）
- GitCompare 图标（changes 类型）
- 关闭按钮（hover 时显示）
- 添加新 Tab 按钮
- 活跃 Tab 高亮样式

**UI 样式**:
```
┌──────────────────────────────────────────────┐
│ [💬 Chat 1 ×] [💬 Chat 2 ×] [📊 Changes ×] [+] │
└──────────────────────────────────────────────┘
```

#### [ChatTabContent.tsx](src/components/ChatTabContent.tsx)

Tab 内容渲染组件：

```typescript
interface ChatTabContentProps {
  tab: Tab | undefined;
  sendEvent: (event: ClientEvent) => void;
  partialMessageHandlerRef: React.MutableRefObject<
    ((event: ServerEvent) => void) | null
  >;
}
```

**功能**:
- 根据 tab.type 渲染不同内容
- chat 类型：渲染消息流 + 权限面板
- changes 类型：渲染 ChangesView（待实现）
- 处理历史记录加载
- 流式消息处理
- 空状态显示

**消息流处理**:
```typescript
// 注册部分消息处理器
useEffect(() => {
  partialMessageHandlerRef.current = handlePartialMessages;
  return () => {
    partialMessageHandlerRef.current = null;
  };
}, [handlePartialMessages]);
```

### 修改文件

#### [Chat.tsx](src/pages/Chat.tsx)

重构为 Tab 容器：

**核心改动**:
1. 集成 useTabsStore
2. URL sessionId 与 Tab 同步
3. Tab 切换更新 URL
4. 删除 Tab 时导航处理

**URL 同步逻辑**:
```typescript
useEffect(() => {
  if (!sessionId) {
    navigate("/");
    return;
  }
  const tabId = getOrCreateTabForSession(sessionId, sessions[sessionId]?.title);
  setActiveTab(tabId);
  setActiveSessionId(sessionId);
}, [sessionId, sessionsLoaded]);
```

**组件结构**:
```tsx
<div className="flex h-full flex-col bg-surface-cream">
  <ChatTabs
    tabs={tabs}
    activeTabId={activeTab?.id ?? null}
    onTabClick={handleTabClick}
    onTabClose={handleTabClose}
    onAddTab={handleAddTab}
  />
  <ChatTabContent
    tab={activeTab}
    sendEvent={sendEvent}
    partialMessageHandlerRef={partialMessageHandlerRef}
  />
  <PromptInput sendEvent={sendEvent} />
</div>
```

---

## Phase 4: 消息组件

### 新增文件

#### [MessageBubble.tsx](src/components/MessageBubble.tsx)

聊天气泡组件：

```typescript
interface MessageBubbleProps {
  variant: "user" | "assistant";
  children: React.ReactNode;
  className?: string;
}
```

**样式差异**:

| 属性 | User | Assistant |
|------|------|-----------|
| 对齐 | 右对齐 | 左对齐 |
| 背景 | accent 色 | 白色 |
| 文字 | oncolor | text-100 |
| 最大宽度 | 85% | 85% |
| 圆角 | 左上圆角更大 | 右上圆角更大 |

#### [StepGroup.tsx](src/components/StepGroup.tsx)

可折叠工具步骤组：

```typescript
interface StepGroupProps {
  steps: ToolStep[];
  defaultExpanded?: boolean;
}
```

**功能**:
- 使用 Base UI Collapsible
- 显示 "Completed X steps" 标题
- 展开后显示所有 ToolStepCard
- 动画展开/折叠效果

**UI 结构**:
```
┌─────────────────────────────────┐
│ ✓ Completed 5 steps        ▼   │
├─────────────────────────────────┤
│ ┌─ Read ─────────────────────┐ │
│ │ /path/to/file.ts           │ │
│ └────────────────────────────┘ │
│ ┌─ Edit ─────────────────────┐ │
│ │ /path/to/file.ts           │ │
│ └────────────────────────────┘ │
└─────────────────────────────────┘
```

#### [ToolStepCard.tsx](src/components/ToolStepCard.tsx)

单个工具步骤卡片：

```typescript
export interface ToolStep {
  toolName: string;
  toolId: string;
  input: unknown;
  status: "pending" | "success" | "error";
  result?: string;
  isError?: boolean;
}
```

**功能**:
- 状态图标（Loader2 旋转 / CheckCircle / XCircle）
- 工具名称（accent 颜色）
- 智能提取工具信息（路径/命令/模式等）
- 可展开查看结果
- 错误结果红色显示

**工具信息提取**:
```typescript
const getToolInfo = (): string | null => {
  switch (step.toolName) {
    case "Bash": return input.command;
    case "Read":
    case "Write":
    case "Edit": return input.file_path;
    case "Glob":
    case "Grep": return input.pattern;
    case "Task": return input.description;
    case "WebFetch": return input.url;
    default: return null;
  }
};
```

---

## Phase 6: 输入区选择器

### 新增文件

#### [ModelSelector.tsx](src/components/ModelSelector.tsx)

模型下拉选择器：

```typescript
// 使用 Base UI Menu
// 显示 Sparkles 图标 + 当前模型名
// 选中项显示勾选标记
```

**可选模型**:
- Claude Sonnet 4
- Claude Opus 4.5
- Claude 3.5 Haiku

#### [QualitySelector.tsx](src/components/QualitySelector.tsx)

质量级别选择器：

```typescript
// 使用 Base UI Menu
// 显示 Gauge 图标 + 当前级别
// 每个选项显示描述文字
```

**质量级别**:
- Standard - 快速响应
- High - 平衡质量与速度
- Max - 最高质量

### 修改文件

#### [PromptInput.tsx](src/components/PromptInput.tsx)

集成选择器组件：

**新增内容**:
```tsx
<div className="flex items-center gap-2">
  <ModelSelector />
  <QualitySelector />
  <div className="h-5 w-px bg-border-100/20 mx-1" />
  {/* 语音和发送按钮 */}
</div>
```

**布局变化**:
- 模型选择器在右侧工具栏
- 质量选择器紧随其后
- 分隔线区分功能组

---

## CSS 更新

### [index.css](src/index.css)

新增 Collapsible 动画：

```css
@keyframes collapsible-down {
  from { height: 0; opacity: 0; }
  to { height: var(--collapsible-panel-height); opacity: 1; }
}

@keyframes collapsible-up {
  from { height: var(--collapsible-panel-height); opacity: 1; }
  to { height: 0; opacity: 0; }
}

.animate-collapsible-down {
  animation: collapsible-down 200ms ease-out;
}

.animate-collapsible-up {
  animation: collapsible-up 200ms ease-out;
}
```

新增隐藏滚动条工具类：

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

---

## 文件清单

### 新增文件 (9)

| 文件 | 用途 |
|------|------|
| `src/store/useTabsStore.ts` | Tab 状态管理 |
| `src/components/WorkspaceSelector.tsx` | 工作区下拉选择器 |
| `src/components/ChatTabs.tsx` | Tab 导航栏 |
| `src/components/ChatTabContent.tsx` | Tab 内容渲染 |
| `src/components/MessageBubble.tsx` | 聊天气泡样式 |
| `src/components/StepGroup.tsx` | 可折叠步骤组 |
| `src/components/ToolStepCard.tsx` | 工具步骤卡片 |
| `src/components/ModelSelector.tsx` | 模型选择器 |
| `src/components/QualitySelector.tsx` | 质量选择器 |

### 修改文件 (6)

| 文件 | 改动说明 |
|------|---------|
| `src/store/useAppStore.ts` | 新增模型、质量、工作区状态 |
| `src/store/useSessionsStore.ts` | 新增工作区过滤选择器 |
| `src/components/Sidebar.tsx` | 集成工作区选择器，添加分支徽章 |
| `src/pages/Chat.tsx` | 重构为 Tab 容器 |
| `src/components/PromptInput.tsx` | 集成模型和质量选择器 |
| `src/index.css` | 添加动画和工具类 |

---

## 待完成任务

### Phase 4 (剩余)
- [ ] 重构 EventCard.tsx 为 MessageRenderer
- [ ] 集成 MessageBubble 和 StepGroup
- [ ] 实现消息分组逻辑

### Phase 5
- [ ] 创建 ChangesView.tsx
- [ ] 创建 DiffViewer.tsx
- [ ] 创建 FileTree.tsx
- [ ] 实现 Diff 解析和渲染

### Phase 7
- [ ] 响应式设计优化
- [ ] 动画和过渡效果完善
- [ ] 空状态和加载状态
- [ ] 可访问性改进

---

## 验证步骤

### 已完成验证

1. ✅ `bun run dev` - 开发服务器正常启动
2. ✅ TypeScript 编译无错误
3. ✅ 侧边栏工作区选择器可用
4. ✅ Tab 标签页切换功能正常
5. ✅ 模型和质量选择器显示正确
6. ✅ 状态持久化到 localStorage

### 待验证功能

1. 消息气泡样式渲染
2. 工具步骤折叠/展开
3. Changes Tab 内容渲染
4. Diff 视图功能
5. 移动端响应式布局

---

## 技术栈

- **UI 组件库**: Base UI (@base-ui/react)
- **状态管理**: Zustand + persist middleware
- **路由**: React Router v7
- **图标**: Lucide React
- **ID 生成**: nanoid
- **样式**: Tailwind CSS 4 + CSS 变量主题系统

---

**统计**:
- 新增文件: 9 个
- 修改文件: 6 个
- 新增代码: ~1,200 行
