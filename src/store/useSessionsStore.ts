import { create } from "zustand";
import type { ServerEvent, SessionStatus } from "../types";

// Session metadata only (no messages)
export type SessionMeta = {
  id: string;
  title: string;
  status: SessionStatus;
  cwd?: string;
  worktreeId?: string;
  githubRepoId?: string;
  lastPrompt?: string;
  createdAt?: number;
  updatedAt?: number;
};

interface SessionsState {
  // State
  sessions: Record<string, SessionMeta>;
  activeSessionId: string | null;
  sessionsLoaded: boolean;
  historyRequested: Set<string>;

  // Actions
  setActiveSessionId: (id: string | null) => void;
  markHistoryRequested: (sessionId: string) => void;

  // Event Handling
  handleSessionEvent: (event: ServerEvent) => void;
}

const LAST_SESSION_KEY = "cc-webui:last-session-id";

function createSessionMeta(id: string): SessionMeta {
  return {
    id,
    title: "",
    status: "idle",
  };
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: {},
  activeSessionId: null,
  sessionsLoaded: false,
  historyRequested: new Set(),

  setActiveSessionId: (id) => {
    set({ activeSessionId: id });
    if (id) {
      localStorage.setItem(LAST_SESSION_KEY, id);
    } else {
      localStorage.removeItem(LAST_SESSION_KEY);
    }
  },

  markHistoryRequested: (sessionId) => {
    set((state) => {
      const next = new Set(state.historyRequested);
      next.add(sessionId);
      return { historyRequested: next };
    });
  },

  handleSessionEvent: (event) => {
    const state = get();

    switch (event.type) {
      case "session.list": {
        const nextSessions: Record<string, SessionMeta> = {};
        for (const session of event.payload.sessions) {
          const existing =
            state.sessions[session.id] ?? createSessionMeta(session.id);
          nextSessions[session.id] = {
            ...existing,
            status: session.status,
            title: session.title,
            cwd: session.cwd,
            worktreeId: session.worktreeId,
            githubRepoId: session.githubRepoId,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          };
        }

        set({
          sessions: nextSessions,
          sessionsLoaded: true,
        });

        if (!event.payload.sessions.length) {
          get().setActiveSessionId(null);
        }

        // Logic to select initial session
        if (!state.activeSessionId && event.payload.sessions.length > 0) {
          const sorted = [...event.payload.sessions].sort((a, b) => {
            const aTime = a.updatedAt ?? a.createdAt ?? 0;
            const bTime = b.updatedAt ?? b.createdAt ?? 0;
            return aTime - bTime;
          });
          const latestSession = sorted[sorted.length - 1];
          if (latestSession) {
            get().setActiveSessionId(latestSession.id);
          }
        } else if (state.activeSessionId) {
          const stillExists = event.payload.sessions.some(
            (session) => session.id === state.activeSessionId,
          );
          if (!stillExists) {
            get().setActiveSessionId(null);
          }
        }
        break;
      }

      case "session.history": {
        // Only update status from history, messages handled by useMessageStore
        const { sessionId, status } = event.payload;
        set((state) => {
          const existing =
            state.sessions[sessionId] ?? createSessionMeta(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                status,
              },
            },
          };
        });
        break;
      }

      case "session.status": {
        const { sessionId, status, title, cwd } = event.payload;
        set((state) => {
          const existing =
            state.sessions[sessionId] ?? createSessionMeta(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                status,
                title: title ?? existing.title,
                cwd: cwd ?? existing.cwd,
                updatedAt: Date.now(),
              },
            },
          };
        });
        break;
      }

      case "session.deleted": {
        const { sessionId } = event.payload;
        const state = get();
        if (!state.sessions[sessionId]) break;
        const nextSessions = { ...state.sessions };
        delete nextSessions[sessionId];
        set({
          sessions: nextSessions,
        });
        if (state.activeSessionId === sessionId) {
          const remaining = Object.values(nextSessions).sort(
            (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
          );
          get().setActiveSessionId(remaining[0]?.id ?? null);
        }
        break;
      }
    }
  },
}));

// Selector hooks for workspace filtering
export const useSessionsByWorkspace = (workspaceId: string | null) => {
  return useSessionsStore((state) => {
    const allSessions = Object.values(state.sessions);
    if (!workspaceId) return allSessions;
    return allSessions.filter((s) => s.githubRepoId === workspaceId);
  });
};

export const useSessionsSortedByDate = (workspaceId: string | null) => {
  return useSessionsStore((state) => {
    const allSessions = Object.values(state.sessions);
    const filtered = workspaceId
      ? allSessions.filter((s) => s.githubRepoId === workspaceId)
      : allSessions;
    return [...filtered].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  });
};
