import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useAppStore } from "../../store/useAppStore";
import { useSessionsStore } from "../../store/useSessionsStore";
import { useWorktreeStore } from "../../store/useWorktreeStore";
import type { WorkTreeInfo } from "../../types";
import { AddRepositoryDialog } from "../AddRepositoryDialog";
import { CodeModeSession } from "./CodeModeSession";
import { useRepos } from "./hooks/useRepos";
import { NormalModeSession } from "./NormalModeSession";
import { ResumeDialog } from "./ResumeDialog";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarHeader } from "./SidebarHeader";
import type { SidebarProps, WorkspaceGroup as WorkspaceGroupType } from "./types";
import { WorkspaceGroup } from "./WorkspaceGroup";

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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [showAddRepoDialog, setShowAddRepoDialog] = useState(false);

  // Custom hook for repos
  const { repos, loadingRepos, addRepo } = useRepos(sessionMode, authenticated);

  // Get sessions for normal mode (no workspace)
  const normalSessionList = useMemo(() => {
    const allSessions = Object.values(sessions);
    return allSessions
      .filter((s) => !s.githubRepoId)
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [sessions]);

  // Group sessions by workspace for code mode
  const workspaceGroups = useMemo(() => {
    const allSessions = Object.values(sessions);
    const workspaceSessions = allSessions.filter((s) => !!s.githubRepoId);

    // Create a map of repoId -> sessions
    const sessionsByRepo: Record<string, typeof workspaceSessions> = {};
    for (const session of workspaceSessions) {
      const repoId = session.githubRepoId!;
      if (!sessionsByRepo[repoId]) {
        sessionsByRepo[repoId] = [];
      }
      sessionsByRepo[repoId].push(session);
    }

    // Sort sessions within each group by updatedAt
    for (const repoId of Object.keys(sessionsByRepo)) {
      sessionsByRepo[repoId].sort(
        (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
      );
    }

    // Build workspace groups, including repos without sessions
    const groups: WorkspaceGroupType[] = [];
    for (const repo of repos) {
      groups.push({
        repo,
        sessions: sessionsByRepo[repo.id] || [],
      });
    }

    // Sort groups by most recent session activity
    groups.sort((a, b) => {
      const aLatest = a.sessions[0]?.updatedAt ?? 0;
      const bLatest = b.sessions[0]?.updatedAt ?? 0;
      return bLatest - aLatest;
    });

    return groups;
  }, [sessions, repos]);

  // Determine active session from URL
  const urlSessionId = location.pathname.match(/^\/chat\/([^/]+)/)?.[1];
  const isSessionActive = (sessionId: string) => urlSessionId === sessionId;

  // Get worktree info for a session
  const getWorktree = (worktreeId?: string): WorkTreeInfo | null => {
    if (!worktreeId) return null;
    return worktrees[worktreeId] || null;
  };

  const handleSelectSession = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
    onMobileClose?.();
  };

  const handleNewSession = () => {
    onNewSession();
    onMobileClose?.();
  };

  const toggleGroupCollapse = (repoId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
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
        <SidebarHeader
          sessionMode={sessionMode}
          onModeChange={setSessionMode}
          onNewSession={handleNewSession}
          onNavigateHome={() => navigate("/")}
        />

        {/* Content based on mode */}
        {sessionMode === "normal" ? (
          <>
            {/* Normal Mode: Sessions Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-text-100">
                Sessions
              </span>
            </div>

            {/* Normal Mode: Session List */}
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto min-h-0">
              {normalSessionList.length === 0 && (
                <div className="rounded-xl border border-border-100/10 bg-bg-000 px-4 py-5 text-center text-xs text-text-400">
                  No sessions yet. Start by sending a prompt.
                </div>
              )}
              {normalSessionList.map((session) => (
                <NormalModeSession
                  key={session.id}
                  session={session}
                  isActive={isSessionActive(session.id)}
                  onSelect={handleSelectSession}
                  onOpenInCLI={setResumeSessionId}
                  onDelete={onDeleteSession}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Code Mode: Workspace list */}
            <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
              {workspaceGroups.length === 0 && !loadingRepos && (
                <div className="rounded-xl border border-border-100/10 bg-bg-000 px-4 py-5 text-center text-xs text-text-400">
                  No workspaces yet. Add a repository to get started.
                </div>
              )}
              {loadingRepos && (
                <div className="rounded-xl border border-border-100/10 bg-bg-000 px-4 py-5 text-center text-xs text-text-400">
                  Loading workspaces...
                </div>
              )}
              {workspaceGroups.map((group) => (
                <WorkspaceGroup
                  key={group.repo.id}
                  group={group}
                  isCollapsed={collapsedGroups.has(group.repo.id)}
                  onToggle={() => toggleGroupCollapse(group.repo.id)}
                  onNewSession={handleNewSession}
                >
                  {group.sessions.map((session, index) => (
                    <CodeModeSession
                      key={session.id}
                      session={session}
                      index={index}
                      isActive={isSessionActive(session.id)}
                      worktree={getWorktree(session.worktreeId)}
                      onSelect={handleSelectSession}
                      onOpenInCLI={setResumeSessionId}
                      onDelete={onDeleteSession}
                    />
                  ))}
                </WorkspaceGroup>
              ))}
            </div>
          </>
        )}

        <SidebarFooter
          sessionMode={sessionMode}
          user={user}
          authenticated={authenticated}
          onOpenSettings={onOpenSettings}
          onAddRepo={() => setShowAddRepoDialog(true)}
        />

        <ResumeDialog
          sessionId={resumeSessionId}
          onClose={() => setResumeSessionId(null)}
        />

        <AddRepositoryDialog
          open={showAddRepoDialog}
          onOpenChange={setShowAddRepoDialog}
          onRepoAdded={addRepo}
        />
      </aside>
    </>
  );
}
