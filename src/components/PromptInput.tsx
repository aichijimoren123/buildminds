import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientEvent } from "../types";
import { useAppStore } from "../store/useAppStore";
import {
  ArrowUp,
  Cable,
  Mic,
  Plus,
  Square,
  Github,
  Globe,
  Mail,
  HardDrive,
  Calendar,
  Slack,
  Settings,
} from "lucide-react";

const DEFAULT_ALLOWED_TOOLS = "Read,Edit,Bash";

interface PromptInputProps {
  sendEvent: (event: ClientEvent) => void;
  variant?: "home" | "chat";
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
    id: "browser",
    name: "My Browser",
    icon: Globe,
    type: "action",
    action: "安装",
  },
  { id: "gmail", name: "Gmail", icon: Mail, type: "action", action: "连接" },
  {
    id: "drive",
    name: "Google Drive",
    icon: HardDrive,
    type: "action",
    action: "连接",
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

export function usePromptActions(sendEvent: (event: ClientEvent) => void) {
  const prompt = useAppStore((state) => state.prompt);
  const cwd = useAppStore((state) => state.cwd);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const setPrompt = useAppStore((state) => state.setPrompt);
  const setPendingStart = useAppStore((state) => state.setPendingStart);
  const setGlobalError = useAppStore((state) => state.setGlobalError);

  const activeSession = activeSessionId ? sessions[activeSessionId] : undefined;
  const isRunning = activeSession?.status === "running";

  const handleSend = useCallback(async () => {
    if (!prompt.trim()) return;

    if (!activeSessionId) {
      let title = "";
      try {
        setPendingStart(true);
        const response = await fetch(`/api/sessions/title?userInput=${prompt}`);
        const data = await response.json();
        title = data.title;
      } catch (error) {
        console.error(error);
        setPendingStart(false);
        setGlobalError("Failed to get session title.");
        return;
      }
      sendEvent({
        type: "session.start",
        payload: {
          title,
          prompt,
          cwd: cwd.trim() || undefined,
          allowedTools: DEFAULT_ALLOWED_TOOLS,
        },
      });
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
    cwd,
    prompt,
    sendEvent,
    setGlobalError,
    setPendingStart,
    setPrompt,
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
    handleSend,
    handleStop,
    handleStartFromModal,
  };
}

export function PromptInput({ sendEvent, variant = "chat" }: PromptInputProps) {
  const { prompt, setPrompt, isRunning, handleSend, handleStop } =
    usePromptActions(sendEvent);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  const [showConnectors, setShowConnectors] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowConnectors(false);
      }
    }
    if (showConnectors) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showConnectors]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (isRunning) {
      handleStop();
      return;
    }
    handleSend();
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
      : "relative w-full z-50";

  return (
    <section className={containerClasses}>
      <div className="mx-auto w-full max-w-3xl">
        {/* 主容器：大圆角，白色背景，移除阴影 */}
        <div className="relative flex flex-col rounded-[32px] bg-white ring-1 ring-black/5">
          {/* 上半部分：输入框 + 操作按钮 */}
          <div className="p-5 pb-3">
            {/* 1. 文本输入区域 */}
            <textarea
              rows={1}
              className="w-full resize-none bg-transparent text-lg text-[#1A1915] placeholder:text-gray-300 focus:outline-none min-h-[56px] leading-relaxed"
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
              <div className="flex items-center gap-3" ref={dropdownRef}>
                <button
                  className="group cursor-pointer flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                  aria-label="添加附件"
                >
                  <Plus size={20} />
                </button>
                <div className="relative">
                  <button
                    className={`group cursor-pointer flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                      showConnectors
                        ? "border-gray-800 bg-gray-800 text-white"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                    aria-label="Connectors"
                    onClick={() => {
                      setShowConnectors(!showConnectors);
                    }}
                  >
                    <Cable size={20} />
                  </button>

                  {/* Connectors Dropdown */}
                  {showConnectors && (
                    <div className="absolute top-12 left-0 w-64 rounded-xl bg-white dark:bg-gray-800 py-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 text-gray-900 dark:text-white z-[60]">
                      <div className="flex flex-col">
                        {CONNECTORS.map((connector) => (
                          <div
                            key={connector.id}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <connector.icon
                                size={18}
                                className="text-gray-500 dark:text-gray-300"
                              />
                              <span className="text-sm font-medium">
                                {connector.name}
                              </span>
                            </div>
                            {connector.type === "toggle" ? (
                              <div
                                className={`h-5 w-9 rounded-full relative transition-colors ${connector.connected ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-gray-600"}`}
                              >
                                <div
                                  className={`absolute top-1 h-3 w-3 rounded-full bg-white dark:bg-gray-900 transition-all ${connector.connected ? "left-5" : "left-1"}`}
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                {connector.action}
                              </span>
                            )}
                          </div>
                        ))}

                        <div className="my-1.5 h-px bg-gray-100 dark:bg-white/10" />

                        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                          <Plus size={18} />
                          <span className="text-sm font-medium">
                            添加连接器
                          </span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                          <Settings size={18} />
                          <span className="text-sm font-medium">
                            管理连接器
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧：语音和发送 */}
              <div className="flex items-center gap-4">
                <button
                  className="text-gray-400 cursor-pointer transition-colors hover:text-gray-600"
                  aria-label="语音输入"
                >
                  <Mic size={22} />
                </button>

                <button
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
                    isRunning
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : prompt.trim()
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-100 text-gray-400"
                  }`}
                  onClick={isRunning ? handleStop : handleSend}
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
    </section>
  );
}
