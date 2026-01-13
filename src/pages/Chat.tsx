import { useEffect } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { ChatTabs } from "../components/ChatTabs";
import { ChatTabContent } from "../components/ChatTabContent";
import { PromptInput } from "../components/PromptInput";
import { useSessionsStore } from "../store/useSessionsStore";
import { useTabsStore, useActiveTab, useTabs } from "../store/useTabsStore";
import type { ClientEvent, ServerEvent } from "../types";

interface LayoutContext {
  connected: boolean;
  sendEvent: (event: ClientEvent) => void;
  sessionsLoaded: boolean;
  partialMessageHandlerRef: React.MutableRefObject<
    ((event: ServerEvent) => void) | null
  >;
}

export function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { sendEvent, partialMessageHandlerRef } =
    useOutletContext<LayoutContext>();
  const navigate = useNavigate();

  const sessions = useSessionsStore((state) => state.sessions);
  const setActiveSessionId = useSessionsStore(
    (state) => state.setActiveSessionId
  );

  // Tab store
  const tabs = useTabs();
  const activeTab = useActiveTab();
  const removeTab = useTabsStore((state) => state.removeTab);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const getOrCreateTabForSession = useTabsStore(
    (state) => state.getOrCreateTabForSession
  );
  const updateTabLabel = useTabsStore((state) => state.updateTabLabel);

  // Sync URL sessionId with tab store
  useEffect(() => {
    if (sessionId && sessions[sessionId]) {
      const session = sessions[sessionId];
      getOrCreateTabForSession(sessionId, session.title || "Chat");
      setActiveSessionId(sessionId);
    }
  }, [sessionId, sessions, getOrCreateTabForSession, setActiveSessionId]);

  // Update tab label when session title changes
  useEffect(() => {
    if (activeTab?.sessionId && sessions[activeTab.sessionId]) {
      const session = sessions[activeTab.sessionId];
      if (session.title && activeTab.label !== session.title) {
        updateTabLabel(activeTab.id, session.title);
      }
    }
  }, [activeTab, sessions, updateTabLabel]);

  // Redirect to home if session doesn't exist
  useEffect(() => {
    if (sessionId && Object.keys(sessions).length > 0 && !sessions[sessionId]) {
      navigate("/");
    }
  }, [sessionId, sessions, navigate]);

  const handleTabClick = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      setActiveTab(tabId);
      if (tab.sessionId) {
        navigate(`/chat/${tab.sessionId}`);
      }
    }
  };

  const handleTabClose = (tabId: string) => {
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    removeTab(tabId);

    // Navigate to another tab if we closed the active one
    if (activeTab?.id === tabId) {
      const remainingTabs = tabs.filter((t) => t.id !== tabId);
      if (remainingTabs.length > 0) {
        const newTab =
          remainingTabs[Math.min(tabIndex, remainingTabs.length - 1)];
        if (newTab.sessionId) {
          navigate(`/chat/${newTab.sessionId}`);
        } else {
          navigate("/");
        }
      } else {
        navigate("/");
      }
    }
  };

  const handleAddTab = () => {
    navigate("/");
  };

  return (
    <div className="flex h-full flex-col bg-surface-cream">
      {/* Tab bar */}
      <ChatTabs
        tabs={tabs}
        activeTabId={activeTab?.id ?? null}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onAddTab={handleAddTab}
      />

      {/* Tab content */}
      <ChatTabContent
        tab={activeTab}
        sendEvent={sendEvent}
        partialMessageHandlerRef={partialMessageHandlerRef}
      />

      {/* Prompt input */}
      <PromptInput sendEvent={sendEvent} />
    </div>
  );
}
