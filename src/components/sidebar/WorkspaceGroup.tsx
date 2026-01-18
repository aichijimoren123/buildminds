import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkspaceGroup as WorkspaceGroupType } from "./types";

interface WorkspaceGroupProps {
  group: WorkspaceGroupType;
  isCollapsed: boolean;
  onToggle: () => void;
  onNewSession: () => void;
  children: ReactNode;
}

export function WorkspaceGroup({
  group,
  isCollapsed,
  onToggle,
  onNewSession,
  children,
}: WorkspaceGroupProps) {
  const repoName =
    group.repo.repoFullName.split("/").pop() || group.repo.repoFullName;

  return (
    <div className="mb-2">
      {/* Workspace header */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-bg-200/50 rounded-lg transition-colors"
        onClick={onToggle}
      >
        <button className="shrink-0 p-0.5 text-text-400">
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
        <span className="text-sm font-medium text-text-100 truncate">
          {repoName}
        </span>
        {group.sessions.length > 0 && (
          <span className="text-xs text-text-400 ml-auto">
            {group.sessions.length}
          </span>
        )}
      </div>

      {/* Sessions list */}
      {!isCollapsed && (
        <div className="ml-2 pl-2 border-l border-border-100/10">
          {/* New workspace button */}
          <button
            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-text-400 hover:text-text-200 hover:bg-bg-200/50 rounded-lg transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onNewSession();
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            New workspace
          </button>

          {/* Session items */}
          {children}
        </div>
      )}
    </div>
  );
}
