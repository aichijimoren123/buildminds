import { useEffect, useMemo, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { useAppStore } from "../store/useAppStore";

interface SidebarProps {
  connected: boolean;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  connected,
  onNewSession,
  onDeleteSession,
  isMobileOpen = false,
  onMobileClose
}: SidebarProps) {
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const setActiveSessionId = useAppStore((state) => state.setActiveSessionId);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const formatCwd = (cwd?: string) => {
    if (!cwd) return "Working dir unavailable";
    const parts = cwd.split(/[\\/]+/).filter(Boolean);
    const tail = parts.slice(-2).join("/");
    return `/${tail || cwd}`;
  };

  const sessionList = useMemo(() => {
    const list = Object.values(sessions);
    list.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return list;
  }, [sessions]);

  useEffect(() => {
    setCopied(false);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [resumeSessionId]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const handleCopyCommand = async () => {
    if (!resumeSessionId) return;
    const command = `claude --resume ${resumeSessionId}`;
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    setCopied(true);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setResumeSessionId(null);
    }, 3000);
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    onMobileClose?.();
  };

  const handleNewSession = () => {
    onNewSession();
    onMobileClose?.();
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-[80vw] max-w-[320px] flex-col gap-4 border-r border-ink-900/5 bg-[#FAF9F6] p-4 shadow-xl transition-transform duration-300 ease-out lg:fixed lg:inset-y-0 lg:left-0 lg:z-auto lg:w-[280px] lg:translate-x-0 lg:shadow-none ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-ink-800">Sessions</div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${connected
                ? "bg-success-light text-success"
                : "bg-error-light text-error"
                }`}
            >
              {connected ? "Connected" : "Offline"}
            </span>
            {isMobileOpen && (
              <button
                className="rounded-full p-1 text-ink-500 hover:bg-ink-900/10 lg:hidden"
                onClick={onMobileClose}
                aria-label="Close sessions"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <button
          className="w-full rounded-xl border border-ink-900/10 bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors"
          onClick={handleNewSession}
        >
          + New Session
        </button>
        <div className="flex flex-col gap-2 overflow-y-auto">
          {sessionList.length === 0 && (
            <div className="rounded-xl border border-ink-900/5 bg-surface px-4 py-5 text-center text-xs text-muted">
              No sessions yet. Start by sending a prompt.
            </div>
          )}
          {sessionList.map((session) => (
            <div
              key={session.id}
              className={`cursor-pointer rounded-xl border px-2 py-3 text-left transition ${activeSessionId === session.id
                ? "border-accent/30 bg-accent-subtle"
                : "border-ink-900/5 bg-surface hover:bg-surface-tertiary"
                }`}
              onClick={() => handleSelectSession(session.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSelectSession(session.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                  <div className={`text-[12px] font-medium text-ink-800 ${session.status === "running"
                    ? "text-info/70"
                    : session.status === "completed"
                      ? "text-success/70"
                      : session.status === "error"
                        ? "text-error/70"
                        : "text-muted"
                    }`}>
                    {session.title}
                  </div>
                  <div className="flex items-center justify-between mt-0.5 text-xs text-muted">
                    <span className="truncate">
                      {formatCwd(session.cwd)}
                    </span>
                  </div>
                </div>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className="flex-shrink-0 rounded-full p-1.5 text-ink-500 hover:bg-ink-900/10"
                      aria-label="Open session menu"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                        <circle cx="5" cy="12" r="1.7" />
                        <circle cx="12" cy="12" r="1.7" />
                        <circle cx="19" cy="12" r="1.7" />
                      </svg>
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="z-50 min-w-[220px] rounded-xl border border-ink-900/10 bg-white p-1 shadow-lg"
                      align="center"
                      sideOffset={8}
                    >
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 outline-none hover:bg-ink-900/5"
                        onSelect={() => onDeleteSession(session.id)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-error/80"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M4 7h16" />
                          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          <path d="M7 7l1 12a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9l1-12" />
                        </svg>
                        Delete this session
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 outline-none hover:bg-ink-900/5"
                        onSelect={() => setResumeSessionId(session.id)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-ink-500"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M4 5h16v14H4z" />
                          <path d="M7 9h10M7 12h6" />
                          <path d="M13 15l3 2-3 2" />
                        </svg>
                        Resume in Claude Code
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>
          ))}
        </div>
        <Dialog.Root open={!!resumeSessionId} onOpenChange={(open) => !open && setResumeSessionId(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <Dialog.Title className="text-lg font-semibold text-ink-800">Resume</Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    className="rounded-full p-1 text-ink-500 hover:bg-ink-900/10"
                    aria-label="Close dialog"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M18 6l-12 12" />
                    </svg>
                  </button>
                </Dialog.Close>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink-900/10 bg-surface px-3 py-2 font-mono text-xs text-ink-700">
                <span className="flex-1 break-all">
                  {resumeSessionId ? `claude --resume ${resumeSessionId}` : ""}
                </span>
                <button
                  className="rounded-lg p-1.5 text-ink-600 hover:bg-ink-900/10"
                  onClick={handleCopyCommand}
                  aria-label="Copy resume command"
                >
                  {copied ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12l4 4L19 6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                  )}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </aside>
    </>
  );
}
