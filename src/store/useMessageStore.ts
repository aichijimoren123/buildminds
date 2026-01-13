import { create } from "zustand";
import type { ServerEvent, StreamMessage } from "../types";

export type PermissionRequest = {
  toolUseId: string;
  toolName: string;
  input: unknown;
};

export type SessionMessages = {
  messages: StreamMessage[];
  permissionRequests: PermissionRequest[];
  hydrated: boolean;
};

interface MessageState {
  // State: messages indexed by sessionId
  messagesBySession: Record<string, SessionMessages>;

  // Actions
  resolvePermissionRequest: (sessionId: string, toolUseId: string) => void;
  clearSessionMessages: (sessionId: string) => void;

  // Event Handling
  handleMessageEvent: (event: ServerEvent) => void;
}

function createSessionMessages(): SessionMessages {
  return {
    messages: [],
    permissionRequests: [],
    hydrated: false,
  };
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messagesBySession: {},

  resolvePermissionRequest: (sessionId, toolUseId) => {
    set((state) => {
      const existing = state.messagesBySession[sessionId];
      if (!existing) return {};
      return {
        messagesBySession: {
          ...state.messagesBySession,
          [sessionId]: {
            ...existing,
            permissionRequests: existing.permissionRequests.filter(
              (req) => req.toolUseId !== toolUseId,
            ),
          },
        },
      };
    });
  },

  clearSessionMessages: (sessionId) => {
    set((state) => {
      const next = { ...state.messagesBySession };
      delete next[sessionId];
      return { messagesBySession: next };
    });
  },

  handleMessageEvent: (event) => {
    switch (event.type) {
      case "session.history": {
        const { sessionId, messages } = event.payload;
        set((state) => {
          const existing =
            state.messagesBySession[sessionId] ?? createSessionMessages();
          return {
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: {
                ...existing,
                messages,
                hydrated: true,
              },
            },
          };
        });
        break;
      }

      case "stream.message": {
        const { sessionId, message } = event.payload;
        set((state) => {
          const existing =
            state.messagesBySession[sessionId] ?? createSessionMessages();
          return {
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: {
                ...existing,
                messages: [...existing.messages, message],
              },
            },
          };
        });
        break;
      }

      case "stream.user_prompt": {
        const { sessionId, prompt } = event.payload;
        set((state) => {
          const existing =
            state.messagesBySession[sessionId] ?? createSessionMessages();
          return {
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: {
                ...existing,
                messages: [
                  ...existing.messages,
                  { type: "user_prompt", prompt },
                ],
              },
            },
          };
        });
        break;
      }

      case "permission.request": {
        const { sessionId, toolUseId, toolName, input } = event.payload;
        set((state) => {
          const existing =
            state.messagesBySession[sessionId] ?? createSessionMessages();
          return {
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: {
                ...existing,
                permissionRequests: [
                  ...existing.permissionRequests,
                  { toolUseId, toolName, input },
                ],
              },
            },
          };
        });
        break;
      }

      case "session.deleted": {
        // Clean up messages when session is deleted
        const { sessionId } = event.payload;
        get().clearSessionMessages(sessionId);
        break;
      }
    }
  },
}));

// Selector hooks for common use cases
export const useSessionMessages = (sessionId: string | undefined) => {
  return useMessageStore((state) =>
    sessionId ? state.messagesBySession[sessionId] : undefined,
  );
};

export const useSessionHydrated = (sessionId: string | undefined) => {
  return useMessageStore((state) =>
    sessionId ? state.messagesBySession[sessionId]?.hydrated ?? false : false,
  );
};
