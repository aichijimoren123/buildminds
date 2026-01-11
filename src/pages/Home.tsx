import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { usePromptActions } from "../components/PromptInput";
import { useAppStore } from "../store/useAppStore";
import type { ClientEvent, ServerEvent } from "../types";

interface LayoutContext {
  connected: boolean;
  sendEvent: (event: ClientEvent) => void;
  sessionsLoaded: boolean;
  partialMessageHandlerRef?: React.MutableRefObject<((event: ServerEvent) => void) | null>;
}

export function Home() {
  const { connected, sendEvent, sessionsLoaded } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();

  const prompt = useAppStore((state) => state.prompt);
  const cwd = useAppStore((state) => state.cwd);
  const selectedGitHubRepoId = useAppStore((state) => state.selectedGitHubRepoId);
  const pendingStart = useAppStore((state) => state.pendingStart);
  const globalError = useAppStore((state) => state.globalError);

  const setPrompt = useAppStore((state) => state.setPrompt);
  const setCwd = useAppStore((state) => state.setCwd);
  const setSelectedGitHubRepoId = useAppStore((state) => state.setSelectedGitHubRepoId);

  const [recentCwds, setRecentCwds] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isStartingSession = useRef(false);

  const { handleStartFromModal } = usePromptActions(sendEvent);

  // Fetch default cwd and recent cwds
  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch(`/api/sessions/default-cwd`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .catch(() => ({ cwd: "" })),
      fetch(`/api/sessions/recent-cwd?limit=8`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .catch(() => ({ cwds: [] }))
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

  // Navigate to chat ONLY when user starts a new session
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);

  useEffect(() => {
    // Only navigate if we're actively starting a session
    if (isStartingSession.current && activeSessionId && sessions[activeSessionId]) {
      navigate(`/chat/${activeSessionId}`);
      isStartingSession.current = false;
    }
  }, [activeSessionId, sessions, navigate]);

  const handleStart = () => {
    isStartingSession.current = true;
    handleStartFromModal();
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-cream px-6 py-12">
      <div className="w-full max-w-3xl">
        {globalError && (
          <div className="mb-6 rounded-xl border border-error/20 bg-error-light p-4 text-sm text-error">
            {globalError}
          </div>
        )}

        <div className="text-center">
      

          {/* Main Input Area */}
          <div className="relative rounded-2xl border border-ink-900/10 bg-white shadow-card overflow-hidden">
            <textarea
              rows={1}
              className="w-full min-h-[120px] px-6 py-5 text-base text-ink-800 placeholder:text-muted-light focus:outline-none resize-none"
              placeholder="分配一个任务或提问任何问题"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !pendingStart && prompt.trim()) {
                  e.preventDefault();
                  handleStart();
                }
              }}
              style={{
                height: 'auto',
                minHeight: '120px',
                maxHeight: '300px'
              }}
            />

            {/* Bottom Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-ink-900/5 bg-surface-secondary/30">
              <div className="flex items-center gap-2">
                {/* Add attachment button */}
                <button
                  type="button"
                  className="p-2 text-muted hover:text-ink-700 hover:bg-ink-900/5 rounded-lg transition-colors"
                  title="Add files (coming soon)"
                  disabled
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14m-7-7h14" />
                  </svg>
                </button>

                {/* Advanced options toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="p-2 text-muted hover:text-ink-700 hover:bg-ink-900/5 rounded-lg transition-colors"
                  title="Advanced options"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Keyboard shortcut hint */}
                <span className="text-xs text-muted-light hidden sm:inline">
                  ⌘+Enter
                </span>

                {/* Submit button */}
                <button
                  onClick={handleStart}
                  disabled={pendingStart || !prompt.trim()}
                  className="flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pendingStart ? (
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 text-white/30 animate-spin fill-white"
                      viewBox="0 0 100 101"
                      fill="none"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                      />
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentFill"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Options Panel */}
          {showAdvanced && (
            <div className="mt-4 rounded-xl border border-ink-900/10 bg-white p-4 shadow-card text-left">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Working Directory <span className="text-muted-light font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-lg border border-ink-900/10 bg-surface-secondary px-3 py-2 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors pr-24"
                      placeholder="Uses current directory if empty"
                      value={cwd}
                      onChange={(e) => {
                        setCwd(e.target.value);
                        // Clear GitHub repo selection when manually editing
                        if (selectedGitHubRepoId) {
                          setSelectedGitHubRepoId(null);
                        }
                      }}
                    />
                    {selectedGitHubRepoId && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-accent/10 rounded text-xs text-accent font-medium">
                        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                        GitHub
                      </div>
                    )}
                  </div>
                </div>
                {recentCwds.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-light mb-2">Recent directories</div>
                    <div className="flex flex-wrap gap-2">
                      {recentCwds.map((path) => {
                        const isActive = cwd === path;
                        return (
                          <button
                            key={path}
                            type="button"
                            className={`max-w-full truncate rounded-lg border px-2 py-1 text-xs transition-colors ${
                              isActive
                                ? "border-accent/60 bg-accent/10 text-ink-800"
                                : "border-ink-900/10 bg-white text-muted hover:border-ink-900/20 hover:text-ink-700"
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
    </div>
  );
}
