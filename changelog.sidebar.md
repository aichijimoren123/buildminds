# Sidebar & Settings Mobile Optimization Changelog

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
