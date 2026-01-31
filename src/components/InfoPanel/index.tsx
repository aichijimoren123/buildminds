import type { FileChange, SessionStatus } from "../../types";
import type { FileNode } from "../FileBrowser";
import { ArtifactsCard } from "./ArtifactsCard";
import { ContextCard } from "./ContextCard";
import { FilesCard } from "./FilesCard";
import { ProgressCard } from "./ProgressCard";

interface InfoPanelProps {
  status: SessionStatus;
  messageCount: number;
  fileChanges?: FileChange[];
  cwd?: string;
  createdAt?: number;
  worktreeId?: string;
  onFileClick?: (filePath: string, index: number) => void;
  onFileSelect?: (node: FileNode) => void;
}

export function InfoPanel({
  status,
  messageCount,
  fileChanges,
  cwd,
  createdAt,
  worktreeId,
  onFileClick,
  onFileSelect,
}: InfoPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-bg-100 border-l border-border-100/10 p-4 space-y-4">
      <ProgressCard status={status} messageCount={messageCount} />

      <FilesCard cwd={cwd} onFileSelect={onFileSelect} />

      <ArtifactsCard
        fileChanges={fileChanges || []}
        cwd={cwd}
        onFileClick={onFileClick}
      />

      <ContextCard cwd={cwd} createdAt={createdAt} worktreeId={worktreeId} />
    </div>
  );
}

export { ProgressCard } from "./ProgressCard";
export { ArtifactsCard } from "./ArtifactsCard";
export { ContextCard } from "./ContextCard";
export { FilesCard } from "./FilesCard";
