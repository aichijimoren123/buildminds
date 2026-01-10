# Claude Code WebUI

**Claude Code —— 现在就在你的浏览器中。任何地方都可以使用。**

一个**基于 Web 的 Claude Code**，可以在**桌面、手机和 iPad**上运行，
同时**与你本地的 Claude Code 共享完全相同的配置**。

> 无需云端重写。
> 无供应商锁定。
> 就是 Claude Code —— 随时随地。

![截图](./assets/ScreenShot_1.png)

---

## ✨ 为什么选择 Claude Code WebUI？

Claude Code 很强大 —— 但它**受限于终端**。

这意味着：
- ❌ 无法在手机或 iPad 上使用
- ❌ 难以远程访问
- ❌ 不适合演示、监控或快速编辑

**Claude Code WebUI 通过以下方式解决了这些问题：**

- 🌍 在**你的浏览器中**运行 Claude Code
- 📱 支持**手机和 iPad**
- 🔁 重用你现有的 **`~/.claude/settings.json`**
- 🧠 保持与本地 Claude Code **100% 兼容**

如果 Claude Code 在你的机器上能正常运行 ——
**它在这里也能正常运行。**

---

## 🚀 快速开始（10 秒）

### 1. 前置条件

确保你已经安装了 **Bun** 和 **Claude Code**。

```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 安装 Claude Code
npm install -g @anthropic-ai/claude-code
```

---

### 2. 运行 Claude Code WebUI

```bash
bunx @devagentforge/claude-code-webui@latest
```

打开你的浏览器：

```text
http://localhost:10086
```

✅ 就这么简单。

---

### 更改端口（可选）

```bash
PORT=3000 bunx @devagentforge/claude-code-webui@latest
```

---

## 🧠 核心功能

### 🤖 浏览器中的 Claude Code

* 与 Claude Code 的自然语言交互
* **实时流式输出**（逐字显示）
* Markdown + 语法高亮代码渲染
* 简洁的 Claude 风格界面

---

### 📂 会话和工作区管理

* 创建带有**自定义工作目录**的会话
* 恢复之前的任何对话
* 完整的本地会话历史（SQLite 支持）
* 安全删除和自动持久化

---

### 🔐 工具权限控制

* 明确批准工具执行
* 每个工具的允许/拒绝
* 批量权限策略
* 手动处理 AskUserQuestion 流程

---

### 📱 移动优先的 UI

* 完全响应式（桌面/手机/iPad）
* Claude 风格浅色主题
* 快速会话切换
* 触屏友好交互

---

## 🔁 与本地 Claude Code 完全兼容

Claude Code WebUI**没有重新发明配置**。

它直接复用：

```text
~/.claude/settings.json
```

这意味着：

* 相同的 API 密钥
* 相同的基础 URL
* 相同的模型
* 相同的行为

> 一次配置 Claude Code —— 随时随地使用。

---

## 🧩 架构概述

### 前端

* React 19 + TypeScript
* Tailwind CSS 4
* Radix UI
* Zustand
* Markdown + 语法高亮
* 流式优先渲染

### 后端

* Bun 运行时
* Hono Web 框架
* 基于 WebSocket 的流式传输
* SQLite（WAL 模式）
* Claude Agent SDK

---

## 🛠 从源码运行

```bash
git clone https://github.com/DevAgentForge/claude-code-webui.git
cd claude-code-webui

bun install
bun run build
bun run start
```

---

## ⚙️ 环境变量

```bash
PORT=10086
DB_PATH=./webui.db
CORS_ORIGIN=*
```

Claude 相关配置与 Claude Code 共享：

* `ANTHROPIC_AUTH_TOKEN`
* `ANTHROPIC_BASE_URL`
* `ANTHROPIC_MODEL`
* `ANTHROPIC_DEFAULT_SONNET_MODEL`
* `ANTHROPIC_DEFAULT_OPUS_MODEL`
* `ANTHROPIC_DEFAULT_HAIKU_MODEL`
* `API_TIMEOUT_MS`
* `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`

---

## 🗺 路线图

计划中的功能：

* 🌐 基于 Web 的基础 URL 和 API Key 配置
* 🐙 使用 **GitHub 仓库作为工作目录**
* 🧠 部分替代 Claude Code Web
* 👥 多会话和多代理改进
* 🚧 更多功能即将推出

---

## 🤝 贡献

欢迎提交 PR。

1. Fork 这个仓库
2. 创建你的功能分支
3. 提交你的更改
4. 打开 Pull Request

---

## ⭐ 最后说明

如果你曾经想要：

* 在手机上使用 Claude Code
* 在 iPad 上使用 Claude Code
* 无需终端使用 Claude Code

这个项目就是为你准备的。

👉 **如果对你有帮助，请给个 Star。**
