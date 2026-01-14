import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import {
  GitBranch,
  MoreHorizontal,
  Settings,
  Trash2,
  Terminal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAppStore } from "../store/useAppStore";
import { useSessionsSortedByDate } from "../store/useSessionsStore";
import { useWorktreeStore } from "../store/useWorktreeStore";
import { WorkspaceSelector } from "./WorkspaceSelector";

interface SidebarProps {
  connected: boolean;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenSettings: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  connected,
  onNewSession,
  onDeleteSession,
  onOpenSettings,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const worktrees = useWorktreeStore((state) => state.worktrees);

  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  // Use filtered sessions based on workspace
  const sessionList = useSessionsSortedByDate(activeWorkspaceId);

  const formatCwd = (cwd?: string) => {
    if (!cwd) return "Working dir unavailable";
    const parts = cwd.split(/[\\/]+/).filter(Boolean);
    const tail = parts.slice(-2).join("/");
    return `/${tail || cwd}`;
  };

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
    navigate(`/chat/${sessionId}`);
    onMobileClose?.();
  };

  const handleNewSession = () => {
    onNewSession();
    onMobileClose?.();
  };

  // Determine active session from URL
  const urlSessionId = location.pathname.match(/^\/chat\/([^/]+)/)?.[1];
  const isSessionActive = (sessionId: string) => urlSessionId === sessionId;

  // Get branch name for a session
  const getBranchName = (worktreeId?: string) => {
    if (!worktreeId) return null;
    const worktree = worktrees[worktreeId];
    if (!worktree) return null;
    // Extract just the branch name from full path
    const parts = worktree.branchName.split("/");
    return parts[parts.length - 1] || worktree.branchName;
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
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-[80vw] max-w-[320px] flex-col border-r border-ink-900/5 bg-[#FAF9F6] p-4 shadow-xl transition-transform duration-300 ease-out lg:fixed lg:inset-y-0 lg:left-0 lg:z-auto lg:w-[280px] lg:translate-x-0 lg:shadow-none ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header with connection status */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-sm font-semibold text-ink-800">Sessions</div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                connected
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
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Workspace Selector */}
        <WorkspaceSelector />

        {/* New Session Button */}
        <button
          className="w-full rounded-xl border border-ink-900/10 bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors mb-4"
          onClick={handleNewSession}
        >
          + New Session
        </button>

        {/* Session List */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto min-h-0">
          {sessionList.length === 0 && (
            <div className="rounded-xl border border-ink-900/5 bg-surface px-4 py-5 text-center text-xs text-muted">
              No sessions yet. Start by sending a prompt.
            </div>
          )}
          {sessionList.map((session) => {
            const branchName = getBranchName(session.worktreeId);
            return (
              <div
                key={session.id}
                className={`cursor-pointer rounded-xl border px-3 py-3 text-left transition ${
                  isSessionActive(session.id)
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                    {/* Title with status color */}
                    <div
                      className={`text-[13px] font-medium truncate ${
                        session.status === "running"
                          ? "text-info"
                          : session.status === "completed"
                            ? "text-success"
                            : session.status === "error"
                              ? "text-error"
                              : "text-ink-800"
                      }`}
                    >
                      {session.title || "Untitled Session"}
                    </div>

                    {/* Working directory */}
                    <div className="text-xs text-muted mt-0.5 truncate">
                      {formatCwd(session.cwd)}
                    </div>

                    {/* Branch badge */}
                    {branchName && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-medium">
                          <GitBranch className="w-3 h-3" />
                          {branchName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Session menu */}
                  <Menu.Root>
                    <Menu.Trigger
                      className="flex-shrink-0 rounded-full p-1.5 text-ink-500 hover:bg-ink-900/10"
                      aria-label="Open session menu"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner className="z-50">
                        <Menu.Popup className="min-w-[200px] rounded-xl border border-ink-900/10 bg-white p-1 shadow-lg">
                          <Menu.Item
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 outline-none hover:bg-ink-900/5"
                            onClick={(e) => {
                              e.preventDefault();
                              setResumeSessionId(session.id);
                            }}
                          >
                            <Terminal className="w-4 h-4 text-ink-500" />
                            Resume in Claude Code
                          </Menu.Item>
                          <Menu.Item
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-error/80 outline-none hover:bg-ink-900/5"
                            onClick={(e) => {
                              e.preventDefault();
                              onDeleteSession(session.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete session
                          </Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </div>
              </div>
            );
          })}
        </div>

        {/* Settings button */}
        <div className="border-t border-ink-900/5 pt-3 mt-3">
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-700 hover:bg-surface-tertiary transition-colors"
            onClick={onOpenSettings}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Resume Dialog */}
        <Dialog.Root
          open={!!resumeSessionId}
          onOpenChange={(open) => !open && setResumeSessionId(null)}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm" />
            <Dialog.Popup className="fixed left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <Dialog.Title className="text-lg font-semibold text-ink-800">
                  Resume in Terminal
                </Dialog.Title>
                <Dialog.Close className="rounded-full p-1 text-ink-500 hover:bg-ink-900/10">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </Dialog.Close>
              </div>
              <p className="mt-2 text-sm text-muted">
                Run this command in your terminal to resume the session:
              </p>
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
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-success"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12l4 4L19 6" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                  )}
                </button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </aside>
    </>
  );
}
