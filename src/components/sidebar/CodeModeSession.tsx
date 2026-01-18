import { Archive, GitBranch, GitMerge } from "lucide-react";
import type { SessionMeta } from "../../store/useSessionsStore";
import type { WorkTreeInfo } from "../../types";
import { SessionMenu } from "./SessionMenu";
import { getChangeStats, getStatusLabel } from "./utils";

interface CodeModeSessionProps {
  session: SessionMeta;
  index: number;
  isActive: boolean;
  worktree: WorkTreeInfo | null;
  onSelect: (sessionId: string) => void;
  onOpenInCLI: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function CodeModeSession({
  session,
  index,
  isActive,
  worktree,
  onSelect,
  onOpenInCLI,
  onDelete,
}: CodeModeSessionProps) {
  const statusLabel = getStatusLabel(worktree);
  const changeStats = getChangeStats(worktree);

  const branchName = worktree
    ? worktree.branchName.split("/").pop() || worktree.branchName
    : null;

  return (
    <div
      className={`group cursor-pointer rounded-lg px-2 py-2 text-left transition ${
        isActive ? "bg-bg-200" : "hover:bg-bg-200/50"
      }`}
      onClick={() => onSelect(session.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(session.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-2">
        {/* Worktree icon */}
        <div className="shrink-0 mt-0.5">
          {worktree?.status === "merged" ? (
            <GitMerge className="w-4 h-4 text-text-400" />
          ) : worktree?.status === "abandoned" ? (
            <Archive className="w-4 h-4 text-text-400" />
          ) : (
            <GitBranch className="w-4 h-4 text-text-300" />
          )}
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Title row with change stats on right */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[13px] font-medium truncate ${
                session.status === "running" ? "text-info" : "text-text-100"
              }`}
            >
              {worktree?.name || session.title || "Untitled"}
            </span>

            {/* Change stats badge - right aligned */}
            {changeStats && (
              <span className="shrink-0 text-[11px] font-mono px-1.5 py-0.5 rounded border border-border-100/20">
                <span className="text-success">+{changeStats.additions}</span>
                <span className="text-text-400 mx-0.5"></span>
                <span className="text-error">-{changeStats.deletions}</span>
              </span>
            )}
          </div>

          {/* Branch, status, and shortcut */}
          <div className="flex items-center gap-2 mt-0.5 text-xs text-text-400">
            {branchName && <span className="truncate">{branchName}</span>}
            {branchName && statusLabel && <span>·</span>}
            {statusLabel && (
              <span className={statusLabel.color}>{statusLabel.text}</span>
            )}
            {/* Keyboard shortcut hint - inline */}
            {index < 9 && (
              <span className="ml-auto shrink-0 opacity-50">⌘{index + 1}</span>
            )}
          </div>
        </div>

        {/* Session menu - only on hover */}
        <SessionMenu
          sessionId={session.id}
          onOpenInCLI={onOpenInCLI}
          onDelete={onDelete}
          variant="code"
        />
      </div>
    </div>
  );
}
