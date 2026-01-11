import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { DecisionPanel } from "../components/DecisionPanel";
import { MessageCard } from "../components/EventCard";
import { PromptInput } from "../components/PromptInput";
import MDContent from "../render/markdown";
import type { PermissionRequest } from "../store/useAppStore";
import { useAppStore } from "../store/useAppStore";
import type { ClientEvent, ServerEvent } from "../types";

interface LayoutContext {
  connected: boolean;
  sendEvent: (event: ClientEvent) => void;
  sessionsLoaded: boolean;
  partialMessageHandlerRef: React.MutableRefObject<((event: ServerEvent) => void) | null>;
}

export function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { connected, sendEvent, partialMessageHandlerRef } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();

  const sessions = useAppStore((state) => state.sessions);
  const globalError = useAppStore((state) => state.globalError);
  const historyRequested = useAppStore((state) => state.historyRequested);
  const markHistoryRequested = useAppStore((state) => state.markHistoryRequested);
  const resolvePermissionRequest = useAppStore((state) => state.resolvePermissionRequest);
  const setActiveSessionId = useAppStore((state) => state.setActiveSessionId);
  const handleServerEvent = useAppStore((state) => state.handleServerEvent);

  const streamEndRef = useRef<HTMLDivElement | null>(null);
  const particalMessageRef = useRef("");
  const [particalMessage, setParticalMessage] = useState("");
  const [showParticalMessage, setShowParticalMessage] = useState(false);

  const activeSession = sessionId ? sessions[sessionId] : undefined;

  // Set active session ID when component mounts or sessionId changes
  useEffect(() => {
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId, setActiveSessionId]);

  // Redirect to home if session doesn't exist
  useEffect(() => {
    if (sessionId && Object.keys(sessions).length > 0 && !sessions[sessionId]) {
      navigate("/");
    }
  }, [sessionId, sessions, navigate]);

  // Handle partial messages
  const handlePartialMessages = (particalEvent: ServerEvent) => {
    if (particalEvent.type !== "stream.message" || particalEvent.payload.message.type !== "stream_event") return;

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
  }, [partialMessageHandlerRef]);

  // History loading
  useEffect(() => {
    if (!connected || !sessionId) return;
    const session = sessions[sessionId];
    if (!session || session.hydrated) return;

    if (historyRequested.has(sessionId)) return;

    markHistoryRequested(sessionId);
    sendEvent({
      type: "session.history",
      payload: { sessionId }
    });
  }, [connected, sessionId, sessions, historyRequested, markHistoryRequested, sendEvent]);

  // Auto-scroll when new messages are added
  const messagesLength = activeSession?.messages.length ?? 0;

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
        result
      }
    });

    resolvePermissionRequest(sessionId, request.toolUseId);
  };

  // If no session selected, show placeholder
  if (!sessionId) {
    return (
      <div className="flex min-h-full items-center justify-center bg-surface-cream px-6 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-ink-800 mb-4">No Session Selected</h2>
          <p className="text-muted">Please select a session from the sidebar or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-6 px-6 py-8 pb-36 bg-surface-cream">
      {globalError && (
        <div className="rounded-xl border border-error/20 bg-error-light p-4 text-sm text-error">
          {globalError}
        </div>
      )}

      {activeSession && activeSession.permissionRequests.length > 0 && (
        <DecisionPanel
          request={activeSession.permissionRequests[activeSession.permissionRequests.length - 1]}
          onSubmit={(result) =>
            handlePermissionResponse(activeSession.permissionRequests[activeSession.permissionRequests.length - 1], result)
          }
        />
      )}

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <div className="text-xs font-medium text-muted mb-4">Stream</div>
        <div className="flex flex-col gap-4 mb-24 md:mb-16 lg:mb-0">
          {activeSession?.messages.length ? (
            activeSession.messages.map((message, index) => {
              const isLast = index === activeSession.messages.length - 1;
              const showIndicator = isLast && activeSession.status === "running";
              const key = "uuid" in message ? message.uuid : `msg-${index}`;
              return (
                <MessageCard
                  key={key}
                  message={message}
                  showIndicator={showIndicator}
                  permissionRequests={activeSession?.permissionRequests}
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

      {sessionId && <PromptInput sendEvent={sendEvent} />}
    </div>
  );
}
