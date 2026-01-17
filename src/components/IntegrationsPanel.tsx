import { Collapsible } from "@base-ui/react/collapsible";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { authClient } from "../lib/auth-client";

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

interface IntegrationsPanelProps {
  onSelectRepo?: (repoId: string, localPath: string) => void;
}

export function IntegrationsPanel({ onSelectRepo }: IntegrationsPanelProps) {
  const { authenticated, user, loading } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showRepos, setShowRepos] = useState(false);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [availableRepos, setAvailableRepos] = useState<AvailableRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [addingRepo, setAddingRepo] = useState<string | null>(null);

  const handleToggleExpanded = async () => {
    if (authenticated) {
      setExpanded(!expanded);
      if (!expanded && !showRepos && repos.length === 0) {
        // Auto-load repos when expanding for the first time
        loadRepos();
      }
    } else {
      // Trigger GitHub OAuth sign in using Better Auth client
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    }
  };

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

  const loadAvailableRepos = async () => {
    setLoadingRepos(true);
    try {
      const response = await fetch("/api/github/browse");
      if (response.ok) {
        const data = await response.json();
        setAvailableRepos(data.repos);
      }
    } catch (error) {
      console.error("Failed to load available repos:", error);
    } finally {
      setLoadingRepos(false);
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
        setRepos([...repos, data.repo]);
        setShowRepos(false);
        setSearchQuery("");
      }
    } catch (error) {
      console.error("Failed to add repo:", error);
    } finally {
      setAddingRepo(null);
    }
  };

  const handleSelectRepo = (repo: GithubRepo) => {
    if (onSelectRepo) {
      onSelectRepo(repo.id, repo.localPath);
    }
  };

  const handleShowRepos = () => {
    setShowRepos(true);
    loadAvailableRepos();
  };

  const filteredRepos = showRepos
    ? availableRepos.filter((repo) =>
        repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : repos.filter((repo) =>
        repo.repoFullName.toLowerCase().includes(searchQuery.toLowerCase()),
      );

  return (
    <div className="rounded-xl border border-border-100/10 bg-bg-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggleExpanded}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-100-secondary transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-5 h-5" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-text-100">GitHub</span>
        </div>

        <div className="flex items-center gap-2">
          {loading ? (
            <div className="w-10 h-5 bg-bg-100-secondary animate-pulse rounded-full" />
          ) : authenticated ? (
            <div className="flex items-center gap-2">
              <div
                className={`w-10 h-5 rounded-full transition-colors ${
                  expanded ? "bg-accent" : "bg-border-100/20"
                }`}
              >
                <div
                  className={`w-4 h-4 mt-0.5 rounded-full bg-bg-000 shadow-sm transition-transform ${
                    expanded ? "ml-5" : "ml-0.5"
                  }`}
                />
              </div>
              <span className="text-xs text-text-400">
                {expanded ? "连接" : "未连接"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-accent hover:text-accent-hover font-medium">
              连接
            </span>
          )}
        </div>
      </button>

      {/* Expandable Content */}
      <Collapsible.Root
        open={expanded && authenticated}
        onOpenChange={setExpanded}
      >
        <Collapsible.Panel className="border-t border-border-100/10">
          <div className="p-4 space-y-3 max-h-100 overflow-y-auto">
            {/* Connected User Info */}
            {user && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-100-secondary">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="text-sm font-medium text-text-100">
                  {user.username}
                </span>
              </div>
            )}

            {/* Repositories Section */}
            <div>
              <button
                onClick={() => setShowRepos(!showRepos)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-text-100 hover:bg-bg-100-secondary rounded-lg transition-colors"
              >
                <span>代码库</span>
                <svg
                  viewBox="0 0 24 24"
                  className={`w-4 h-4 transition-transform ${showRepos ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded && (
                <div className="mt-2 space-y-2">
                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="搜索代码库"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 pl-9 text-sm border border-border-100/10 rounded-lg bg-bg-000 focus:outline-none focus:border-accent transition-colors"
                    />
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>

                  {/* Repository List */}
                  {loadingRepos ? (
                    <div className="text-sm text-text-400 px-3 py-2">
                      Loading...
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {filteredRepos.length === 0 && !showRepos && (
                        <div className="text-center py-4">
                          <p className="text-sm text-text-400 mb-2">
                            No repositories added
                          </p>
                          <button
                            onClick={handleShowRepos}
                            className="text-xs text-accent hover:text-accent-hover font-medium"
                          >
                            Browse Repositories
                          </button>
                        </div>
                      )}

                      {showRepos ? (
                        // Available repos from GitHub
                        <>
                          <div className="flex items-center justify-between px-3 py-2">
                            <span className="text-xs font-medium text-text-400">
                              Browse GitHub Repositories
                            </span>
                            <button
                              onClick={() => {
                                setShowRepos(false);
                                setSearchQuery("");
                              }}
                              className="text-xs text-accent hover:text-accent-hover"
                            >
                              Back
                            </button>
                          </div>
                          {filteredRepos.map((repo) => {
                            const availableRepo = repo as AvailableRepo;
                            const alreadyAdded = repos.some(
                              (r) => r.repoFullName === availableRepo.fullName,
                            );
                            const isAdding =
                              addingRepo === availableRepo.fullName;

                            return (
                              <div
                                key={availableRepo.fullName}
                                className="flex items-start justify-between gap-2 px-3 py-2 hover:bg-bg-100-secondary rounded-lg transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-text-100 truncate">
                                      {availableRepo.fullName}
                                    </span>
                                    {availableRepo.isPrivate && (
                                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                                        Private
                                      </span>
                                    )}
                                  </div>
                                  {availableRepo.description && (
                                    <p className="text-xs text-text-400 mt-0.5 line-clamp-1">
                                      {availableRepo.description}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() =>
                                    addRepo(availableRepo.fullName)
                                  }
                                  disabled={alreadyAdded || isAdding}
                                  className="text-xs px-2 py-1 text-accent hover:text-accent-hover disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                  {isAdding
                                    ? "Adding..."
                                    : alreadyAdded
                                      ? "Added"
                                      : "Add"}
                                </button>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        // Added repos
                        <>
                          {filteredRepos.map((repo) => {
                            const githubRepo = repo as GithubRepo;
                            return (
                              <button
                                key={githubRepo.id}
                                onClick={() => handleSelectRepo(githubRepo)}
                                className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-bg-100-secondary rounded-lg transition-colors"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  className="w-4 h-4 mt-0.5 shrink-0 text-text-400"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M4 7h16M4 12h16M4 17h16" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-text-100 truncate">
                                      {githubRepo.repoFullName}
                                    </span>
                                    {githubRepo.isPrivate && (
                                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                                        Private
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-text-400 mt-0.5 truncate">
                                    {githubRepo.localPath}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                          {repos.length > 0 && (
                            <button
                              onClick={handleShowRepos}
                              className="w-full text-xs text-accent hover:text-accent-hover font-medium px-3 py-2 text-center"
                            >
                              + Add Repository
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Configure GitHub Link */}
            <a
              href="https://github.com/settings/connections/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-text-400 hover:text-text-200 hover:bg-bg-100-secondary rounded-lg transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
              </svg>
              配置 GitHub
            </a>
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  );
}
