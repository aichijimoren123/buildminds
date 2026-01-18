import type { WorkTreeInfo } from "../../types";

export function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "";
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${weeks}w ago`;
}

export function getStatusLabel(worktree: WorkTreeInfo | null): {
  text: string;
  color: string;
} | null {
  if (!worktree) return null;
  switch (worktree.status) {
    case "active":
      return null;
    case "pending":
      return { text: "Ready to merge", color: "text-success" };
    case "merged":
      return { text: "Merged", color: "text-text-400" };
    case "abandoned":
      return { text: "Abandoned", color: "text-text-400" };
    default:
      return null;
  }
}

export function getChangeStats(
  worktree: WorkTreeInfo | null
): { additions: number; deletions: number } | null {
  if (!worktree?.changesStats) return null;
  const { added, modified, deleted } = worktree.changesStats;
  const additions = added + modified;
  const deletions = deleted;
  if (additions === 0 && deletions === 0) return null;
  return { additions, deletions };
}
