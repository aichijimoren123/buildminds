# Changelog: GitHub 集成功能修复

## 概述

本次更新修复了 GitHub 连接和仓库浏览功能的多个问题。

## 修复的问题

### 1. GitHub OAuth Scope 权限不足

**问题**：登录后无法获取仓库列表，返回空数组。

**原因**：better-auth 默认只请求 `read:user` 和 `user:email` 权限，没有 `repo` 权限。

**修复**：在 `src/server/auth.ts` 中添加 `repo` scope：

```typescript
socialProviders: {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    scope: ["read:user", "user:email", "repo"], // 添加 repo 权限
  },
},
```

**注意**：修改 scope 后需要用户重新授权才能生效。

### 2. Base UI Menu.Item onSelect 不触发

**问题**：点击 "Add Repository" 按钮没有任何反应，`onSelect` 回调不被调用。

**原因**：Base UI 的 `Menu.Item` 组件的 `onSelect` 事件在某些情况下不会触发，尤其是当需要执行异步操作或打开其他模态框时。

**修复**：使用 `onClick` 替代 `onSelect`：

```typescript
// 修复前（不工作）
<Menu.Item onSelect={handleOpenBrowse}>
  Add Repository
</Menu.Item>

// 修复后
<Menu.Item
  onClick={(e) => {
    e.preventDefault();
    handleOpenBrowse();
  }}
>
  Add Repository
</Menu.Item>
```

### 3. Menu.Positioner 缺失导致报错

**问题**：点击 Sidebar 中会话的菜单按钮报错 `MenuPositionerContext is missing`。

**原因**：Base UI 的 Menu 组件要求在 `Menu.Portal` 内部必须包裹 `Menu.Positioner`。

**修复**：

```typescript
// 修复前
<Menu.Portal>
  <Menu.Popup>...</Menu.Popup>
</Menu.Portal>

// 修复后
<Menu.Portal>
  <Menu.Positioner className="z-50">
    <Menu.Popup>...</Menu.Popup>
  </Menu.Positioner>
</Menu.Portal>
```

### 4. WorkspaceSelector 添加浏览仓库功能

**问题**："Add Repository" 按钮只是刷新列表，没有实际的添加功能。

**修复**：添加了完整的浏览仓库 Modal：

- 点击 "Add Repository" 打开 Modal
- Modal 中显示用户 GitHub 账号下的所有仓库
- 支持添加仓库（clone 到本地）
- 添加后自动选中新仓库

## 文件变更

| 文件 | 说明 |
|------|------|
| `src/server/auth.ts` | 添加 GitHub OAuth repo scope |
| `src/components/WorkspaceSelector.tsx` | 添加浏览仓库 Modal，修复 onClick 事件 |
| `src/components/Sidebar.tsx` | 修复 Menu.Positioner 缺失问题 |
| `src/server/routes/github.routes.ts` | 添加调试日志 |
| `src/server/services/repository.service.ts` | 添加调试日志 |
| `src/server/middleware/auth.middleware.ts` | 添加调试日志 |

## 调试经验

### 问题排查步骤

1. **检查数据库**：确认 `account` 表中有 `access_token` 和正确的 `scope`
2. **测试 GitHub API**：使用 curl 直接调用 GitHub API 验证 token 有效性
3. **检查后端日志**：确认请求是否到达后端
4. **检查前端控制台**：确认前端是否发出请求
5. **检查组件事件**：确认 UI 组件的事件回调是否被触发

### Base UI 组件使用注意事项

1. `Menu.Popup` 必须包裹在 `Menu.Positioner` 内
2. `Menu.Item` 的 `onSelect` 可能不可靠，优先使用 `onClick`
3. OAuth 相关操作使用 `onClick` 而不是 `onSelect`，避免菜单关闭干扰重定向
