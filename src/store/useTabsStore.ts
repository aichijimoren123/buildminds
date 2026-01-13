import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

export interface Tab {
  id: string;
  type: "chat" | "changes";
  sessionId?: string;
  worktreeId?: string;
  label: string;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  addTab: (tab: Omit<Tab, "id">) => string;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabLabel: (tabId: string, label: string) => void;
  updateTabSession: (tabId: string, sessionId: string) => void;
  getOrCreateTabForSession: (sessionId: string, label?: string) => string;
  clearTabs: () => void;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (tabData) => {
        const id = nanoid(8);
        const newTab: Tab = { id, ...tabData };
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id,
        }));
        return id;
      },

      removeTab: (tabId) => {
        set((state) => {
          const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
          const newTabs = state.tabs.filter((t) => t.id !== tabId);

          // Determine new active tab if we're removing the active one
          let newActiveTabId = state.activeTabId;
          if (state.activeTabId === tabId) {
            if (newTabs.length === 0) {
              newActiveTabId = null;
            } else if (tabIndex >= newTabs.length) {
              // Was last tab, select previous
              newActiveTabId = newTabs[newTabs.length - 1].id;
            } else {
              // Select tab at same index (next tab)
              newActiveTabId = newTabs[tabIndex].id;
            }
          }

          return { tabs: newTabs, activeTabId: newActiveTabId };
        });
      },

      setActiveTab: (tabId) => {
        set({ activeTabId: tabId });
      },

      updateTabLabel: (tabId, label) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, label } : t)),
        }));
      },

      updateTabSession: (tabId, sessionId) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, sessionId } : t
          ),
        }));
      },

      getOrCreateTabForSession: (sessionId, label = "Chat") => {
        const state = get();
        const existingTab = state.tabs.find(
          (t) => t.type === "chat" && t.sessionId === sessionId
        );
        if (existingTab) {
          set({ activeTabId: existingTab.id });
          return existingTab.id;
        }
        // Create new tab for this session
        return get().addTab({ type: "chat", sessionId, label });
      },

      clearTabs: () => {
        set({ tabs: [], activeTabId: null });
      },
    }),
    {
      name: "cc-webui:tabs",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);

// Selector hooks
export const useActiveTab = () => {
  return useTabsStore((state) => {
    if (!state.activeTabId) return null;
    return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
  });
};

export const useTabs = () => {
  return useTabsStore((state) => state.tabs);
};
