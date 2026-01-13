import { X, Plus, MessageSquare, GitCompare } from "lucide-react";
import type { Tab } from "../store/useTabsStore";

interface ChatTabsProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: () => void;
}

export function ChatTabs({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onAddTab,
}: ChatTabsProps) {
  const getTabIcon = (tab: Tab) => {
    if (tab.type === "changes") {
      return <GitCompare className="w-3.5 h-3.5" />;
    }
    return <MessageSquare className="w-3.5 h-3.5" />;
  };

  const getTabLabel = (tab: Tab) => {
    if (tab.label) return tab.label;
    if (tab.type === "changes") return "Changes";
    return "New Chat";
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center border-b border-ink-900/10 bg-surface-secondary/50">
      {/* Scrollable tab container */}
      <div className="flex-1 overflow-x-auto scrollbar-hide">
        <div className="flex items-center">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors min-w-0 max-w-[200px] ${
                  isActive
                    ? "border-accent bg-surface text-ink-800"
                    : "border-transparent text-ink-600 hover:text-ink-800 hover:bg-surface-tertiary"
                }`}
                onClick={() => onTabClick(tab.id)}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onTabClick(tab.id);
                  }
                }}
              >
                {getTabIcon(tab)}
                <span className="text-sm font-medium truncate">
                  {getTabLabel(tab)}
                </span>

                {/* Close button */}
                {tabs.length > 1 && (
                  <button
                    className={`ml-1 p-0.5 rounded hover:bg-ink-900/10 transition-opacity ${
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose(tab.id);
                    }}
                    aria-label={`Close ${getTabLabel(tab)}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add tab button */}
      <button
        className="flex items-center justify-center w-9 h-9 mx-1 rounded-lg text-ink-500 hover:text-ink-700 hover:bg-surface-tertiary transition-colors shrink-0"
        onClick={onAddTab}
        aria-label="New conversation"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
