import type { FileChange, SessionStatus } from "../../types";
import { ArtifactsCard } from "./ArtifactsCard";
import { ContextCard } from "./ContextCard";
import { ProgressCard } from "./ProgressCard";

interface InfoPanelProps {
  status: SessionStatus;
  messageCount: number;
  fileChanges?: FileChange[];
  cwd?: string;
  createdAt?: number;
  worktreeId?: string;
  onFileClick?: (filePath: string, index: number) => void;
}

export function InfoPanel({
  status,
  messageCount,
  fileChanges,
  cwd,
  createdAt,
  worktreeId,
  onFileClick,
}: InfoPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-surface-cream border-l border-ink-900/10 p-4 space-y-4">
      <ProgressCard status={status} messageCount={messageCount} />

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
