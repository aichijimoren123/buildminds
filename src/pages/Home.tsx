import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { PromptInput } from "../components/PromptInput";
import { useAppStore } from "../store/useAppStore";
import { useSessionsStore } from "../store/useSessionsStore";
import type { ClientEvent, ServerEvent } from "../types";

interface LayoutContext {
  connected: boolean;
  sendEvent: (event: ClientEvent) => void;
  sessionsLoaded: boolean;
  partialMessageHandlerRef?: React.MutableRefObject<
    ((event: ServerEvent) => void) | null
  >;
}

export function Home() {
  const { sendEvent } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();

  const cwd = useAppStore((state) => state.cwd);
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const globalError = useAppStore((state) => state.globalError);
  const pendingStart = useAppStore((state) => state.pendingStart);

  const setCwd = useAppStore((state) => state.setCwd);
  const setActiveWorkspaceId = useAppStore(
    (state) => state.setActiveWorkspaceId,
  );

  const sessions = useSessionsStore((state) => state.sessions);
  const activeSessionId = useSessionsStore((state) => state.activeSessionId);

  const [recentCwds, setRecentCwds] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Track if we were in pending state to detect the transition
  const wasPendingRef = useRef(false);

  // Fetch default cwd and recent cwds
  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch(`/api/sessions/default-cwd`, { signal: controller.signal })
        .then((response) =>
          response.ok ? response.json() : Promise.reject(response),
        )
        .catch(() => ({ cwd: "" })),
      fetch(`/api/sessions/recent-cwd?limit=8`, { signal: controller.signal })
        .then((response) =>
          response.ok ? response.json() : Promise.reject(response),
        )
        .catch(() => ({ cwds: [] })),
    ]).then(([defaultData, recentData]) => {
      if (defaultData?.cwd && !cwd) {
        setCwd(defaultData.cwd);
      }

      if (recentData && Array.isArray(recentData.cwds)) {
        setRecentCwds(recentData.cwds);
      } else {
        setRecentCwds([]);
      }
    });

    return () => controller.abort();
  }, [cwd, setCwd]);

  // Track pending state transitions
  useEffect(() => {
    if (pendingStart) {
      wasPendingRef.current = true;
    }
  }, [pendingStart]);

  useEffect(() => {
    // Navigate when pendingStart transitions from true to false and we have an active session
    if (
      wasPendingRef.current &&
      !pendingStart &&
      activeSessionId &&
      sessions[activeSessionId]
    ) {
      navigate(`/chat/${activeSessionId}`);
      wasPendingRef.current = false;
    }
  }, [activeSessionId, sessions, navigate, pendingStart]);

  return (
    <div className="flex flex-col min-h-full items-center justify-center bg-bg-100 px-6 py-12">
      <div className="w-full max-w-3xl">
        {globalError && (
          <div className="mb-6 rounded-xl border border-error/20 bg-error-light p-4 text-sm text-error">
            {globalError}
          </div>
        )}

        <div className="text-center">
          {/* Advanced Options Panel */}
          {showAdvanced && (
            <div className="mb-4 rounded-xl border border-border-100/10 bg-bg-000 p-4 shadow-card text-left">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text-400 mb-2">
                    Working Directory{" "}
                    <span className="text-text-400-light font-normal">
                      (optional)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-lg border border-border-100/10 bg-bg-200 px-3 py-2 text-sm text-text-100 placeholder:text-text-400-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors pr-24"
                      placeholder="Uses current directory if empty"
                      value={cwd}
                      onChange={(e) => {
                        setCwd(e.target.value);
                        // Clear workspace selection when manually editing
                        if (activeWorkspaceId) {
                          setActiveWorkspaceId(null);
                        }
                      }}
                    />
                    {activeWorkspaceId && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-accent/10 rounded text-xs text-accent font-medium">
                        <svg
                          viewBox="0 0 16 16"
                          className="w-3 h-3"
                          fill="currentColor"
                        >
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                        GitHub
                      </div>
                    )}
                  </div>
                </div>
                {recentCwds.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-text-400-light mb-2">
                      Recent directories
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentCwds.map((path) => {
                        const isActive = cwd === path;
                        return (
                          <button
                            key={path}
                            type="button"
                            className={`max-w-full truncate rounded-lg border px-2 py-1 text-xs transition-colors ${
                              isActive
                                ? "border-accent/60 bg-accent/10 text-text-100"
                                : "border-border-100/10 bg-bg-000 text-text-400 hover:border-border-100/20 hover:text-text-200"
                            }`}
                            onClick={() => setCwd(path)}
                            title={path}
                          >
                            {path}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 使用统一的 PromptInput 组件，forceNewSession 确保始终创建新会话 */}
      <PromptInput sendEvent={sendEvent} variant="home" forceNewSession />
    </div>
  );
}
