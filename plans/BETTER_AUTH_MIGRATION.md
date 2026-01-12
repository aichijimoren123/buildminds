# BetterAuth 迁移完成

## 概述

已成功将项目从自定义 OAuth 实现迁移到 BetterAuth。

## 更改的文件

### 新增文件

- `src/server/auth.ts` - BetterAuth 配置
- `src/lib/auth-client.ts` - 前端认证客户端
- `src/server/repositories/user.repository.ts` - 用户仓库（重写以支持 BetterAuth 表结构）

### 修改的文件

- `src/server/routes/index.ts` - 使用 BetterAuth handler
- `src/server/routes/github.routes.ts` - 添加类型支持
- `src/server/middleware/auth.middleware.ts` - 使用 BetterAuth session API
- `src/hooks/useAuth.ts` - 使用 BetterAuth React hooks
- `src/components/GitHubAuthButton.tsx` - 使用 BetterAuth signIn

### 删除的文件

- `src/server/routes/auth.routes.ts` - 不再需要自定义路由
- `src/server/services/auth.service.ts` - BetterAuth 内置
- 旧的 `src/server/repositories/user.repository.ts` - 已重写

## 环境变量配置

确保 `.env` 文件包含以下变量：

```bash
# GitHub OAuth (从 https://github.com/settings/developers 获取)
GITHUB_CLIENT_ID=你的_client_id
GITHUB_CLIENT_SECRET=你的_client_secret

# 公共 URL
PUBLIC_URL=http://localhost:10086
```

## BetterAuth 数据库表

BetterAuth 会自动创建以下表：

- `user` - 用户基本信息
- `session` - 会话管理
- `account` - OAuth 账户和 access tokens
- `verification` - 验证令牌

## API 端点

BetterAuth 自动提供以下端点：

- `GET /api/auth/session` - 获取当前会话
- `POST /api/auth/sign-out` - 登出
- `GET /api/auth/sign-in/social` - 社交登录（GitHub）
- 以及其他标准认证端点

## 前端使用

```tsx
import { useSession, signIn, signOut } from "../lib/auth-client";

// 使用会话
const { data: session, isPending } = useSession();

// GitHub 登录
await signIn.social({ provider: "github", callbackURL: "/" });

// 登出
await signOut();
```

## 验证迁移

1. 启动开发服务器：

```bash
bun run dev
```

2. 访问 http://localhost:10086

3. 点击 "Connect GitHub" 按钮

4. 完成 OAuth 流程

5. 验证用户信息显示正确

## 优势

- ✅ 生产级认证解决方案
- ✅ 自动处理 OAuth 流程
- ✅ 内置安全防护（CSRF、XSS 等）
- ✅ TypeScript 完整支持
- ✅ 易于扩展（支持多种认证方式）
- ✅ 维护成本低

## 故障排除

### "GitHub OAuth not configured" 错误

- 确保环境变量 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 已设置
- 重启开发服务器以加载新的环境变量

### 会话无法获取

- 检查浏览器控制台是否有 CORS 错误
- 确保 `PUBLIC_URL` 配置正确
- 清除浏览器 cookies 后重试

### 数据库错误

- BetterAuth 会自动创建所需的表
- 如果遇到表结构问题，可以删除数据库文件重新开始
- 检查 SQLite 数据库文件权限

## 下一步

BetterAuth 支持许多额外功能，可以根据需要启用：

- 双因素认证 (2FA)
- 邮箱/密码登录
- 魔法链接登录
- 多设备会话管理
- 更多 OAuth 提供商（Google, Facebook 等）

参考文档：https://www.better-auth.com/docs
