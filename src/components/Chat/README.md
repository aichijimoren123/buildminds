# Chat Components

这个文件夹包含与聊天标签页（Tabs）相关的组件。

## 组件列表

### ChatTitleBar
聊天页面顶部的标题栏组件，显示当前会话的信息。

**功能：**
- 显示会话标题和状态
- 显示工作目录
- 显示关联的 Git 分支
- 显示最后更新时间
- 移动端显示返回按钮

**状态：** 已启用

### ChatTabs
顶部的标签页栏组件，用于显示和管理多个聊天会话标签。

**功能：**
- 显示多个聊天标签
- 切换活动标签
- 关闭标签
- 添加新标签

**状态：** 当前已暂时隐藏，但代码保留以备将来使用

### ChatTabContent
标签页内容组件，显示当前活动标签的聊天内容。

**功能：**
- 显示聊天消息流
- 处理权限请求
- 显示部分消息（流式输出）
- 支持 "Changes" 视图（待实现）

## 使用方式

```tsx
import { ChatTitleBar, ChatTabs, ChatTabContent } from "../components/Chat";

// 在页面中使用
<ChatTitleBar session={currentSession} />

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
```

## 移动端交互

- **Chat 页面作为二级页面**：在移动端，Chat 页面不显示侧边栏和汉堡菜单
- **返回导航**：通过 TitleBar 的返回按钮返回到会话列表
- **桌面端**：保持侧边栏始终可见

## 相关 Store

- `useTabsStore` - 管理标签页状态
- `useMessageStore` - 管理消息状态
- `useSessionsStore` - 管理会话状态
- `useWorktreeStore` - 管理工作树状态
