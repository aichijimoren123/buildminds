import { Menu } from "@base-ui/react/menu";
import {
  ArrowUp,
  Cable,
  Calendar,
  FolderGit2,
  Github,
  MessageSquare,
  Mic,
  Plus,
  Settings,
  Slack,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { useSessionsStore } from "../store/useSessionsStore";
import type { ClientEvent } from "../types";
import { ModelSelector } from "./ModelSelector";
import { QualitySelector } from "./QualitySelector";
import { WorkspaceSessionModal } from "./WorkspaceSessionModal";

const DEFAULT_ALLOWED_TOOLS = "Read,Edit,Bash";

interface PromptInputProps {
  sendEvent: (event: ClientEvent) => void;
  variant?: "home" | "chat";
  forceNewSession?: boolean; // When true, always create a new session instead of continuing
}

const CONNECTORS = [
  {
    id: "github",
    name: "GitHub",
    icon: Github,
    type: "toggle",
    connected: true,
  },
  {
    id: "calendar",
    name: "Google Calendar",
    icon: Calendar,
    type: "action",
    action: "连接",
  },
  { id: "slack", name: "Slack", icon: Slack, type: "action", action: "连接" },
];

export function usePromptActions(
  sendEvent: (event: ClientEvent) => void,
  options?: { forceNewSession?: boolean },
) {
  const prompt = useAppStore((state) => state.prompt);
  const cwd = useAppStore((state) => state.cwd);
  const selectedGitHubRepoId = useAppStore(
    (state) => state.selectedGitHubRepoId,
  );
  const sessionMode = useAppStore((state) => state.sessionMode);
  const setPrompt = useAppStore((state) => state.setPrompt);
  const setPendingStart = useAppStore((state) => state.setPendingStart);
  const setGlobalError = useAppStore((state) => state.setGlobalError);

  const activeSessionId = useSessionsStore((state) => state.activeSessionId);
  const sessions = useSessionsStore((state) => state.sessions);

  const activeSession = activeSessionId ? sessions[activeSessionId] : undefined;
  const isRunning = activeSession?.status === "running";

  const forceNewSession = options?.forceNewSession ?? false;

  // Start a normal session (no worktree)
  const startNormalSession = useCallback(
    (promptText: string) => {
      setPendingStart(true);
      sendEvent({
        type: "session.start",
        payload: {
          prompt: promptText,
          cwd: cwd.trim() || undefined,
          // Don't pass workspaceId for normal mode
          allowedTools: DEFAULT_ALLOWED_TOOLS,
        },
      });
    },
    [cwd, sendEvent, setPendingStart],
  );

  // Start a workspace session (with worktree)
  const startWorkspaceSession = useCallback(
    (promptText: string, worktreeName: string) => {
      if (!selectedGitHubRepoId) {
        setGlobalError("Please select a GitHub repository first.");
        return;
      }
      setPendingStart(true);
      sendEvent({
        type: "session.start",
        payload: {
          prompt: promptText,
          cwd: cwd.trim() || undefined,
          workspaceId: selectedGitHubRepoId,
          title: worktreeName, // Use worktree name as title
          allowedTools: DEFAULT_ALLOWED_TOOLS,
        },
      });
    },
    [cwd, selectedGitHubRepoId, sendEvent, setGlobalError, setPendingStart],
  );

  const handleSend = useCallback(async () => {
    if (!prompt.trim()) return;

    // Create new session if no active session OR forceNewSession is true
    if (!activeSessionId || forceNewSession) {
      // For workspace mode, the modal will handle calling startWorkspaceSession
      // This path is for normal mode or when called from modal
      startNormalSession(prompt);
    } else {
      if (activeSession?.status === "running") {
        setGlobalError(
          "Session is still running. Please wait for it to finish.",
        );
        return;
      }
      sendEvent({
        type: "session.continue",
        payload: {
          sessionId: activeSessionId,
          prompt,
        },
      });
    }

    setPrompt("");
  }, [
    activeSession,
    activeSessionId,
    forceNewSession,
    prompt,
    sendEvent,
    setGlobalError,
    setPrompt,
    startNormalSession,
  ]);

  const handleStop = useCallback(() => {
    if (!activeSessionId) return;
    sendEvent({
      type: "session.stop",
      payload: { sessionId: activeSessionId },
    });
  }, [activeSessionId, sendEvent]);

  const handleStartFromModal = useCallback(() => {
    if (!cwd.trim()) {
      setGlobalError("Working Directory is required to start a session.");
      return;
    }
    handleSend();
  }, [cwd, handleSend, setGlobalError]);

  return {
    prompt,
    setPrompt,
    isRunning,
    sessionMode,
    handleSend,
    handleStop,
    handleStartFromModal,
    startNormalSession,
    startWorkspaceSession,
  };
}

export function PromptInput({
  sendEvent,
  variant = "chat",
  forceNewSession = false,
}: PromptInputProps) {
  const {
    prompt,
    setPrompt,
    isRunning,
    sessionMode,
    handleSend,
    handleStop,
    startWorkspaceSession,
  } = usePromptActions(sendEvent, { forceNewSession });
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  const setSessionMode = useAppStore((state) => state.setSessionMode);

  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");

  // Determine if we should create a new session (for mode toggle visibility)
  const activeSessionId = useSessionsStore((state) => state.activeSessionId);
  const isNewSession = !activeSessionId || forceNewSession;

  const handleSubmit = () => {
    if (!prompt.trim()) return;

    if (isNewSession && sessionMode === "workspace") {
      // Workspace mode: show modal to get worktree name
      setPendingPrompt(prompt);
      setShowWorkspaceModal(true);
    } else {
      // Normal mode or continuing session
      handleSend();
    }
  };

  const handleWorkspaceConfirm = (worktreeName: string) => {
    startWorkspaceSession(pendingPrompt, worktreeName);
    setPrompt("");
    setPendingPrompt("");
    setShowWorkspaceModal(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (isRunning) {
      handleStop();
      return;
    }
    handleSubmit();
  };

  const handleInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  };

  useEffect(() => {
    if (!promptRef.current) return;
    promptRef.current.style.height = "auto";
    promptRef.current.style.height = `${promptRef.current.scrollHeight}px`;
  }, [prompt]);

  const containerClasses =
    variant === "chat"
      ? "w-full bottom-0 left-0 right-0 pb-6 px-4 lg:pb-10 pt-4 z-50"
      : "relative w-full";

  return (
    <section className={containerClasses}>
      <div className="mx-auto w-full max-w-3xl">
        {/* 主容器：使用主题变量 */}
        <div className="relative flex flex-col rounded-4xl bg-bg-000 ring-1 ring-border-100/10">
          {/* 上半部分：输入框 + 操作按钮 */}
          <div className="p-5 pb-3">
            {/* 1. 文本输入区域 */}
            <textarea
              rows={1}
              className="w-full resize-none bg-transparent text-md text-text-100 placeholder:text-text-500 focus:outline-none min-h-[56px] leading-relaxed"
              placeholder="分配一个任务或提问任何问题"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              ref={promptRef}
            />

            {/* 2. 中间操作行：左右对齐 */}
            <div className="flex items-center justify-between mt-3 relative">
              {/* 左侧：加号和 Connectors */}
              <div className="flex items-center gap-3">
                <button
                  className="group cursor-pointer flex h-10 w-10 items-center justify-center rounded-full border border-border-100/20 bg-bg-000 text-text-400 transition-colors hover:border-border-100/30 hover:bg-bg-100 hover:text-text-200"
                  aria-label="添加附件"
                >
                  <Plus size={20} />
                </button>

                {/* Base UI Menu for Connectors */}
                <Menu.Root
                  open={connectorsOpen}
                  onOpenChange={setConnectorsOpen}
                >
                  <Menu.Trigger
                    className={`group cursor-pointer flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                      connectorsOpen
                        ? "border-text-100 bg-text-100 text-bg-000"
                        : "border-border-100/20 bg-bg-000 text-text-400 hover:border-border-100/30 hover:bg-bg-100 hover:text-text-200"
                    }`}
                  >
                    <Cable size={20} />
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner
                      side="bottom"
                      align="start"
                      sideOffset={8}
                      className="z-[9999]"
                    >
                      <Menu.Popup className="w-64 rounded-xl bg-bg-100 py-2 shadow-elevated ring-1 ring-border-100/10 text-text-100">
                        {CONNECTORS.map((connector) => (
                          <Menu.Item
                            key={connector.id}
                            className="flex items-center justify-between px-4 py-2 hover:bg-bg-200 cursor-pointer transition-colors outline-none"
                            label={connector.name}
                            closeOnClick={false}
                          >
                            <div className="flex items-center gap-3">
                              <connector.icon
                                size={18}
                                className="text-text-400"
                              />
                              <span className="text-sm font-medium">
                                {connector.name}
                              </span>
                            </div>
                            {connector.type === "toggle" ? (
                              <div
                                className={`h-5 w-9 rounded-full relative transition-colors ${connector.connected ? "bg-text-100" : "bg-bg-300"}`}
                              >
                                <div
                                  className={`absolute top-1 h-3 w-3 rounded-full bg-bg-000 transition-all ${connector.connected ? "left-5" : "left-1"}`}
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-text-500 font-medium">
                                {connector.action}
                              </span>
                            )}
                          </Menu.Item>
                        ))}

                        <Menu.Separator className="my-1.5 h-px bg-border-100/10" />

                        <Menu.Item
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-200 cursor-pointer text-text-300 hover:text-text-100 transition-colors outline-none"
                          label="添加连接器"
                        >
                          <Plus size={18} />
                          <span className="text-sm font-medium">
                            添加连接器
                          </span>
                        </Menu.Item>

                        <Menu.Item
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-200 cursor-pointer text-text-300 hover:text-text-100 transition-colors outline-none"
                          label="管理连接器"
                        >
                          <Settings size={18} />
                          <span className="text-sm font-medium">
                            管理连接器
                          </span>
                        </Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </div>

              {/* 右侧：模式切换、模型选择、质量选择、语音和发送 */}
              <div className="flex items-center gap-2">
                {/* Session Mode Toggle - only show for new sessions */}
                {isNewSession && (
                  <div className="flex items-center rounded-full border border-border-100/20 p-0.5">
                    <button
                      onClick={() => setSessionMode("normal")}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        sessionMode === "normal"
                          ? "bg-text-100 text-bg-000"
                          : "text-text-400 hover:text-text-200"
                      }`}
                      title="Normal session - direct conversation"
                    >
                      <MessageSquare size={14} />
                      <span className="hidden sm:inline">Normal</span>
                    </button>
                    <button
                      onClick={() => setSessionMode("workspace")}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        sessionMode === "workspace"
                          ? "bg-accent text-white"
                          : "text-text-400 hover:text-text-200"
                      }`}
                      title="Workspace mode - creates a git branch for this task"
                    >
                      <FolderGit2 size={14} />
                      <span className="hidden sm:inline">Workspace</span>
                    </button>
                  </div>
                )}

                {/* Model selector */}
                <ModelSelector />

                {/* Quality selector */}
                <QualitySelector />

                {/* Divider */}
                <div className="h-5 w-px bg-border-100/20 mx-1" />

                <button
                  className="text-text-500 cursor-pointer transition-colors hover:text-text-300"
                  aria-label="语音输入"
                >
                  <Mic size={22} />
                </button>

                <button
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
                    isRunning
                      ? "bg-danger-100 text-oncolor-100 hover:bg-danger-000"
                      : prompt.trim()
                        ? sessionMode === "workspace" && isNewSession
                          ? "bg-accent text-white hover:bg-accent/90"
                          : "bg-text-100 text-bg-000 hover:bg-text-200"
                        : "bg-bg-200 text-text-500"
                  }`}
                  onClick={isRunning ? handleStop : handleSubmit}
                  disabled={!isRunning && !prompt.trim()}
                >
                  {isRunning ? (
                    <Square size={12} fill="currentColor" />
                  ) : (
                    <ArrowUp size={20} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Session Modal */}
      <WorkspaceSessionModal
        open={showWorkspaceModal}
        onClose={() => {
          setShowWorkspaceModal(false);
          setPendingPrompt("");
        }}
        onConfirm={handleWorkspaceConfirm}
        prompt={pendingPrompt}
      />
    </section>
  );
}
