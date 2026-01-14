import { ArrowLeft, GitBranch, FolderOpen, Clock } from "lucide-react";
import { useNavigate } from "react-router";
import { useWorktreeStore } from "../../store/useWorktreeStore";
import type { SessionMeta } from "../../store/useSessionsStore";

interface ChatTitleBarProps {
  session: SessionMeta | undefined;
  onBack?: () => void;
}

export function ChatTitleBar({ session, onBack }: ChatTitleBarProps) {
  const navigate = useNavigate();
  const worktrees = useWorktreeStore((state) => state.worktrees);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/");
    }
  };

  const formatCwd = (cwd?: string) => {
    if (!cwd) return "No directory";
    const parts = cwd.split(/[\\/]+/).filter(Boolean);
    const tail = parts.slice(-2).join("/");
    return `/${tail || cwd}`;
  };

  const getBranchName = (worktreeId?: string) => {
    if (!worktreeId) return null;
    const worktree = worktrees[worktreeId];
    if (!worktree) return null;
    const parts = worktree.branchName.split("/");
    return parts[parts.length - 1] || worktree.branchName;
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "running":
        return "text-info";
      case "completed":
        return "text-success";
      case "error":
        return "text-error";
      default:
        return "text-ink-700";
    }
  };

  const branchName = getBranchName(session?.worktreeId);

  return (
    <div className="border-b border-ink-900/10 bg-white">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
        {/* Back button - visible on mobile */}
        <button
          className="flex items-center justify-center rounded-lg p-1.5 text-ink-600 hover:bg-surface-tertiary lg:hidden"
          onClick={handleBack}
          aria-label="Back to sessions"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Session info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className={`text-base font-semibold truncate ${getStatusColor(session?.status)}`}
            >
              {session?.title || "Untitled Session"}
            </h1>
            {session?.status === "running" && (
              <span className="flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-info-light text-info">
                Running
              </span>
            )}
          </div>

          {/* Session metadata */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted">
            {/* Working directory */}
            {session?.cwd && (
              <div className="flex items-center gap-1 truncate">
                <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{formatCwd(session.cwd)}</span>
              </div>
            )}

            {/* Branch */}
            {branchName && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <GitBranch className="w-3.5 h-3.5" />
                <span>{branchName}</span>
              </div>
            )}

            {/* Last updated */}
            {session?.updatedAt && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(session.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
