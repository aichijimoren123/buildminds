import { FolderTree, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { FileTree } from "../FileTree";
import type { FileNode } from "../FileBrowser";

interface FilesCardProps {
  cwd?: string;
  onFileSelect?: (node: FileNode) => void;
}

export function FilesCard({ cwd, onFileSelect }: FilesCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!cwd) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border-100/10 bg-bg-000 overflow-hidden">
      {/* 标题栏 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg-100/50 transition-colors"
      >
        <FolderTree size={16} className="text-accent-main-100 shrink-0" />
        <span className="text-sm font-medium text-text-100 flex-1 text-left">
          Files
        </span>
        {isExpanded ? (
          <ChevronDown size={14} className="text-text-400" />
        ) : (
          <ChevronRight size={14} className="text-text-400" />
        )}
      </button>

      {/* 文件树 */}
      {isExpanded && (
        <div className="border-t border-border-100/10">
          <FileTree
            rootPath={cwd}
            onFileSelect={onFileSelect}
            maxHeight="300px"
            className="py-1"
          />
        </div>
      )}
    </div>
  );
}
