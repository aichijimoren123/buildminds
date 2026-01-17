import {
  ChevronRight,
  FileCode,
  FileEdit,
  FileMinus,
  FilePlus,
} from "lucide-react";
import type { FileChange } from "../../types";

interface ArtifactsCardProps {
  fileChanges: FileChange[];
  cwd?: string;
  onFileClick?: (filePath: string, index: number) => void;
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

export function ArtifactsCard({
  fileChanges,
  cwd,
  onFileClick,
}: ArtifactsCardProps) {
  if (!fileChanges || fileChanges.length === 0) {
    return (
      <div className="rounded-xl border border-ink-900/10 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-900/5">
          <h3 className="text-sm font-medium text-ink-700">Artifacts</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted text-center py-4">
            No files changed yet
          </p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totals = fileChanges.reduce(
    (acc, change) => ({
      additions: acc.additions + change.additions,
      deletions: acc.deletions + change.deletions,
    }),
    { additions: 0, deletions: 0 },
  );

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-900/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink-700">Artifacts</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-success">+{totals.additions}</span>
            <span className="text-error">-{totals.deletions}</span>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-ink-900/5 max-h-64 overflow-y-auto">
        {fileChanges.map((change, index) => (
          <li key={`${change.path}-${index}`}>
            <button
              onClick={() => onFileClick?.(change.path, index)}
              className="w-full px-4 py-2.5 hover:bg-bg-100 transition-colors flex items-center gap-3 text-left"
            >
              <FileIcon status={change.status} />
              <span className="flex-1 text-sm text-ink-600 truncate font-mono">
                {getRelativePath(change.path, cwd)}
              </span>
              <ChevronRight className="w-4 h-4 text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
