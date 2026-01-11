import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAppStore } from "../store/useAppStore";
import type { ServerEvent } from "../types";
import { SettingsModal } from "./SettingsModal";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const navigate = useNavigate();

  // Store state
  const handleServerEvent = useAppStore((state) => state.handleServerEvent);
  const sessionsLoaded = useAppStore((state) => state.sessionsLoaded);

  // Create a ref to store the partial message handler callback
  const partialMessageHandlerRef = useRef<((event: ServerEvent) => void) | null>(null);

  // WebSocket setup
  const onEvent = useCallback((event: ServerEvent) => {
    handleServerEvent(event);
    // Also call partial message handler if registered
    if (partialMessageHandlerRef.current) {
      partialMessageHandlerRef.current(event);
    }
  }, [handleServerEvent]);

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
        <Sidebar
          connected={connected}
          onNewSession={handleNewSessionClick}
          onDeleteSession={handleDeleteSession}
          onOpenSettings={() => setShowSettingsModal(true)}
          isMobileOpen={isSidebarOpen}
          onMobileClose={() => setIsSidebarOpen(false)}
        />

        <main className="relative flex min-h-full flex-col lg:ml-[280px]">
          <button
            className="fixed left-4 top-4 z-20 rounded-full border border-ink-900/10 bg-white p-2 text-ink-700 shadow-sm hover:bg-surface-tertiary lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sessions menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <Outlet context={{ connected, sendEvent, sessionsLoaded, partialMessageHandlerRef }} />
        </main>
      </div>

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
}
