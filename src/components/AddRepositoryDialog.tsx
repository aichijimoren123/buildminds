import { Dialog } from "@base-ui/react/dialog";
import { Download, FolderGit2, Lock, LogIn, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { signIn } from "../lib/auth-client";

interface AvailableRepo {
  fullName: string;
  name: string;
  cloneUrl: string;
  isPrivate: boolean;
  description?: string;
  language?: string;
}

interface AddedRepo {
  id: string;
  repoFullName: string;
  localPath: string;
  isPrivate: boolean;
}

interface AddRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRepoAdded?: (repo: AddedRepo) => void;
}

export function AddRepositoryDialog({
  open,
  onOpenChange,
  onRepoAdded,
}: AddRepositoryDialogProps) {
  const [availableRepos, setAvailableRepos] = useState<AvailableRepo[]>([]);
  const [addedRepos, setAddedRepos] = useState<AddedRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloningRepo, setCloningRepo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Load available repos when dialog opens
  useEffect(() => {
    if (open) {
      loadAvailableRepos();
      loadAddedRepos();
    }
  }, [open]);

  const loadAddedRepos = async () => {
    try {
      const response = await fetch("/api/github/repos");
      if (response.ok) {
        const data = await response.json();
        setAddedRepos(data.repos || []);
      }
    } catch (err) {
      console.error("Failed to load added repos:", err);
    }
  };

  const loadAvailableRepos = async () => {
    setLoading(true);
    setError(null);
    setNeedsAuth(false);
    try {
      const response = await fetch("/api/github/browse");
      if (response.ok) {
        const data = await response.json();
        setAvailableRepos(data.repos || []);
      } else if (response.status === 401) {
        setNeedsAuth(true);
        setError("Please log in with GitHub to browse repositories.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to load repositories. Please try again.");
      }
    } catch (err) {
      console.error("Failed to load available repos:", err);
      setError("Failed to connect to server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const cloneRepo = async (repoFullName: string) => {
    setCloningRepo(repoFullName);
    setError(null);
    try {
      const response = await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName }),
      });
      if (response.ok) {
        const data = await response.json();
        setAddedRepos([...addedRepos, data.repo]);
        onRepoAdded?.(data.repo);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to clone repository.");
      }
    } catch (err) {
      console.error("Failed to clone repo:", err);
      setError("Failed to clone repository. Please try again.");
    } finally {
      setCloningRepo(null);
    }
  };

  // Filter repos by search query
  const filteredRepos = availableRepos.filter((repo) => {
    const query = searchQuery.toLowerCase();
    return (
      repo.fullName.toLowerCase().includes(query) ||
      repo.description?.toLowerCase().includes(query) ||
      repo.language?.toLowerCase().includes(query)
    );
  });

  const isRepoAdded = (repoFullName: string) =>
    addedRepos.some((r) => r.repoFullName === repoFullName);

  const handleGitHubLogin = async () => {
    await signIn.social({
      provider: "github",
      callbackURL: window.location.pathname,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl max-h-[85vh] rounded-2xl bg-bg-000 shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-100/10">
            <div className="flex items-center gap-3">
              <FolderGit2 className="w-5 h-5 text-text-300" />
              <Dialog.Title className="text-lg font-semibold text-text-100">
                Add Repository
              </Dialog.Title>
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-text-400 hover:bg-bg-200 hover:text-text-200 transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* Search - only show when we have repos */}
          {!needsAuth && availableRepos.length > 0 && (
            <div className="px-6 py-3 border-b border-border-100/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-400" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-bg-100 border border-border-100/10 rounded-xl text-text-100 placeholder:text-text-400 focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>
          )}

          {/* Error message - only show non-auth errors here */}
          {error && !needsAuth && (
            <div className="mx-6 mt-3 px-4 py-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error">
              <p>{error}</p>
            </div>
          )}

          {/* Repository list */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-text-400">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Loading repositories...</span>
                </div>
              </div>
            ) : needsAuth ? (
              <div className="text-center py-12">
                <FolderGit2 className="w-12 h-12 text-text-400 mx-auto mb-3" />
                <p className="text-sm text-text-400 mb-4">
                  Sign in with GitHub to browse your repositories
                </p>
                <button
                  onClick={handleGitHubLogin}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#24292e] hover:bg-[#1b1f23] rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in with GitHub
                </button>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="text-center py-12">
                <FolderGit2 className="w-12 h-12 text-text-400 mx-auto mb-3" />
                <p className="text-sm text-text-400">
                  {searchQuery
                    ? "No repositories match your search"
                    : "No repositories found"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRepos.map((repo) => {
                  const added = isRepoAdded(repo.fullName);
                  const isCloning = cloningRepo === repo.fullName;

                  return (
                    <div
                      key={repo.fullName}
                      className={`p-4 border rounded-xl transition-colors ${
                        added
                          ? "border-success/30 bg-success/5"
                          : "border-border-100/10 hover:bg-bg-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-100 truncate">
                              {repo.fullName}
                            </span>
                            {repo.isPrivate && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-lg">
                                <Lock className="w-3 h-3" />
                                Private
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-xs text-text-400 mt-1.5 line-clamp-2">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {repo.language && (
                              <span className="text-xs text-text-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-accent" />
                                {repo.language}
                              </span>
                            )}
                          </div>
                        </div>

                        {added ? (
                          <span className="shrink-0 px-3 py-1.5 text-xs font-medium text-success bg-success/10 rounded-lg">
                            Cloned
                          </span>
                        ) : (
                          <button
                            onClick={() => cloneRepo(repo.fullName)}
                            disabled={isCloning}
                            className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isCloning ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Cloning...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                Clone
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-100/10 bg-bg-100/50">
            <p className="text-xs text-text-400 text-center">
              Repositories will be cloned to your local machine
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
