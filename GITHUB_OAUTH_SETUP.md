# GitHub OAuth 设置指南

## 问题已修复

✅ 删除了与 better-auth 冲突的自定义 users schema
✅ 重命名 `sessions` 表为 `claude_sessions`（避免与 better-auth 的 session 表冲突）
✅ 初始化了数据库表结构
✅ Better-auth 现在可以正常工作

## 设置步骤

### 1. 创建 GitHub OAuth 应用

访问：https://github.com/settings/developers

1. 点击 **"New OAuth App"**
2. 填写应用信息：
   - **Application name**: Claude Code WebUI（或任意名称）
   - **Homepage URL**: `http://127.0.0.1:10086`
   - **Authorization callback URL**: `http://127.0.0.1:10086/api/auth/callback/github`
3. 点击 **"Register application"**
4. 记下你的 **Client ID**
5. 点击 **"Generate a new client secret"** 并记下 **Client Secret**

### 2. 配置环境变量

复制 `.env.example` 到 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 GitHub OAuth 凭据：

```bash
# GitHub OAuth (必填)
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# 服务器地址（如果使用不同的端口或域名，请修改）
PUBLIC_URL=http://127.0.0.1:10086

# 其他必需配置
ANTHROPIC_AUTH_TOKEN=your_anthropic_api_key_here
```

### 3. 启动服务器

```bash
bun run dev
```

### 4. 测试 OAuth 流程

1. 打开浏览器访问：`http://127.0.0.1:10086`
2. 点击 "Login with GitHub" 按钮
3. 你会被重定向到 GitHub 授权页面
4. 授权后，你会被重定向回应用并自动登录

## Better-auth 表结构

Better-auth 会在第一次 OAuth 请求时自动创建以下表：

- `user` - 用户信息（id, name, email, emailVerified, image, createdAt, updatedAt）
- `session` - 认证会话（id, expiresAt, ipAddress, userAgent, userId）
- `account` - OAuth 账户（id, accountId, providerId, userId, accessToken, refreshToken, etc.）
- `verification` - 验证码（id, identifier, value, expiresAt）

## 应用表结构

我们的应用使用以下表（已创建）：

- `claude_sessions` - Claude 对话会话
- `messages` - 会话消息
- `settings` - 应用设置
- `github_repos` - GitHub 仓库信息

## 数据库架构

```
webui.db
├── user (better-auth)
├── session (better-auth)
├── account (better-auth)
├── verification (better-auth)
├── claude_sessions (app)
├── messages (app)
├── settings (app)
└── github_repos (app)
```

## 常见问题

### Q: 我仍然看到 404 错误

**A**: 确保：
1. `.env` 文件存在并包含正确的 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET`
2. GitHub OAuth 应用的 callback URL 设置为 `http://127.0.0.1:10086/api/auth/callback/github`
3. 服务器正在运行（`bun run dev`）

### Q: Better-auth 表在哪里？

**A**: Better-auth 会在第一次 OAuth 请求时自动创建表。运行以下命令查看所有表：

```bash
sqlite3 webui.db ".tables"
```

### Q: 如何重置数据库？

**A**:

```bash
rm webui.db webui.db-shm webui.db-wal
bun scripts/init-db.ts
```

然后重启服务器，better-auth 会重新创建认证表。

## 验证设置

运行以下命令验证数据库表是否正确创建：

```bash
sqlite3 webui.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

你应该看到：
- claude_sessions
- github_repos
- messages
- settings

在第一次 OAuth 请求后，你还会看到：
- user
- session
- account
- verification
