import type { SessionMeta } from "../../store/useSessionsStore";

export interface GithubRepo {
  id: string;
  repoFullName: string;
  localPath: string;
  lastSynced?: number;
  isPrivate: boolean;
}

export interface WorkspaceGroup {
  repo: GithubRepo;
  sessions: SessionMeta[];
}

export interface SidebarProps {
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenSettings: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}
