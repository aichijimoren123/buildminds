import { Clock, Folder, GitBranch } from "lucide-react";

interface ContextCardProps {
  cwd?: string;
  createdAt?: number;
  worktreeId?: string;
}

function formatDuration(createdAt: number): string {
  const now = Date.now();
  const diff = now - createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

function getShortPath(cwd?: string): string {
  if (!cwd) return "Unknown";
  const parts = cwd.split("/");
  if (parts.length <= 3) return cwd;
  return `.../${parts.slice(-2).join("/")}`;
}

export function ContextCard({ cwd, createdAt, worktreeId }: ContextCardProps) {
  return (
    <div className="rounded-xl border border-border-100/10 bg-bg-000 overflow-hidden">
      <div className="px-4 py-3 border-b border-border-100/5">
        <h3 className="text-sm font-medium text-text-100">Context</h3>
      </div>
      <div className="p-4 space-y-3">
        {cwd && (
          <div className="flex items-start gap-3">
            <Folder className="w-4 h-4 text-text-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-400">Working Directory</div>
              <div
                className="text-sm text-text-200 font-mono truncate"
                title={cwd}
              >
                {getShortPath(cwd)}
              </div>
            </div>
          </div>
        )}

        {createdAt && (
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-text-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-text-400">Started</div>
              <div className="text-sm text-text-200">
                {formatDuration(createdAt)}
              </div>
            </div>
          </div>
        )}

        {worktreeId && (
          <div className="flex items-start gap-3">
            <GitBranch className="w-4 h-4 text-text-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-text-400">Worktree</div>
              <div className="text-sm text-text-200 font-mono truncate">
                {worktreeId.slice(0, 8)}
              </div>
            </div>
          </div>
        )}

        {!cwd && !createdAt && !worktreeId && (
          <p className="text-sm text-text-400 text-center py-2">
            No context available
          </p>
        )}
      </div>
    </div>
  );
}
