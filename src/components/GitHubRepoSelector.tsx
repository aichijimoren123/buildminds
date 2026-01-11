import { useEffect, useState } from "react";

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

interface GitHubRepoSelectorProps {
  onSelect: (repoId: string, localPath: string) => void;
  selectedRepoId?: string | null;
}

export function GitHubRepoSelector({ onSelect, selectedRepoId }: GitHubRepoSelectorProps) {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrowse, setShowBrowse] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<AvailableRepo[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [addingRepo, setAddingRepo] = useState<string | null>(null);

  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    try {
      const response = await fetch("/api/github/repos");
      if (response.ok) {
        const data = await response.json();
        setRepos(data.repos);
      }
    } catch (error) {
      console.error("Failed to load repos:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRepos = async () => {
    setLoadingAvailable(true);
    try {
      const response = await fetch("/api/github/browse");
      if (response.ok) {
        const data = await response.json();
        setAvailableRepos(data.repos);
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
        setRepos([...repos, data.repo]);
        onSelect(data.repo.id, data.repo.localPath);
        setShowBrowse(false);
      }
    } catch (error) {
      console.error("Failed to add repo:", error);
    } finally {
      setAddingRepo(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted">Loading repositories...</div>;
  }

  if (repos.length === 0 && !showBrowse) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted mb-4">No GitHub repositories added yet</p>
        <button
          onClick={() => {
            setShowBrowse(true);
            loadAvailableRepos();
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors"
        >
          Browse Repositories
        </button>
      </div>
    );
  }

  if (showBrowse) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink-800">Browse GitHub Repositories</h3>
          <button
            onClick={() => setShowBrowse(false)}
            className="text-sm text-muted hover:text-ink-700"
          >
            Back
          </button>
        </div>

        {loadingAvailable ? (
          <div className="text-sm text-muted">Loading...</div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2">
            {availableRepos.map((repo) => {
              const alreadyAdded = repos.some(r => r.repoFullName === repo.fullName);
              const isAdding = addingRepo === repo.fullName;

              return (
                <div
                  key={repo.fullName}
                  className="p-3 border border-ink-900/10 rounded-lg hover:bg-surface-secondary transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink-800 truncate">
                          {repo.fullName}
                        </span>
                        {repo.isPrivate && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                            Private
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted mt-1 line-clamp-2">{repo.description}</p>
                      )}
                      {repo.language && (
                        <span className="text-xs text-muted mt-1 inline-block">{repo.language}</span>
                      )}
                    </div>
                    <button
                      onClick={() => addRepo(repo.fullName)}
                      disabled={alreadyAdded || isAdding}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {isAdding ? "Adding..." : alreadyAdded ? "Added" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink-800">Your Repositories</h3>
        <button
          onClick={() => {
            setShowBrowse(true);
            loadAvailableRepos();
          }}
          className="text-sm text-accent hover:text-accent-hover font-medium"
        >
          + Add Repository
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {repos.map((repo) => (
          <button
            key={repo.id}
            onClick={() => onSelect(repo.id, repo.localPath)}
            className={`w-full text-left p-3 border rounded-lg transition-colors ${
              selectedRepoId === repo.id
                ? "border-accent bg-accent/5"
                : "border-ink-900/10 hover:bg-surface-secondary"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink-800 truncate">
                {repo.repoFullName}
              </span>
              {repo.isPrivate && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                  Private
                </span>
              )}
            </div>
            <div className="text-xs text-muted mt-1 truncate">{repo.localPath}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
