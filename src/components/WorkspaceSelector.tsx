import { Menu } from "@base-ui/react/menu";
import { ChevronDown, FolderGit2, Github, Plus } from "lucide-react";
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

  // Load repos when authenticated
  useEffect(() => {
    if (authenticated && repos.length === 0) {
      loadRepos();
    }
  }, [authenticated]);

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
    }
  };

  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
  };

  const handleSelectWorkspace = (repo: GithubRepo | null) => {
    if (repo) {
      setActiveWorkspaceId(repo.id);
      setCwd(repo.localPath);
      onSelectWorkspace?.(repo.id, repo.localPath);
    } else {
      setActiveWorkspaceId(null);
      onSelectWorkspace?.(null, "");
    }
    setIsOpen(false);
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
          <Menu.Positioner side="bottom" align="start" sideOffset={4}>
            <Menu.Popup className="w-[calc(100%-2rem)] min-w-[240px] max-w-[280px] rounded-xl bg-white border border-ink-900/10 shadow-lg py-1 z-50">
              {/* All Workspaces option */}
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-surface-tertiary cursor-pointer outline-none"
                onSelect={() => handleSelectWorkspace(null)}
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
                  onSelect={handleSignIn}
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
                        onSelect={() => handleSelectWorkspace(repo)}
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
                    onSelect={() => {
                      // TODO: Open repo browser modal
                      loadRepos();
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
    </div>
  );
}
