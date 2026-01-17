import { useEffect } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { ChatTabContent } from "../components/Chat/ChatTabContent";
import { ChatTitleBar } from "../components/Chat/ChatTitleBar";
import { InfoPanel } from "../components/InfoPanel";
import { PromptInput } from "../components/PromptInput";
import { useSessionMessages } from "../store/useMessageStore";
import { useSessionsStore } from "../store/useSessionsStore";
import { useActiveTab, useTabs, useTabsStore } from "../store/useTabsStore";
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
    (state) => state.setActiveSessionId,
  );

  // Tab store
  const tabs = useTabs();
  const activeTab = useActiveTab();
  const removeTab = useTabsStore((state) => state.removeTab);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const getOrCreateTabForSession = useTabsStore(
    (state) => state.getOrCreateTabForSession,
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

  // Get current session
  const currentSession = sessionId ? sessions[sessionId] : undefined;

  // Get message count for InfoPanel
  const sessionMessages = useSessionMessages(sessionId);
  const messageCount = sessionMessages?.messages?.length ?? 0;

  // Handle file click in InfoPanel - navigate to review
  const handleFileClick = (filePath: string, index: number) => {
    if (sessionId) {
      navigate(`/chat/${sessionId}/review/${index}`);
    }
  };

  return (
    <div className="flex h-full w-full bg-bg-100 overflow-hidden">
      {/* Main content area with optional InfoPanel */}
      <div className="flex flex-1 min-h-0 min-w-0">
        {/* Chat content - flexible width */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Title bar - only in content area */}
          <ChatTitleBar session={currentSession} />

          {/* Tab bar - temporarily hidden */}
          {/* <ChatTabs
            tabs={tabs}
            activeTabId={activeTab?.id ?? null}
            onTabClick={handleTabClick}
            onTabClose={handleTabClose}
            onAddTab={handleAddTab}
          /> */}

          {/* Tab content */}
          <ChatTabContent
            tab={activeTab}
            sendEvent={sendEvent}
            partialMessageHandlerRef={partialMessageHandlerRef}
          />

          {/* Prompt input */}
          <PromptInput sendEvent={sendEvent} />
        </div>

        {/* InfoPanel - desktop only, completely hidden on smaller screens */}
        <div className="hidden xl:flex xl:w-80 xl:shrink-0">
          <InfoPanel
            status={currentSession?.status ?? "idle"}
            messageCount={messageCount}
            fileChanges={currentSession?.fileChanges}
            cwd={currentSession?.cwd}
            createdAt={currentSession?.createdAt}
            worktreeId={currentSession?.worktreeId}
            onFileClick={handleFileClick}
          />
        </div>
      </div>
    </div>
  );
}
