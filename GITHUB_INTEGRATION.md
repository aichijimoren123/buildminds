# GitHub集成使用指南

## 🎉 已完成的功能

GitHub集成的核心后端功能已经实现！包括：

### 后端功能 ✅
- ✅ GitHub OAuth认证系统
- ✅ 用户管理（users表）
- ✅ GitHub仓库管理（github_repos表）
- ✅ Session与GitHub repo关联
- ✅ 仓库克隆、拉取、提交、推送功能
- ✅ RESTful API路由
- ✅ 认证中间件

### 前端组件 ✅
- ✅ `useAuth` Hook - 管理认证状态
- ✅ `GitHubAuthButton` - GitHub登录/登出按钮
- ✅ `GitHubRepoSelector` - 仓库选择器组件

## 📋 使用步骤

### 1. 配置GitHub OAuth

首先，在GitHub上创建一个OAuth应用：

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写信息：
   - **Application name**: Claude Code WebUI
   - **Homepage URL**: `http://localhost:10086`
   - **Authorization callback URL**: `http://localhost:10086/api/auth/github/callback`
4. 获取 `Client ID` 和 `Client Secret`

### 2. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# 应用URL
PUBLIC_URL=http://localhost:10086

# GitHub仓库存储路径（可选，默认 ./.claude-repos）
GITHUB_REPOS_PATH=./.claude-repos

# 其他必需配置
PORT=10086
DB_PATH=./webui.db
ANTHROPIC_AUTH_TOKEN=your_anthropic_key
```

### 3. 启动应用

```bash
# 开发模式
bun run dev

# 生产模式
bun run build
bun run start
```

## 🔧 集成前端UI（待完成）

虽然核心功能已实现，但还需要在前端页面中集成这些组件：

### 需要集成到现有页面：

#### 1. 在 `src/components/Sidebar.tsx` 中添加 GitHubAuthButton

```tsx
import { GitHubAuthButton } from "./GitHubAuthButton";

// 在Sidebar顶部添加
<div className="p-4 border-b">
  <GitHubAuthButton />
</div>
```

#### 2. 在 `src/pages/Home.tsx` 中集成仓库选择

修改 Advanced Options部分，添加tab切换：

```tsx
import { GitHubRepoSelector } from "../components/GitHubRepoSelector";
import { useAuth } from "../hooks/useAuth";

// 添加状态
const [sourceType, setSourceType] = useState<"local" | "github">("local");
const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
const { authenticated } = useAuth();

// 在Advanced Options中添加tab切换
{showAdvanced && (
  <div>
    {/* Tab切换 */}
    <div className="flex gap-2 mb-4">
      <button onClick={() => setSourceType("local")}>
        Local Directory
      </button>
      <button onClick={() => setSourceType("github")} disabled={!authenticated}>
        GitHub Repository
      </button>
    </div>

    {/* 内容区域 */}
    {sourceType === "local" ? (
      <input value={cwd} onChange={(e) => setCwd(e.target.value)} />
    ) : (
      <GitHubRepoSelector
        onSelect={(repoId, localPath) => {
          setSelectedRepoId(repoId);
          setCwd(localPath);
        }}
        selectedRepoId={selectedRepoId}
      />
    )}
  </div>
)}
```

## 🔌 API端点

### 认证相关
- `GET /api/auth/github` - 跳转到GitHub OAuth授权
- `GET /api/auth/github/callback` - OAuth回调
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/logout` - 退出登录

### GitHub仓库管理
- `GET /api/github/repos` - 列出已添加的仓库
- `GET /api/github/browse` - 浏览GitHub上的所有仓库
- `POST /api/github/repos` - 添加（克隆）仓库
  ```json
  { "repoFullName": "owner/repo-name" }
  ```
- `GET /api/github/repos/:repoId` - 获取仓库详情
- `POST /api/github/repos/:repoId/sync` - 同步仓库（git pull）
- `GET /api/github/repos/:repoId/status` - 获取仓库状态
- `POST /api/github/repos/:repoId/commit` - 提交并推送更改
  ```json
  { "message": "commit message" }
  ```
- `DELETE /api/github/repos/:repoId` - 删除仓库

## 📊 数据库Schema

### users 表
存储GitHub用户信息和access token。

### github_repos 表
存储已克隆的GitHub仓库信息，包括本地路径、最后同步时间等。

### sessions 表（已扩展）
添加了 `userId` 和 `githubRepoId` 字段，用于关联用户和GitHub仓库。

## 🧪 测试流程

### 1. 测试GitHub认证

```bash
# 启动应用
bun run dev

# 访问 http://localhost:10086
# 点击 "Connect GitHub" 按钮
# 完成GitHub OAuth授权
# 验证用户信息显示在右上角
```

### 2. 测试仓库管理

```bash
# 使用curl测试API（需要先登录并获取cookie）

# 浏览可用仓库
curl -b cookies.txt http://localhost:10086/api/github/browse

# 添加仓库
curl -b cookies.txt -X POST http://localhost:10086/api/github/repos \
  -H "Content-Type: application/json" \
  -d '{"repoFullName": "owner/repo"}'

# 列出已添加的仓库
curl -b cookies.txt http://localhost:10086/api/github/repos

# 同步仓库
curl -b cookies.txt -X POST http://localhost:10086/api/github/repos/REPO_ID/sync
```

### 3. 测试Session创建

创建一个使用GitHub仓库的session，cwd应该指向clone的本地路径。

## 📝 下一步

要完成前端集成，还需要：

1. ✅ 在Sidebar添加GitHubAuthButton
2. ✅ 在Home页面集成GitHubRepoSelector
3. ✅ 修改session创建逻辑，支持传递`githubRepoId`
4. ✅ 添加仓库同步按钮（在session运行前自动同步）
5. ✅ 添加commit/push功能到UI（可选，通过Claude命令行工具实现）

## 🐛 故障排除

### 问题1：OAuth回调失败
- 确保 `.env` 中的 `PUBLIC_URL` 正确
- 确保GitHub OAuth App的回调URL正确配置

### 问题2：仓库克隆失败
- 检查access token权限（需要`repo`权限）
- 确保有足够的磁盘空间
- 检查网络连接

### 问题3：认证状态丢失
- 检查cookie设置（`httpOnly`, `sameSite`）
- 开发模式下可能需要使用`secure: false`

## 🎯 核心文件清单

### 后端
- `src/server/db/schema/users.schema.ts`
- `src/server/db/schema/github-repos.schema.ts`
- `src/server/services/auth.service.ts`
- `src/server/services/github.service.ts`
- `src/server/services/repository.service.ts`
- `src/server/routes/auth.routes.ts`
- `src/server/routes/github.routes.ts`
- `src/server/middleware/auth.middleware.ts`
- `src/server/repositories/user.repository.ts`
- `src/server/repositories/github-repo.repository.ts`

### 前端
- `src/hooks/useAuth.ts`
- `src/components/GitHubAuthButton.tsx`
- `src/components/GitHubRepoSelector.tsx`

### 配置
- `.env.example` - 环境变量模板
- `scripts/run-migration.ts` - 数据库迁移脚本

---

**作者**: Claude Sonnet 4.5
**最后更新**: 2026-01-11
