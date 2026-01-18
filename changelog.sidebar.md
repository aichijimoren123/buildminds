# Sidebar & Settings Mobile Optimization Changelog

## 2026-01-18 - Sidebar 模式切换重构

### 概述

重构 Sidebar 组件，引入 Normal/Code 双模式切换，移除 WorkspaceSelector，改进会话列表展示，新增用户资料区域。

### 新增功能

#### 模式切换 (Normal/Code)

- **Header 区域重新设计**：
  - 左侧：模式切换按钮组（圆角容器内两个按钮）
    - `MessageSquare` 图标：Normal 模式（普通会话）
    - `Code2` 图标：Code 模式（工作区会话）
  - 右侧：圆形 `+` 按钮（创建新会话）

- **模式行为**：
  - **Normal 模式**：显示没有关联 workspace 的会话
  - **Code 模式**：显示所有关联 workspace 的会话（跨所有 workspace）

#### 会话列表改进

- **Sessions 标题栏**：
  - 左侧显示 "Sessions" 标签
  - 右侧新增 Filter 图标按钮（预留功能）

- **会话项显示**：
  - 标题：会话名称，运行中状态显示为蓝色
  - 副标题：
    - Normal 模式：仅显示相对时间（如 "2d ago"）
    - Code 模式：显示相对时间 + workspace 名称（如 "2d ago 12products/poke-backend"）
  - 分支徽章：仅在 Code 模式下显示关联的 git 分支

#### 用户资料区域（底部）

- **已登录状态**：
  - 用户头像（或首字母占位符）
  - 用户名
  - Code 模式下显示 workspace 数量（如 "3 workspaces"）
  - 下拉菜单入口（ChevronDown 图标）
  - 菜单包含 Settings 选项

- **未登录状态**：
  - 显示简单的 Settings 按钮

### 移除内容

- **WorkspaceSelector 组件**：不再从 Sidebar 导入和使用
- **连接状态指示器**：移除 "Connected/Offline" 状态徽章
- **旧版 "+ New Session" 按钮**：替换为圆形 `+` 按钮
- **`connected` prop**：从 SidebarProps 中移除

### 技术实现

#### 会话过滤逻辑

```typescript
const sessionList = useMemo(() => {
  const allSessions = Object.values(sessions);
  let filtered: typeof allSessions;

  if (sessionMode === "normal") {
    // Normal 模式：显示没有 workspace 关联的会话
    filtered = allSessions.filter((s) => !s.githubRepoId);
  } else {
    // Code 模式：显示所有有 workspace 关联的会话
    filtered = allSessions.filter((s) => !!s.githubRepoId);
  }

  return filtered.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}, [sessions, sessionMode]);
```

#### 相对时间格式化

```typescript
const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return "";
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${weeks}w ago`;
};
```

#### Workspace 信息获取

```typescript
// 在 Code 模式下加载 repos
useEffect(() => {
  if (sessionMode === "workspace" && authenticated && !hasLoadedRepos && !loadingRepos) {
    loadRepos();
  }
}, [sessionMode, authenticated, hasLoadedRepos, loadingRepos]);

// 创建 workspace ID 到 repo 信息的映射
const repoMap = useMemo(() => {
  const map: Record<string, GithubRepo> = {};
  for (const repo of repos) {
    map[repo.id] = repo;
  }
  return map;
}, [repos]);
```

### 文件变更

#### 修改文件

- `src/components/Sidebar.tsx`
  - 新增导入：`Code2`, `Filter`, `MessageSquare`, `Plus`, `ChevronDown`
  - 新增导入：`useAuth` hook, `SessionMode` type
  - 移除导入：`WorkspaceSelector`
  - 重写 Header 区域
  - 重写会话列表渲染逻辑
  - 新增用户资料区域
  - 移除 `connected` prop

- `src/components/Layout.tsx`
  - 移除 Sidebar 组件的 `connected` prop

### 视觉设计

#### 模式切换按钮组

```jsx
<div className="flex items-center gap-1 p-1 rounded-xl bg-bg-000 border border-border-100/10">
  <button className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
    sessionMode === "normal"
      ? "bg-bg-200 text-text-100"
      : "text-text-400 hover:text-text-200"
  }`}>
    <MessageSquare className="w-4 h-4" />
  </button>
  {/* Code 模式按钮类似 */}
</div>
```

#### 新建会话按钮

```jsx
<button className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white hover:bg-accent/90 transition-colors">
  <Plus className="w-4 h-4" />
</button>
```

#### 会话项样式

- 移除边框，改用更简洁的背景色变化
- 活动状态：`bg-bg-200`
- 悬停状态：`hover:bg-bg-200/50`
- 间距减小：`gap-1`（原 `gap-2`）

### 状态管理

使用 `useAppStore` 中的 `sessionMode` 状态：

```typescript
export type SessionMode = "normal" | "workspace";

// Store state
const sessionMode = useAppStore((state) => state.sessionMode);
const setSessionMode = useAppStore((state) => state.setSessionMode);
```

### 待优化项

- [ ] Filter 按钮功能实现（按状态、时间排序等）
- [ ] Code 模式下按 workspace 分组显示
- [ ] 会话搜索功能
- [ ] 拖拽排序会话
- [ ] 会话固定/收藏功能

---

## 2026-01-14 - 移动端设置页面优化

### 新增功能

#### 独立设置页面 (`/settings`)
- 将设置从弹窗模式改为独立页面路由
- 移动端采用两级页面结构：
  - **第一级**：设置菜单列表（包含用户信息卡片）
  - **第二级**：具体设置详情页面
- 桌面端保持侧边栏 + 内容区域的布局

#### 移动端交互优化
- **滑动手势支持**：从屏幕左边缘向右滑动可返回上一级
  - 触发条件：从左边缘 50px 内开始，滑动超过 80px
- **页面过渡动画**：
  - 进入详情页：从右侧滑入 + 淡入效果
  - 返回列表：向左滑出 + 淡出效果
  - 动画时长：200ms
- **触摸反馈**：
  - 按钮点击时有缩放效果 (`active:scale-[0.98]` / `active:scale-[0.99]`)
  - Toggle 开关增大到 `h-7 w-12`（原 `h-6 w-11`）
  - 返回按钮增大到 `p-2.5`

#### iOS 安全区域适配
- 新增 CSS 工具类：
  - `.safe-top`：适配顶部刘海屏
  - `.safe-bottom`：适配底部 Home 指示器
  - `.pb-safe`：底部内边距自动适配安全区域

### 设置页面内容

#### 账户页面
- 用户头像和基本信息展示
- 邮箱信息
- 订阅方案显示和升级入口

#### 设置页面
- **通用设置**：
  - 语言选择（简体中文、English、日本語）
- **外观设置**：
  - 主题切换（浅色、深色、自动）
  - 带预览卡片的视觉选择器
- **通知设置**：
  - 接收独家内容开关
  - 任务开始通知开关
- **隐私设置**：
  - Cookies 管理入口
- **帮助与支持**
- **退出登录**

### Layout 组件改进

#### 路由感知
- 使用 `useLocation` 检测当前路由
- 设置页面 (`/settings`) 在移动端有特殊处理

#### 移动端设置页面
- **不显示侧边栏**：避免与设置页面自身导航冲突
- **不显示汉堡菜单按钮**：防止遮挡设置页面的返回按钮
- 设置页面拥有完全独立的导航控制

#### 桌面端设置页面
- 保持显示侧边栏（使用 `hidden lg:block`）
- 保持左侧边距 `lg:ml-[280px]`

### 视觉设计

#### 移动端菜单列表
- **用户卡片**：
  - 圆形头像（`h-12 w-12`）
  - 用户名和订阅方案信息
  - 独立卡片样式
- **菜单项组**：
  - 合并为一个卡片组
  - 首尾圆角，中间项无圆角
  - 图标尺寸 `h-9 w-9`
  - 右侧箭头指示
- **底部操作**：
  - 帮助与支持按钮
  - 退出登录按钮（独立样式）
  - 版本号显示

#### 设置详情页
- 分组标题：小号大写字母，灰色
- 卡片式布局：白色背景，圆角 `rounded-2xl`
- Toggle 开关：橙色主题色（`bg-accent`）
- 主题选择器：带预览的卡片式选择

### 技术实现

#### 状态管理
```typescript
const [activeSection, setActiveSection] = useState<string | null>(null);
const [isAnimating, setIsAnimating] = useState(false);
const [slideDirection, setSlideDirection] = useState<"in" | "out">("in");
```

#### 滑动手势
```typescript
const handleTouchStart = (e: React.TouchEvent) => {
  touchStartX.current = e.touches[0].clientX;
};

const handleTouchEnd = () => {
  const diff = touchEndX.current - touchStartX.current;
  if (diff > 80 && touchStartX.current < 50 && activeSection) {
    handleBack();
  }
};
```

#### 页面过渡
```css
.transition-all duration-200 ease-out
opacity-0 -translate-x-8 pointer-events-none  /* 隐藏状态 */
opacity-100 translate-x-0                      /* 显示状态 */
```

### 文件变更

#### 新增文件
- `src/pages/Settings.tsx` - 独立设置页面组件

#### 修改文件
- `src/App.tsx` - 添加 `/settings` 路由
- `src/components/Layout.tsx` - 添加路由感知和条件渲染
- `src/components/Sidebar.tsx` - 设置按钮改为导航到 `/settings`
- `src/index.css` - 添加安全区域和过渡动画 CSS

#### 移除依赖
- `src/components/SettingsModal.tsx` - 不再使用（保留用于桌面端参考）

### 响应式断点

- **移动端**：`< 1024px` (lg 断点以下)
  - 两级页面结构
  - 全屏显示
  - 滑动手势支持
  
- **桌面端**：`>= 1024px` (lg 断点及以上)
  - 侧边栏 + 内容区域布局
  - 固定宽度侧边栏 `w-72`
  - 内容区域最大宽度 `max-w-2xl`

### 用户体验改进

1. **更大的触摸目标**：所有交互元素至少 44x44px
2. **清晰的视觉层级**：使用分组、间距和颜色区分
3. **即时反馈**：触摸时的缩放和背景色变化
4. **流畅动画**：200ms 的过渡动画，不会感觉迟钝
5. **手势支持**：符合移动端用户习惯的滑动返回
6. **安全区域适配**：在刘海屏和全面屏设备上正确显示

### 待优化项

- [ ] 添加设置项的实际功能实现
- [ ] 连接后端 API 保存用户设置
- [ ] 实现其他菜单项的详情页面
- [ ] 添加设置项搜索功能
- [ ] 支持深色模式
- [ ] 添加设置项的权限控制

### 兼容性

- iOS Safari 12+
- Android Chrome 80+
- 支持触摸和鼠标操作
- 响应式设计，适配各种屏幕尺寸

---

## 设计参考

参考了 Claude.ai 官网的设置页面设计：
- 简洁的视觉风格
- 清晰的信息层级
- 优秀的移动端交互
- 温暖的配色方案（橙棕色调）
