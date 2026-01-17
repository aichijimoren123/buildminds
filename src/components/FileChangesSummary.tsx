import {
  ExternalLink,
  FileCode,
  FileEdit,
  FileMinus,
  FilePlus,
} from "lucide-react";
import type { FileChange } from "../types";

interface FileChangesSummaryProps {
  changes: FileChange[];
  cwd?: string;
  onFileClick?: (filePath: string, index: number) => void;
  onReviewClick?: () => void;
}

// Get relative path from cwd
function getRelativePath(filePath: string, cwd?: string): string {
  if (!cwd) return filePath;
  if (filePath.startsWith(cwd)) {
    const relative = filePath.slice(cwd.length);
    return relative.startsWith("/") ? relative.slice(1) : relative;
  }
  return filePath;
}

// Get file icon based on status
function FileIcon({ status }: { status: FileChange["status"] }) {
  switch (status) {
    case "added":
      return <FilePlus className="w-4 h-4 text-success" />;
    case "deleted":
      return <FileMinus className="w-4 h-4 text-error" />;
    case "modified":
      return <FileEdit className="w-4 h-4 text-warning" />;
    default:
      return <FileCode className="w-4 h-4 text-muted" />;
  }
}

export function FileChangesSummary({
  changes,
  cwd,
  onFileClick,
  onReviewClick,
}: FileChangesSummaryProps) {
  if (!changes || changes.length === 0) {
    return null;
  }

  // Calculate totals
  const totals = changes.reduce(
    (acc, change) => ({
      additions: acc.additions + change.additions,
      deletions: acc.deletions + change.deletions,
    }),
    { additions: 0, deletions: 0 },
  );

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-bg-200 border-b border-ink-900/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* File count badge */}
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-ink-700">
                {changes.length} {changes.length === 1 ? "file" : "files"}{" "}
                changed
              </span>
            </div>
            {/* Line stats */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-success font-medium">
                +{totals.additions}
              </span>
              <span className="text-error font-medium">
                -{totals.deletions}
              </span>
            </div>
          </div>
          {/* Review button */}
          {onReviewClick && (
            <button
              onClick={onReviewClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent hover:text-accent-hover bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Review
            </button>
          )}
        </div>
      </div>

      {/* File list */}
      <ul className="divide-y divide-ink-900/5 max-h-64 overflow-y-auto">
        {changes.map((change, index) => (
          <li
            key={`${change.path}-${index}`}
            className={`px-4 py-2 hover:bg-bg-100 transition-colors ${
              onFileClick ? "cursor-pointer" : ""
            }`}
            onClick={() => onFileClick?.(change.path, index)}
          >
            <div className="flex items-center gap-3">
              <FileIcon status={change.status} />
              <span className="flex-1 text-sm font-mono text-ink-600 truncate">
                {getRelativePath(change.path, cwd)}
              </span>
              <div className="flex items-center gap-2 text-xs">
                {change.additions > 0 && (
                  <span className="text-success">+{change.additions}</span>
                )}
                {change.deletions > 0 && (
                  <span className="text-error">-{change.deletions}</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
