import { Dialog } from "@base-ui/react/dialog";
import {
  ChevronDown,
  FolderGit2,
  GitBranch,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface GithubRepo {
  id: string;
  repoFullName: string;
  localPath: string;
  isPrivate: boolean;
}

interface CreateWorktreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repos: GithubRepo[];
  selectedRepoId?: string;
  onConfirm: (data: {
    worktreeName: string;
    repoId: string;
    baseBranch: string;
    localPath: string;
  }) => void;
}

export function CreateWorktreeDialog({
  open,
  onOpenChange,
  repos,
  selectedRepoId,
  onConfirm,
}: CreateWorktreeDialogProps) {
  const [worktreeName, setWorktreeName] = useState("");
  const [repoId, setRepoId] = useState(selectedRepoId || "");
  const [baseBranch, setBaseBranch] = useState("main");
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathPreview, setPathPreview] = useState<string>("");

  const selectedRepo = repos.find((r) => r.id === repoId);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setWorktreeName("");
      setRepoId(selectedRepoId || repos[0]?.id || "");
      setBaseBranch("main");
      setError(null);
      setPathPreview("");
    }
  }, [open, selectedRepoId, repos]);

  // Fetch path preview when repoId or worktreeName changes
  useEffect(() => {
    if (!open || !repoId) {
      setPathPreview("");
      return;
    }

    const fetchPathPreview = async () => {
      try {
        const name = worktreeName.trim() || "task-name";
        const response = await fetch(
          `/api/worktrees/workspace/${repoId}/path-preview?name=${encodeURIComponent(name)}`
        );
        if (response.ok) {
          const data = await response.json();
          setPathPreview(data.path || "");
        }
      } catch (err) {
        console.error("Failed to fetch path preview:", err);
      }
    };

    // Debounce the fetch
    const timer = setTimeout(fetchPathPreview, 300);
    return () => clearTimeout(timer);
  }, [open, repoId, worktreeName]);

  // Load branches when repo changes
  useEffect(() => {
    if (open && repoId) {
      setLoadingBranches(true);
      setBranches([]);
      fetch(`/api/worktrees/workspace/${repoId}/branches`)
        .then((res) => res.json())
        .then((data) => {
          if (data.branches && Array.isArray(data.branches)) {
            setBranches(data.branches);
            // Set default branch
            if (data.branches.length > 0) {
              setBaseBranch(
                data.branches.includes("main")
                  ? "main"
                  : data.branches.includes("master")
                    ? "master"
                    : data.branches[0]
              );
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoadingBranches(false));
    }
  }, [open, repoId]);

  const handleConfirm = async () => {
    if (!worktreeName.trim() || !repoId || !selectedRepo) {
      setError("请填写所有必填项");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Create the worktree via API
      const response = await fetch("/api/worktrees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: repoId,
          name: worktreeName.trim(),
          baseBranch,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "创建失败");
      }

      const { worktree } = await response.json();

      onConfirm({
        worktreeName: worktree.name,
        repoId,
        baseBranch,
        localPath: worktree.localPath,
      });

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !creating) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-bg-400/40 backdrop-blur-sm z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-bg-000 p-6 shadow-xl z-50 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <GitBranch className="h-5 w-5 text-accent" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-text-100">
                新建 Workspace
              </Dialog.Title>
            </div>
            <Dialog.Close className="rounded-full p-1.5 text-text-400 hover:bg-border-100/10 transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 text-sm text-error">
              {error}
            </div>
          )}

          {/* Worktree name input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-200 mb-2">
              Workspace 名称 <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={worktreeName}
              onChange={(e) =>
                setWorktreeName(sanitizeBranchName(e.target.value))
              }
              onKeyDown={handleKeyDown}
              placeholder="fix-login-bug"
              className="w-full rounded-lg border border-border-100/10 bg-bg-100 px-3 py-2.5 text-sm text-text-100 placeholder:text-text-400-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
              autoFocus
            />
            <div className="mt-1.5 text-xs text-text-400">
              分支名:{" "}
              <code className="bg-bg-200 px-1 py-0.5 rounded">
                task/{worktreeName || "task-name"}
              </code>
            </div>
          </div>

          {/* Repository selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-200 mb-2">
              仓库 <span className="text-error">*</span>
            </label>
            <div className="relative">
              <select
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border-100/10 bg-bg-100 px-3 py-2.5 pr-10 text-sm text-text-100 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
              >
                {repos.length === 0 ? (
                  <option value="">没有可用的仓库</option>
                ) : (
                  repos.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.repoFullName}
                      {repo.isPrivate ? " (Private)" : ""}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-400 pointer-events-none" />
            </div>
            {selectedRepo && (
              <div className="mt-2 flex items-center gap-2 text-xs text-text-400">
                <FolderGit2 className="h-3.5 w-3.5" />
                <span className="truncate">{selectedRepo.localPath}</span>
                {selectedRepo.isPrivate && (
                  <Lock className="h-3 w-3 text-amber-500" />
                )}
              </div>
            )}
          </div>

          {/* Base branch selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-200 mb-2">
              基于分支
            </label>
            {loadingBranches ? (
              <div className="flex items-center gap-2 text-sm text-text-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载分支列表...
              </div>
            ) : (
              <div className="relative">
                <select
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border-100/10 bg-bg-100 px-3 py-2.5 pr-10 text-sm text-text-100 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                >
                  {branches.length > 0 ? (
                    branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))
                  ) : (
                    <option value="main">main</option>
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Worktree path preview */}
          <div className="mb-6 p-3 rounded-lg bg-border-100/5 border border-border-100/5">
            <div className="text-xs text-text-400 mb-1">Worktree 路径</div>
            <div className="text-xs font-mono text-text-300 break-all">
              {pathPreview || "请选择仓库"}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => onOpenChange(false)}
              disabled={creating}
              className="px-4 py-2.5 text-sm font-medium text-text-300 hover:text-text-100 hover:bg-border-100/5 rounded-lg transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!worktreeName.trim() || !repoId || creating}
              className="px-4 py-2.5 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                "创建并开始对话"
              )}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Sanitize input to be a valid git branch name
 */
function sanitizeBranchName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
