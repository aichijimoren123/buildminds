import { Dialog } from "@base-ui/react/dialog";
import { FolderGit2, GitBranch, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface WorkspaceInfo {
  id: string;
  repoFullName: string;
  localPath: string;
  branch: string;
}

interface WorkspaceSessionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (worktreeName: string, baseBranch: string) => void;
  prompt: string;
  workspace: WorkspaceInfo | null;
}

export function WorkspaceSessionModal({
  open,
  onClose,
  onConfirm,
  prompt,
  workspace,
}: WorkspaceSessionModalProps) {
  // Generate default name from prompt
  const defaultName = generateDefaultName(prompt);
  const [worktreeName, setWorktreeName] = useState(defaultName);
  const [baseBranch, setBaseBranch] = useState(workspace?.branch || "main");
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setWorktreeName(generateDefaultName(prompt));
      setBaseBranch(workspace?.branch || "main");
    }
  }, [open, prompt, workspace?.branch]);

  // Load branches when workspace changes
  useEffect(() => {
    if (open && workspace?.id) {
      setLoadingBranches(true);
      fetch(`/api/worktrees/workspace/${workspace.id}/branches`)
        .then((res) => res.json())
        .then((data) => {
          if (data.branches && Array.isArray(data.branches)) {
            setBranches(data.branches);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingBranches(false));
    }
  }, [open, workspace?.id]);

  const handleConfirm = async () => {
    if (!worktreeName.trim() || !workspace) return;
    setCreating(true);
    try {
      onConfirm(worktreeName.trim(), baseBranch);
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

  if (!workspace) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl z-50 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <GitBranch className="h-5 w-5 text-accent" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-ink-800">
                创建新任务
              </Dialog.Title>
            </div>
            <Dialog.Close className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/10 transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Workspace Info */}
          <div className="mb-4 p-3 rounded-lg bg-surface-secondary border border-ink-900/5">
            <div className="flex items-center gap-2 mb-2">
              <FolderGit2 className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-ink-800">
                {workspace.repoFullName}
              </span>
            </div>
            <div className="text-xs text-muted truncate" title={workspace.localPath}>
              {workspace.localPath}
            </div>
          </div>

          {/* Preview prompt */}
          {prompt && (
            <div className="mb-4 p-3 rounded-lg bg-surface-secondary border border-ink-900/5">
              <div className="text-xs text-muted mb-1">任务描述</div>
              <div className="text-sm text-ink-700 line-clamp-2">{prompt}</div>
            </div>
          )}

          {/* Worktree name input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-700 mb-2">
              任务名称
            </label>
            <input
              type="text"
              value={worktreeName}
              onChange={(e) => setWorktreeName(sanitizeBranchName(e.target.value))}
              onKeyDown={handleKeyDown}
              placeholder="fix-login-bug"
              className="w-full rounded-lg border border-ink-900/10 bg-surface px-3 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
              autoFocus
            />
            <div className="mt-1.5 text-xs text-muted">
              分支名: <code className="bg-surface-secondary px-1 py-0.5 rounded">task/{worktreeName || "task-name"}</code>
            </div>
          </div>

          {/* Base branch selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-ink-700 mb-2">
              基于分支
            </label>
            {loadingBranches ? (
              <div className="flex items-center gap-2 text-sm text-muted py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载分支列表...
              </div>
            ) : (
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="w-full rounded-lg border border-ink-900/10 bg-surface px-3 py-2.5 text-sm text-ink-800 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
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
            )}
          </div>

          {/* Worktree path preview */}
          <div className="mb-6 p-3 rounded-lg bg-ink-900/5 border border-ink-900/5">
            <div className="text-xs text-muted mb-1">Worktree 路径</div>
            <div className="text-xs font-mono text-ink-600 break-all">
              {workspace.localPath}/.worktrees/{worktreeName || "task-name"}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2.5 text-sm font-medium text-ink-600 hover:text-ink-800 hover:bg-ink-900/5 rounded-lg transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!worktreeName.trim() || creating}
              className="px-4 py-2.5 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                "创建任务"
              )}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Generate a default branch name from the prompt
 */
function generateDefaultName(prompt: string): string {
  // Extract keywords from prompt
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3);

  if (words.length === 0) return "task";

  return words.join("-");
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
