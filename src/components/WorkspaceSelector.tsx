import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  GitBranch,
  GitMerge,
  Github,
  Loader2,
  Lock,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { authClient } from "../lib/auth-client";
import { useAppStore } from "../store/useAppStore";
import { useSessionsStore } from "../store/useSessionsStore";
import { useWorktreeStore } from "../store/useWorktreeStore";
import type { WorkTreeInfo } from "../types";
import { CreateWorktreeDialog } from "./CreateWorktreeDialog";

interface GithubRepo {
  id: string;
  repoFullName: string;
  localPath: string;
  lastSynced?: number;
  isPrivate: boolean;
}

interface AvailableRepo {
  fullName: string;
  name: string;
  cloneUrl: string;
  isPrivate: boolean;
  description?: string;
  language?: string;
}

interface WorkspaceSelectorProps {
  onSelectWorkspace?: (workspaceId: string | null, localPath: string) => void;
  onSelectWorktree?: (worktreeId: string) => void;
  onNewWorkspace?: (workspaceId: string) => void;
  onWorktreeCreated?: (data: {
    worktreeName: string;
    repoId: string;
    baseBranch: string;
    localPath: string;
  }) => void;
}

export function WorkspaceSelector({
  onSelectWorkspace,
  onSelectWorktree,
  onNewWorkspace,
  onWorktreeCreated,
}: WorkspaceSelectorProps) {
  const { authenticated, user, loading } = useAuth();
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const setActiveWorkspaceId = useAppStore(
    (state) => state.setActiveWorkspaceId
  );
  const setCwd = useAppStore((state) => state.setCwd);
  const sessions = useSessionsStore((state) => state.sessions);
  const worktrees = useWorktreeStore((state) => state.worktrees);

  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoadedRepos, setHasLoadedRepos] = useState(false);
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());

  // Browse repos modal state
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<AvailableRepo[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [addingRepo, setAddingRepo] = useState<string | null>(null);

  // Create worktree dialog state
  const [showCreateWorktreeDialog, setShowCreateWorktreeDialog] =
    useState(false);
  const [selectedRepoForWorktree, setSelectedRepoForWorktree] = useState<
    string | undefined
  >(undefined);

  // Group worktrees by workspace
  const worktreesByWorkspace = useMemo(() => {
    const grouped: Record<string, WorkTreeInfo[]> = {};
    Object.values(worktrees).forEach((wt) => {
      if (!grouped[wt.workspaceId]) {
        grouped[wt.workspaceId] = [];
      }
      grouped[wt.workspaceId].push(wt);
    });
    // Sort worktrees by updatedAt desc
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => b.updatedAt - a.updatedAt);
    });
    return grouped;
  }, [worktrees]);

  // Load repos when authenticated
  useEffect(() => {
    if (authenticated && !hasLoadedRepos && !loadingRepos) {
      loadRepos();
    }
  }, [authenticated, hasLoadedRepos, loadingRepos]);

  // Auto-expand active workspace
  useEffect(() => {
    if (activeWorkspaceId) {
      setExpandedRepos((prev) => new Set([...prev, activeWorkspaceId]));
    }
  }, [activeWorkspaceId]);

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const response = await fetch("/api/github/repos");
      if (response.ok) {
        const data = await response.json();
        setRepos(data.repos || []);
      }
    } catch (error) {
      console.error("Failed to load repos:", error);
    } finally {
      setLoadingRepos(false);
      setHasLoadedRepos(true);
    }
  };

  const loadAvailableRepos = async () => {
    setLoadingAvailable(true);
    try {
      const response = await fetch("/api/github/browse");
      if (response.ok) {
        const data = await response.json();
        setAvailableRepos(data.repos || []);
      }
    } catch (error) {
      console.error("Failed to load available repos:", error);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const addRepo = async (repoFullName: string) => {
    setAddingRepo(repoFullName);
    try {
      const response = await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName }),
      });
      if (response.ok) {
        const data = await response.json();
        setRepos((prev) => [...prev, data.repo]);
        // Auto-select the newly added repo
        handleSelectWorkspace(data.repo);
        setShowBrowseModal(false);
      }
    } catch (error) {
      console.error("Failed to add repo:", error);
    } finally {
      setAddingRepo(null);
    }
  };

  const handleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleSelectWorkspace = (repo: GithubRepo) => {
    setActiveWorkspaceId(repo.id);
    setCwd(repo.localPath);
    onSelectWorkspace?.(repo.id, repo.localPath);
    setIsOpen(false);
  };

  const handleToggleExpand = (repoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  const handleNewWorkspace = (repoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Open the create worktree dialog with this repo selected
    setSelectedRepoForWorktree(repoId);
    setShowCreateWorktreeDialog(true);
    setIsOpen(false);
  };

  const handleWorktreeCreated = (data: {
    worktreeName: string;
    repoId: string;
    baseBranch: string;
    localPath: string;
  }) => {
    // Update workspace and cwd
    setActiveWorkspaceId(data.repoId);
    setCwd(data.localPath);

    // Call the callback if provided
    onWorktreeCreated?.(data);

    // Also call onNewWorkspace for backwards compatibility
    onNewWorkspace?.(data.repoId);
  };

  const handleSelectWorktree = (worktree: WorkTreeInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    // Find the session associated with this worktree
    const session = Object.values(sessions).find(
      (s) => s.worktreeId === worktree.id
    );
    if (session) {
      onSelectWorktree?.(session.id);
    }
    // Also select the workspace
    setActiveWorkspaceId(worktree.workspaceId);
    setCwd(worktree.localPath);
    setIsOpen(false);
  };

  const handleOpenBrowse = () => {
    setIsOpen(false);
    setShowBrowseModal(true);
    loadAvailableRepos();
  };

  const selectedRepo = repos.find((r) => r.id === activeWorkspaceId);

  const getDisplayLabel = () => {
    if (selectedRepo) {
      return selectedRepo.repoFullName;
    }
    return "Select repository";
  };

  const getWorktreeIcon = (status: WorkTreeInfo["status"]) => {
    switch (status) {
      case "merged":
        return <GitMerge className="w-4 h-4 text-success" />;
      case "abandoned":
        return <Archive className="w-4 h-4 text-text-400" />;
      default:
        return <GitBranch className="w-4 h-4 text-text-300" />;
    }
  };

  return (
    <div className="mb-4">
      <Menu.Root open={isOpen} onOpenChange={setIsOpen}>
        <Menu.Trigger className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-border-100/10 bg-bg-000 hover:bg-bg-100 hover:border-border-100/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-3 min-w-0">
            {selectedRepo ? (
              <FolderOpen className="w-5 h-5 text-accent shrink-0" />
            ) : (
              <Folder className="w-5 h-5 text-text-400 shrink-0" />
            )}
            <span
              className={`text-sm font-medium truncate ${
                selectedRepo ? "text-text-100" : "text-text-400"
              }`}
            >
              {getDisplayLabel()}
            </span>
            {selectedRepo?.isPrivate && (
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-text-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner
            side="bottom"
            align="start"
            sideOffset={4}
            className="z-50"
          >
            <Menu.Popup className="w-[380px] max-h-[400px] overflow-y-auto rounded-xl bg-bg-000 border border-border-100/10 shadow-elevated py-2">
              {/* Loading state */}
              {loading ? (
                <div className="px-4 py-6 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-text-400 mx-auto" />
                  <span className="text-sm text-text-400 mt-2 block">
                    Loading...
                  </span>
                </div>
              ) : !authenticated ? (
                /* Not authenticated */
                <div className="px-4 py-6 text-center">
                  <Github className="w-8 h-8 text-text-400 mx-auto mb-3" />
                  <p className="text-sm text-text-400 mb-4">
                    Connect GitHub to access your repositories
                  </p>
                  <button
                    onClick={handleSignIn}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#24292e] hover:bg-[#1b1f23] rounded-lg transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    Connect GitHub
                  </button>
                </div>
              ) : loadingRepos ? (
                /* Loading repos */
                <div className="px-4 py-6 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-text-400 mx-auto" />
                  <span className="text-sm text-text-400 mt-2 block">
                    Loading repositories...
                  </span>
                </div>
              ) : repos.length === 0 ? (
                /* No repos */
                <div className="px-4 py-6 text-center">
                  <FolderPlus className="w-8 h-8 text-text-400 mx-auto mb-3" />
                  <p className="text-sm text-text-400 mb-4">
                    No repositories added yet
                  </p>
                  <button
                    onClick={handleOpenBrowse}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Repository
                  </button>
                </div>
              ) : (
                /* Repo list with worktrees */
                <>
                  {/* Section header */}
                  <div className="px-4 py-2 text-xs font-medium text-text-400 uppercase tracking-wide">
                    Repositories
                  </div>

                  {repos.map((repo) => {
                    const isExpanded = expandedRepos.has(repo.id);
                    const isActive = repo.id === activeWorkspaceId;
                    const repoWorktrees = worktreesByWorkspace[repo.id] || [];
                    const repoName =
                      repo.repoFullName.split("/").pop() || repo.repoFullName;

                    return (
                      <div key={repo.id} className="px-2">
                        {/* Repo header */}
                        <div
                          className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                            isActive
                              ? "bg-accent/10 text-accent"
                              : "hover:bg-bg-100"
                          }`}
                          onClick={() => handleSelectWorkspace(repo)}
                        >
                          {/* Expand toggle */}
                          <button
                            className="shrink-0 p-0.5 text-text-400 hover:text-text-200"
                            onClick={(e) => handleToggleExpand(repo.id, e)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          {/* Repo icon */}
                          <Github
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? "text-accent" : "text-text-400"
                            }`}
                          />

                          {/* Repo name and path */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium truncate ${
                                  isActive ? "text-accent" : "text-text-100"
                                }`}
                              >
                                {repoName}
                              </span>
                              {repo.isPrivate && (
                                <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-text-400 truncate">
                              {repo.localPath}
                            </div>
                          </div>

                          {/* Worktree count */}
                          {repoWorktrees.length > 0 && (
                            <span className="text-xs text-text-400 shrink-0">
                              {repoWorktrees.length}
                            </span>
                          )}
                        </div>

                        {/* Expanded content: worktrees */}
                        {isExpanded && (
                          <div className="ml-6 pl-3 border-l border-border-100/10 mb-2">
                            {/* New workspace button */}
                            <button
                              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-accent hover:bg-bg-100 rounded-lg transition-colors"
                              onClick={(e) => handleNewWorkspace(repo.id, e)}
                            >
                              <Plus className="w-4 h-4" />
                              New workspace
                            </button>

                            {/* Worktree list */}
                            {repoWorktrees.map((wt) => {
                              const branchName =
                                wt.branchName.split("/").pop() || wt.branchName;
                              return (
                                <div
                                  key={wt.id}
                                  className="flex items-center gap-2 px-2 py-2 hover:bg-bg-100 rounded-lg cursor-pointer transition-colors"
                                  onClick={(e) => handleSelectWorktree(wt, e)}
                                >
                                  {getWorktreeIcon(wt.status)}
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm text-text-100 truncate block">
                                      {wt.name}
                                    </span>
                                    <span className="text-xs text-text-400 truncate block">
                                      {branchName}
                                    </span>
                                  </div>
                                  {wt.changesStats && (
                                    <span className="text-[11px] font-mono text-text-400">
                                      <span className="text-success">
                                        +{wt.changesStats.added}
                                      </span>
                                      <span className="mx-0.5">/</span>
                                      <span className="text-error">
                                        -{wt.changesStats.deleted}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Menu.Separator className="my-2 h-px bg-border-100/10" />

                  {/* Add repository option */}
                  <div className="px-2">
                    <button
                      className="flex items-center gap-3 w-full px-2 py-2 text-sm text-text-300 hover:text-text-100 hover:bg-bg-100 rounded-lg transition-colors"
                      onClick={handleOpenBrowse}
                    >
                      <FolderPlus className="w-4 h-4" />
                      Open...
                    </button>
                  </div>
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      {/* Browse Repositories Modal */}
      <Dialog.Root open={showBrowseModal} onOpenChange={setShowBrowseModal}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-bg-000 p-6 shadow-xl z-50 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-text-100">
                Add Repository
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-1 text-text-400 hover:bg-bg-100">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-sm text-text-400 mb-4">
              Select a repository from your GitHub account to add as a
              workspace.
            </Dialog.Description>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loadingAvailable ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <span className="ml-2 text-sm text-text-400">
                    Loading repositories...
                  </span>
                </div>
              ) : availableRepos.length === 0 ? (
                <div className="text-center py-8 text-sm text-text-400">
                  No repositories found
                </div>
              ) : (
                <div className="space-y-2">
                  {availableRepos.map((repo) => {
                    const alreadyAdded = repos.some(
                      (r) => r.repoFullName === repo.fullName
                    );
                    const isAdding = addingRepo === repo.fullName;

                    return (
                      <div
                        key={repo.fullName}
                        className="p-3 border border-border-100/10 rounded-xl hover:bg-bg-100 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Github className="w-4 h-4 text-text-400 shrink-0" />
                              <span className="text-sm font-medium text-text-100 truncate">
                                {repo.fullName}
                              </span>
                              {repo.isPrivate && (
                                <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded shrink-0">
                                  Private
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-text-400 mt-1 line-clamp-2">
                                {repo.description}
                              </p>
                            )}
                            {repo.language && (
                              <span className="text-xs text-text-400 mt-1 inline-block">
                                {repo.language}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => addRepo(repo.fullName)}
                            disabled={alreadyAdded || isAdding}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-1"
                          >
                            {isAdding ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Adding...
                              </>
                            ) : alreadyAdded ? (
                              "Added"
                            ) : (
                              "Add"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Create Worktree Dialog */}
      <CreateWorktreeDialog
        open={showCreateWorktreeDialog}
        onOpenChange={setShowCreateWorktreeDialog}
        repos={repos}
        selectedRepoId={selectedRepoForWorktree}
        onConfirm={handleWorktreeCreated}
      />
    </div>
  );
}
