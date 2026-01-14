# Changelog: GitHub 仓库管理与移动端 Vibe Coding 支持

## 概述

本次更新实现了 GitHub 仓库存储路径配置、默认工作目录设置，以及多项 UI 和路由修复，支持在移动端进行 vibe coding。

## 新增功能

### 1. 开发者设置页面

在设置页面新增 "开发设置" 板块，允许用户配置：

- **GitHub 仓库存放目录** (`GITHUB_REPOS_PATH`)：从 GitHub 克隆的仓库存放路径
- **默认工作目录** (`DEFAULT_CWD`)：新建会话时的默认 cwd

#### UI 示意

```
开发设置
├── GitHub 仓库设置
│   └── 仓库存放目录: /path/to/claude-projects
└── 工作目录设置
    └── 默认工作目录 (CWD): /path/to/your/projects
```

### 2. GitHub 仓库动态路径

GitHub 仓库克隆路径现在支持动态配置：

1. 优先使用 `process.env.GITHUB_REPOS_PATH`
2. 默认使用项目父目录下的 `claude-projects` 文件夹

```typescript
// GitHubService.getBaseRepoPath()
private getBaseRepoPath(): string {
  return (
    process.env.GITHUB_REPOS_PATH ||
    path.join(process.cwd(), "..", "claude-projects")
  );
}
```

### 3. 服务器设置同步

应用启动时自动从服务器加载设置并同步到客户端状态：

```typescript
// App.tsx
useEffect(() => {
  loadServerSettings();
}, [loadServerSettings]);
```

## Bug 修复

### 1. Menu.Item onSelect 事件不可靠

**问题**：Base UI 的 `Menu.Item` 组件 `onSelect` 事件在某些情况下不触发（特别是 async 操作和导航）。

**修复**：将所有 `Menu.Item` 的 `onSelect` 改为 `onClick`：

```typescript
// 修复前
<Menu.Item onSelect={() => handleSelect(item)}>

// 修复后
<Menu.Item onClick={(e) => { e.preventDefault(); handleSelect(item); }}>
```

**影响文件**：
- `src/components/WorkspaceSelector.tsx`
- `src/components/Sidebar.tsx`
- `src/components/ModelSelector.tsx`
- `src/components/QualitySelector.tsx`

### 2. WorkspaceSelector "全部工作区" 无法取消选择

**问题**：选择工作区后点击 "All Workspaces" 无法清除选择。

**修复**：在 `handleSelectWorkspace(null)` 时同时清除 `cwd`：

```typescript
const handleSelectWorkspace = (repo: GithubRepo | null) => {
  if (repo) {
    setActiveWorkspaceId(repo.id);
    setCwd(repo.localPath);
    onSelectWorkspace?.(repo.id, repo.localPath);
  } else {
    setActiveWorkspaceId(null);
    setCwd("");  // 新增：清除 cwd
    onSelectWorkspace?.(null, "");
  }
  setIsOpen(false);
};
```

### 3. SPA 路由直接访问 404

**问题**：直接访问 `/settings` 等客户端路由时返回 404。

**修复**：在 Bun 服务器的 `routes` 配置中添加 SPA 路由：

```typescript
const indexRoutes = devIndex
  ? {
      "/": devIndex,
      "/index.html": devIndex,
      "/settings": devIndex,
      "/chat/:sessionId": devIndex,
    }
  : {
      "/": prodIndex!,
      "/index.html": prodIndex!,
      "/settings": prodIndex!,
      "/chat/:sessionId": prodIndex!,
    };
```

### 4. 移动端输入框适配

**问题**：移动端输入框显示模型选择器和质量选择器，占用过多空间。

**修复**：移除 `ModelSelector` 和 `QualitySelector` 组件。

## 文件变更

### 修改文件

| 文件 | 说明 |
|------|------|
| `src/index.tsx` | 添加 SPA 路由支持 (/settings, /chat/:sessionId) |
| `src/App.tsx` | 启动时加载服务器设置 |
| `src/pages/Settings.tsx` | 新增开发者设置板块 (DeveloperContent) |
| `src/store/useAppStore.ts` | 新增 defaultCwd, serverSettingsLoaded, loadServerSettings |
| `src/server/services/github.service.ts` | 动态获取仓库路径 |
| `src/components/PromptInput.tsx` | 移除 ModelSelector 和 QualitySelector |
| `src/components/WorkspaceSelector.tsx` | 修复 onSelect → onClick, 修复清除选择 |
| `src/components/Sidebar.tsx` | 修复 Menu.Item onSelect → onClick |
| `src/components/ModelSelector.tsx` | 修复 Menu.Item onSelect → onClick |
| `src/components/QualitySelector.tsx` | 修复 Menu.Item onSelect → onClick |

## 状态管理更新

### useAppStore 新增

```typescript
interface AppState {
  // 新增
  defaultCwd: string;
  serverSettingsLoaded: boolean;
  setDefaultCwd: (cwd: string) => void;
  loadServerSettings: () => Promise<void>;
}
```

## 使用流程

### 移动端 Vibe Coding 配置

1. 在服务器上运行 Claude Code WebUI
2. 进入 **设置 → 开发设置**
3. 配置 **仓库存放目录**（如 `/home/user/claude-projects`）
4. 配置 **默认工作目录**（如 `/home/user/projects/my-app`）
5. 点击 **保存设置**
6. 从 GitHub 添加仓库
7. 在手机上开始 coding

### 设置持久化

设置保存到 SQLite 数据库，重启后自动加载到 `process.env`。

## 技术细节

### HTMLBundle vs BunFile

Bun 在开发模式下返回 `HTMLBundle` 对象，不能直接用于 `new Response()`。需要将其作为路由配置传递：

```typescript
// 错误示例
return new Response(devIndex);  // devIndex 是 HTMLBundle，会显示 [object HTMLBundle]

// 正确示例
const routes = { "/settings": devIndex };  // Bun 内部处理 HTMLBundle
```

### 设置同步机制

1. 前端通过 `PUT /api/settings` 保存设置
2. 后端 `SettingsService.setMany()` 写入数据库
3. 后端 `reloadClaudeEnv()` 将设置同步到 `process.env`
4. `GitHubService.getBaseRepoPath()` 从 `process.env` 读取
