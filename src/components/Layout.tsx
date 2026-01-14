import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAppStore } from "../store/useAppStore";
import { useMessageStore } from "../store/useMessageStore";
import { useSessionsStore } from "../store/useSessionsStore";
import { useWorktreeStore } from "../store/useWorktreeStore";
import type { ServerEvent } from "../types";
import { Sidebar } from "./Sidebar";
import { PanelRight } from "lucide-react";

// Message-related event types
const MESSAGE_EVENTS = new Set([
  "session.history",
  "stream.message",
  "stream.user_prompt",
  "permission.request",
  "session.deleted",
]);

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 检查是否在设置页面或聊天页面
  const isSettingsPage = location.pathname === "/settings";
  const isChatPage = location.pathname.startsWith("/chat/");

  // Store event handlers
  const handleAppEvent = useAppStore((state) => state.handleAppEvent);
  const handleSessionEvent = useSessionsStore(
    (state) => state.handleSessionEvent,
  );
  const handleMessageEvent = useMessageStore(
    (state) => state.handleMessageEvent,
  );
  const handleWorktreeEvent = useWorktreeStore(
    (state) => state.handleWorktreeEvent,
  );
  const sessionsLoaded = useSessionsStore((state) => state.sessionsLoaded);

  // Create a ref to store the partial message handler callback
  const partialMessageHandlerRef = useRef<
    ((event: ServerEvent) => void) | null
  >(null);

  // WebSocket setup - dispatch events to appropriate stores
  const onEvent = useCallback(
    (event: ServerEvent) => {
      // Route event to appropriate store based on type
      if (event.type.startsWith("worktree.")) {
        handleWorktreeEvent(event);
      } else if (event.type === "runner.error") {
        handleAppEvent(event);
      } else {
        // Session events go to sessions store
        handleSessionEvent(event);
        // Message-related events also go to message store
        if (MESSAGE_EVENTS.has(event.type)) {
          handleMessageEvent(event);
        }
        // session.status also updates app state (pendingStart)
        if (event.type === "session.status") {
          handleAppEvent(event);
        }
      }

      // Also call partial message handler if registered
      if (partialMessageHandlerRef.current) {
        partialMessageHandlerRef.current(event);
      }
    },
    [
      handleAppEvent,
      handleSessionEvent,
      handleMessageEvent,
      handleWorktreeEvent,
    ],
  );

  const { connected, sendEvent } = useWebSocket(onEvent);

  // Initial session load
  useEffect(() => {
    if (!connected) return;
    sendEvent({ type: "session.list" });
  }, [connected, sendEvent]);

  const handleNewSessionClick = () => {
    navigate("/");
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    sendEvent({ type: "session.delete", payload: { sessionId } });
  };

  return (
    <div className="h-full bg-surface">
      <div className="relative flex h-full flex-col lg:block">
        {/* 移动端：设置页面和聊天页面不显示侧边栏 */}
        {!isSettingsPage && !isChatPage && (
          <Sidebar
            connected={connected}
            onNewSession={handleNewSessionClick}
            onDeleteSession={handleDeleteSession}
            onOpenSettings={() => navigate("/settings")}
            isMobileOpen={isSidebarOpen}
            onMobileClose={() => setIsSidebarOpen(false)}
          />
        )}
        {/* 桌面端：始终显示侧边栏 */}
        {(isSettingsPage || isChatPage) && (
          <div className="hidden lg:block">
            <Sidebar
              connected={connected}
              onNewSession={handleNewSessionClick}
              onDeleteSession={handleDeleteSession}
              onOpenSettings={() => navigate("/settings")}
              isMobileOpen={false}
              onMobileClose={() => {}}
            />
          </div>
        )}

        <main
          className={`relative flex h-full flex-col ${isSettingsPage || isChatPage ? "lg:ml-[280px]" : "lg:ml-[280px]"}`}
        >
          {/* 移动端：设置页面和聊天页面不显示汉堡菜单按钮 */}
          {!isSettingsPage && !isChatPage && (
            <button
              className="fixed left-4 top-4 z-20 rounded-lg p-2 text-ink-700 hover:bg-surface-tertiary lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sessions menu"
            >
              <PanelRight size={20} />
            </button>
          )}

          <Outlet
            context={{
              connected,
              sendEvent,
              sessionsLoaded,
              partialMessageHandlerRef,
            }}
          />
        </main>
      </div>
    </div>
  );
}
