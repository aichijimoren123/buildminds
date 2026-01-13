import { Dialog } from "@base-ui/react/dialog";
import { GitBranch, X } from "lucide-react";
import { useState } from "react";

interface WorkspaceSessionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (worktreeName: string) => void;
  prompt: string;
}

export function WorkspaceSessionModal({
  open,
  onClose,
  onConfirm,
  prompt,
}: WorkspaceSessionModalProps) {
  // Generate default name from prompt
  const defaultName = generateDefaultName(prompt);
  const [worktreeName, setWorktreeName] = useState(defaultName);

  const handleConfirm = () => {
    if (!worktreeName.trim()) return;
    onConfirm(worktreeName.trim());
    setWorktreeName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl z-50">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <GitBranch className="h-5 w-5 text-accent" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-ink-800">
                Create Workspace Session
              </Dialog.Title>
            </div>
            <Dialog.Close className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/10 transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-muted mb-4">
            This will create a new git branch for this task. Enter a name for
            the worktree branch.
          </Dialog.Description>

          {/* Preview prompt */}
          <div className="mb-4 p-3 rounded-lg bg-surface-secondary border border-ink-900/5">
            <div className="text-xs text-muted mb-1">Task</div>
            <div className="text-sm text-ink-700 line-clamp-2">{prompt}</div>
          </div>

          {/* Worktree name input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-ink-700 mb-2">
              Branch Name
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">buildminds/</span>
              <input
                type="text"
                value={worktreeName}
                onChange={(e) => setWorktreeName(sanitizeBranchName(e.target.value))}
                onKeyDown={handleKeyDown}
                placeholder="feature-name"
                className="flex-1 rounded-lg border border-ink-900/10 bg-surface px-3 py-2 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                autoFocus
              />
            </div>
            <div className="mt-1.5 text-xs text-muted">
              Full branch: <code className="bg-surface-secondary px-1 py-0.5 rounded">buildminds/{worktreeName || "feature-name"}</code>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink-600 hover:text-ink-800 hover:bg-ink-900/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!worktreeName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Session
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
