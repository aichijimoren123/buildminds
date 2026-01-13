import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import { useEffect, useRef, useState } from "react";
import { DecisionPanel } from "./DecisionPanel";
import { MessageCard } from "./EventCard";
import MDContent from "../render/markdown";
import { useAppStore } from "../store/useAppStore";
import {
  useMessageStore,
  useSessionMessages,
  type PermissionRequest,
} from "../store/useMessageStore";
import { useSessionsStore } from "../store/useSessionsStore";
import type { Tab } from "../store/useTabsStore";
import type { ClientEvent, ServerEvent } from "../types";

interface ChatTabContentProps {
  tab: Tab | null;
  sendEvent: (event: ClientEvent) => void;
  partialMessageHandlerRef: React.MutableRefObject<
    ((event: ServerEvent) => void) | null
  >;
}

export function ChatTabContent({
  tab,
  sendEvent,
  partialMessageHandlerRef,
}: ChatTabContentProps) {
  const globalError = useAppStore((state) => state.globalError);
  const sessions = useSessionsStore((state) => state.sessions);
  const historyRequested = useSessionsStore((state) => state.historyRequested);
  const markHistoryRequested = useSessionsStore(
    (state) => state.markHistoryRequested
  );

  const sessionId = tab?.sessionId;
  const sessionMessages = useSessionMessages(sessionId);
  const resolvePermissionRequest = useMessageStore(
    (state) => state.resolvePermissionRequest
  );

  const streamEndRef = useRef<HTMLDivElement | null>(null);
  const particalMessageRef = useRef("");
  const [particalMessage, setParticalMessage] = useState("");
  const [showParticalMessage, setShowParticalMessage] = useState(false);

  const activeSessionMeta = sessionId ? sessions[sessionId] : undefined;
  const messages = sessionMessages?.messages ?? [];
  const permissionRequests = sessionMessages?.permissionRequests ?? [];
  const hydrated = sessionMessages?.hydrated ?? false;

  // Handle partial messages for this tab
  const handlePartialMessages = (particalEvent: ServerEvent) => {
    if (
      particalEvent.type !== "stream.message" ||
      particalEvent.payload.message.type !== "stream_event"
    )
      return;

    // Only handle events for this session
    if (particalEvent.payload.sessionId !== sessionId) return;

    const message = particalEvent.payload.message as any;
    if (message.event.type === "content_block_start") {
      particalMessageRef.current = "";
      setParticalMessage(particalMessageRef.current);
      setShowParticalMessage(true);
    }

    if (message.event.type === "content_block_delta") {
      try {
        const realType = message.event.delta.type.split("_")[0];
        const content = message.event.delta[realType] || "";
        particalMessageRef.current += content;
        setParticalMessage(particalMessageRef.current);
        streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } catch (error) {
        console.error(error);
      }
    }

    if (message.event.type === "content_block_stop") {
      setShowParticalMessage(false);
      setTimeout(() => {
        particalMessageRef.current = "";
        setParticalMessage(particalMessageRef.current);
      }, 500);
    }
  };

  // Register partial message handler
  useEffect(() => {
    partialMessageHandlerRef.current = handlePartialMessages;
    return () => {
      partialMessageHandlerRef.current = null;
    };
  }, [partialMessageHandlerRef, sessionId]);

  // History loading
  useEffect(() => {
    if (!sessionId) return;
    const session = sessions[sessionId];
    if (!session || hydrated) return;
    if (historyRequested.has(sessionId)) return;

    markHistoryRequested(sessionId);
    sendEvent({
      type: "session.history",
      payload: { sessionId },
    });
  }, [sessionId, sessions, hydrated, historyRequested, markHistoryRequested, sendEvent]);

  // Auto-scroll when new messages are added
  const messagesLength = messages.length;
  useEffect(() => {
    if (!streamEndRef.current) return;
    streamEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messagesLength, particalMessage]);

  const handlePermissionResponse = (
    request: PermissionRequest,
    result: PermissionResult
  ) => {
    if (!sessionId) return;
    sendEvent({
      type: "permission.response",
      payload: {
        sessionId,
        toolUseId: request.toolUseId,
        result,
      },
    });
    resolvePermissionRequest(sessionId, request.toolUseId);
  };

  // Handle Changes tab
  if (tab?.type === "changes") {
    return (
      <div className="flex-1 flex items-center justify-center text-muted">
        <div className="text-center">
          <p className="text-lg font-medium text-ink-700">Changes View</p>
          <p className="text-sm mt-2">Coming soon...</p>
        </div>
      </div>
    );
  }

  // No session selected
  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-cream px-6 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-ink-800 mb-4">
            Start a New Conversation
          </h2>
          <p className="text-muted">
            Enter a prompt below to begin working with Claude.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 py-8 pb-36 bg-surface-cream min-h-full">
        {globalError && (
          <div className="rounded-xl border border-error/20 bg-error-light p-4 text-sm text-error">
            {globalError}
          </div>
        )}

        {permissionRequests.length > 0 && (
          <DecisionPanel
            request={permissionRequests[permissionRequests.length - 1]}
            onSubmit={(result) =>
              handlePermissionResponse(
                permissionRequests[permissionRequests.length - 1],
                result
              )
            }
          />
        )}

        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          <div className="text-xs font-medium text-muted mb-4">Stream</div>
          <div className="flex flex-col gap-4 mb-24 md:mb-16 lg:mb-0">
            {messages.length ? (
              messages.map((message, index) => {
                const isLast = index === messages.length - 1;
                const showIndicator =
                  isLast && activeSessionMeta?.status === "running";
                const key = "uuid" in message ? message.uuid : `msg-${index}`;
                return (
                  <MessageCard
                    key={key}
                    message={message}
                    showIndicator={showIndicator}
                    permissionRequests={permissionRequests}
                    onPermissionResponse={handlePermissionResponse}
                  />
                );
              })
            ) : (
              <div className="rounded-xl border border-ink-900/10 bg-white px-6 py-8 text-center text-sm text-muted shadow-soft">
                No stream output yet. Start by sending a prompt.
              </div>
            )}

            <div className="partical-message">
              <MDContent text={particalMessage} />
              {showParticalMessage && (
                <div className="mt-3 flex flex-col gap-2 px-1">
                  <div className="relative h-3 w-2/12 overflow-hidden rounded-full bg-ink-900/10">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="relative h-3 w-12/12 overflow-hidden rounded-full bg-ink-900/10">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="relative h-3 w-12/12 overflow-hidden rounded-full bg-ink-900/10">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="relative h-3 w-12/12 overflow-hidden rounded-full bg-ink-900/10">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                  </div>
                  <div className="relative h-3 w-4/12 overflow-hidden rounded-full bg-ink-900/10">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        <div ref={streamEndRef} />
      </div>
    </div>
  );
}
