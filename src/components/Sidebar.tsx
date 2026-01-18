import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import {
  ChevronDown,
  Code2,
  Filter,
  GitBranch,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Settings,
  Terminal,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useAppStore, type SessionMode } from "../store/useAppStore";
import { useSessionsStore } from "../store/useSessionsStore";
import { useWorktreeStore } from "../store/useWorktreeStore";

interface GithubRepo {
  id: string;
  repoFullName: string;
  localPath: string;
  lastSynced?: number;
  isPrivate: boolean;
}

interface SidebarProps {
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenSettings: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  onNewSession,
  onDeleteSession,
  onOpenSettings,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authenticated } = useAuth();

  // Store state
  const sessionMode = useAppStore((state) => state.sessionMode);
  const setSessionMode = useAppStore((state) => state.setSessionMode);
  const worktrees = useWorktreeStore((state) => state.worktrees);
  const sessions = useSessionsStore((state) => state.sessions);

  // Local state
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  // Workspaces state for code mode
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [hasLoadedRepos, setHasLoadedRepos] = useState(false);

  // Load repos when in code mode and authenticated
  useEffect(() => {
    if (sessionMode === "workspace" && authenticated && !hasLoadedRepos && !loadingRepos) {
      loadRepos();
    }
  }, [sessionMode, authenticated, hasLoadedRepos, loadingRepos]);

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const response = await fetch("/api/github/repos");
      if (response.ok) {
        const data = await response.json();
        setRepos(data.repos);
      }
    } catch (error) {
      console.error("Failed to load repos:", error);
    } finally {
      setLoadingRepos(false);
      setHasLoadedRepos(true);
    }
  };

  // Get sessions based on mode
  // In normal mode: show all sessions without workspace filter
  // In code mode: show all sessions that have a workspace association
  const sessionList = useMemo(() => {
    const allSessions = Object.values(sessions);
    let filtered: typeof allSessions;

    if (sessionMode === "normal") {
      // Normal mode: show sessions without workspace
      filtered = allSessions.filter((s) => !s.githubRepoId);
    } else {
      // Code mode: show all sessions with workspace association
      filtered = allSessions.filter((s) => !!s.githubRepoId);
    }

    return filtered.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [sessions, sessionMode]);

  // Create a map of workspace IDs to repo info for display
  const repoMap = useMemo(() => {
    const map: Record<string, GithubRepo> = {};
    for (const repo of repos) {
      map[repo.id] = repo;
    }
    return map;
  }, [repos]);

  // Format relative time
  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(diff / 604800000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return `${weeks}w ago`;
  };

  // Get workspace display name
  const getWorkspaceName = (githubRepoId?: string) => {
    if (!githubRepoId) return null;
    const repo = repoMap[githubRepoId];
    if (!repo) return null;
    return repo.repoFullName;
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

  const handleModeChange = (mode: SessionMode) => {
    setSessionMode(mode);
  };

  // Determine active session from URL
  const urlSessionId = location.pathname.match(/^\/chat\/([^/]+)/)?.[1];
  const isSessionActive = (sessionId: string) => urlSessionId === sessionId;

  // Get branch name for a session
  const getBranchName = (worktreeId?: string) => {
    if (!worktreeId) return null;
    const worktree = worktrees[worktreeId];
    if (!worktree) return null;
    const parts = worktree.branchName.split("/");
    return parts[parts.length - 1] || worktree.branchName;
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-bg-400/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-[80vw] max-w-[320px] flex-col border-r border-border-100/10 bg-bg-100 p-4 shadow-xl transition-transform duration-300 ease-out lg:fixed lg:inset-y-0 lg:left-0 lg:z-auto lg:w-[280px] lg:translate-x-0 lg:shadow-none ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header with mode toggle and new session button */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* Mode Toggle Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-000 border border-border-100/10">
            <button
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                sessionMode === "normal"
                  ? "bg-bg-200 text-text-100"
                  : "text-text-400 hover:text-text-200"
              }`}
              onClick={() => handleModeChange("normal")}
              aria-label="Normal mode"
              title="Normal mode"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                sessionMode === "workspace"
                  ? "bg-bg-200 text-text-100"
                  : "text-text-400 hover:text-text-200"
              }`}
              onClick={() => handleModeChange("workspace")}
              aria-label="Code mode"
              title="Code mode"
            >
              <Code2 className="w-4 h-4" />
            </button>
          </div>

          {/* New Session Button */}
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white hover:bg-accent/90 transition-colors"
            onClick={handleNewSession}
            aria-label="New session"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Sessions Header with Filter */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-text-100">Sessions</span>
          <button
            className="flex items-center justify-center w-6 h-6 rounded text-text-400 hover:text-text-200 hover:bg-bg-200 transition-colors"
            aria-label="Filter sessions"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Session List */}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto min-h-0">
          {sessionList.length === 0 && (
            <div className="rounded-xl border border-border-100/10 bg-bg-000 px-4 py-5 text-center text-xs text-text-400">
              {sessionMode === "normal"
                ? "No sessions yet. Start by sending a prompt."
                : "No workspace sessions yet. Select a repository to start."}
            </div>
          )}
          {sessionList.map((session) => {
            const branchName = getBranchName(session.worktreeId);
            const workspaceName = getWorkspaceName(session.githubRepoId);
            const timeAgo = formatRelativeTime(session.updatedAt);

            return (
              <div
                key={session.id}
                className={`cursor-pointer rounded-xl px-3 py-2.5 text-left transition ${
                  isSessionActive(session.id)
                    ? "bg-bg-200"
                    : "hover:bg-bg-200/50"
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
                    {/* Title */}
                    <div
                      className={`text-[13px] font-medium truncate ${
                        session.status === "running"
                          ? "text-info"
                          : "text-text-100"
                      }`}
                    >
                      {session.title || "Untitled Session"}
                    </div>

                    {/* Time and Workspace */}
                    <div className="text-xs text-text-400 mt-0.5 truncate">
                      {sessionMode === "workspace" && workspaceName ? (
                        <>
                          {timeAgo} {workspaceName}
                        </>
                      ) : (
                        timeAgo
                      )}
                    </div>

                    {/* Branch badge (code mode only) */}
                    {sessionMode === "workspace" && branchName && (
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
                      className="flex-shrink-0 rounded-full p-1 text-text-400 hover:bg-bg-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Open session menu"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner className="z-50">
                        <Menu.Popup className="min-w-[200px] rounded-xl border border-border-100/10 bg-bg-000 p-1 shadow-lg">
                          <Menu.Item
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-200 outline-none hover:bg-bg-100"
                            onClick={(e) => {
                              e.preventDefault();
                              setResumeSessionId(session.id);
                            }}
                          >
                            <Terminal className="w-4 h-4 text-text-400" />
                            Resume in Claude Code
                          </Menu.Item>
                          <Menu.Item
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-error/80 outline-none hover:bg-bg-100"
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

        {/* Bottom Section: User Profile */}
        <div className="border-t border-border-100/10 pt-3 mt-3">
          {authenticated && user ? (
            <Menu.Root>
              <Menu.Trigger className="flex w-full items-center gap-3 rounded-xl px-3 py-2 hover:bg-bg-200 transition-colors">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-accent">
                      {user.username?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium text-text-100 truncate">
                    {user.username}
                  </div>
                  {sessionMode === "workspace" && (
                    <div className="text-xs text-text-400">
                      {repos.length} workspace{repos.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-text-400" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner className="z-50" side="top" sideOffset={4}>
                  <Menu.Popup className="min-w-[200px] rounded-xl border border-border-100/10 bg-bg-000 p-1 shadow-lg">
                    <Menu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-200 outline-none hover:bg-bg-100"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenSettings();
                      }}
                    >
                      <Settings className="w-4 h-4 text-text-400" />
                      Settings
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          ) : (
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-text-200 hover:bg-bg-200 transition-colors"
              onClick={onOpenSettings}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          )}
        </div>

        {/* Resume Dialog */}
        <Dialog.Root
          open={!!resumeSessionId}
          onOpenChange={(open) => !open && setResumeSessionId(null)}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-bg-400/40 backdrop-blur-sm" />
            <Dialog.Popup className="fixed left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-bg-000 p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <Dialog.Title className="text-lg font-semibold text-text-100">
                  Resume in Terminal
                </Dialog.Title>
                <Dialog.Close className="rounded-full p-1 text-text-400 hover:bg-bg-200">
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
              <p className="mt-2 text-sm text-text-400">
                Run this command in your terminal to resume the session:
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-border-100/10 bg-bg-000 px-3 py-2 font-mono text-xs text-text-200">
                <span className="flex-1 break-all">
                  {resumeSessionId ? `claude --resume ${resumeSessionId}` : ""}
                </span>
                <button
                  className="rounded-lg p-1.5 text-text-300 hover:bg-bg-200"
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
