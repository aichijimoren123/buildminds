import { Menu } from "@base-ui/react/menu";
import {
  ArrowUp,
  Cable,
  Calendar,
  Github,
  Mic,
  Plus,
  Settings,
  Slack,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import type { ClientEvent } from "../types";

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
      setPendingStart(true);
      sendEvent({
        type: "session.start",
        payload: {
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

  const [connectorsOpen, setConnectorsOpen] = useState(false);

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

              {/* 右侧：语音和发送 */}
              <div className="flex items-center gap-4">
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
                        ? "bg-text-100 text-bg-000 hover:bg-text-200"
                        : "bg-bg-200 text-text-500"
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
