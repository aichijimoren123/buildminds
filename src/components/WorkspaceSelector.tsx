import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, FolderGit2, Github, Plus, X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { authClient } from "../lib/auth-client";
import { useAppStore } from "../store/useAppStore";

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
}

export function WorkspaceSelector({ onSelectWorkspace }: WorkspaceSelectorProps) {
  const { authenticated, user, loading } = useAuth();
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const setActiveWorkspaceId = useAppStore((state) => state.setActiveWorkspaceId);
  const setCwd = useAppStore((state) => state.setCwd);

  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoadedRepos, setHasLoadedRepos] = useState(false);

  // Browse repos modal state
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<AvailableRepo[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [addingRepo, setAddingRepo] = useState<string | null>(null);

  // Load repos when authenticated
  useEffect(() => {
    if (authenticated && !hasLoadedRepos && !loadingRepos) {
      loadRepos();
    }
  }, [authenticated, hasLoadedRepos, loadingRepos]);

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

  const loadAvailableRepos = async () => {
    console.log("[WorkspaceSelector] loadAvailableRepos called");
    setLoadingAvailable(true);
    try {
      console.log("[WorkspaceSelector] Fetching /api/github/browse...");
      const response = await fetch("/api/github/browse");
      console.log("[WorkspaceSelector] Response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("[WorkspaceSelector] Got repos:", data.repos?.length);
        setAvailableRepos(data.repos);
      } else {
        const error = await response.text();
        console.error("[WorkspaceSelector] Error response:", error);
      }
    } catch (error) {
      console.error("[WorkspaceSelector] Failed to load available repos:", error);
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
      console.log("Starting GitHub sign in...");
      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
      console.log("Sign in result:", result);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleSelectWorkspace = (repo: GithubRepo | null) => {
    if (repo) {
      setActiveWorkspaceId(repo.id);
      setCwd(repo.localPath);
      onSelectWorkspace?.(repo.id, repo.localPath);
    } else {
      setActiveWorkspaceId(null);
      setCwd("");
      onSelectWorkspace?.(null, "");
    }
    setIsOpen(false);
  };

  const handleOpenBrowse = () => {
    console.log("[WorkspaceSelector] handleOpenBrowse called");
    setIsOpen(false);
    setShowBrowseModal(true);
    loadAvailableRepos();
  };

  const selectedRepo = repos.find((r) => r.id === activeWorkspaceId);

  const getDisplayLabel = () => {
    if (selectedRepo) {
      const parts = selectedRepo.repoFullName.split("/");
      return parts[parts.length - 1] || selectedRepo.repoFullName;
    }
    return "All Workspaces";
  };

  return (
    <div className="mb-4">
      <Menu.Root open={isOpen} onOpenChange={setIsOpen}>
        <Menu.Trigger className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-ink-900/10 bg-surface hover:bg-surface-tertiary transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            {selectedRepo ? (
              <Github className="w-4 h-4 text-ink-600 shrink-0" />
            ) : (
              <FolderGit2 className="w-4 h-4 text-ink-600 shrink-0" />
            )}
            <span className="text-sm font-medium text-ink-800 truncate">
              {getDisplayLabel()}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-ink-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
            <Menu.Popup className="w-[calc(100%-2rem)] min-w-[240px] max-w-[280px] rounded-xl bg-white border border-ink-900/10 shadow-lg py-1">
              {/* All Workspaces option */}
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-surface-tertiary cursor-pointer outline-none"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectWorkspace(null);
                }}
              >
                <FolderGit2 className="w-4 h-4 text-ink-500" />
                <span>All Workspaces</span>
                {!activeWorkspaceId && (
                  <span className="ml-auto text-accent">✓</span>
                )}
              </Menu.Item>

              <Menu.Separator className="my-1 h-px bg-ink-900/10" />

              {/* GitHub Section */}
              {loading ? (
                <div className="px-3 py-2 text-sm text-muted">Loading...</div>
              ) : !authenticated ? (
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-surface-tertiary cursor-pointer outline-none"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSignIn();
                  }}
                >
                  <Github className="w-4 h-4" />
                  <span>Connect GitHub</span>
                </Menu.Item>
              ) : (
                <>
                  {/* User info */}
                  {user && (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
                      {user.avatarUrl && (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span>{user.username}</span>
                    </div>
                  )}

                  {/* Repos list */}
                  {loadingRepos ? (
                    <div className="px-3 py-2 text-sm text-muted">
                      Loading repositories...
                    </div>
                  ) : repos.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted text-center">
                      No repositories added
                    </div>
                  ) : (
                    repos.map((repo) => (
                      <Menu.Item
                        key={repo.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-surface-tertiary cursor-pointer outline-none"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSelectWorkspace(repo);
                        }}
                      >
                        <Github className="w-4 h-4 text-ink-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{repo.repoFullName}</div>
                          <div className="text-xs text-muted truncate">
                            {repo.localPath}
                          </div>
                        </div>
                        {activeWorkspaceId === repo.id && (
                          <span className="text-accent shrink-0">✓</span>
                        )}
                      </Menu.Item>
                    ))
                  )}

                  <Menu.Separator className="my-1 h-px bg-ink-900/10" />

                  {/* Add repository */}
                  <Menu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-surface-tertiary cursor-pointer outline-none"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenBrowse();
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Repository</span>
                  </Menu.Item>
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
          <Dialog.Popup className="fixed left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl z-50 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-ink-800">
                Add Repository
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-1 text-ink-500 hover:bg-ink-900/10">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-sm text-muted mb-4">
              Select a repository from your GitHub account to add as a workspace.
            </Dialog.Description>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loadingAvailable ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <span className="ml-2 text-sm text-muted">Loading repositories...</span>
                </div>
              ) : availableRepos.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted">
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
                        className="p-3 border border-ink-900/10 rounded-xl hover:bg-surface-secondary transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Github className="w-4 h-4 text-ink-500 shrink-0" />
                              <span className="text-sm font-medium text-ink-800 truncate">
                                {repo.fullName}
                              </span>
                              {repo.isPrivate && (
                                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded shrink-0">
                                  Private
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-muted mt-1 line-clamp-2">
                                {repo.description}
                              </p>
                            )}
                            {repo.language && (
                              <span className="text-xs text-muted mt-1 inline-block">
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
    </div>
  );
}
